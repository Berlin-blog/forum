import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client';
import { moderationActions, posts, reports, sessions, threads, users } from '../db/schema';
import { requireUser } from '../lib/guard';

const reportSchema = z.object({
  targetType: z.enum(['thread', 'post', 'user']),
  targetId: z.coerce.number().int().positive(),
  reason: z.enum(['spam', 'abuse', 'sexual', 'infringement', 'other']),
  detail: z.string().trim().max(1000).default(''),
});

async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  const user = await requireUser(request, reply);
  if (!user) return null;
  if (user.userRole !== 'admin') {
    reply.code(403).send({ error: { code: 'FORBIDDEN', message: '需要管理员权限' } });
    return null;
  }
  return user;
}

const adminRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/reports', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;

    const parsed = reportSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'INVALID_INPUT', message: '举报参数不合法' } });
    }

    await db.insert(reports).values([{
      reporterId: user.id,
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      reason: parsed.data.reason,
      detail: parsed.data.detail,
      reportStatus: 'open',
      createdAt: new Date(),
    }]);

    return reply.code(201).send({ ok: true });
  });

  app.get('/api/admin/reports', async (request, reply) => {
    if (!await requireAdmin(request, reply)) return;

    const rows = await db
      .select({
        id: reports.id,
        targetType: reports.targetType,
        targetId: reports.targetId,
        reason: reports.reason,
        detail: reports.detail,
        reportStatus: reports.reportStatus,
        resolution: reports.resolution,
        createdAt: reports.createdAt,
        handledAt: reports.handledAt,
        reporterName: users.displayName,
        reporterUsername: users.username,
      })
      .from(reports)
      .innerJoin(users, eq(users.id, reports.reporterId))
      .orderBy(desc(reports.createdAt))
      .limit(100);

    return { items: rows };
  });

  app.post('/api/admin/reports/:id/resolve', async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;

    const id = Number((request.params as { id: string }).id);
    const parsed = z.object({
      status: z.enum(['resolved', 'rejected']),
      resolution: z.string().trim().max(500).default(''),
    }).safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'INVALID_INPUT', message: '处理参数不合法' } });
    }

    await db.update(reports).set({
      reportStatus: parsed.data.status,
      resolution: parsed.data.resolution,
      handledBy: admin.id,
      handledAt: new Date(),
    }).where(eq(reports.id, id));

    return { ok: true };
  });

  app.post('/api/admin/users/:id/sanction', async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;

    const userId = Number((request.params as { id: string }).id);
    const parsed = z.object({
      action: z.enum(['ban', 'unban']),
      reason: z.string().trim().max(500).default(''),
    }).safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'INVALID_INPUT', message: '处罚参数不合法' } });
    }

    if (parsed.data.action === 'ban') {
      await db.update(users).set({ status: 'suspended' }).where(eq(users.id, userId));
      await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.userId, userId));
    } else {
      await db.update(users).set({ status: 'active' }).where(eq(users.id, userId));
    }

    await db.insert(moderationActions).values([{
      actorId: admin.id,
      actionType: parsed.data.action === 'ban' ? 'ban' : 'unban',
      targetType: 'user',
      targetId: userId,
      reason: parsed.data.reason,
      createdAt: new Date(),
    }]);

    return { ok: true };
  });

  app.post('/api/admin/threads/:id/hide', async (request, reply) => {
    if (!await requireAdmin(request, reply)) return;

    const threadId = Number((request.params as { id: string }).id);
    const parsed = z.object({
      action: z.enum(['hide', 'restore']),
      reason: z.string().trim().max(500).default(''),
    }).safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'INVALID_INPUT', message: '操作参数不合法' } });
    }

    await db.update(threads).set({
      status: parsed.data.action === 'hide' ? 'deleted' : 'open',
      deletedAt: parsed.data.action === 'hide' ? new Date() : null,
    }).where(eq(threads.id, threadId));

    return { ok: true };
  });

  app.post('/api/admin/posts/:id/hide', async (request, reply) => {
    if (!await requireAdmin(request, reply)) return;

    const postId = Number((request.params as { id: string }).id);
    const parsed = z.object({
      action: z.enum(['hide', 'restore']),
      reason: z.string().trim().max(500).default(''),
    }).safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'INVALID_INPUT', message: '操作参数不合法' } });
    }

    await db.update(posts).set({
      status: parsed.data.action === 'hide' ? 'hidden' : 'visible',
    }).where(eq(posts.id, postId));

    return { ok: true };
  });
};

export default adminRoutes;
