import type { FastifyReply, FastifyRequest } from 'fastify';
import { getSessionUser, type AuthUser } from './auth';

export async function requireUser(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<AuthUser | null> {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: '请先登录' } });
    return null;
  }

  const token = header.slice('Bearer '.length).trim();
  const user = await getSessionUser(token);
  if (!user) {
    reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: '登录已过期，请重新登录' } });
    return null;
  }

  request.user = user;
  request.token = token;
  return user;
}

export async function optionalUser(request: FastifyRequest): Promise<AuthUser | null> {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  const user = await getSessionUser(header.slice('Bearer '.length).trim());
  if (user) request.user = user;
  return user;
}
