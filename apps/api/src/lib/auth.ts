import { createHash, randomBytes, randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from '../db/client';
import { sessions, users } from '../db/schema';

export type AuthUser = {
  id: number;
  username: string;
  displayName: string;
  userRole: string;
  status: string;
  level: number;
  exp: number;
  equippedTitleId: number | null;
};

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function hashPassword(password: string) {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, password: string) {
  return argon2.verify(hash, password);
}

export async function createSession(userId: number) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values([{
    id: randomUUID(),
    userId,
    tokenHash: hashToken(token),
    expiresAt,
    createdAt: new Date(),
  }]);
  return token;
}

export async function getSessionUser(token: string): Promise<AuthUser | null> {
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      userRole: users.userRole,
      status: users.status,
      level: users.level,
      exp: users.exp,
      equippedTitleId: users.equippedTitleId,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(
      eq(sessions.tokenHash, hashToken(token)),
      gt(sessions.expiresAt, new Date()),
      isNull(sessions.revokedAt),
      eq(users.status, 'active'),
    ))
    .limit(1);
  return rows[0] ?? null;
}

export async function revokeSession(token: string) {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.tokenHash, hashToken(token)));
}
