import type { FastifyPluginAsync } from 'fastify';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client';
import { users } from '../db/schema';
import { createSession, hashPassword, revokeSession, verifyPassword } from '../lib/auth';
import { requireUser } from '../lib/guard';
import { initializeProgress } from '../lib/progression';

const registerSchema = z.object({
  username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_\u4e00-\u9fa5-]+$/),
  password: z.string().min(8).max(128),
  displayName: z.string().trim().min(1).max(64),
});

const loginSchema = z.object({
  username: z.string().trim().min(1).max(32),
  password: z.string().min(1).max(128),
});

function publicUser(user: {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string;
  userRole: string;
  level: number;
  exp: number;
  equippedTitleId: number | null;
  createdAt: Date;
}) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    userRole: user.userRole,
    level: user.level,
    exp: user.exp,
    equippedTitleId: user.equippedTitleId,
    createdAt: user.createdAt,
  };
}

const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/auth/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message ?? '输入不合法' },
      });
    }

    const { username, password, displayName } = parsed.data;
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
    if (existing.length) {
      return reply.code(409).send({
        error: { code: 'USERNAME_TAKEN', message: '用户名已被占用' },
      });
    }

    const passwordHash = await hashPassword(password);
    const created = await db.transaction(async (tx) => {
      const [row] = await tx.insert(users).values([{
        username,
        passwordHash,
        displayName,
        createdAt: new Date(),
      }]).$returningId();
      await initializeProgress(tx, row.id);
      return row;
    });

    const [user] = await db.select().from(users).where(eq(users.id, created.id)).limit(1);
    const token = await createSession(created.id);

    return reply.code(201).send({ token, user: publicUser(user) });
  });

  app.post('/api/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'INVALID_INPUT', message: '请输入用户名和密码' },
      });
    }

    const [user] = await db.select().from(users)
      .where(eq(users.username, parsed.data.username))
      .limit(1);

    if (!user || user.status !== 'active') {
      return reply.code(401).send({
        error: { code: 'INVALID_CREDENTIALS', message: '用户名或密码错误' },
      });
    }

    const valid = await verifyPassword(user.passwordHash, parsed.data.password);
    if (!valid) {
      return reply.code(401).send({
        error: { code: 'INVALID_CREDENTIALS', message: '用户名或密码错误' },
      });
    }

    await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, user.id));
    const token = await createSession(user.id);
    return { token, user: publicUser(user) };
  });

  app.post('/api/auth/logout', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user || !request.token) return;
    await revokeSession(request.token);
    return { ok: true };
  });

  app.get('/api/me', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const [full] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    if (!full) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: '用户不存在' } });
    }
    return { user: publicUser(full) };
  });
};

export default authRoutes;
