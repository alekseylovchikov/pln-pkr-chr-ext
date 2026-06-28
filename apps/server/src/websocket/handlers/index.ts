import type { WebSocket } from 'ws';
import type { ClientMessage, ClientEventType } from '@planning-poker/shared-types';
import { connectionManager, type Connection } from '../connection-manager';
import * as roomRepo from '../../db/repositories/room.repository';
import * as voteRepo from '../../db/repositories/vote.repository';
import * as userRepo from '../../db/repositories/user.repository';
import { getBuiltInCardSet } from '@planning-poker/shared-types';

function err(ws: WebSocket, code: string, message: string) {
  connectionManager.send(ws, 'error', { code, message });
}

async function broadcastRoomState(roomId: string) {
  const room = await roomRepo.getRoomById(roomId);
  if (!room) return;
  connectionManager.broadcastToAll(roomId, 'room_state', { room });
}

export async function handleMessage(ws: WebSocket, raw: string): Promise<void> {
  let msg: ClientMessage;
  try {
    msg = JSON.parse(raw) as ClientMessage;
  } catch {
    err(ws, 'INVALID_JSON', 'Message must be valid JSON');
    return;
  }

  const { event, payload } = msg;

  // ── ping ─────────────────────────────────────────────────────────────────
  if (event === 'ping') {
    connectionManager.send(ws, 'pong', {});
    return;
  }

  // ── join_room ─────────────────────────────────────────────────────────────
  if (event === 'join_room') {
    const p = payload as Parameters<typeof handleJoinRoom>[1];
    await handleJoinRoom(ws, p);
    return;
  }

  // For all other events, connection must be established
  const conn = connectionManager.get(ws);
  if (!conn) {
    err(ws, 'NOT_IN_ROOM', 'Join a room first');
    return;
  }

  switch (event as ClientEventType) {
    case 'leave_room':
      await handleLeaveRoom(ws, conn);
      break;

    case 'submit_vote': {
      const p = payload as { cardValue: string };
      await handleSubmitVote(ws, conn, p.cardValue);
      break;
    }

    case 'reveal_votes': {
      const p = payload as { adminToken: string };
      await handleAdminAction(ws, conn, p.adminToken, async () => {
        const roundId = await voteRepo.getCurrentRoundId(conn.roomId);
        if (!roundId) return err(ws, 'NO_ROUND', 'No active round');
        const votes = await voteRepo.revealRound(roundId);
        await roomRepo.updateRoomStatus(conn.roomId, 'revealed');
        connectionManager.broadcastToAll(conn.roomId, 'votes_revealed', { votes, roundId });
        await broadcastRoomState(conn.roomId);
      });
      break;
    }

    case 'reset_round': {
      const p = payload as { adminToken: string };
      await handleAdminAction(ws, conn, p.adminToken, async () => {
        const roundId = await voteRepo.getCurrentRoundId(conn.roomId);
        if (roundId) await voteRepo.deleteVotesForRound(roundId);
        await roomRepo.updateRoomStatus(conn.roomId, 'waiting');
        connectionManager.broadcastToAll(conn.roomId, 'round_reset', { roundId: null });
        await broadcastRoomState(conn.roomId);
      });
      break;
    }

    case 'start_round': {
      const p = payload as { adminToken: string; story: string };
      await handleAdminAction(ws, conn, p.adminToken, async () => {
        const roundId = await voteRepo.createRound(conn.roomId, p.story || '');
        await roomRepo.updateRoomStatus(conn.roomId, 'voting');
        connectionManager.broadcastToAll(conn.roomId, 'round_started', {
          story: p.story || '',
          roundId,
          startedAt: new Date().toISOString(),
        });
        await broadcastRoomState(conn.roomId);
      });
      break;
    }

    case 'kick_user': {
      const p = payload as { adminToken: string; userId: string };
      await handleAdminAction(ws, conn, p.adminToken, async () => {
        if (p.userId === conn.userId) return err(ws, 'CANNOT_KICK_SELF', 'Cannot kick yourself');
        await roomRepo.removeMember(conn.roomId, p.userId);
        // Disconnect the kicked user
        const kickedConns = connectionManager
          .getRoomConnections(conn.roomId)
          .filter((c) => c.userId === p.userId);
        for (const kc of kickedConns) {
          connectionManager.send(kc.ws, 'user_kicked', {
            userId: p.userId,
            reason: 'Kicked by admin',
          });
          kc.ws.close(1000, 'kicked');
        }
        connectionManager.broadcastToAll(conn.roomId, 'user_kicked', {
          userId: p.userId,
          reason: 'Kicked by admin',
        });
        await broadcastRoomState(conn.roomId);
      });
      break;
    }

    case 'update_story': {
      const p = payload as { adminToken: string; story: string };
      await handleAdminAction(ws, conn, p.adminToken, async () => {
        const roundId = await voteRepo.getCurrentRoundId(conn.roomId);
        if (roundId) await voteRepo.updateRoundStory(roundId, p.story);
        connectionManager.broadcastToAll(conn.roomId, 'story_updated', { story: p.story });
        await broadcastRoomState(conn.roomId);
      });
      break;
    }

    case 'update_card_set': {
      const p = payload as { adminToken: string; cardSetId?: string; customCardSet?: object };
      await handleAdminAction(ws, conn, p.adminToken, async () => {
        let cardSet;
        if (p.cardSetId) {
          cardSet = getBuiltInCardSet(p.cardSetId);
          if (!cardSet) return err(ws, 'INVALID_CARD_SET', 'Unknown card set');
          await roomRepo.updateRoomCardSet(conn.roomId, p.cardSetId);
        } else if (p.customCardSet) {
          const custom = p.customCardSet as { name: string; cards: object[] };
          const cardSetData = {
            id: 'custom',
            name: custom.name || 'Custom',
            cards: custom.cards as NonNullable<ReturnType<typeof getBuiltInCardSet>>['cards'],
            isCustom: true,
          };
          await roomRepo.updateRoomCardSet(conn.roomId, 'custom', cardSetData);
          cardSet = cardSetData;
        } else {
          return err(ws, 'INVALID_PAYLOAD', 'Provide cardSetId or customCardSet');
        }
        connectionManager.broadcastToAll(conn.roomId, 'card_set_updated', { cardSet });
        await broadcastRoomState(conn.roomId);
      });
      break;
    }

    default:
      err(ws, 'UNKNOWN_EVENT', `Unknown event: ${event}`);
  }
}

