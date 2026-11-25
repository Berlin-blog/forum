import { randomUUID } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client';
import { bars, posts, threads, users } from '../db/schema';
import { renderContent } from '../lib/content';
import { requireUser } from '../lib/guard';

const createThreadSchema = z.object({
  barSlug: z.string().trim().min(1).max(64),
  title: z.string().trim().min(5).max(120),
  content: z.string().trim().min(1).max(50_000),
});

const listQuerySchema = z.object({
  bar: z.string().trim().min(1).max(64).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const threadsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/threads', async (request, reply) => {
    const parsed = listQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'INVALID_QUERY', message: '查询参数不合法' } });
    }
    const { bar, limit, offset } = parsed.data;

    const conditions = [
      eq(threads.status, 'open'),
      isNull(threads.deletedAt),
    ];
    if (bar) conditions.push(eq(bars.slug, bar));

    const rows = await db
      .select({
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
      })
      .from(threads)
      .innerJoin(bars, eq(bars.id, threads.barId))
      .innerJoin(users, eq(users.id, threads.authorId))
      .where(and(...conditions))
      .orderBy(desc(threads.isPinned), desc(threads.lastPostAt))
      .limit(limit)
      .offset(offset);

    return { items: rows };
  });

  app.post('/api/threads', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;

    const parsed = createThreadSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message ?? '输入不合法' },
      });
    }

    const [bar] = await db
      .select()
      .from(bars)
      .where(and(eq(bars.slug, parsed.data.barSlug), eq(bars.status, 'active')))
      .limit(1);

    if (!bar) {
      return reply.code(404).send({ error: { code: 'BAR_NOT_FOUND', message: '吧不存在' } });
    }

    const { html, text } = renderContent(parsed.data.content);
    const slug = `t-${randomUUID().slice(0, 8)}`;

    const result = await db.transaction(async (tx) => {
      const [thread] = await tx.insert(threads).values([{
        barId: bar.id,
        authorId: user.id,
        title: parsed.data.title,
        slug,
        status: 'open',
        lastPostAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }]).$returningId();

      await tx.insert(posts).values([{
        threadId: thread.id,
        authorId: user.id,
        parentId: null,
        floor: 1,
        contentMd: parsed.data.content,
        contentHtml: html,
        contentText: text,
        status: 'visible',
        createdAt: new Date(),
      }]);

      await tx.update(bars).set({
        threadCount: sql`thread_count + 1`,
        postCount: sql`post_count + 1`,
        lastThreadId: thread.id,
      }).where(eq(bars.id, bar.id));

      return thread;
    });

    return reply.code(201).send({ threadId: result.id, slug });
  });

  app.get('/api/threads/:id', async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    if (!Number.isSafeInteger(id) || id <= 0) {
      return reply.code(400).send({ error: { code: 'INVALID_ID', message: '主题 ID 不合法' } });
    }

    const [thread] = await db
      .select({
        id: threads.id,
        title: threads.title,
        replyCount: threads.replyCount,
        viewCount: threads.viewCount,
        status: threads.status,
        createdAt: threads.createdAt,
        lastPostAt: threads.lastPostAt,
        barId: bars.id,
        barSlug: bars.slug,
        barName: bars.name,
        authorId: users.id,
        authorName: users.displayName,
        authorUsername: users.username,
      })
      .from(threads)
      .innerJoin(bars, eq(bars.id, threads.barId))
      .innerJoin(users, eq(users.id, threads.authorId))
      .where(and(eq(threads.id, id), isNull(threads.deletedAt)))
      .limit(1);

    if (!thread) {
      return reply.code(404).send({ error: { code: 'THREAD_NOT_FOUND', message: '主题不存在' } });
    }

    const [firstPost] = await db
      .select({
        id: posts.id,
        contentHtml: posts.contentHtml,
        contentMd: posts.contentMd,
        createdAt: posts.createdAt,
      })
      .from(posts)
      .where(and(eq(posts.threadId, id), eq(posts.floor, 1), eq(posts.status, 'visible')))
      .limit(1);

    await db.update(threads).set({ viewCount: sql`view_count + 1` }).where(eq(threads.id, id));

    return { thread, firstPost: firstPost ?? null };
  });

  app.get('/api/threads/:id/posts', async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    if (!Number.isSafeInteger(id) || id <= 0) {
      return reply.code(400).send({ error: { code: 'INVALID_ID', message: '主题 ID 不合法' } });
    }

    const query = z.object({
      limit: z.coerce.number().int().min(1).max(50).default(20),
      offset: z.coerce.number().int().min(0).default(0),
    }).safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send({ error: { code: 'INVALID_QUERY', message: '查询参数不合法' } });
    }

    const rows = await db
      .select({
        id: posts.id,
        parentId: posts.parentId,
        floor: posts.floor,
        contentHtml: posts.contentHtml,
        createdAt: posts.createdAt,
        childCount: sql<number>`(
          select count(*) from posts child
          where child.parent_id = ${posts.id} and child.status = 'visible'
        )`,
        authorId: users.id,
        authorName: users.displayName,
        authorUsername: users.username,
        avatarUrl: users.avatarUrl,
      })
      .from(posts)
      .innerJoin(users, eq(users.id, posts.authorId))
      .where(and(
        eq(posts.threadId, id),
        isNull(posts.parentId),
        eq(posts.status, 'visible'),
      ))
      .orderBy(asc(posts.floor))
      .limit(query.data.limit)
      .offset(query.data.offset);

    return { items: rows };
  });
};

export default threadsRoutes;
