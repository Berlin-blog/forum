import type { FastifyPluginAsync } from 'fastify';
import { and, desc, eq, like, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client';
import { bars, threads, users } from '../db/schema';

const searchRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/search', async (request, reply) => {
    const parsed = z.object({
      q: z.string().trim().min(1).max(64),
      type: z.enum(['all', 'bar', 'thread', 'user']).default('all'),
      limit: z.coerce.number().int().min(1).max(20).default(10),
      offset: z.coerce.number().int().min(0).default(0),
    }).safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'INVALID_QUERY', message: '请输入搜索关键词' } });
    }

    const q = parsed.data.q.replace(/[%_\\]/g, '\\$&');
    const pattern = `%${q}%`;
    const { type, limit, offset } = parsed.data;
    const wantBars = type === 'all' || type === 'bar';
    const wantUsers = type === 'all' || type === 'user';
    const wantThreads = type === 'all' || type === 'thread';

    const barWhere = and(eq(bars.status, 'active'), or(like(bars.name, pattern), like(bars.description, pattern)));
    const userWhere = and(
      eq(users.status, 'active'),
      or(like(users.username, pattern), like(users.displayName, pattern)),
    );
    const threadWhere = and(
      eq(threads.status, 'open'),
      or(
        like(threads.title, pattern),
        sql`exists (
          select 1 from posts p
          where p.thread_id = ${threads.id}
            and p.status = 'visible'
            and p.content_text like ${pattern}
        )`,
      ),
    );

    const [barRows, userRows, threadRows, [barCount], [userCount], [threadCount]] = await Promise.all([
      wantBars
        ? db.select({
          id: bars.id,
          slug: bars.slug,
          name: bars.name,
          description: bars.description,
          threadCount: bars.threadCount,
          postCount: bars.postCount,
          memberCount: bars.memberCount,
        }).from(bars).where(barWhere).orderBy(desc(bars.memberCount)).limit(limit).offset(offset)
        : Promise.resolve([]),
      wantUsers
        ? db.select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          level: users.level,
          bio: users.bio,
        }).from(users).where(userWhere).orderBy(desc(users.level), desc(users.exp)).limit(limit).offset(offset)
        : Promise.resolve([]),
      wantThreads
        ? db.select({
          id: threads.id,
          title: threads.title,
          replyCount: threads.replyCount,
          createdAt: threads.createdAt,
          barSlug: bars.slug,
          barName: bars.name,
          authorName: users.displayName,
          authorUsername: users.username,
          excerpt: sql<string>`coalesce(
            (select p2.content_text from posts p2
              where p2.thread_id = threads.id and p2.status = 'visible' and p2.content_text like ${pattern}
              order by p2.id limit 1),
            (select p3.content_text from posts p3
              where p3.thread_id = threads.id and p3.status = 'visible' and p3.floor = 1 limit 1),
            ''
          )`,
        }).from(threads)
          .innerJoin(bars, eq(bars.id, threads.barId))
          .innerJoin(users, eq(users.id, threads.authorId))
          .where(threadWhere)
          .orderBy(desc(threads.lastPostAt))
          .limit(limit)
          .offset(offset)
        : Promise.resolve([]),
      wantBars
        ? db.select({ value: sql<number>`count(*)` }).from(bars).where(barWhere)
        : Promise.resolve([{ value: 0 }]),
      wantUsers
        ? db.select({ value: sql<number>`count(*)` }).from(users).where(userWhere)
        : Promise.resolve([{ value: 0 }]),
      wantThreads
        ? db.select({ value: sql<number>`count(*)` }).from(threads).where(threadWhere)
        : Promise.resolve([{ value: 0 }]),
    ]);

    const totals = {
      bars: Number(barCount?.value ?? 0),
      users: Number(userCount?.value ?? 0),
      threads: Number(threadCount?.value ?? 0),
    };
    const total = totals.bars + totals.users + totals.threads;

    return {
      query: parsed.data.q,
      bars: barRows,
      users: userRows,
      threads: threadRows.map((row) => ({ ...row, excerpt: row.excerpt.slice(0, 160) })),
      totals,
      total,
      limit,
      offset,
      hasMore: offset + limit < Math.max(totals.bars, totals.users, totals.threads),
    };
  });
};

export default searchRoutes;
