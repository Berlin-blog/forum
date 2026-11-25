import { and, eq, gte, inArray, isNotNull, sql } from 'drizzle-orm';
import { db } from '../db/client';
import {
  achievements,
  checkins,
  notifications,
  posts,
  reactions,
  threads,
  titles,
  userAchievements,
  userFollows,
  userTitles,
  users,
  xpEvents,
} from '../db/schema';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const LEVEL_THRESHOLDS = [
  0, 10, 110, 310, 660, 1160, 1810, 2610, 3560, 4660,
  5910, 7310, 8860, 10560, 12410, 14410, 16560, 18860, 21310, 23910,
];

export const XP_RULES = {
  thread: { amount: 5, dailyCap: 15 },
  reply: { amount: 3, dailyCap: 15 },
  received_reply: { amount: 2, dailyCap: 10 },
  checkin: { amount: 5, dailyCap: 5 },
} as const;

export type XpSource = keyof typeof XP_RULES;

export function levelForExp(exp: number) {
  let level = 1;
  for (let index = 0; index < LEVEL_THRESHOLDS.length; index += 1) {
    if (exp >= LEVEL_THRESHOLDS[index]) level = index + 1;
  }
  return Math.min(level, 20);
}

export function progressForExp(exp: number) {
  const level = levelForExp(exp);
  const floor = LEVEL_THRESHOLDS[level - 1];
  const next = LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const need = Math.max(1, next - floor);
  const current = Math.max(0, exp - floor);
  return {
    level,
    exp,
    levelFloor: floor,
    nextLevelExp: next,
    currentLevelExp: current,
    levelNeed: need,
    percent: level >= 20 ? 100 : Math.min(100, Math.round((current / need) * 100)),
  };
}

function startOfUtcDay() {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  return now;
}

async function insertIgnoreTitles(tx: Tx, userId: number, level: number) {
  const available = await tx
    .select({ id: titles.id })
    .from(titles)
    .where(sql`${titles.minLevel} <= ${level}`);

  if (!available.length) return;
  const now = new Date();
  const values = available.map((title) => `(${userId}, ${title.id}, '${now.toISOString().slice(0, 19).replace('T', ' ')}')`);
  await tx.execute(sql.raw(`INSERT IGNORE INTO user_titles (user_id, title_id, acquired_at) VALUES ${values.join(', ')}`));
}

async function insertIgnoreAchievements(tx: Tx, userId: number, unlocked: number[]) {
  if (!unlocked.length) return;
  const now = new Date();
  const stamp = now.toISOString().slice(0, 19).replace('T', ' ');
  const values = unlocked.map((id) => `(${userId}, ${id}, '${stamp}')`);
  await tx.execute(sql.raw(`INSERT IGNORE INTO user_achievements (user_id, achievement_id, unlocked_at) VALUES ${values.join(', ')}`));
}

export async function syncAchievements(tx: Tx, userId: number, level: number) {
  const userPostIds = tx.select({ id: posts.id }).from(posts).where(eq(posts.authorId, userId));

  const [[threadCount], [replyCount], [followerCount], [checkinCount], [likeCount]] = await Promise.all([
    tx.select({ value: sql<number>`count(*)` }).from(threads).where(eq(threads.authorId, userId)),
    tx.select({ value: sql<number>`count(*)` }).from(posts).where(and(eq(posts.authorId, userId), isNotNull(posts.parentId))),
    tx.select({ value: sql<number>`count(*)` }).from(userFollows).where(eq(userFollows.followeeId, userId)),
    tx.select({ value: sql<number>`count(*)` }).from(checkins).where(eq(checkins.userId, userId)),
    tx.select({ value: sql<number>`count(*)` }).from(reactions).where(and(
      eq(reactions.targetType, 'post'),
      inArray(reactions.targetId, userPostIds),
    )),
  ]);

  const metrics: Record<string, number> = {
    threads: Number(threadCount?.value ?? 0),
    replies: Number(replyCount?.value ?? 0),
    followers: Number(followerCount?.value ?? 0),
    checkins: Number(checkinCount?.value ?? 0),
    level,
    likes_received: Number(likeCount?.value ?? 0),
  };

  const all = await tx.select({ id: achievements.id, conditionType: achievements.conditionType, threshold: achievements.threshold })
    .from(achievements);
  const unlocked = all
    .filter((item) => (metrics[item.conditionType] ?? 0) >= item.threshold)
    .map((item) => item.id);

  await insertIgnoreAchievements(tx, userId, unlocked);
  return unlocked;
}

export async function awardXp(tx: Tx, userId: number, source: XpSource) {
  const rule = XP_RULES[source];
  const start = startOfUtcDay();
  const [used] = await tx
    .select({ value: sql<number>`coalesce(sum(${xpEvents.amount}), 0)` })
    .from(xpEvents)
    .where(and(
      eq(xpEvents.userId, userId),
      eq(xpEvents.source, source),
      gte(xpEvents.createdAt, start),
    ));

  const amount = Math.max(0, Math.min(rule.amount, rule.dailyCap - Number(used?.value ?? 0)));
  const [current] = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!current) return null;

  if (amount <= 0) {
    return { awarded: 0, ...progressForExp(current.exp), levelUp: false };
  }

  await tx.insert(xpEvents).values([{
    userId,
    source,
    amount,
    createdAt: new Date(),
  }]);

  const newExp = current.exp + amount;
  const oldLevel = current.level;
  const newLevel = levelForExp(newExp);

  await tx.update(users).set({ exp: newExp, level: newLevel }).where(eq(users.id, userId));
  await insertIgnoreTitles(tx, userId, newLevel);
  await syncAchievements(tx, userId, newLevel);

  if (newLevel > oldLevel) {
    await tx.insert(notifications).values([{
      userId,
      notificationType: 'system',
      actorId: null,
      threadId: null,
      postId: null,
      payload: { kind: 'level', level: newLevel },
      createdAt: new Date(),
    }]);
  }

  return {
    awarded: amount,
    ...progressForExp(newExp),
    levelUp: newLevel > oldLevel,
  };
}

export async function initializeProgress(tx: Tx, userId: number) {
  await insertIgnoreTitles(tx, userId, 1);
  await syncAchievements(tx, userId, 1);
}

export async function checkinToday(tx: Tx, userId: number) {
  const day = new Date().toISOString().slice(0, 10);
  const [existing] = await tx
    .select({ userId: checkins.userId })
    .from(checkins)
    .where(and(eq(checkins.userId, userId), eq(checkins.checkinDate, day)))
    .limit(1);

  if (existing) return false;

  await tx.insert(checkins).values([{
    userId,
    checkinDate: day,
    createdAt: new Date(),
  }]);

  return true;
}
