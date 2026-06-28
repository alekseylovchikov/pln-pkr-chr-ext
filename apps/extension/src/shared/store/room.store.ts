import { create } from 'zustand';
import type { Room, RoomMember, Vote } from '@planning-poker/shared-types';
import type { WsStatus } from '../ws/websocket-client';

export type AppView =
  | 'home'
  | 'create-room'
  | 'join-room'
  | 'room'
  | 'error';

interface RoomState {
  view: AppView;
  room: Room | null;
  userId: string | null;
  myVote: string | null;
  wsStatus: WsStatus;
  error: string | null;

  // Optimistic: local "has voted" flag before server confirms
  hasVotedOptimistic: boolean;

  setView: (view: AppView) => void;
  setRoom: (room: Room) => void;
  setUserId: (id: string) => void;
  setMyVote: (value: string | null) => void;
  setWsStatus: (status: WsStatus) => void;
  setError: (error: string | null) => void;
  markMemberVoted: (userId: string) => void;
  revealVotes: (votes: Vote[]) => void;
  resetRound: () => void;
  updateMemberConnection: (userId: string, connected: boolean) => void;
  removeMember: (userId: string) => void;
  addMember: (member: RoomMember) => void;
  leaveRoom: () => void;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  view: 'home',
  room: null,
  userId: null,
  myVote: null,
  wsStatus: 'disconnected',
  error: null,
  hasVotedOptimistic: false,

  setView: (view) => set({ view }),
  setRoom: (room) => set({ room }),
  setUserId: (userId) => set({ userId }),
  setMyVote: (myVote) => set({ myVote, hasVotedOptimistic: myVote !== null }),
  setWsStatus: (wsStatus) => set({ wsStatus }),
  setError: (error) => set({ error, view: error ? 'error' : get().view }),

  markMemberVoted: (userId) =>
    set((s) => {
      if (!s.room) return {};
      return {
        room: {
          ...s.room,
          members: s.room.members.map((m) =>
            m.userId === userId ? { ...m, hasVoted: true } : m
          ),
        },
      };
    }),

  revealVotes: (votes) =>
    set((s) => {
      if (!s.room?.currentRound) return {};
      return {
        room: {
          ...s.room,
          status: 'revealed' as const,
          currentRound: {
            ...s.room.currentRound,
            status: 'revealed' as const,
            votes,
          },
        },
      };
    }),

  resetRound: () =>
    set((s) => {
      if (!s.room) return {};
      return {
        myVote: null,
        hasVotedOptimistic: false,
        room: {
          ...s.room,
          status: 'waiting' as const,
          currentRound: null,
          members: s.room.members.map((m) => ({ ...m, hasVoted: false })),
        },
      };
    }),

  updateMemberConnection: (userId, connected) =>
    set((s) => {
      if (!s.room) return {};
      return {
        room: {
          ...s.room,
          members: s.room.members.map((m) =>
            m.userId === userId ? { ...m, isConnected: connected } : m
          ),
        },
      };
    }),

  removeMember: (userId) =>
    set((s) => {
      if (!s.room) return {};
      return {
        room: {
          ...s.room,
          members: s.room.members.filter((m) => m.userId !== userId),
        },
      };
    }),

  addMember: (member) =>
    set((s) => {
      if (!s.room) return {};
      const exists = s.room.members.find((m) => m.userId === member.userId);
      return {
        room: {
          ...s.room,
          members: exists
            ? s.room.members.map((m) => (m.userId === member.userId ? member : m))
            : [...s.room.members, member],
        },
      };
    }),

  leaveRoom: () =>
    set({
      room: null,
      userId: null,
      myVote: null,
      hasVotedOptimistic: false,
      view: 'home',
      error: null,
    }),
}));
