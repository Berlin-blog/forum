import { randomUUID } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { and, asc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client';
import { barMembers, barModerators, bars, categories } from '../db/schema';
import { optionalUser, requireUser } from '../lib/guard';

const createBarSchema = z.object({
  name: z.string().trim().min(2).max(64),
  categoryId: z.coerce.number().int().positive(),
  description: z.string().trim().max(500).default(''),
  slug: z.string().trim().max(64).regex(/^[a-z0-9-]+$/).optional(),
});

const barsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/bars', async () => {
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
        createdBy: bars.createdBy,
        createdAt: bars.createdAt,
      })
      .from(bars)
      .innerJoin(categories, eq(categories.id, bars.categoryId))
      .where(eq(bars.status, 'active'))
      .orderBy(asc(categories.sortOrder), asc(bars.sortOrder), asc(bars.id));

    const grouped = new Map<number, {
      id: number;
      slug: string;
      name: string;
      bars: typeof rows;
    }>();

    for (const row of rows) {
      let category = grouped.get(row.categoryId);
      if (!category) {
        category = {
          id: row.categoryId,
          slug: row.categorySlug,
          name: row.categoryName,
          bars: [],
        };
        grouped.set(row.categoryId, category);
      }
      category.bars.push(row);
    }

    return { categories: [...grouped.values()] };
  });

  app.get('/api/bars/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const viewer = await optionalUser(request);
    const [bar] = await db
      .select()
      .from(bars)
      .where(and(eq(bars.slug, slug), eq(bars.status, 'active')))
      .limit(1);

    if (!bar) {
      return reply.code(404).send({ error: { code: 'BAR_NOT_FOUND', message: '吧不存在' } });
    }

    let isFollowing = false;
    if (viewer) {
      const [membership] = await db
        .select({ userId: barMembers.userId })
        .from(barMembers)
        .where(and(eq(barMembers.userId, viewer.id), eq(barMembers.barId, bar.id)))
        .limit(1);
      isFollowing = Boolean(membership);
    }

    return { bar: { ...bar, isFollowing } };
  });

  app.post('/api/bars', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;

    const parsed = createBarSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'INVALID_INPUT', message: '吧信息不合法' } });
    }

    const [category] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, parsed.data.categoryId))
      .limit(1);
    if (!category) {
      return reply.code(400).send({ error: { code: 'CATEGORY_NOT_FOUND', message: '分类不存在' } });
    }

    const slug = parsed.data.slug ?? `b-${randomUUID().slice(0, 8)}`;

    try {
      const created = await db.transaction(async (tx) => {
        const [bar] = await tx.insert(bars).values([{
          categoryId: parsed.data.categoryId,
          slug,
          name: parsed.data.name,
          description: parsed.data.description,
          createdBy: user.id,
          status: 'active',
          createdAt: new Date(),
        }]).$returningId();

        await tx.insert(barModerators).values([{
          barId: bar.id,
          userId: user.id,
          modRole: 'owner',
          createdAt: new Date(),
        }]);

        const [full] = await tx.select().from(bars).where(eq(bars.id, bar.id)).limit(1);
        return full;
      });

      return reply.code(201).send({ bar: created });
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'ER_DUP_ENTRY') {
        return reply.code(409).send({ error: { code: 'SLUG_TAKEN', message: '吧地址已被占用，换一个' } });
      }
      throw error;
    }
  });

  app.post('/api/bars/:slug/follow', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;

    const { slug } = request.params as { slug: string };
    const [bar] = await db.select({ id: bars.id }).from(bars).where(eq(bars.slug, slug)).limit(1);
    if (!bar) {
      return reply.code(404).send({ error: { code: 'BAR_NOT_FOUND', message: '吧不存在' } });
    }

    const result = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ userId: barMembers.userId })
        .from(barMembers)
        .where(and(eq(barMembers.userId, user.id), eq(barMembers.barId, bar.id)))
        .limit(1);

      let following: boolean;
      if (existing) {
        await tx.delete(barMembers).where(and(eq(barMembers.userId, user.id), eq(barMembers.barId, bar.id)));
        following = false;
      } else {
        await tx.insert(barMembers).values([{
          userId: user.id,
          barId: bar.id,
          joinedAt: new Date(),
        }]);
        following = true;
      }

      const [count] = await tx
        .select({ value: sql<number>`count(*)` })
        .from(barMembers)
        .where(eq(barMembers.barId, bar.id));

      const memberCount = Number(count?.value ?? 0);
      await tx.update(bars).set({ memberCount }).where(eq(bars.id, bar.id));
      return { following, memberCount };
    });

    return result;
  });

  app.get('/api/me/bars', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;

    const rows = await db
      .select({
        id: bars.id,
        slug: bars.slug,
        name: bars.name,
        description: bars.description,
        threadCount: bars.threadCount,
        postCount: bars.postCount,
        memberCount: bars.memberCount,
        joinedAt: barMembers.joinedAt,
      })
      .from(barMembers)
      .innerJoin(bars, eq(bars.id, barMembers.barId))
      .where(and(eq(barMembers.userId, user.id), eq(bars.status, 'active')))
      .orderBy(asc(bars.name));

    return { items: rows };
  });
};

export default barsRoutes;
