import { eq, and, desc } from 'drizzle-orm';
import { getDb } from '../index';
import { rooms, roomMembers, rounds, votes, sessions } from '../schema';
import type { CardSet, Room, RoomMember, Round, Vote } from '@planning-poker/shared-types';
import { BUILT_IN_CARD_SETS } from '@planning-poker/shared-types';

function resolveCardSet(cardSetId: string, customBlob: string | null): CardSet {
  if (cardSetId === 'custom' && customBlob) return JSON.parse(customBlob) as CardSet;
  return BUILT_IN_CARD_SETS.find((s) => s.id === cardSetId) ?? BUILT_IN_CARD_SETS[0];
}

export async function getRoomByCode(code: string): Promise<Room | null> {
  const db = getDb();
  const row = db.select().from(rooms).where(eq(rooms.code, code.toUpperCase())).get();
  if (!row) return null;
  return hydrateRoom(row.id);
}

export async function getRoomById(id: string): Promise<Room | null> {
  return hydrateRoom(id);
}

async function hydrateRoom(roomId: string): Promise<Room | null> {
  const db = getDb();

  const room = db.select().from(rooms).where(eq(rooms.id, roomId)).get();
  if (!room) return null;

  const members = db.select().from(roomMembers).where(eq(roomMembers.roomId, roomId)).all();

  const latestRound = db
    .select()
    .from(rounds)
    .where(eq(rounds.roomId, roomId))
    .orderBy(desc(rounds.startedAt))
    .get();

  let currentRound: Round | null = null;
  let votedUserIds = new Set<string>();

  if (latestRound) {
    const roundVotes = db.select().from(votes).where(eq(votes.roundId, latestRound.id)).all();
    votedUserIds = new Set(roundVotes.map((v) => v.userId));

    currentRound = {
      id: latestRound.id,
      story: latestRound.story,
      status: latestRound.status as Round['status'],
      votes:
        latestRound.status === 'revealed'
          ? roundVotes.map((v) => ({
              userId: v.userId,
              userName: v.userName,
              value: v.value,
              submittedAt: new Date(v.submittedAt).toISOString(),
            }))
          : [],
      startedAt: new Date(latestRound.startedAt).toISOString(),
      revealedAt: latestRound.revealedAt ? new Date(latestRound.revealedAt).toISOString() : null,
    };
  }

  const cardSet = resolveCardSet(room.cardSetId, room.customCardSet ?? null);

  return {
    id: room.id,
    code: room.code,
    name: room.name,
    adminId: room.adminId,
    cardSet,
    currentRound,
    status: room.status as Room['status'],
    createdAt: new Date(room.createdAt).toISOString(),
    members: members.map((m) => ({
      userId: m.userId,
      userName: m.userName,
      role: m.role as RoomMember['role'],
      isConnected: Boolean(m.isConnected),
      hasVoted: currentRound?.status === 'voting' ? votedUserIds.has(m.userId) : false,
      joinedAt: new Date(m.joinedAt).toISOString(),
    })),
  };
}

export async function setMemberConnected(
  roomId: string,
  userId: string,
  connected: boolean
): Promise<void> {
  const db = getDb();
  db.update(roomMembers)
    .set({ isConnected: connected })
    .where(and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, userId)))
    .run();
}

export async function updateRoomStatus(roomId: string, status: Room['status']): Promise<void> {
  const db = getDb();
  db.update(rooms)
    .set({ status, updatedAt: new Date() })
    .where(eq(rooms.id, roomId))
    .run();
}

export async function updateRoomCardSet(
  roomId: string,
  cardSetId: string,
  customCardSet?: CardSet
): Promise<void> {
  const db = getDb();
  db.update(rooms)
    .set({
      cardSetId,
      customCardSet: customCardSet ? JSON.stringify(customCardSet) : null,
      updatedAt: new Date(),
    })
    .where(eq(rooms.id, roomId))
    .run();
}

export async function removeMember(roomId: string, userId: string): Promise<void> {
  const db = getDb();
  db.delete(roomMembers)
    .where(and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, userId)))
    .run();
}

export async function getMemberBySession(sessionToken: string): Promise<{
  userId: string;
  roomId: string;
  userName: string;
  role: string;
} | null> {
  const db = getDb();
  const session = db
    .select()
    .from(sessions)
    .where(eq(sessions.sessionToken, sessionToken))
    .get();
  if (!session) return null;

  const member = db
    .select()
    .from(roomMembers)
    .where(
      and(eq(roomMembers.roomId, session.roomId), eq(roomMembers.userId, session.userId))
    )
    .get();
  if (!member) return null;

  return {
    userId: member.userId,
    roomId: member.roomId,
    userName: member.userName,
    role: member.role,
  };
}
