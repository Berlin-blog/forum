import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { createConnection } from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');

const sql = await readFile(new URL('../../migrations/0001_init.sql', import.meta.url), 'utf8');
const connection = await createConnection({ uri: url, multipleStatements: true });

try {
  await connection.query(sql);
  console.log('migration ok');
} finally {
  await connection.end();
}
