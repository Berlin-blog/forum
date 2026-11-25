import 'dotenv/config';
import { db, pool } from './client';
import { users } from './schema';
import { syncAchievements, syncTitles } from '../lib/progression';

const rows = await db.select({ id: users.id, level: users.level }).from(users);

for (const user of rows) {
  await db.transaction(async (tx) => {
    await syncTitles(tx, user.id, user.level);
    await syncAchievements(tx, user.id, user.level);
  });
  console.log(`synced user ${user.id} (Lv.${user.level})`);
}

await pool.end();
console.log('growth sync ok');
