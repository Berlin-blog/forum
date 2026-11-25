import {
  bigint,
  boolean,
  char,
  date,
  datetime,
  index,
  int,
  json,
  mediumtext,
  mysqlTable,
  text,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  username: varchar('username', { length: 32 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 64 }).notNull(),
  avatarUrl: varchar('avatar_url', { length: 512 }),
  bio: varchar('bio', { length: 500 }).notNull().default(''),
  userRole: varchar('user_role', { length: 16 }).notNull().default('member'),
  status: varchar('status', { length: 16 }).notNull().default('active'),
  level: int('level').notNull().default(1),
  exp: int('exp').notNull().default(0),
  equippedTitleId: int('equipped_title_id', { unsigned: true }),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull(),
  lastSeenAt: datetime('last_seen_at', { mode: 'date', fsp: 3 }),
}, (table) => [
  uniqueIndex('uk_users_username').on(table.username),
  index('idx_users_status').on(table.status),
]);

export const sessions = mysqlTable('sessions', {
  id: char('id', { length: 36 }).primaryKey(),
  userId: bigint('user_id', { mode: 'number', unsigned: true }).notNull(),
  tokenHash: char('token_hash', { length: 64 }).notNull(),
  expiresAt: datetime('expires_at', { mode: 'date', fsp: 3 }).notNull(),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull(),
  revokedAt: datetime('revoked_at', { mode: 'date', fsp: 3 }),
}, (table) => [
  uniqueIndex('uk_sessions_token_hash').on(table.tokenHash),
  index('idx_sessions_user').on(table.userId, table.expiresAt),
]);

export const categories = mysqlTable('categories', {
  id: int('id', { unsigned: true }).autoincrement().primaryKey(),
  slug: varchar('slug', { length: 64 }).notNull(),
  name: varchar('name', { length: 64 }).notNull(),
  sortOrder: int('sort_order').notNull().default(0),
}, (table) => [
  uniqueIndex('uk_categories_slug').on(table.slug),
]);

export const bars = mysqlTable('bars', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  categoryId: int('category_id', { unsigned: true }).notNull(),
  slug: varchar('slug', { length: 64 }).notNull(),
  name: varchar('name', { length: 64 }).notNull(),
  description: varchar('description', { length: 500 }).notNull().default(''),
  rules: text('rules'),
  avatarUrl: varchar('avatar_url', { length: 512 }),
  status: varchar('status', { length: 16 }).notNull().default('active'),
  sortOrder: int('sort_order').notNull().default(0),
  threadCount: int('thread_count', { unsigned: true }).notNull().default(0),
  postCount: int('post_count', { unsigned: true }).notNull().default(0),
  memberCount: int('member_count', { unsigned: true }).notNull().default(0),
  lastThreadId: bigint('last_thread_id', { mode: 'number', unsigned: true }),
  createdBy: bigint('created_by', { mode: 'number', unsigned: true }),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull(),
}, (table) => [
  uniqueIndex('uk_bars_slug').on(table.slug),
  index('idx_bars_category').on(table.categoryId, table.sortOrder),
  index('idx_bars_status').on(table.status, table.memberCount),
]);

export const threads = mysqlTable('threads', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  barId: bigint('bar_id', { mode: 'number', unsigned: true }).notNull(),
  authorId: bigint('author_id', { mode: 'number', unsigned: true }).notNull(),
  title: varchar('title', { length: 120 }).notNull(),
  slug: varchar('slug', { length: 160 }).notNull(),
  status: varchar('status', { length: 16 }).notNull().default('open'),
  isPinned: boolean('is_pinned').notNull().default(false),
  isFeatured: boolean('is_featured').notNull().default(false),
  replyCount: int('reply_count', { unsigned: true }).notNull().default(0),
  viewCount: int('view_count', { unsigned: true }).notNull().default(0),
  lastPostAt: datetime('last_post_at', { mode: 'date', fsp: 3 }).notNull(),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull(),
  updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 }).notNull(),
  deletedAt: datetime('deleted_at', { mode: 'date', fsp: 3 }),
}, (table) => [
  uniqueIndex('uk_threads_bar_slug').on(table.barId, table.slug),
  index('idx_threads_bar_last').on(table.barId, table.status, table.isPinned, table.lastPostAt),
  index('idx_threads_bar_featured').on(table.barId, table.status, table.isFeatured, table.lastPostAt),
  index('idx_threads_author').on(table.authorId, table.createdAt),
]);

