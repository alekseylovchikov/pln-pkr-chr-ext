export const DEFAULT_SERVER_URL = 'https://pln-pkr-chr-ext-production.up.railway.app';
export const DEFAULT_WS_URL = 'wss://pln-pkr-chr-ext-production.up.railway.app/ws';

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
