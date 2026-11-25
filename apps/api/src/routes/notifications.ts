import type { FastifyPluginAsync } from 'fastify';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { notifications, threads, users } from '../db/schema';
import { requireUser } from '../lib/guard';

const notificationsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/notifications/unread-count', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;

    const [row] = await db
      .select({ value: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));

    return { count: Number(row?.value ?? 0) };
  });

  app.get('/api/notifications', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;

    const rows = await db
      .select({
        id: notifications.id,
        type: notifications.notificationType,
        payload: notifications.payload,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
        threadId: notifications.threadId,
        postId: notifications.postId,
        actorName: users.displayName,
        actorUsername: users.username,
        threadTitle: threads.title,
      })
      .from(notifications)
      .leftJoin(users, eq(users.id, notifications.actorId))
      .leftJoin(threads, eq(threads.id, notifications.threadId))
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    return { items: rows };
  });

  app.post('/api/notifications/read', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;

    await db.update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));

    return { ok: true };
  });

  app.post('/api/notifications/:id/read', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;

    const id = Number((request.params as { id: string }).id);
    await db.update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)));

    return { ok: true };
  });
};

export default notificationsRoutes;
