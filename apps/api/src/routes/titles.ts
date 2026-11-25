import type { FastifyPluginAsync } from 'fastify';
import { and, asc, eq, gt, isNull, or } from 'drizzle-orm';
import { db } from '../db/client';
import { titles, userTitles } from '../db/schema';
import { optionalUser } from '../lib/guard';

const titlesRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/titles', async (request) => {
    const viewer = await optionalUser(request);
    const all = await db.select().from(titles).orderBy(asc(titles.minLevel), asc(titles.sortOrder));
    const unlocked = viewer
      ? await db.select({ titleId: userTitles.titleId, acquiredAt: userTitles.acquiredAt, expiresAt: userTitles.expiresAt })
        .from(userTitles)
        .where(and(
          eq(userTitles.userId, viewer.id),
          or(isNull(userTitles.expiresAt), gt(userTitles.expiresAt, new Date())),
        ))
      : [];
    const map = new Map(unlocked.map((item) => [item.titleId, item]));

    return {
      items: all.map((title) => {
        const owned = map.get(title.id);
        return {
          ...title,
          unlocked: Boolean(owned),
          acquiredAt: owned?.acquiredAt ?? null,
          expiresAt: owned?.expiresAt ?? null,
        };
      }),
      unlockedCount: map.size,
      totalCount: all.length,
    };
  });
};

export default titlesRoutes;