async function handleJoinRoom(
  ws: WebSocket,
  payload: {
    roomCode: string;
    userName: string;
    sessionToken?: string;
    role?: 'participant' | 'observer';
  }
) {
  const { roomCode, userName } = payload;

  if (!roomCode || !userName) {
    return err(ws, 'INVALID_PAYLOAD', 'roomCode and userName are required');
  }

  const room = await roomRepo.getRoomByCode(roomCode);
  if (!room) {
    return err(ws, 'ROOM_NOT_FOUND', `Room "${roomCode}" not found`);
  }

  // Determine userId: reuse from session or generate new
  let userId: string = crypto.randomUUID();
  let sessionToken: string = crypto.randomUUID();
  let role: 'admin' | 'participant' | 'observer' = payload.role ?? 'participant';

  if (payload.sessionToken) {
    const existing = await roomRepo.getMemberBySession(payload.sessionToken);
    if (existing && existing.roomId === room.id) {
      userId = existing.userId;
      await userRepo.touchSession(payload.sessionToken);
      sessionToken = payload.sessionToken;
      role = existing.role as typeof role;
    }
  }

  await userRepo.addMember(room.id, userId, userName, sessionToken, role);
  await roomRepo.setMemberConnected(room.id, userId, true);

  const updatedRoom = await roomRepo.getRoomById(room.id);
  if (!updatedRoom) return err(ws, 'INTERNAL', 'Failed to load room');

  connectionManager.add(ws, {
    ws,
    userId,
    userName,
    roomId: room.id,
    sessionToken,
    role,
  });

  connectionManager.send(ws, 'joined', {
    sessionToken,
    room: updatedRoom,
    userId,
  });

  connectionManager.broadcast(room.id, 'user_joined', {
    member: updatedRoom.members.find((m) => m.userId === userId)!,
  }, ws);

  await broadcastRoomState(room.id);
}

async function handleLeaveRoom(ws: WebSocket, conn: Connection) {
  await roomRepo.setMemberConnected(conn.roomId, conn.userId, false);
  connectionManager.remove(ws);
  connectionManager.broadcastToAll(conn.roomId, 'user_left', { userId: conn.userId });
  await broadcastRoomState(conn.roomId);
}

async function handleSubmitVote(ws: WebSocket, conn: Connection, cardValue: string) {
  if (conn.role === 'observer') return err(ws, 'OBSERVER', 'Observers cannot vote');

  const roundId = await voteRepo.getCurrentRoundId(conn.roomId);
  if (!roundId) return err(ws, 'NO_ROUND', 'No active round');

  const room = await roomRepo.getRoomById(conn.roomId);
  if (!room || room.status !== 'voting') return err(ws, 'NOT_VOTING', 'Room is not in voting state');

  const validValues = room.cardSet.cards.map((c) => c.value);
  if (!validValues.includes(cardValue)) return err(ws, 'INVALID_CARD', 'Invalid card value');

  await voteRepo.submitVote(roundId, conn.userId, conn.userName, cardValue);

  connectionManager.broadcastToAll(conn.roomId, 'vote_submitted', {
    userId: conn.userId,
    userName: conn.userName,
    hasVoted: true,
  });
}

async function handleAdminAction(
  ws: WebSocket,
  conn: Connection,
  adminToken: string,
  action: () => Promise<void>
): Promise<void> {
  if (conn.role !== 'admin') {
    return err(ws, 'FORBIDDEN', 'Admin only');
  }
  const valid = await userRepo.verifyAdminToken(conn.roomId, adminToken);
  if (!valid) {
    return err(ws, 'INVALID_TOKEN', 'Invalid admin token');
  }
  await action();
}
