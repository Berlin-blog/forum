import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FastifyPluginAsync } from 'fastify';
import sharp from 'sharp';
import { db } from '../db/client';
import { attachments } from '../db/schema';
import { requireUser } from '../lib/guard';

export const uploadsDir = fileURLToPath(new URL('../../../../uploads/', import.meta.url));

const uploadsRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/uploads', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;

    let part;
    try {
      part = await request.file();
    } catch {
      return reply.code(413).send({ error: { code: 'FILE_TOO_LARGE', message: '图片不能超过 8MB' } });
    }

    if (!part) {
      return reply.code(400).send({ error: { code: 'NO_FILE', message: '请选择图片' } });
    }

    const mime = part.mimetype;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mime)) {
      return reply.code(400).send({ error: { code: 'INVALID_IMAGE', message: '只支持 JPG / PNG / WebP / GIF' } });
    }

    let buffer;
    try {
      buffer = await part.toBuffer();
    } catch {
      return reply.code(413).send({ error: { code: 'FILE_TOO_LARGE', message: '图片不能超过 8MB' } });
    }

    let image;
    try {
      image = await sharp(buffer, { animated: mime === 'image/gif' })
        .rotate()
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer({ resolveWithObject: true });
    } catch {
      return reply.code(400).send({ error: { code: 'INVALID_IMAGE', message: '图片无法解析' } });
    }

    const now = new Date();
    const folder = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
    const key = `${folder}/${randomUUID()}.webp`;
    const target = join(uploadsDir, key);
    await mkdir(join(uploadsDir, folder), { recursive: true });
    await writeFile(target, image.data);

    await db.insert(attachments).values([{
      uploaderId: user.id,
      objectKey: key,
      mimeType: 'image/webp',
      sizeBytes: image.data.length,
      width: image.info.width,
      height: image.info.height,
      createdAt: new Date(),
    }]);

    const url = `/uploads/${key}`;
    const dataUrl = `data:image/webp;base64,${image.data.toString('base64')}`;
    return reply.code(201).send({
      url,
      markdown: `![图片](${dataUrl})`,
      width: image.info.width,
      height: image.info.height,
      size: image.data.length,
    });
  });
};

export default uploadsRoutes;
