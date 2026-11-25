import type { FastifyPluginAsync } from 'fastify';
import { and, asc, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { db } from '../db/client';
import {
  achievements,
  barMembers,
  bars,
  checkins,
  notifications,
  posts,
  reactions,
  threads,
  titles,
  userAchievements,
  userFollows,
  userTitles,
  users,
} from '../db/schema';
import { optionalUser, requireUser } from '../lib/guard';
import { syncAchievements } from '../lib/progression';

async function withFollowingState<T extends { id: number }>(rows: T[], viewerId?: number) {
  if (!viewerId || rows.length === 0) {
    return rows.map((row) => ({ ...row, isFollowing: false, isSelf: false }));
  }
  const follows = await db
    .select({ followeeId: userFollows.followeeId })
    .from(userFollows)
    .where(and(eq(userFollows.followerId, viewerId), inArray(userFollows.followeeId, rows.map((row) => row.id))));
  const set = new Set(follows.map((row) => row.followeeId));
  return rows.map((row) => ({
    ...row,
    isFollowing: set.has(row.id),
    isSelf: row.id === viewerId,
  }));
}

const usersRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/users/:username', async (request, reply) => {
    const { username } = request.params as { username: string };
    const viewer = await optionalUser(request);

    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        bio: users.bio,
        userRole: users.userRole,
        level: users.level,
        exp: users.exp,
        equippedTitleId: users.equippedTitleId,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(and(eq(users.username, username), eq(users.status, 'active')))
      .limit(1);

    if (!user) {
      return reply.code(404).send({ error: { code: 'USER_NOT_FOUND', message: '用户不存在' } });
    }

    const [
      [followerRow], [followingRow], [threadRow], [postRow], [checkinRow], [likeRow],
      followedBars, userThreads, replies, ownedTitles, unlockedAchievements,
    ] = await Promise.all([
      db.select({ value: sql<number>`count(*)` }).from(userFollows).where(eq(userFollows.followeeId, user.id)),
      db.select({ value: sql<number>`count(*)` }).from(userFollows).where(eq(userFollows.followerId, user.id)),
      db.select({ value: sql<number>`count(*)` }).from(threads).where(eq(threads.authorId, user.id)),
      db.select({ value: sql<number>`count(*)` }).from(posts).where(eq(posts.authorId, user.id)),
      db.select({ value: sql<number>`count(*)` }).from(checkins).where(eq(checkins.userId, user.id)),
      db.select({ value: sql<number>`count(*)` }).from(reactions).where(and(
        eq(reactions.targetType, 'post'),
        inArray(reactions.targetId, db.select({ id: posts.id }).from(posts).where(eq(posts.authorId, user.id))),
      )),
      db.select({
        id: bars.id,
        slug: bars.slug,
        name: bars.name,
        description: bars.description,
        threadCount: bars.threadCount,
      }).from(barMembers)
        .innerJoin(bars, eq(bars.id, barMembers.barId))
        .where(and(eq(barMembers.userId, user.id), eq(bars.status, 'active')))
        .orderBy(asc(bars.name)),
      db.select({
        id: threads.id,
        title: threads.title,
        replyCount: threads.replyCount,
        lastPostAt: threads.lastPostAt,
        barSlug: bars.slug,
        barName: bars.name,
      }).from(threads)
        .innerJoin(bars, eq(bars.id, threads.barId))
        .where(eq(threads.authorId, user.id))
        .orderBy(desc(threads.lastPostAt))
        .limit(20),
      db.select({
        id: posts.id,
        threadId: posts.threadId,
        contentText: posts.contentText,
        createdAt: posts.createdAt,
        threadTitle: threads.title,
        barSlug: bars.slug,
        barName: bars.name,
      }).from(posts)
        .innerJoin(threads, eq(threads.id, posts.threadId))
        .innerJoin(bars, eq(bars.id, threads.barId))
        .where(and(eq(posts.authorId, user.id), isNotNull(posts.parentId), eq(posts.status, 'visible')))
        .orderBy(desc(posts.createdAt))
        .limit(20),
      db.select({
        id: titles.id,
        slug: titles.slug,
        name: titles.name,
        description: titles.description,
        icon: titles.icon,
        minLevel: titles.minLevel,
      }).from(userTitles)
        .innerJoin(titles, eq(titles.id, userTitles.titleId))
        .where(eq(userTitles.userId, user.id))
        .orderBy(asc(titles.minLevel)),
      db.select({
        id: achievements.id,
        slug: achievements.slug,
        name: achievements.name,
        description: achievements.description,
        icon: achievements.icon,
        unlockedAt: userAchievements.unlockedAt,
      }).from(userAchievements)
        .innerJoin(achievements, eq(achievements.id, userAchievements.achievementId))
        .where(eq(userAchievements.userId, user.id))
        .orderBy(asc(achievements.sortOrder)),
    ]);

    let equippedTitle = null;
    if (user.equippedTitleId) {
      const [title] = await db.select({
        id: titles.id,
        slug: titles.slug,
        name: titles.name,
        description: titles.description,
        icon: titles.icon,
        minLevel: titles.minLevel,
      }).from(titles).where(eq(titles.id, user.equippedTitleId)).limit(1);
      equippedTitle = title ?? null;
    }

    let isFollowing = false;
    if (viewer && viewer.id !== user.id) {
      const [row] = await db
        .select({ followerId: userFollows.followerId })
        .from(userFollows)
        .where(and(eq(userFollows.followerId, viewer.id), eq(userFollows.followeeId, user.id)))
        .limit(1);
      isFollowing = Boolean(row);
    }

    return {
      user,
      equippedTitle,
      stats: {
        followers: Number(followerRow?.value ?? 0),
        following: Number(followingRow?.value ?? 0),
        threads: Number(threadRow?.value ?? 0),
        posts: Number(postRow?.value ?? 0),
        checkins: Number(checkinRow?.value ?? 0),
        likesReceived: Number(likeRow?.value ?? 0),
      },
      followedBars,
      threads: userThreads,
      replies,
      titles: ownedTitles,
      achievements: unlockedAchievements,
      isFollowing,
      isSelf: viewer?.id === user.id,
    };
  });

  app.get('/api/users/:username/followers', async (request, reply) => {
    const { username } = request.params as { username: string };
    const viewer = await optionalUser(request);
    const [target] = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
    if (!target) return reply.code(404).send({ error: { code: 'USER_NOT_FOUND', message: '用户不存在' } });

    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        level: users.level,
        titleName: titles.name,
        titleIcon: titles.icon,
        followedAt: userFollows.createdAt,
      })
      .from(userFollows)
      .innerJoin(users, eq(users.id, userFollows.followerId))
      .leftJoin(titles, eq(titles.id, users.equippedTitleId))
      .where(eq(userFollows.followeeId, target.id))
      .orderBy(desc(userFollows.createdAt))
      .limit(50);

    return { items: await withFollowingState(rows, viewer?.id) };
  });

  app.get('/api/users/:username/following', async (request, reply) => {
    const { username } = request.params as { username: string };
    const viewer = await optionalUser(request);
    const [target] = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
    if (!target) return reply.code(404).send({ error: { code: 'USER_NOT_FOUND', message: '用户不存在' } });

    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        level: users.level,
        titleName: titles.name,
        titleIcon: titles.icon,
        followedAt: userFollows.createdAt,
      })
      .from(userFollows)
      .innerJoin(users, eq(users.id, userFollows.followeeId))
      .leftJoin(titles, eq(titles.id, users.equippedTitleId))
      .where(eq(userFollows.followerId, target.id))
      .orderBy(desc(userFollows.createdAt))
      .limit(50);

    return { items: await withFollowingState(rows, viewer?.id) };
  });

  app.post('/api/users/:username/follow', async (request, reply) => {
    const viewer = await requireUser(request, reply);
    if (!viewer) return;

    const { username } = request.params as { username: string };
    const [target] = await db.select({ id: users.id, level: users.level }).from(users).where(eq(users.username, username)).limit(1);
    if (!target) {
      return reply.code(404).send({ error: { code: 'USER_NOT_FOUND', message: '用户不存在' } });
    }
    if (target.id === viewer.id) {
      return reply.code(400).send({ error: { code: 'CANNOT_FOLLOW_SELF', message: '不能关注自己' } });
    }

    const result = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ followerId: userFollows.followerId })
        .from(userFollows)
        .where(and(eq(userFollows.followerId, viewer.id), eq(userFollows.followeeId, target.id)))
        .limit(1);

      let following: boolean;
      if (existing) {
        await tx.delete(userFollows).where(and(
          eq(userFollows.followerId, viewer.id),
          eq(userFollows.followeeId, target.id),
        ));
        following = false;
      } else {
        await tx.insert(userFollows).values([{
          followerId: viewer.id,
          followeeId: target.id,
          createdAt: new Date(),
        }]);
        await tx.insert(notifications).values([{
          userId: target.id,
          notificationType: 'system',
          actorId: viewer.id,
          payload: { kind: 'follow' },
          createdAt: new Date(),
        }]);
        following = true;
      }

      const [count] = await tx
        .select({ value: sql<number>`count(*)` })
        .from(userFollows)
        .where(eq(userFollows.followeeId, target.id));

      await syncAchievements(tx, target.id, target.level);
      return { following, followers: Number(count?.value ?? 0) };
    });

    return result;
  });
};

export default usersRoutes;
