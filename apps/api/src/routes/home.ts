import type { FastifyPluginAsync } from 'fastify';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { bars, categories, threads, titles, users } from '../db/schema';
import { optionalUser } from '../lib/guard';
import { leaderboardEligibility } from '../lib/weekly';
import { getDailyTasks, progressForExp } from '../lib/progression';

async function categoryRows() {
  const rows = await db
    .select({
      categoryId: categories.id,
      categorySlug: categories.slug,
      categoryName: categories.name,
      categorySort: categories.sortOrder,
      id: bars.id,
      slug: bars.slug,
      name: bars.name,
      description: bars.description,
      threadCount: bars.threadCount,
      postCount: bars.postCount,
      memberCount: bars.memberCount,
    })
    .from(bars)
    .innerJoin(categories, eq(categories.id, bars.categoryId))
    .where(eq(bars.status, 'active'))
    .orderBy(categories.sortOrder, bars.sortOrder, bars.id);

  const grouped = new Map<number, { id: number; slug: string; name: string; bars: typeof rows }>();
  for (const row of rows) {
    let group = grouped.get(row.categoryId);
    if (!group) {
      group = { id: row.categoryId, slug: row.categorySlug, name: row.categoryName, bars: [] };
      grouped.set(row.categoryId, group);
    }
    group.bars.push(row);
  }
  return [...grouped.values()];
}

async function leaderboard(limit: number) {
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      level: users.level,
      exp: users.exp,
      titleName: titles.name,
      titleIcon: titles.icon,
    })
    .from(users)
    .leftJoin(titles, eq(titles.id, users.equippedTitleId))
    .where(leaderboardEligibility())
    .orderBy(desc(users.level), desc(users.exp))
    .limit(limit);

  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}

const homeRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/home', async (request) => {
    const viewer = await optionalUser(request);

    const [cats, latest, featured, leaders, [userCount], [threadCount], [barCount], tasks] = await Promise.all([
      categoryRows(),
      db.select({
        id: threads.id,
        title: threads.title,
        replyCount: threads.replyCount,
        viewCount: threads.viewCount,
        isPinned: threads.isPinned,
        isFeatured: threads.isFeatured,
        lastPostAt: threads.lastPostAt,
        createdAt: threads.createdAt,
        authorName: users.displayName,
        authorUsername: users.username,
        barSlug: bars.slug,
        barName: bars.name,
      }).from(threads)
        .innerJoin(bars, eq(bars.id, threads.barId))
        .innerJoin(users, eq(users.id, threads.authorId))
        .where(and(eq(threads.status, 'open'), eq(bars.status, 'active')))
        .orderBy(desc(threads.lastPostAt))
        .limit(8),
      db.select({
        id: threads.id,
        title: threads.title,
        replyCount: threads.replyCount,
        viewCount: threads.viewCount,
        isPinned: threads.isPinned,
        isFeatured: threads.isFeatured,
        lastPostAt: threads.lastPostAt,
        createdAt: threads.createdAt,
        authorName: users.displayName,
        authorUsername: users.username,
        barSlug: bars.slug,
        barName: bars.name,
      }).from(threads)
        .innerJoin(bars, eq(bars.id, threads.barId))
        .innerJoin(users, eq(users.id, threads.authorId))
        .where(and(eq(threads.status, 'open'), eq(threads.isFeatured, true)))
        .orderBy(desc(threads.lastPostAt))
        .limit(3),
      leaderboard(5),
      db.select({ value: sql<number>`count(*)` }).from(users).where(eq(users.status, 'active')),
      db.select({ value: sql<number>`count(*)` }).from(threads).where(eq(threads.status, 'open')),
      db.select({ value: sql<number>`count(*)` }).from(bars).where(eq(bars.status, 'active')),
      viewer ? getDailyTasks(viewer.id) : Promise.resolve([]),
    ]);

    return {
      categories: cats,
      latest,
      featured: featured.length ? featured : latest.slice(0, 3),
      leaderboard: leaders,
      tasks,
      stats: {
        users: Number(userCount?.value ?? 0),
        threads: Number(threadCount?.value ?? 0),
        bars: Number(barCount?.value ?? 0),
      },
      userProgress: viewer ? progressForExp(viewer.exp) : null,
    };
  });

  app.get('/api/leaderboard', async (request) => {
    const query = request.query as { limit?: string };
    const limit = Math.min(50, Math.max(3, Number(query.limit ?? 20)));
    return { items: await leaderboard(limit) };
  });
};

export default homeRoutes;
