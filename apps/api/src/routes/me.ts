import type { FastifyPluginAsync } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client';
import { checkins, titles, userTitles, users } from '../db/schema';
import { requireUser } from '../lib/guard';
import { awardXp, checkinToday, getDailyTasks, progressForExp } from '../lib/progression';

const meRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/checkin', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;

    const result = await db.transaction(async (tx) => {
      const fresh = await checkinToday(tx, user.id);
      const award = fresh ? await awardXp(tx, user.id, 'checkin') : null;
      const [me] = await tx.select().from(users).where(eq(users.id, user.id)).limit(1);
      return { fresh, award, me };
    });

    return {
      checkedIn: result.fresh,
      alreadyCheckedIn: !result.fresh,
      awarded: result.award?.awarded ?? 0,
      progress: progressForExp(result.me?.exp ?? 0),
    };
  });

  app.get('/api/me/checkin', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;

    const day = new Date().toISOString().slice(0, 10);
    const [row] = await db
      .select({ userId: checkins.userId })
      .from(checkins)
      .where(and(eq(checkins.userId, user.id), eq(checkins.checkinDate, day)))
      .limit(1);

    const [me] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    return {
      checkedIn: Boolean(row),
      progress: progressForExp(me?.exp ?? 0),
    };
  });

  app.get('/api/me/daily-tasks', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    return { tasks: await getDailyTasks(user.id) };
  });

  app.get('/api/me/titles', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;

    const rows = await db
      .select({
        id: titles.id,
        slug: titles.slug,
        name: titles.name,
        description: titles.description,
        icon: titles.icon,
        minLevel: titles.minLevel,
        acquiredAt: userTitles.acquiredAt,
      })
      .from(userTitles)
      .innerJoin(titles, eq(titles.id, userTitles.titleId))
      .where(eq(userTitles.userId, user.id))
      .orderBy(titles.minLevel);

    const [me] = await db.select({ equippedTitleId: users.equippedTitleId }).from(users).where(eq(users.id, user.id)).limit(1);
    return { titles: rows, equippedTitleId: me?.equippedTitleId ?? null };
  });

  app.post('/api/me/title', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;

    const parsed = z.object({
      titleId: z.number().int().positive().nullable(),
    }).safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'INVALID_INPUT', message: '称号参数不合法' } });
    }

    if (parsed.data.titleId !== null) {
      const [owned] = await db
        .select({ titleId: userTitles.titleId })
        .from(userTitles)
        .where(and(eq(userTitles.userId, user.id), eq(userTitles.titleId, parsed.data.titleId)))
        .limit(1);
      if (!owned) {
        return reply.code(403).send({ error: { code: 'TITLE_NOT_OWNED', message: '还没有获得这个称号' } });
      }
    }

    await db.update(users).set({ equippedTitleId: parsed.data.titleId }).where(eq(users.id, user.id));
    return { equippedTitleId: parsed.data.titleId };
  });

  app.patch('/api/me', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;

    const parsed = z.object({
      displayName: z.string().trim().min(1).max(64).optional(),
      bio: z.string().trim().max(500).optional(),
      avatarUrl: z.string().trim().max(512).nullable().optional(),
    }).safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'INVALID_INPUT', message: '资料格式不合法' } });
    }

    await db.update(users).set(parsed.data).where(eq(users.id, user.id));
    const [updated] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    return {
      user: updated ? {
        id: updated.id,
        username: updated.username,
        displayName: updated.displayName,
        avatarUrl: updated.avatarUrl,
        bio: updated.bio,
        userRole: updated.userRole,
        level: updated.level,
        exp: updated.exp,
        equippedTitleId: updated.equippedTitleId,
        createdAt: updated.createdAt,
      } : null,
    };
  });
};

export default meRoutes;
