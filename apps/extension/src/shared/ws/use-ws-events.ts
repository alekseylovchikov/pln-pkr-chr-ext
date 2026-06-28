import { useEffect } from 'react';
import { wsClient } from './websocket-client';
import { useRoomStore } from '../store/room.store';
import { useSessionStore } from '../store/session.store';
import type { ServerEventType, ServerEventMap } from '@planning-poker/shared-types';

export function useWsEvents() {
  const store = useRoomStore();
  const sessionStore = useSessionStore();

  useEffect(() => {
    const unsubs: Array<() => void> = [];

    unsubs.push(
      wsClient.on('joined', ({ room, userId, sessionToken }) => {
        store.setRoom(room);
        store.setUserId(userId);
        store.setView('room');

        const session = sessionStore.getSession(room.code);
        sessionStore.saveSession({
          ...(session ?? {}),
          sessionToken,
          userId,
          roomCode: room.code,
          roomName: room.name,
        });
        sessionStore.setCurrentRoom(room.code);
      })
    );

    unsubs.push(
      wsClient.on('room_state', ({ room }) => {
        store.setRoom(room);
        // Sync my vote from server state if round changed
        const myId = store.userId;
        if (myId && room.currentRound?.status === 'revealed') {
          const myServerVote = room.currentRound.votes.find((v) => v.userId === myId);
          if (myServerVote) store.setMyVote(myServerVote.value);
        }
        if (!room.currentRound) {
          store.setMyVote(null);
        }
      })
    );

    unsubs.push(
      wsClient.on('vote_submitted', ({ userId }) => {
        store.markMemberVoted(userId);
      })
    );

    unsubs.push(
      wsClient.on('votes_revealed', ({ votes }) => {
        store.revealVotes(votes);
        // Find my own vote
        const myId = store.userId;
        const myVote = votes.find((v) => v.userId === myId);
        if (myVote) store.setMyVote(myVote.value);
      })
    );

    unsubs.push(
      wsClient.on('round_reset', () => {
        store.resetRound();
      })
    );

    unsubs.push(
      wsClient.on('round_started', ({ story, roundId, startedAt }) => {
        const current = store.room;
        if (!current) return;
        store.setMyVote(null);
        store.setRoom({
          ...current,
          status: 'voting',
          currentRound: {
            id: roundId,
            story,
            status: 'voting',
            votes: [],
            startedAt,
            revealedAt: null,
          },
          members: current.members.map((m) => ({ ...m, hasVoted: false })),
        });
      })
    );

    unsubs.push(
      wsClient.on('user_joined', ({ member }) => {
        store.addMember(member);
      })
    );

    unsubs.push(
      wsClient.on('user_left', ({ userId }) => {
        store.updateMemberConnection(userId, false);
      })
    );

    unsubs.push(
      wsClient.on('user_kicked', ({ userId }) => {
        const myId = store.userId;
        if (userId === myId) {
          wsClient.disconnect();
          store.leaveRoom();
          store.setError('You were removed from the room by the admin.');
        } else {
          store.removeMember(userId);
        }
      })
    );

    unsubs.push(
      wsClient.on('card_set_updated', ({ cardSet }) => {
        if (store.room) {
          store.setRoom({ ...store.room, cardSet });
        }
      })
    );

    unsubs.push(
      wsClient.on('story_updated', ({ story }) => {
        if (store.room?.currentRound) {
          store.setRoom({
            ...store.room,
            currentRound: { ...store.room.currentRound, story },
          });
        }
      })
    );

    unsubs.push(
      wsClient.on('error', ({ code, message }) => {
        if (code === 'ROOM_NOT_FOUND' || code === 'INVALID_TOKEN') {
          store.setError(message);
        } else {
          console.warn('[WS Error]', code, message);
        }
      })
    );

    wsClient.setOptions({
      onStatusChange: (status) => {
        store.setWsStatus(status);
      },
    });

    return () => {
      unsubs.forEach((u) => u());
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
