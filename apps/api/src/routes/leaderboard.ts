import type { FastifyPluginAsync } from 'fastify';
import { desc, inArray } from 'drizzle-orm';
import { db } from '../db/client';
import { users, weeklySettlements } from '../db/schema';
import { currentWeekStart, weekKey, weeklyLeaderboard } from '../lib/weekly';

const leaderboardRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/leaderboard/weekly', async () => {
    const start = currentWeekStart();
    const [last] = await db.select().from(weeklySettlements)
      .orderBy(desc(weeklySettlements.weekStart)).limit(1);
    let lastSettlement = null;
    if (last) {
      const ids = last.winners.map((winner) => winner.userId);
      const names = ids.length
        ? await db.select({ id: users.id, username: users.username, displayName: users.displayName })
          .from(users).where(inArray(users.id, ids))
        : [];
      const map = new Map(names.map((user) => [user.id, user]));
      lastSettlement = {
        weekStart: last.weekStart,
        winners: last.winners.map((winner) => ({
          ...winner,
          username: map.get(winner.userId)?.username ?? null,
          displayName: map.get(winner.userId)?.displayName ?? '已注销用户',
        })),
      };
    }

    return {
      items: await weeklyLeaderboard(20),
      weekStart: weekKey(start),
      weekEnd: weekKey(new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)),
      lastSettlement,
    };
  });
};

export default leaderboardRoutes;
