import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StoredSession } from '../config';
import { STORAGE_KEYS } from '../config';

interface SessionState {
  sessions: Record<string, StoredSession>; // roomCode → session
  currentRoomCode: string | null;

  saveSession: (session: StoredSession) => void;
  getSession: (roomCode: string) => StoredSession | undefined;
  clearSession: (roomCode: string) => void;
  setCurrentRoom: (code: string | null) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessions: {},
      currentRoomCode: null,

      saveSession: (session) =>
        set((s) => ({ sessions: { ...s.sessions, [session.roomCode]: session } })),

      getSession: (roomCode) => get().sessions[roomCode],

      clearSession: (roomCode) =>
        set((s) => {
          const next = { ...s.sessions };
          delete next[roomCode];
          return { sessions: next };
        }),

      setCurrentRoom: (code) => set({ currentRoomCode: code }),
    }),
    {
      name: STORAGE_KEYS.sessions,
      storage: {
        getItem: (name) =>
          new Promise((resolve) => {
            chrome.storage.local.get([name], (result) => {
              resolve(result[name] ? JSON.parse(result[name] as string) : null);
            });
          }),
        setItem: (name, value) =>
          new Promise<void>((resolve) => {
            chrome.storage.local.set({ [name]: JSON.stringify(value) }, resolve);
          }),
        removeItem: (name) =>
          new Promise<void>((resolve) => {
            chrome.storage.local.remove([name], resolve);
          }),
      },
    }
  )
);
