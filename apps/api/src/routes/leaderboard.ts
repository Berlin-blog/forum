import type { FastifyPluginAsync } from 'fastify';
import { currentWeekStart, weekKey, weeklyLeaderboard } from '../lib/weekly';

const leaderboardRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/leaderboard/weekly', async () => {
    const start = currentWeekStart();
    return {
      items: await weeklyLeaderboard(20),
      weekStart: weekKey(start),
      weekEnd: weekKey(new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)),
    };
  });
};

export default leaderboardRoutes;
