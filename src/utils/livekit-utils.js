import { AccessToken } from 'livekit-server-sdk';
import { LIVEKIT_SERVER } from '../config/livekit';

export const generateToken = (roomName, participantName) => {
  const at = new AccessToken(LIVEKIT_SERVER.API_KEY, LIVEKIT_SERVER.API_SECRET, {
    identity: participantName,
  });
  
  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });

  return at.toJwt();
};

export const createRoomUrl = (roomName) => {
  return `${LIVEKIT_SERVER.WS_URL}/room/${roomName}`;
}; 