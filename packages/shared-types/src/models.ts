export type UserRole = 'admin' | 'participant' | 'observer';
export type RoomStatus = 'waiting' | 'voting' | 'revealed';
export type RoundStatus = 'voting' | 'revealed';

export interface Card {
  value: string;
  label: string;
  isSpecial: boolean;
}

export interface CardSet {
  id: string;
  name: string;
  cards: Card[];
  isCustom: boolean;
}

export interface User {
  id: string;
  name: string;
}

export interface RoomMember {
  userId: string;
  userName: string;
  role: UserRole;
  isConnected: boolean;
  hasVoted: boolean;
  joinedAt: string;
}

export interface Vote {
  userId: string;
  userName: string;
  value: string;
  submittedAt: string;
}

export interface Round {
  id: string;
  story: string;
  status: RoundStatus;
  votes: Vote[];
  startedAt: string;
  revealedAt: string | null;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  adminId: string;
  cardSet: CardSet;
  currentRound: Round | null;
  members: RoomMember[];
  status: RoomStatus;
  createdAt: string;
}

export interface RoomStats {
  average: number | null;
  median: number | null;
  hasNumericVotes: boolean;
  voteCounts: Record<string, number>;
}

export function computeRoomStats(votes: Vote[]): RoomStats {
  const voteCounts: Record<string, number> = {};
  const numericValues: number[] = [];

  for (const vote of votes) {
    voteCounts[vote.value] = (voteCounts[vote.value] ?? 0) + 1;
    const n = parseFloat(vote.value);
    if (!isNaN(n)) numericValues.push(n);
  }

  const hasNumericVotes = numericValues.length > 0;
  numericValues.sort((a, b) => a - b);

  const average = hasNumericVotes
    ? Math.round((numericValues.reduce((s, v) => s + v, 0) / numericValues.length) * 10) / 10
    : null;

  let median: number | null = null;
  if (hasNumericVotes) {
    const mid = Math.floor(numericValues.length / 2);
    median =
      numericValues.length % 2 !== 0
        ? numericValues[mid]
        : (numericValues[mid - 1] + numericValues[mid]) / 2;
  }

  return { average, median, hasNumericVotes, voteCounts };
}
