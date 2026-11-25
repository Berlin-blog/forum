import type { FastifyPluginAsync } from 'fastify';
import { and, desc, eq, like, or } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client';
import { bars, posts, threads, users } from '../db/schema';

const searchRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/search', async (request, reply) => {
    const parsed = z.object({
      q: z.string().trim().min(1).max(64),
      type: z.enum(['all', 'bar', 'thread', 'user']).default('all'),
    }).safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'INVALID_QUERY', message: '请输入搜索关键词' } });
    }

    const q = parsed.data.q.replace(/[%_\\]/g, '\\$&');
    const pattern = `%${q}%`;
    const type = parsed.data.type;

    const [barRows, userRows, threadRows] = await Promise.all([
      type === 'all' || type === 'bar'
        ? db.select({
          id: bars.id,
          slug: bars.slug,
          name: bars.name,
          description: bars.description,
          threadCount: bars.threadCount,
          postCount: bars.postCount,
          memberCount: bars.memberCount,
        }).from(bars)
          .where(and(eq(bars.status, 'active'), or(like(bars.name, pattern), like(bars.description, pattern))))
          .limit(10)
        : Promise.resolve([]),
      type === 'all' || type === 'user'
        ? db.select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          level: users.level,
          bio: users.bio,
        }).from(users)
          .where(and(
            eq(users.status, 'active'),
            or(like(users.username, pattern), like(users.displayName, pattern)),
          ))
          .limit(10)
        : Promise.resolve([]),
      type === 'all' || type === 'thread'
        ? db.select({
          id: threads.id,
          title: threads.title,
          replyCount: threads.replyCount,
          createdAt: threads.createdAt,
          barSlug: bars.slug,
          barName: bars.name,
          authorName: users.displayName,
          authorUsername: users.username,
          excerpt: posts.contentText,
        }).from(threads)
          .innerJoin(bars, eq(bars.id, threads.barId))
          .innerJoin(users, eq(users.id, threads.authorId))
          .innerJoin(posts, and(eq(posts.threadId, threads.id), eq(posts.floor, 1)))
          .where(and(
            eq(threads.status, 'open'),
            or(like(threads.title, pattern), like(posts.contentText, pattern)),
          ))
          .orderBy(desc(threads.lastPostAt))
          .limit(10)
        : Promise.resolve([]),
    ]);

    return {
      query: parsed.data.q,
      bars: barRows,
      users: userRows,
      threads: threadRows.map((row) => ({
        ...row,
        excerpt: row.excerpt.slice(0, 160),
      })),
    };
  });
};

export default searchRoutes;
