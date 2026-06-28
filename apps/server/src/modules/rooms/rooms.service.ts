import { v4 as uuidv4 } from 'uuid';
import { nanoid } from 'nanoid';
import * as userRepo from '../../db/repositories/user.repository';
import * as roomRepo from '../../db/repositories/room.repository';
import type { Room } from '@planning-poker/shared-types';
import { DEFAULT_CARD_SET_ID, getBuiltInCardSet } from '@planning-poker/shared-types';

export interface CreateRoomResult {
  room: Room;
  adminToken: string;
  sessionToken: string;
  userId: string;
}

export async function createRoom(
  roomName: string,
  adminName: string,
  cardSetId: string = DEFAULT_CARD_SET_ID
): Promise<CreateRoomResult> {
  const cardSet = getBuiltInCardSet(cardSetId);
  if (!cardSet) throw new Error(`Unknown card set: ${cardSetId}`);

  const roomId = uuidv4();
  const roomCode = nanoid(6).toUpperCase();
  const adminId = uuidv4();
  const adminToken = uuidv4();
  const sessionToken = uuidv4();

  await userRepo.createRoom({
    roomId,
    roomCode,
    roomName,
    adminId,
    adminToken,
    cardSetId,
  });

  await userRepo.addMember(roomId, adminId, adminName, sessionToken, 'admin');

  const room = await roomRepo.getRoomById(roomId);
  if (!room) throw new Error('Failed to create room');

  return { room, adminToken, sessionToken, userId: adminId };
}

export async function getRoomByCode(code: string): Promise<Room | null> {
  return roomRepo.getRoomByCode(code);
}

export async function cleanupStaleRooms(ttlMinutes: number): Promise<void> {
  // Rooms with no connections and older than ttl are safe to remove
  // Simple cleanup — extend with actual DB query when needed
  if (ttlMinutes <= 0) return;
  // TODO: implement periodic cleanup
}
