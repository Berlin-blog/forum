import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');

export const pool = mysql.createPool({
  uri: url,
  connectionLimit: 10,
  timezone: 'Z',
  charset: 'utf8mb4',
});

export const db = drizzle(pool, { schema, mode: 'default' });
