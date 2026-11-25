import type { FastifyPluginAsync } from 'fastify';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client';
import { bars, posts, reactions, threads, users } from '../db/schema';
import { renderContent } from '../lib/content';
import { requireUser } from '../lib/guard';

const replySchema = z.object({
  content: z.string().trim().min(1).max(50_000),
});

const pageSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const postSelect = {
  id: posts.id,
  threadId: posts.threadId,
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
};

const postsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/posts/:id/children', async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    if (!Number.isSafeInteger(id) || id <= 0) {
      return reply.code(400).send({ error: { code: 'INVALID_ID', message: '帖子 ID 不合法' } });
    }

    const parsed = pageSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'INVALID_QUERY', message: '查询参数不合法' } });
    }

    const rows = await db
      .select(postSelect)
      .from(posts)
      .innerJoin(users, eq(users.id, posts.authorId))
      .where(and(
        eq(posts.parentId, id),
        eq(posts.status, 'visible'),
      ))
      .orderBy(asc(posts.createdAt))
      .limit(parsed.data.limit)
      .offset(parsed.data.offset);

    return { items: rows };
  });

  app.post('/api/threads/:id/posts', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;

    const threadId = Number((request.params as { id: string }).id);
    if (!Number.isSafeInteger(threadId) || threadId <= 0) {
      return reply.code(400).send({ error: { code: 'INVALID_ID', message: '主题 ID 不合法' } });
    }

    const parsed = replySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'INVALID_INPUT', message: '回复内容不能为空' } });
    }

    const { html, text } = renderContent(parsed.data.content);
    const created = await db.transaction(async (tx) => {
      const [thread] = await tx.select().from(threads).where(eq(threads.id, threadId)).for('update');
      if (!thread) {
        throw new Error('THREAD_NOT_FOUND');
      }
      if (thread.status !== 'open') {
        throw new Error('THREAD_LOCKED');
      }

      const [max] = await tx
        .select({ value: sql<number>`coalesce(max(${posts.floor}), 1)` })
        .from(posts)
        .where(eq(posts.threadId, threadId));

      const floor = Number(max?.value ?? 1) + 1;
      const [post] = await tx.insert(posts).values([{
        threadId,
        authorId: user.id,
        parentId: null,
        floor,
        contentMd: parsed.data.content,
        contentHtml: html,
        contentText: text,
        status: 'visible',
        createdAt: new Date(),
      }]).$returningId();

      await tx.update(threads).set({
        replyCount: sql`reply_count + 1`,
        lastPostAt: new Date(),
      }).where(eq(threads.id, threadId));

      await tx.update(bars).set({
        postCount: sql`post_count + 1`,
      }).where(eq(bars.id, thread.barId));

      return post;
    }).catch((error: Error) => {
      if (error.message === 'THREAD_NOT_FOUND') {
        reply.code(404).send({ error: { code: 'THREAD_NOT_FOUND', message: '主题不存在' } });
        return null;
      }
      if (error.message === 'THREAD_LOCKED') {
        reply.code(409).send({ error: { code: 'THREAD_LOCKED', message: '主题已锁定' } });
        return null;
      }
      throw error;
    });

    if (!created) return;

    const [post] = await db
      .select(postSelect)
      .from(posts)
      .innerJoin(users, eq(users.id, posts.authorId))
      .where(eq(posts.id, created.id))
      .limit(1);

    return reply.code(201).send({ post });
  });

  app.post('/api/posts/:id/replies', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;

    const parentId = Number((request.params as { id: string }).id);
    if (!Number.isSafeInteger(parentId) || parentId <= 0) {
      return reply.code(400).send({ error: { code: 'INVALID_ID', message: '帖子 ID 不合法' } });
    }

    const parsed = replySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'INVALID_INPUT', message: '回复内容不能为空' } });
    }

    const [parent] = await db.select().from(posts).where(eq(posts.id, parentId)).limit(1);
    if (!parent || parent.status !== 'visible') {
      return reply.code(404).send({ error: { code: 'POST_NOT_FOUND', message: '被回复的帖子不存在' } });
    }

    const { html, text } = renderContent(parsed.data.content);
    const created = await db.transaction(async (tx) => {
      const [thread] = await tx.select().from(threads).where(eq(threads.id, parent.threadId)).for('update');
      if (!thread) throw new Error('THREAD_NOT_FOUND');
      if (thread.status !== 'open') throw new Error('THREAD_LOCKED');

      const [post] = await tx.insert(posts).values([{
        threadId: parent.threadId,
        authorId: user.id,
        parentId,
        floor: null,
        contentMd: parsed.data.content,
        contentHtml: html,
        contentText: text,
        status: 'visible',
        createdAt: new Date(),
      }]).$returningId();

      await tx.update(posts).set({
        childCount: sql`child_count + 1`,
      }).where(eq(posts.id, parentId));

      await tx.update(threads).set({
        replyCount: sql`reply_count + 1`,
        lastPostAt: new Date(),
      }).where(eq(threads.id, parent.threadId));

      await tx.update(bars).set({
        postCount: sql`post_count + 1`,
      }).where(eq(bars.id, thread.barId));

      return post;
    }).catch((error: Error) => {
      if (error.message === 'THREAD_NOT_FOUND') {
        reply.code(404).send({ error: { code: 'THREAD_NOT_FOUND', message: '主题不存在' } });
        return null;
      }
      if (error.message === 'THREAD_LOCKED') {
        reply.code(409).send({ error: { code: 'THREAD_LOCKED', message: '主题已锁定' } });
        return null;
      }
      throw error;
    });

    if (!created) return;

    const [post] = await db
      .select(postSelect)
      .from(posts)
      .innerJoin(users, eq(users.id, posts.authorId))
      .where(eq(posts.id, created.id))
      .limit(1);

    return reply.code(201).send({ post });
  });

  app.post('/api/posts/:id/like', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;

    const postId = Number((request.params as { id: string }).id);
    if (!Number.isSafeInteger(postId) || postId <= 0) {
      return reply.code(400).send({ error: { code: 'INVALID_ID', message: '帖子 ID 不合法' } });
    }

    const [existing] = await db
      .select({ id: reactions.id })
      .from(reactions)
      .where(and(
        eq(reactions.userId, user.id),
        eq(reactions.targetType, 'post'),
        eq(reactions.targetId, postId),
        eq(reactions.kind, 'like'),
      ))
      .limit(1);

    if (existing) {
      await db.delete(reactions).where(eq(reactions.id, existing.id));
      return { liked: false };
    }

    await db.insert(reactions).values([{
      userId: user.id,
      targetType: 'post',
      targetId: postId,
      kind: 'like',
      createdAt: new Date(),
    }]);
    return { liked: true };
  });
};

export default postsRoutes;
