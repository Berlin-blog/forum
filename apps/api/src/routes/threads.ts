import { randomUUID } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client';
import { bars, posts, threads, users } from '../db/schema';
import { renderContent } from '../lib/content';
import { optionalUser, requireUser } from '../lib/guard';
import { resolveAttachmentMarkdown } from '../lib/attachments';
import { awardXp } from '../lib/progression';

const createThreadSchema = z.object({
  barSlug: z.string().trim().min(1).max(64),
  title: z.string().trim().min(5).max(120),
  content: z.string().trim().min(1).max(50_000),
});

const editThreadSchema = z.object({
  title: z.string().trim().min(5).max(120).optional(),
  content: z.string().trim().min(1).max(50_000).optional(),
}).refine((data) => data.title !== undefined || data.content !== undefined, {
  message: '至少修改一项',
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
        authorRole: users.userRole,
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

    const [count] = await db
      .select({ value: sql<number>`count(*)` })
      .from(threads)
      .innerJoin(bars, eq(bars.id, threads.barId))
      .where(and(...conditions));

    const total = Number(count?.value ?? 0);
    return { items: rows, total, limit, offset, hasMore: offset + rows.length < total };
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

    const resolved = await resolveAttachmentMarkdown(parsed.data.content, user.id);
    const { html, text } = renderContent(resolved);
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

      await awardXp(tx, user.id, 'thread');

      return thread;
    });

    return reply.code(201).send({ threadId: result.id, slug });
  });

  app.patch('/api/threads/:id', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;

    const id = Number((request.params as { id: string }).id);
    if (!Number.isSafeInteger(id) || id <= 0) {
      return reply.code(400).send({ error: { code: 'INVALID_ID', message: '主题 ID 不合法' } });
    }

    const parsed = editThreadSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'INVALID_INPUT', message: '修改内容不合法' } });
    }

    const [thread] = await db
      .select()
      .from(threads)
      .where(and(eq(threads.id, id), isNull(threads.deletedAt)))
      .limit(1);
    if (!thread) {
      return reply.code(404).send({ error: { code: 'THREAD_NOT_FOUND', message: '主题不存在' } });
    }
    if (thread.authorId !== user.id && user.userRole !== 'admin') {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: '只能修改自己的主题' } });
    }

    const [firstPost] = await db
      .select()
      .from(posts)
      .where(and(eq(posts.threadId, id), eq(posts.floor, 1)))
      .limit(1);

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.title !== undefined) updates.title = parsed.data.title;

    await db.transaction(async (tx) => {
      if (parsed.data.content !== undefined && firstPost) {
        const resolved = await resolveAttachmentMarkdown(parsed.data.content, user.id);
        const { html, text } = renderContent(resolved);
        await tx.update(posts).set({
          contentMd: parsed.data.content,
          contentHtml: html,
          contentText: text,
          editedAt: new Date(),
        }).where(eq(posts.id, firstPost.id));
      }
      await tx.update(threads).set(updates).where(eq(threads.id, id));
    });

    return { ok: true };
  });

  app.delete('/api/threads/:id', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;

    const id = Number((request.params as { id: string }).id);
    if (!Number.isSafeInteger(id) || id <= 0) {
      return reply.code(400).send({ error: { code: 'INVALID_ID', message: '主题 ID 不合法' } });
    }

    const [thread] = await db
      .select()
      .from(threads)
      .where(and(eq(threads.id, id), isNull(threads.deletedAt)))
      .limit(1);
    if (!thread) {
      return reply.code(404).send({ error: { code: 'THREAD_NOT_FOUND', message: '主题不存在' } });
    }
    if (thread.authorId !== user.id && user.userRole !== 'admin') {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: '只能删除自己的主题' } });
    }

    const now = new Date();
    await db.transaction(async (tx) => {
      await tx.update(posts).set({ status: 'deleted', deletedAt: now }).where(eq(posts.threadId, id));
      await tx.update(threads).set({ status: 'deleted', deletedAt: now, updatedAt: now }).where(eq(threads.id, id));
      await tx.update(bars).set({
        threadCount: sql`(select count(*) from threads t where t.bar_id = ${thread.barId} and t.status = 'open' and t.deleted_at is null)`,
        postCount: sql`(select count(*) from posts p inner join threads t on t.id = p.thread_id where t.bar_id = ${thread.barId} and p.status = 'visible')`,
        lastThreadId: sql`(select t2.id from threads t2 where t2.bar_id = ${thread.barId} and t2.status = 'open' and t2.deleted_at is null order by t2.last_post_at desc limit 1)`,
      }).where(eq(bars.id, thread.barId));
    });

    return { ok: true };
  });

  app.get('/api/threads/:id', async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    if (!Number.isSafeInteger(id) || id <= 0) {
      return reply.code(400).send({ error: { code: 'INVALID_ID', message: '主题 ID 不合法' } });
    }

    const viewer = await optionalUser(request);

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
        authorRole: users.userRole,
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
        contentText: posts.contentText,
        createdAt: posts.createdAt,
        editedAt: posts.editedAt,
        likeCount: sql<number>`(
          select count(*) from reactions r
          where r.target_type = 'post' and r.target_id = ${posts.id} and r.kind = 'like'
        )`,
        liked: viewer
          ? sql<boolean>`exists(
              select 1 from reactions r
              where r.target_type = 'post' and r.target_id = ${posts.id}
                and r.kind = 'like' and r.user_id = ${viewer.id}
            )`
          : sql<boolean>`false`,
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

    const viewer = await optionalUser(request);
    const rows = await db
      .select({
        id: posts.id,
        parentId: posts.parentId,
        floor: posts.floor,
        contentHtml: posts.contentHtml,
        contentMd: posts.contentMd,
        contentText: posts.contentText,
        createdAt: posts.createdAt,
        editedAt: posts.editedAt,
        childCount: sql<number>`(
          select count(*) from posts child
          where child.parent_id = ${posts.id} and child.status = 'visible'
        )`,
        likeCount: sql<number>`(
          select count(*) from reactions r
          where r.target_type = 'post' and r.target_id = ${posts.id} and r.kind = 'like'
        )`,
        liked: viewer
          ? sql<boolean>`exists(
              select 1 from reactions r
              where r.target_type = 'post' and r.target_id = ${posts.id}
                and r.kind = 'like' and r.user_id = ${viewer.id}
            )`
          : sql<boolean>`false`,
        authorId: users.id,
        authorName: users.displayName,
        authorUsername: users.username,
        avatarUrl: users.avatarUrl,
        authorRole: users.userRole,
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

    const [count] = await db
      .select({ value: sql<number>`count(*)` })
      .from(posts)
      .where(and(eq(posts.threadId, id), isNull(posts.parentId), eq(posts.status, 'visible')));

    const total = Number(count?.value ?? 0);
    return { items: rows, total, limit: query.data.limit, offset: query.data.offset, hasMore: query.data.offset + rows.length < total };
  });
};

export default threadsRoutes;
