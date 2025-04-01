import React, { useEffect, useState, useRef } from 'react';
import {
  Room,
  RoomEvent,
  LocalParticipant,
  RemoteParticipant,
  Track,
} from 'livekit-client';
import { LIVEKIT_SERVER } from '../config/livekit';

const DISTANCE_THRESHOLD = 300; // Maximum distance for audio (in pixels)
const FALLOFF_START = 100; // Distance at which volume starts decreasing

const ProximityChat = ({ position, roomName, token }) => {
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState(new Map());
  const [micPermission, setMicPermission] = useState(false);
  const roomRef = useRef(null);

  // Request microphone permissions explicitly
  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the test stream
      setMicPermission(true);
      return true;
    } catch (error) {
      console.error('Error getting microphone permission:', error);
      setMicPermission(false);
      return false;
    }
  };

  useEffect(() => {
    const connectToRoom = async () => {
      try {
        // Request microphone permission first
        const hasPermission = await requestMicrophonePermission();
        if (!hasPermission) {
          console.error('Microphone permission denied');
          return;
        }

        // Create a new room
        const newRoom = new Room({
          adaptiveStream: true,
          dynacast: true,
          audioCaptureDefaults: {
            autoGainControl: true,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });

        // Connect to LiveKit server
        await newRoom.connect(LIVEKIT_SERVER.WS_URL, token);
        console.log('Connected to LiveKit room');
        
        // Enable audio
        await newRoom.localParticipant.enableAudio();
        console.log('Local audio enabled');
        
        setRoom(newRoom);
        roomRef.current = newRoom;

        // Set up event listeners
        newRoom.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
        newRoom.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
        newRoom.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
        newRoom.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);

      } catch (error) {
        console.error('Error connecting to room:', error);
      }
    };

    connectToRoom();

    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
    };
  }, [token]);

  // Handle participant connection
  const handleParticipantConnected = (participant) => {
    console.log('Participant connected:', participant.identity);
    setParticipants(new Map(participants.set(participant.identity, participant)));
  };

  // Handle participant disconnection
  const handleParticipantDisconnected = (participant) => {
    console.log('Participant disconnected:', participant.identity);
    participants.delete(participant.identity);
    setParticipants(new Map(participants));
  };

  // Handle new audio track subscription
  const handleTrackSubscribed = (track, publication, participant) => {
    if (track.kind === Track.Kind.Audio) {
      console.log('Audio track subscribed from:', participant.identity);
      updateParticipantAudio(participant);
    }
  };

  // Handle audio track unsubscription
  const handleTrackUnsubscribed = (track, publication, participant) => {
    if (track.kind === Track.Kind.Audio) {
      console.log('Audio track unsubscribed from:', participant.identity);
      participants.delete(participant.identity);
      setParticipants(new Map(participants));
    }
  };

  // Update audio volume based on distance
  const updateParticipantAudio = (participant) => {
    const audioTracks = participant.audioTracks;
    
    audioTracks.forEach(publication => {
      const track = publication.track;
      if (!track) return;

      // Calculate distance between participants
      const dx = position.x - participant.metadata.x;
      const dy = position.y - participant.metadata.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Calculate volume based on distance
      let volume = 1.0;
      if (distance > FALLOFF_START) {
        volume = Math.max(0, 1 - (distance - FALLOFF_START) / (DISTANCE_THRESHOLD - FALLOFF_START));
      }

      // Set the audio volume
      track.setVolume(volume);
      console.log(`Set volume for ${participant.identity} to ${volume}`);
    });
  };

  // Update position
  useEffect(() => {
    if (room && room.localParticipant) {
      const metadata = JSON.stringify(position);
      room.localParticipant.setMetadata(metadata);
      console.log('Updated local position:', metadata);
      
      // Update audio volumes for all participants
      participants.forEach(participant => {
        updateParticipantAudio(participant);
      });
    }
  }, [position, room]);

  return (
    <div className="proximity-chat">
      <div className="status">
        {!micPermission && (
          <button onClick={requestMicrophonePermission}>
            Enable Microphone
          </button>
        )}
        <div className="participants">
          {Array.from(participants.values()).map(participant => (
            <div key={participant.identity} className="participant">
              {participant.identity} {participant.audioTracks.size > 0 ? '🎤' : ''}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProximityChat; 