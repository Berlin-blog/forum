import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { db, pool } from './client';
import { users } from './schema';

const username = 'hotbot';
const password = process.env.HOT_BOT_PASSWORD ?? randomBytes(24).toString('base64url');
const passwordHash = await argon2.hash(password);

const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);

if (existing) {
  await db.update(users).set({
    displayName: '热点播报',
    userRole: 'bot',
    status: 'active',
    bio: '每两小时整理一次热点，发到对应的吧。',
  }).where(eq(users.id, existing.id));
  console.log(`bot exists: ${username} (id ${existing.id})`);
} else {
  const [created] = await db.insert(users).values([{
    username,
    passwordHash,
    displayName: '热点播报',
    avatarUrl: null,
    bio: '每两小时整理一次热点，发到对应的吧。',
    userRole: 'bot',
    status: 'active',
    level: 1,
    exp: 0,
    equippedTitleId: null,
    createdAt: new Date(),
  }]).$returningId();
  console.log(`bot created: ${username} (id ${created.id})`);
  console.log(`bot password: ${password}`);
  console.log('save this password somewhere safe; it is only printed once.');
}

await pool.end();
