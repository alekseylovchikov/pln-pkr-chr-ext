export const DEFAULT_SERVER_URL = 'http://localhost:3000';
export const DEFAULT_WS_URL = 'ws://localhost:3000/ws';

export const STORAGE_KEYS = {
  serverUrl: 'serverUrl',
  sessions: 'sessions', // Map<roomCode, {sessionToken, userId, adminToken?}>
} as const;

export type StoredSession = {
  sessionToken: string;
  userId: string;
  adminToken?: string;
  roomCode: string;
  roomName: string;
};
