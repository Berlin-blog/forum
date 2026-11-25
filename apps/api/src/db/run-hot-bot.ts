import 'dotenv/config';
import { pool } from './client';
import { runHotBot } from '../lib/hot-bot';

const result = await runHotBot(true);
console.log(result);
await pool.end();
