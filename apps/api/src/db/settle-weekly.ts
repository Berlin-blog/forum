import 'dotenv/config';
import { pool } from './client';
import { settlePreviousWeek } from '../lib/weekly';

const result = await settlePreviousWeek();
console.log(result);
await pool.end();