export const posts = mysqlTable('posts', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  threadId: bigint('thread_id', { mode: 'number', unsigned: true }).notNull(),
  authorId: bigint('author_id', { mode: 'number', unsigned: true }).notNull(),
  parentId: bigint('parent_id', { mode: 'number', unsigned: true }),
  floor: int('floor', { unsigned: true }),
  contentMd: mediumtext('content_md').notNull(),
  contentHtml: mediumtext('content_html').notNull(),
  contentText: mediumtext('content_text').notNull(),
  status: varchar('status', { length: 16 }).notNull().default('visible'),
  childCount: int('child_count', { unsigned: true }).notNull().default(0),
  editedAt: datetime('edited_at', { mode: 'date', fsp: 3 }),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull(),
  deletedAt: datetime('deleted_at', { mode: 'date', fsp: 3 }),
}, (table) => [
  uniqueIndex('uk_posts_thread_floor').on(table.threadId, table.floor),
  index('idx_posts_thread_parent').on(table.threadId, table.parentId, table.createdAt),
  index('idx_posts_parent').on(table.parentId, table.createdAt),
  index('idx_posts_author').on(table.authorId, table.createdAt),
]);

export const reactions = mysqlTable('reactions', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  userId: bigint('user_id', { mode: 'number', unsigned: true }).notNull(),
  targetType: varchar('target_type', { length: 16 }).notNull(),
  targetId: bigint('target_id', { mode: 'number', unsigned: true }).notNull(),
  kind: varchar('kind', { length: 16 }).notNull().default('like'),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull(),
}, (table) => [
  uniqueIndex('uk_reactions_user_target').on(table.userId, table.targetType, table.targetId, table.kind),
  index('idx_reactions_target').on(table.targetType, table.targetId, table.kind),
]);

export const barMembers = mysqlTable('bar_members', {
  userId: bigint('user_id', { mode: 'number', unsigned: true }).notNull(),
  barId: bigint('bar_id', { mode: 'number', unsigned: true }).notNull(),
  joinedAt: datetime('joined_at', { mode: 'date', fsp: 3 }).notNull(),
}, (table) => [
  uniqueIndex('uk_bar_members').on(table.userId, table.barId),
  index('idx_bar_members_bar').on(table.barId, table.joinedAt),
]);

export const barModerators = mysqlTable('bar_moderators', {
  barId: bigint('bar_id', { mode: 'number', unsigned: true }).notNull(),
  userId: bigint('user_id', { mode: 'number', unsigned: true }).notNull(),
  modRole: varchar('mod_role', { length: 16 }).notNull().default('moderator'),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull(),
}, (table) => [
  uniqueIndex('uk_bar_moderators').on(table.barId, table.userId),
  index('idx_bar_moderators_user').on(table.userId),
]);

export const notifications = mysqlTable('notifications', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  userId: bigint('user_id', { mode: 'number', unsigned: true }).notNull(),
  notificationType: varchar('notification_type', { length: 16 }).notNull(),
  actorId: bigint('actor_id', { mode: 'number', unsigned: true }),
  threadId: bigint('thread_id', { mode: 'number', unsigned: true }),
  postId: bigint('post_id', { mode: 'number', unsigned: true }),
  payload: json('payload').$type<Record<string, unknown>>().notNull(),
  readAt: datetime('read_at', { mode: 'date', fsp: 3 }),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull(),
}, (table) => [
  index('idx_notifications_user').on(table.userId, table.readAt, table.createdAt),
  index('idx_notifications_thread').on(table.threadId),
]);

export const reports = mysqlTable('reports', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  reporterId: bigint('reporter_id', { mode: 'number', unsigned: true }).notNull(),
  targetType: varchar('target_type', { length: 16 }).notNull(),
  targetId: bigint('target_id', { mode: 'number', unsigned: true }).notNull(),
  reason: varchar('reason', { length: 16 }).notNull(),
  detail: varchar('detail', { length: 1000 }).notNull().default(''),
  reportStatus: varchar('report_status', { length: 16 }).notNull().default('open'),
  handledBy: bigint('handled_by', { mode: 'number', unsigned: true }),
  resolution: varchar('resolution', { length: 500 }),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull(),
  handledAt: datetime('handled_at', { mode: 'date', fsp: 3 }),
}, (table) => [
  index('idx_reports_status').on(table.reportStatus, table.createdAt),
  index('idx_reports_target').on(table.targetType, table.targetId),
]);

