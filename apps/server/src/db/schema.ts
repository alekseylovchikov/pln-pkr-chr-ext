import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const rooms = sqliteTable('rooms', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  adminId: text('admin_id').notNull(),
  adminTokenHash: text('admin_token_hash').notNull(),
  cardSetId: text('card_set_id').notNull(),
  customCardSet: text('custom_card_set'), // JSON blob for custom sets
  status: text('status').notNull().default('waiting'), // waiting | voting | revealed
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const roomMembers = sqliteTable('room_members', {
  id: text('id').primaryKey(),
  roomId: text('room_id')
    .notNull()
    .references(() => rooms.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  userName: text('user_name').notNull(),
  sessionTokenHash: text('session_token_hash').notNull(),
  role: text('role').notNull().default('participant'), // admin | participant | observer
  isConnected: integer('is_connected', { mode: 'boolean' }).notNull().default(false),
  joinedAt: integer('joined_at', { mode: 'timestamp' }).notNull(),
});

export const rounds = sqliteTable('rounds', {
  id: text('id').primaryKey(),
  roomId: text('room_id')
    .notNull()
    .references(() => rooms.id, { onDelete: 'cascade' }),
  story: text('story').notNull().default(''),
  status: text('status').notNull().default('voting'), // voting | revealed
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  revealedAt: integer('revealed_at', { mode: 'timestamp' }),
});

export const votes = sqliteTable('votes', {
  id: text('id').primaryKey(),
  roundId: text('round_id')
    .notNull()
    .references(() => rounds.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  userName: text('user_name').notNull(),
  value: text('value').notNull(),
  submittedAt: integer('submitted_at', { mode: 'timestamp' }).notNull(),
});

// Tracks active WS connections for reconnect handling
export const sessions = sqliteTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: text('user_id').notNull(),
  roomId: text('room_id').notNull(),
  lastSeenAt: integer('last_seen_at', { mode: 'timestamp' }).notNull(),
});

export type DbRoom = typeof rooms.$inferSelect;
export type DbRoomMember = typeof roomMembers.$inferSelect;
export type DbRound = typeof rounds.$inferSelect;
export type DbVote = typeof votes.$inferSelect;
export type DbSession = typeof sessions.$inferSelect;
