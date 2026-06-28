import type { CardSet, Room, RoomMember, Vote } from './models';

// ─── Client → Server ─────────────────────────────────────────────────────────

export interface JoinRoomPayload {
  roomCode: string;
  userName: string;
  sessionToken?: string;
  role?: 'participant' | 'observer';
}

export interface SubmitVotePayload {
  cardValue: string;
}

export interface RevealVotesPayload {
  adminToken: string;
}

export interface ResetRoundPayload {
  adminToken: string;
}

export interface StartRoundPayload {
  adminToken: string;
  story: string;
}

export interface KickUserPayload {
  adminToken: string;
  userId: string;
}

export interface UpdateStoryPayload {
  adminToken: string;
  story: string;
}

export interface UpdateCardSetPayload {
  adminToken: string;
  cardSetId?: string;
  customCardSet?: Omit<CardSet, 'id'>;
}

export type ClientEventMap = {
  join_room: JoinRoomPayload;
  leave_room: Record<string, never>;
  submit_vote: SubmitVotePayload;
  reveal_votes: RevealVotesPayload;
  reset_round: ResetRoundPayload;
  start_round: StartRoundPayload;
  kick_user: KickUserPayload;
  update_story: UpdateStoryPayload;
  update_card_set: UpdateCardSetPayload;
  ping: Record<string, never>;
};

export type ClientEventType = keyof ClientEventMap;

export interface ClientMessage<T extends ClientEventType = ClientEventType> {
  event: T;
  payload: ClientEventMap[T];
}

// ─── Server → Client ─────────────────────────────────────────────────────────

export interface JoinedPayload {
  sessionToken: string;
  room: Room;
  userId: string;
}

export interface RoomStatePayload {
  room: Room;
}

export interface VoteSubmittedPayload {
  userId: string;
  userName: string;
  hasVoted: true;
}

export interface VotesRevealedPayload {
  votes: Vote[];
  roundId: string;
}

export interface RoundResetPayload {
  roundId: string | null;
}

export interface RoundStartedPayload {
  story: string;
  roundId: string;
  startedAt: string;
}

export interface UserJoinedPayload {
  member: RoomMember;
}

export interface UserLeftPayload {
  userId: string;
}

export interface UserKickedPayload {
  userId: string;
  reason: string;
}

export interface CardSetUpdatedPayload {
  cardSet: CardSet;
}

export interface StoryUpdatedPayload {
  story: string;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

export type ServerEventMap = {
  joined: JoinedPayload;
  room_state: RoomStatePayload;
  vote_submitted: VoteSubmittedPayload;
  votes_revealed: VotesRevealedPayload;
  round_reset: RoundResetPayload;
  round_started: RoundStartedPayload;
  user_joined: UserJoinedPayload;
  user_left: UserLeftPayload;
  user_kicked: UserKickedPayload;
  card_set_updated: CardSetUpdatedPayload;
  story_updated: StoryUpdatedPayload;
  error: ErrorPayload;
  pong: Record<string, never>;
};

export type ServerEventType = keyof ServerEventMap;

export interface ServerMessage<T extends ServerEventType = ServerEventType> {
  event: T;
  payload: ServerEventMap[T];
}
