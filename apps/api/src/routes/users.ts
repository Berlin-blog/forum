import type { FastifyPluginAsync } from 'fastify';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../db/client';
import { bars, threads, users } from '../db/schema';

const usersRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/users/:username', async (request, reply) => {
    const { username } = request.params as { username: string };
    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        bio: users.bio,
        userRole: users.userRole,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(and(eq(users.username, username), eq(users.status, 'active')))
      .limit(1);

    if (!user) {
      return reply.code(404).send({ error: { code: 'USER_NOT_FOUND', message: '用户不存在' } });
    }

    const userThreads = await db
      .select({
        id: threads.id,
        title: threads.title,
        replyCount: threads.replyCount,
        lastPostAt: threads.lastPostAt,
        barSlug: bars.slug,
        barName: bars.name,
      })
      .from(threads)
      .innerJoin(bars, eq(bars.id, threads.barId))
      .where(and(eq(threads.authorId, user.id), isNull(threads.deletedAt)))
      .orderBy(desc(threads.lastPostAt))
      .limit(20);

    return { user, threads: userThreads };
  });
};

export default usersRoutes;
