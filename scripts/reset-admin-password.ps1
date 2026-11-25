$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Push-Location (Join-Path $root "apps\api")
try {
@'
import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import mysql from 'mysql2/promise';

const password = 'Adm-' + randomBytes(9).toString('base64url');
const hash = await argon2.hash(password, { type: argon2.argon2id });
const conn = await mysql.createConnection({
  uri: process.env.DATABASE_URL || 'mysql://forum:forum_dev_password@127.0.0.1:3307/forum',
});
await conn.execute('UPDATE users SET password_hash = ? WHERE username = ?', [hash, 'admin']);
await conn.end();
console.log('新的 admin 密码：' + password);
'@ | node --input-type=module -
} finally {
  Pop-Location
}
