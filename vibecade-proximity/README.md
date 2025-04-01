# Vibecade Proximity Chat

A WebRTC proximity chat implementation using mediasoup as a Selective Forwarding Unit (SFU). 
Audio volume adjusts based on virtual proximity between participants.

## Features

- WebRTC audio/video streaming using mediasoup
- Proximity-based audio volume adjustment
- Draggable participant video elements
- Microphone and camera controls

## Requirements

- Node.js >= 16.0.0
- SSL certificate for HTTPS in production

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
   or
   ```
   yarn install
   ```

3. Generate SSL certificates for local development:
   ```
   npm run gen-ssl-certs
   ```
   or
   ```
   yarn gen-ssl-certs
   ```

## Running

For development with self-signed certificates:

```
export SSL_CERT_PATH="./cert/cert.pem" SSL_KEY_PATH="./cert/key.pem"
npm start
```

or

```
export SSL_CERT_PATH="./cert/cert.pem" SSL_KEY_PATH="./cert/key.pem"
yarn start
```

For production, set the `ANNOUNCED_IP` environment variable to your server's external IP:

```
export ANNOUNCED_IP="your.server.ip.address" SSL_CERT_PATH="/path/to/cert.pem" SSL_KEY_PATH="/path/to/key.pem"
npm start
```

## Usage

1. Open a browser to `https://localhost:3000` or your server address
2. Allow camera and microphone access when prompted
3. Drag your avatar to move around the virtual room
4. Audio volume adjusts based on proximity to other participants

## License

MIT 