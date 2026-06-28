import { eq, and, desc } from 'drizzle-orm';
import { getDb } from '../index';
import { votes, rounds } from '../schema';
import type { Vote } from '@planning-poker/shared-types';

export async function submitVote(
  roundId: string,
  userId: string,
  userName: string,
  value: string
): Promise<void> {
  const db = getDb();
  const existing = db
    .select()
    .from(votes)
    .where(and(eq(votes.roundId, roundId), eq(votes.userId, userId)))
    .get();

  if (existing) {
    db.update(votes)
      .set({ value, submittedAt: new Date() })
      .where(eq(votes.id, existing.id))
      .run();
  } else {
    db.insert(votes)
      .values({
        id: crypto.randomUUID(),
        roundId,
        userId,
        userName,
        value,
        submittedAt: new Date(),
      })
      .run();
  }
}

export async function getVotesForRound(roundId: string): Promise<Vote[]> {
  const db = getDb();
  const rows = db.select().from(votes).where(eq(votes.roundId, roundId)).all();
  return rows.map((v) => ({
    userId: v.userId,
    userName: v.userName,
    value: v.value,
    submittedAt: new Date(v.submittedAt).toISOString(),
  }));
}

export async function getCurrentRoundId(roomId: string): Promise<string | null> {
  const db = getDb();
  const round = db
    .select({ id: rounds.id })
    .from(rounds)
    .where(eq(rounds.roomId, roomId))
    .orderBy(desc(rounds.startedAt))
    .get();
  return round?.id ?? null;
}

export async function createRound(roomId: string, story: string): Promise<string> {
  const db = getDb();
  const id = crypto.randomUUID();
  db.insert(rounds)
    .values({ id, roomId, story, status: 'voting', startedAt: new Date() })
    .run();
  return id;
}

export async function revealRound(roundId: string): Promise<Vote[]> {
  const db = getDb();
  db.update(rounds)
    .set({ status: 'revealed', revealedAt: new Date() })
    .where(eq(rounds.id, roundId))
    .run();
  return getVotesForRound(roundId);
}

export async function deleteVotesForRound(roundId: string): Promise<void> {
  const db = getDb();
  db.delete(votes).where(eq(votes.roundId, roundId)).run();
}

export async function updateRoundStory(roundId: string, story: string): Promise<void> {
  const db = getDb();
  db.update(rounds).set({ story }).where(eq(rounds.id, roundId)).run();
}
