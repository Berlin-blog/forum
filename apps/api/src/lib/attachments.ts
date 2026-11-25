import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db/client';
import { attachments } from '../db/schema';
import { uploadsDir } from './paths';

export async function resolveAttachmentMarkdown(markdown: string, userId: number) {
  const ids = [...new Set(
    [...markdown.matchAll(/attachment:(\d+)/g)].map((match) => Number(match[1])),
  )].filter((id) => Number.isSafeInteger(id) && id > 0);

  if (!ids.length) return markdown;

  const rows = await db
    .select()
    .from(attachments)
    .where(and(eq(attachments.uploaderId, userId), inArray(attachments.id, ids)));

  let resolved = markdown;
  for (const row of rows) {
    try {
      const data = await readFile(join(uploadsDir, row.objectKey));
      const dataUrl = `data:${row.mimeType};base64,${data.toString('base64')}`;
      resolved = resolved.split(`attachment:${row.id}`).join(dataUrl);
    } catch {
      // Missing file: leave the token so the post can still be saved.
    }
  }
  return resolved;
}
