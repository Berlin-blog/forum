import 'dotenv/config';
import './types';
import { mkdir } from 'node:fs/promises';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import staticPlugin from '@fastify/static';
import { sql } from 'drizzle-orm';
import { db, pool } from './db/client';
import authRoutes from './routes/auth';
import achievementsRoutes from './routes/achievements';
import adminRoutes from './routes/admin';
import barsRoutes from './routes/bars';
import homeRoutes from './routes/home';
import meRoutes from './routes/me';
import notificationsRoutes from './routes/notifications';
import postsRoutes from './routes/posts';
import searchRoutes from './routes/search';
import threadsRoutes from './routes/threads';
import uploadsRoutes, { uploadsDir } from './routes/uploads';
import usersRoutes from './routes/users';

const app = Fastify({
  logger: true,
  bodyLimit: 1024 * 1024,
  trustProxy: true,
});

const configuredOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

function isAllowedOrigin(origin: string | undefined) {
  if (!origin) return true;
  if (configuredOrigins.includes(origin)) return true;
  if (origin.startsWith('http://localhost:')) return true;
  if (origin.startsWith('http://127.0.0.1:')) return true;
  return /^https:\/\/[a-z0-9-]+\.github\.io$/i.test(origin);
}

await app.register(cors, {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origin not allowed'), false);
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
});

app.get('/api/health', async () => {
  await db.execute(sql`select 1`);
  return {
    ok: true,
    service: 'forum-api',
    time: new Date().toISOString(),
  };
});

app.get('/', async () => ({
  service: 'forum-api',
  health: '/api/health',
}));

await mkdir(uploadsDir, { recursive: true });
await app.register(multipart, {
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
});
await app.register(staticPlugin, {
  root: uploadsDir,
  prefix: '/uploads/',
  maxAge: '30d',
  immutable: true,
});

await app.register(authRoutes);
await app.register(achievementsRoutes);
await app.register(adminRoutes);
await app.register(barsRoutes);
await app.register(homeRoutes);
await app.register(meRoutes);
await app.register(notificationsRoutes);
await app.register(searchRoutes);
await app.register(threadsRoutes);
await app.register(postsRoutes);
await app.register(usersRoutes);
await app.register(uploadsRoutes);

app.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  if (reply.sent) return;
  reply.code(500).send({
    error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
  });
});

const port = Number(process.env.PORT ?? 3002);
await app.listen({ port, host: '127.0.0.1' });

async function shutdown() {
  await app.close();
  await pool.end();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
