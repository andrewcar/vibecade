const mediasoup = require('mediasoup');
const os = require('os');

// Mediasoup configuration
const mediasoupConfig = {
  // Worker settings
  worker: {
    rtcMinPort: 10000,
    rtcMaxPort: 10100,
    logLevel: 'warn',
    logTags: [
      'info',
      'ice',
      'dtls',
      'rtp',
      'srtp',
      'rtcp'
    ]
  },
  // Router settings
  router: {
    mediaCodecs: [
      {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2
      },
      {
        kind: 'video',
        mimeType: 'video/VP8',
        clockRate: 90000,
        parameters: {
          'x-google-start-bitrate': 1000
        }
      },
      {
        kind: 'video',
        mimeType: 'video/VP9',
        clockRate: 90000,
        parameters: {
          'profile-id': 2,
          'x-google-start-bitrate': 1000
        }
      },
      {
        kind: 'video',
        mimeType: 'video/h264',
        clockRate: 90000,
        parameters: {
          'packetization-mode': 1,
          'profile-level-id': '4d0032',
          'level-asymmetry-allowed': 1,
          'x-google-start-bitrate': 1000
        }
      }
    ]
  },
  // WebRtcTransport settings
  webRtcTransport: {
    listenIps: [
      { ip: '0.0.0.0', announcedIp: null } // Will be replaced with actual announcedIp
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate: 1000000,
    minimumAvailableOutgoingBitrate: 600000,
    maxSctpMessageSize: 262144
  }
};

class MediasoupService {
  constructor(announcedIp) {
    this.workers = [];
    this.nextWorkerIndex = 0;
    this.router = null;
    this.transports = new Map(); // Map<transportId, transport>
    this.producers = new Map(); // Map<producerId, producer>
    this.consumers = new Map(); // Map<consumerId, consumer>
    
    // Set announced IP
    mediasoupConfig.webRtcTransport.listenIps[0].announcedIp = announcedIp;
  }

  async start() {
    // Create mediasoup workers (one per CPU core)
    const numWorkers = os.cpus().length;
    console.log(`Creating ${numWorkers} mediasoup workers...`);
    
    for (let i = 0; i < numWorkers; i++) {
      const worker = await mediasoup.createWorker({
        logLevel: mediasoupConfig.worker.logLevel,
        logTags: mediasoupConfig.worker.logTags,
        rtcMinPort: mediasoupConfig.worker.rtcMinPort,
        rtcMaxPort: mediasoupConfig.worker.rtcMaxPort
      });
      
      worker.on('died', () => {
        console.error(`Worker ${i} died, exiting...`);
        process.exit(1);
      });
      
      this.workers.push(worker);
      console.log(`Worker ${i} created`);
    }
    
    // Create router in the first worker
    // In a more complex app, you might want to distribute routers among workers
    const worker = this.workers[0];
    this.router = await worker.createRouter({ mediaCodecs: mediasoupConfig.router.mediaCodecs });
    console.log('Router created');
  }

  async stop() {
    console.log('Closing mediasoup workers...');
    
    // Close all workers
    for (const worker of this.workers) {
      await worker.close();
    }
    
    this.workers = [];
    this.router = null;
    
    console.log('All mediasoup workers closed');
  }

  // Get the RTP capabilities of our router
  getRouterRtpCapabilities() {
    return this.router.rtpCapabilities;
  }

  // Create a WebRTC transport
  async createWebRtcTransport(userId) {
    if (!this.router) {
      throw new Error('Router not initialized');
    }
    
    // Create a transport on the router
    const transport = await this.router.createWebRtcTransport({
      listenIps: mediasoupConfig.webRtcTransport.listenIps,
      enableUdp: mediasoupConfig.webRtcTransport.enableUdp,
      enableTcp: mediasoupConfig.webRtcTransport.enableTcp,
      preferUdp: mediasoupConfig.webRtcTransport.preferUdp,
      initialAvailableOutgoingBitrate: mediasoupConfig.webRtcTransport.initialAvailableOutgoingBitrate
    });
    
    // Store the transport
    this.transports.set(transport.id, { transport, userId });
    
    // Return transport info to client
    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters
    };
  }

  // Connect a WebRTC transport
  async connectWebRtcTransport(transportId, dtlsParameters) {
    const transportData = this.transports.get(transportId);
    
    if (!transportData) {
      throw new Error(`Transport not found: ${transportId}`);
    }
    
    await transportData.transport.connect({ dtlsParameters });
    return { connected: true };
  }

  // Create a producer
  async createProducer(transportId, kind, rtpParameters) {
    const transportData = this.transports.get(transportId);
    
    if (!transportData) {
      throw new Error(`Transport not found: ${transportId}`);
    }
    
    const producer = await transportData.transport.produce({ kind, rtpParameters });
    
    // Store the producer
    this.producers.set(producer.id, { 
      producer, 
      userId: transportData.userId, 
      kind 
    });
    
    return { id: producer.id };
  }

  // Create a consumer
  async createConsumer(userId, producerId, rtpCapabilities) {
    // Check if the router can consume this producer
    if (!this.router.canConsume({ producerId, rtpCapabilities })) {
      throw new Error(`Cannot consume producer: ${producerId}`);
    }
    
    // Find the producer
    const producerData = this.producers.get(producerId);
    if (!producerData) {
      throw new Error(`Producer not found: ${producerId}`);
    }
    
    // Find the transport associated with this user
    let userTransport;
    for (const [_, transportData] of this.transports.entries()) {
      if (transportData.userId === userId) {
        userTransport = transportData.transport;
        break;
      }
    }
    
    if (!userTransport) {
      throw new Error(`No transport found for user: ${userId}`);
    }
    
    // Create the consumer
    const consumer = await userTransport.consume({
      producerId,
      rtpCapabilities,
      paused: true // Start in paused state
    });
    
    // Store the consumer
    this.consumers.set(consumer.id, { 
      consumer, 
      userId, 
      producerId,
      producerUserId: producerData.userId 
    });
    
    return {
      id: consumer.id,
      producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
      producerUserId: producerData.userId
    };
  }

  // Resume a consumer
  async resumeConsumer(consumerId) {
    const consumerData = this.consumers.get(consumerId);
    
    if (!consumerData) {
      throw new Error(`Consumer not found: ${consumerId}`);
    }
    
    await consumerData.consumer.resume();
    return { resumed: true };
  }

  // Pause a consumer
  async pauseConsumer(consumerId) {
    const consumerData = this.consumers.get(consumerId);
    
    if (!consumerData) {
      throw new Error(`Consumer not found: ${consumerId}`);
    }
    
    await consumerData.consumer.pause();
    return { paused: true };
  }

  // Close a consumer
  async closeConsumer(consumerId) {
    const consumerData = this.consumers.get(consumerId);
    
    if (!consumerData) {
      throw new Error(`Consumer not found: ${consumerId}`);
    }
    
    await consumerData.consumer.close();
    this.consumers.delete(consumerId);
    
    return { closed: true };
  }

  // Close a producer
  async closeProducer(producerId) {
    const producerData = this.producers.get(producerId);
    
    if (!producerData) {
      throw new Error(`Producer not found: ${producerId}`);
    }
    
    await producerData.producer.close();
    this.producers.delete(producerId);
    
    return { closed: true };
  }

  // Close a transport
  async closeTransport(transportId) {
    const transportData = this.transports.get(transportId);
    
    if (!transportData) {
      throw new Error(`Transport not found: ${transportId}`);
    }
    
    await transportData.transport.close();
    this.transports.delete(transportId);
    
    return { closed: true };
  }

  // Get all producers for a specific user
  getProducersForUser(userId) {
    const producers = [];
    
    for (const [producerId, producerData] of this.producers.entries()) {
      if (producerData.userId === userId) {
        producers.push({
          id: producerId,
          kind: producerData.kind
        });
      }
    }
    
    return producers;
  }

  // Get all producers except the ones from a specific user
  getOtherProducers(userId) {
    const producers = [];
    
    for (const [producerId, producerData] of this.producers.entries()) {
      if (producerData.userId !== userId) {
        producers.push({
          id: producerId,
          userId: producerData.userId,
          kind: producerData.kind
        });
      }
    }
    
    return producers;
  }

  // Clean up resources when user disconnects
  async cleanupUser(userId) {
    // Close all producers
    for (const [producerId, producerData] of this.producers.entries()) {
      if (producerData.userId === userId) {
        await producerData.producer.close();
        this.producers.delete(producerId);
      }
    }
    
    // Close all consumers
    for (const [consumerId, consumerData] of this.consumers.entries()) {
      if (consumerData.userId === userId) {
        await consumerData.consumer.close();
        this.consumers.delete(consumerId);
      }
    }
    
    // Close all transports
    for (const [transportId, transportData] of this.transports.entries()) {
      if (transportData.userId === userId) {
        await transportData.transport.close();
        this.transports.delete(transportId);
      }
    }
  }
}

module.exports = MediasoupService; 