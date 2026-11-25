import type { FastifyPluginAsync } from 'fastify';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { bars, categories } from '../db/schema';

const barsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/bars', async () => {
    const rows = await db
      .select({
        categoryId: categories.id,
        categorySlug: categories.slug,
        categoryName: categories.name,
        categorySort: categories.sortOrder,
        id: bars.id,
        slug: bars.slug,
        name: bars.name,
        description: bars.description,
        threadCount: bars.threadCount,
        postCount: bars.postCount,
        memberCount: bars.memberCount,
      })
      .from(bars)
      .innerJoin(categories, eq(categories.id, bars.categoryId))
      .where(eq(bars.status, 'active'))
      .orderBy(asc(categories.sortOrder), asc(bars.sortOrder), asc(bars.id));

    const grouped = new Map<number, {
      id: number;
      slug: string;
      name: string;
      bars: Array<typeof rows[number] & { categoryId?: number; categorySlug?: string; categoryName?: string; categorySort?: number }>;
    }>();

    for (const row of rows) {
      let category = grouped.get(row.categoryId);
      if (!category) {
        category = {
          id: row.categoryId,
          slug: row.categorySlug,
          name: row.categoryName,
          bars: [],
        };
        grouped.set(row.categoryId, category);
      }
      category.bars.push(row);
    }

    return { categories: [...grouped.values()] };
  });

  app.get('/api/bars/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const [bar] = await db
      .select()
      .from(bars)
      .where(and(eq(bars.slug, slug), eq(bars.status, 'active')))
      .limit(1);

    if (!bar) {
      return reply.code(404).send({ error: { code: 'BAR_NOT_FOUND', message: '吧不存在' } });
    }

    return { bar };
  });
};

export default barsRoutes;
