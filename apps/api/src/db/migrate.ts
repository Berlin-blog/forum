import 'dotenv/config';
import { readFile, readdir } from 'node:fs/promises';
import { createConnection } from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');

const connection = await createConnection({ uri: url, multipleStatements: true });

try {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) NOT NULL PRIMARY KEY,
      applied_at DATETIME(3) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  const dir = new URL('../../migrations/', import.meta.url);
  const files = (await readdir(dir))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const [rows] = await connection.query(
      'SELECT 1 FROM schema_migrations WHERE filename = ? LIMIT 1',
      [file],
    );
    if (Array.isArray(rows) && rows.length) {
      console.log(`skip ${file}`);
      continue;
    }

    const sql = await readFile(new URL(file, dir), 'utf8');
    await connection.query(sql);
    await connection.execute(
      'INSERT INTO schema_migrations (filename, applied_at) VALUES (?, ?)',
      [file, new Date()],
    );
    console.log(`applied ${file}`);
  }

  console.log('migration ok');
} finally {
  await connection.end();
}
