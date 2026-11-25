import type { FastifyPluginAsync } from 'fastify';
import { asc, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { achievements, userAchievements } from '../db/schema';
import { optionalUser } from '../lib/guard';

const achievementsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/achievements', async (request) => {
    const viewer = await optionalUser(request);
    const all = await db.select().from(achievements).orderBy(asc(achievements.sortOrder));
    const unlocked = viewer
      ? await db.select({ achievementId: userAchievements.achievementId, unlockedAt: userAchievements.unlockedAt })
        .from(userAchievements)
        .where(eq(userAchievements.userId, viewer.id))
      : [];
    const map = new Map(unlocked.map((item) => [item.achievementId, item.unlockedAt]));

    return {
      items: all.map((achievement) => ({
        ...achievement,
        unlocked: map.has(achievement.id),
        unlockedAt: map.get(achievement.id) ?? null,
      })),
      unlockedCount: map.size,
      totalCount: all.length,
    };
  });
};

export default achievementsRoutes;
