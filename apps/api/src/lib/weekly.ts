import { and, desc, eq, gte, inArray, lt, ne, notInArray, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { titles, userTitles, users, weeklySettlements, xpEvents } from '../db/schema';

export const EXCLUDED_LEADERBOARD_USERNAMES = ['demo', 'admin', 'hotbot'];

export function leaderboardEligibility() {
  return and(
    eq(users.status, 'active'),
    notInArray(users.username, EXCLUDED_LEADERBOARD_USERNAMES),
    ne(users.userRole, 'admin'),
    ne(users.userRole, 'bot'),
  );
}

export function currentWeekStart(now = new Date()) {
  const date = new Date(now);
  date.setUTCHours(0, 0, 0, 0);
  const day = date.getUTCDay();
  const diff = (day + 6) % 7;
  date.setUTCDate(date.getUTCDate() - diff);
  return date;
}

export function weekKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function weeklyLeaderboard(limit = 10) {
  const start = currentWeekStart();
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      level: users.level,
      weeklyExp: sql<number>`coalesce(sum(${xpEvents.amount}), 0)`,
      titleName: sql<string | null>`max(${titles.name})`,
      titleIcon: sql<string | null>`max(${titles.icon})`,
    })
    .from(xpEvents)
    .innerJoin(users, eq(users.id, xpEvents.userId))
    .leftJoin(titles, eq(titles.id, users.equippedTitleId))
    .where(and(gte(xpEvents.createdAt, start), leaderboardEligibility()))
    .groupBy(users.id, users.username, users.displayName, users.avatarUrl, users.level)
    .orderBy(desc(sql`coalesce(sum(${xpEvents.amount}), 0)`), desc(users.level))
    .limit(limit);

  return rows.map((row, index) => ({ ...row, weeklyExp: Number(row.weeklyExp), rank: index + 1 }));
}

let settling = false;

export async function settlePreviousWeek(now = new Date()) {
  if (settling) return { settled: false, reason: 'running' };
  settling = true;
  try {
    const currentStart = currentWeekStart(now);
    const previousStart = new Date(currentStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const key = weekKey(previousStart);

    const [existing] = await db.select({ weekStart: weeklySettlements.weekStart })
      .from(weeklySettlements).where(eq(weeklySettlements.weekStart, key)).limit(1);
    if (existing) return { settled: false, reason: 'already-settled' };

    const rows = await db
      .select({
        userId: users.id,
        username: users.username,
        exp: sql<number>`coalesce(sum(${xpEvents.amount}), 0)`,
      })
      .from(xpEvents)
      .innerJoin(users, eq(users.id, xpEvents.userId))
      .where(and(
        gte(xpEvents.createdAt, previousStart),
        lt(xpEvents.createdAt, currentStart),
        leaderboardEligibility(),
      ))
      .groupBy(users.id, users.username)
      .orderBy(desc(sql`coalesce(sum(${xpEvents.amount}), 0)`))
      .limit(3);

    const winners = rows
      .map((row, index) => ({ userId: row.userId, rank: index + 1, exp: Number(row.exp) }))
      .filter((winner) => winner.exp > 0);

    const weeklyTitles = await db.select({ id: titles.id, slug: titles.slug }).from(titles)
      .where(eq(titles.conditionType, 'weekly_rank'));
    const bySlug = new Map(weeklyTitles.map((title) => [title.slug, title.id]));
    const weeklyTitleIds = weeklyTitles.map((title) => title.id);
    const titleForRank = [
      bySlug.get('weekly-champion'),
      bySlug.get('weekly-second'),
      bySlug.get('weekly-third'),
    ];

    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await db.transaction(async (tx) => {
      for (const winner of winners) {
        const titleId = titleForRank[winner.rank - 1];
        if (!titleId) continue;
        if (weeklyTitleIds.length) {
          await tx.delete(userTitles).where(and(
            eq(userTitles.userId, winner.userId),
            inArray(userTitles.titleId, weeklyTitleIds),
          ));
        }
        await tx.insert(userTitles).values([{
          userId: winner.userId,
          titleId,
          acquiredAt: now,
          expiresAt,
        }]);
      }

      await tx.insert(weeklySettlements).values([{
        weekStart: key,
        winners,
        settledAt: now,
      }]);
    });

    return { settled: true, weekStart: key, winners, expiresAt };
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === 'ER_DUP_ENTRY') return { settled: false, reason: 'already-settled' };
    console.warn('[weekly] settlement failed', error);
    return { settled: false, reason: 'error' };
  } finally {
    settling = false;
  }
}

export function startWeeklyScheduler() {
  const initial = setTimeout(() => { void settlePreviousWeek(); }, 20_000);
  initial.unref?.();
  const timer = setInterval(() => { void settlePreviousWeek(); }, 6 * 60 * 60 * 1000);
  timer.unref?.();
  console.info('[weekly] scheduler started: every 6h');
}
