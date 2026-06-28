import { eq, and } from 'drizzle-orm';
import { getDb } from '../index';
import { roomMembers, rooms, sessions } from '../schema';
import { createHash } from 'crypto';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface CreateRoomInput {
  roomId: string;
  roomCode: string;
  roomName: string;
  adminId: string;
  adminToken: string;
  cardSetId: string;
}

export async function createRoom(input: CreateRoomInput): Promise<void> {
  const db = getDb();
  db.insert(rooms)
    .values({
      id: input.roomId,
      code: input.roomCode,
      name: input.roomName,
      adminId: input.adminId,
      adminTokenHash: hashToken(input.adminToken),
      cardSetId: input.cardSetId,
      status: 'waiting',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .run();
}

export async function addMember(
  roomId: string,
  userId: string,
  userName: string,
  sessionToken: string,
  role: 'admin' | 'participant' | 'observer'
): Promise<void> {
  const db = getDb();

  const existing = db
    .select()
    .from(roomMembers)
    .where(and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, userId)))
    .get();

  if (existing) {
    db.update(roomMembers)
      .set({ sessionTokenHash: hashToken(sessionToken), isConnected: true })
      .where(eq(roomMembers.id, existing.id))
      .run();
  } else {
    db.insert(roomMembers)
      .values({
        id: crypto.randomUUID(),
        roomId,
        userId,
        userName,
        sessionTokenHash: hashToken(sessionToken),
        role,
        isConnected: true,
        joinedAt: new Date(),
      })
      .run();
  }

  db.insert(sessions)
    .values({ sessionToken, userId, roomId, lastSeenAt: new Date() })
    .onConflictDoUpdate({
      target: sessions.sessionToken,
      set: { lastSeenAt: new Date() },
    })
    .run();
}

export async function verifyAdminToken(roomId: string, adminToken: string): Promise<boolean> {
  const db = getDb();
  const room = db.select().from(rooms).where(eq(rooms.id, roomId)).get();
  if (!room) return false;
  return room.adminTokenHash === hashToken(adminToken);
}

export async function touchSession(sessionToken: string): Promise<void> {
  const db = getDb();
  db.update(sessions)
    .set({ lastSeenAt: new Date() })
    .where(eq(sessions.sessionToken, sessionToken))
    .run();
}

export async function deleteSession(sessionToken: string): Promise<void> {
  const db = getDb();
  db.delete(sessions).where(eq(sessions.sessionToken, sessionToken)).run();
}
