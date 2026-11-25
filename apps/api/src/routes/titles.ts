import type { FastifyPluginAsync } from 'fastify';
import { asc, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { titles, userTitles } from '../db/schema';
import { optionalUser } from '../lib/guard';

const titlesRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/titles', async (request) => {
    const viewer = await optionalUser(request);
    const all = await db.select().from(titles).orderBy(asc(titles.minLevel), asc(titles.sortOrder));
    const unlocked = viewer
      ? await db.select({ titleId: userTitles.titleId, acquiredAt: userTitles.acquiredAt })
        .from(userTitles)
        .where(eq(userTitles.userId, viewer.id))
      : [];
    const map = new Map(unlocked.map((item) => [item.titleId, item.acquiredAt]));

    return {
      items: all.map((title) => ({
        ...title,
        unlocked: map.has(title.id),
        acquiredAt: map.get(title.id) ?? null,
      })),
      unlockedCount: map.size,
      totalCount: all.length,
    };
  });
};

export default titlesRoutes;