export const moderationActions = mysqlTable('moderation_actions', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  actorId: bigint('actor_id', { mode: 'number', unsigned: true }),
  barId: bigint('bar_id', { mode: 'number', unsigned: true }),
  actionType: varchar('action_type', { length: 32 }).notNull(),
  targetType: varchar('target_type', { length: 16 }).notNull(),
  targetId: bigint('target_id', { mode: 'number', unsigned: true }).notNull(),
  reason: varchar('reason', { length: 500 }).notNull().default(''),
  expiresAt: datetime('expires_at', { mode: 'date', fsp: 3 }),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull(),
}, (table) => [
  index('idx_moderation_target').on(table.targetType, table.targetId),
  index('idx_moderation_bar').on(table.barId, table.createdAt),
]);

export const xpEvents = mysqlTable('xp_events', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  userId: bigint('user_id', { mode: 'number', unsigned: true }).notNull(),
  source: varchar('source', { length: 24 }).notNull(),
  amount: int('amount').notNull(),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull(),
}, (table) => [
  index('idx_xp_user_source_time').on(table.userId, table.source, table.createdAt),
]);

export const checkins = mysqlTable('checkins', {
  userId: bigint('user_id', { mode: 'number', unsigned: true }).notNull(),
  checkinDate: date('checkin_date', { mode: 'string' }).notNull(),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull(),
}, (table) => [
  uniqueIndex('uk_checkins_user_date').on(table.userId, table.checkinDate),
  index('idx_checkins_date').on(table.checkinDate),
]);

export const userFollows = mysqlTable('user_follows', {
  followerId: bigint('follower_id', { mode: 'number', unsigned: true }).notNull(),
  followeeId: bigint('followee_id', { mode: 'number', unsigned: true }).notNull(),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull(),
}, (table) => [
  uniqueIndex('uk_user_follows').on(table.followerId, table.followeeId),
  index('idx_user_follows_followee').on(table.followeeId, table.createdAt),
]);

export const titles = mysqlTable('titles', {
  id: int('id', { unsigned: true }).autoincrement().primaryKey(),
  slug: varchar('slug', { length: 64 }).notNull(),
  name: varchar('name', { length: 32 }).notNull(),
  description: varchar('description', { length: 255 }).notNull().default(''),
  icon: varchar('icon', { length: 4 }).notNull().default('雅'),
  minLevel: int('min_level').notNull().default(1),
  sortOrder: int('sort_order').notNull().default(0),
}, (table) => [
  uniqueIndex('uk_titles_slug').on(table.slug),
]);

export const userTitles = mysqlTable('user_titles', {
  userId: bigint('user_id', { mode: 'number', unsigned: true }).notNull(),
  titleId: int('title_id', { unsigned: true }).notNull(),
  acquiredAt: datetime('acquired_at', { mode: 'date', fsp: 3 }).notNull(),
}, (table) => [
  uniqueIndex('uk_user_titles').on(table.userId, table.titleId),
]);

export const achievements = mysqlTable('achievements', {
  id: int('id', { unsigned: true }).autoincrement().primaryKey(),
  slug: varchar('slug', { length: 64 }).notNull(),
  name: varchar('name', { length: 32 }).notNull(),
  description: varchar('description', { length: 255 }).notNull().default(''),
  icon: varchar('icon', { length: 4 }).notNull().default('成'),
  conditionType: varchar('condition_type', { length: 32 }).notNull(),
  threshold: int('threshold').notNull(),
  sortOrder: int('sort_order').notNull().default(0),
}, (table) => [
  uniqueIndex('uk_achievements_slug').on(table.slug),
]);

export const userAchievements = mysqlTable('user_achievements', {
  userId: bigint('user_id', { mode: 'number', unsigned: true }).notNull(),
  achievementId: int('achievement_id', { unsigned: true }).notNull(),
  unlockedAt: datetime('unlocked_at', { mode: 'date', fsp: 3 }).notNull(),
}, (table) => [
  uniqueIndex('uk_user_achievements').on(table.userId, table.achievementId),
]);

export type User = typeof users.$inferSelect;
export type Bar = typeof bars.$inferSelect;
export type Thread = typeof threads.$inferSelect;
export type Post = typeof posts.$inferSelect;
