import { DEFAULT_SERVER_URL, STORAGE_KEYS } from '../config';
import type { CardSet, Room } from '@planning-poker/shared-types';

async function getServerUrl(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.sync.get([STORAGE_KEYS.serverUrl], (result) => {
      resolve(result[STORAGE_KEYS.serverUrl] || DEFAULT_SERVER_URL);
    });
  });
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const base = await getServerUrl();
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

async function get<T>(path: string): Promise<T> {
  const base = await getServerUrl();
  const res = await fetch(`${base}${path}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export interface CreateRoomResponse {
  room: Room;
  adminToken: string;
  sessionToken: string;
  userId: string;
}

export const api = {
  createRoom: (name: string, adminName: string, cardSetId?: string) =>
    post<CreateRoomResponse>('/rooms', { name, adminName, cardSetId }),

  getRoom: (code: string) => get<{ room: Room }>(`/rooms/${code}`),

  getCardSets: () => get<{ cardSets: CardSet[] }>('/card-sets'),
};
