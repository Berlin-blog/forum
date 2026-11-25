import { createHash } from 'node:crypto';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { bars, hotTopicPosts, posts, threads, users } from '../db/schema';
import { renderContent } from './content';

type HotTopic = {
  title: string;
  description: string;
  url: string;
  score?: number;
};

const SENSITIVE = /习近平|主席|外交|关税|政府|政治|战争|军事|导弹|走私|血样|凶杀|杀人|性侵|强奸|死亡|遇难|地震|火灾|疫情|肺炎|诈骗|判刑|落马|纪委|台独|乌克兰|俄罗斯/;

const BAR_RULES: Array<{ slug: string; pattern: RegExp }> = [
  { slug: 'programming', pattern: /编程|程序员|代码|开源|Python|Java|JavaScript|前端|后端|算法/ },
  { slug: 'internet', pattern: /AI|人工智能|科技|互联网|手机|苹果|华为|芯片|机器人|航天|神舟|卫星|数码|电动车|新能源/ },
  { slug: 'movie', pattern: /电影|电视剧|综艺|明星|演员|导演|票房|演唱会|歌手|剧集/ },
  { slug: 'game', pattern: /游戏|电竞|王者荣耀|原神|英雄联盟|Steam|主机|手游/ },
  { slug: 'study', pattern: /高考|考研|教育|学校|大学|学生|老师|读书|考试|留学|论文/ },
  { slug: 'career', pattern: /职场|工作|工资|裁员|招聘|就业|打工|公司|创业/ },
  { slug: 'emotion', pattern: /恋爱|婚姻|结婚|离婚|分手|情感|相亲|情侣/ },
  { slug: 'life', pattern: /健康|美食|天气|旅游|宠物|生活|医院|医生|睡眠|减肥|运动|跑步/ },
];

function decodeJsonString(raw: string) {
  try {
    return JSON.parse(`"${raw}"`) as string;
  } catch {
    return raw;
  }
}

async function fetchBaiduHot(): Promise<HotTopic[]> {
  const response = await fetch('https://top.baidu.com/board?tab=realtime', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`baidu hot http ${response.status}`);
  const html = await response.text();

  const words = [...html.matchAll(/"word":"((?:\\.|[^"\\])*)"/g)].map((match) => decodeJsonString(match[1]));
  const descs = [...html.matchAll(/"desc":"((?:\\.|[^"\\])*)"/g)].map((match) => decodeJsonString(match[1]));
  const urls = [...html.matchAll(/"rawUrl":"((?:\\.|[^"\\])*)"/g)].map((match) => decodeJsonString(match[1]));
  const scores = [...html.matchAll(/"hotScore":"(\d+)"/g)].map((match) => Number(match[1]));

  return words.slice(0, 30).map((title, index) => ({
    title,
    description: descs[index] ?? '',
    url: urls[index] ?? `https://www.baidu.com/s?wd=${encodeURIComponent(title)}`,
    score: scores[index],
  })).filter((topic) => topic.title && !SENSITIVE.test(topic.title + topic.description));
}

function pickBarSlug(topic: HotTopic) {
  const haystack = `${topic.title} ${topic.description}`;
  return BAR_RULES.find((rule) => rule.pattern.test(haystack))?.slug ?? null;
}

function fingerprint(title: string) {
  return createHash('sha256').update(title.replace(/\s+/g, ' ').trim().toLowerCase()).digest('hex');
}

let running = false;
let lastRun = 0;

export async function runHotBot(force = false) {
  if (running) return { posted: 0, skipped: 0, reason: 'running' };
  running = true;
  lastRun = Date.now();
  try {
    if (!force) {
      const [latest] = await db.select({ createdAt: hotTopicPosts.createdAt })
        .from(hotTopicPosts)
        .orderBy(desc(hotTopicPosts.createdAt))
        .limit(1);
      if (latest && Date.now() - latest.createdAt.getTime() < 2 * 60 * 60 * 1000) {
        return { posted: 0, skipped: 0, reason: 'cooldown' };
      }
    }

    const [bot] = await db.select({ id: users.id }).from(users)
      .where(and(eq(users.username, 'hotbot'), eq(users.userRole, 'bot')))
      .limit(1);
    if (!bot) {
      console.warn('[hotbot] bot account missing');
      return { posted: 0, skipped: 0, reason: 'missing-bot' };
    }

    const topics = await fetchBaiduHot();
    let posted = 0;
    let skipped = 0;

    for (const topic of topics) {
      if (posted >= 1) break;
      const barSlug = pickBarSlug(topic);
      if (!barSlug) continue;

      const hash = fingerprint(topic.title);
      const [seen] = await db.select({ id: hotTopicPosts.id }).from(hotTopicPosts)
        .where(eq(hotTopicPosts.fingerprint, hash)).limit(1);
      if (seen) {
        skipped += 1;
        continue;
      }

      const [bar] = await db.select({ id: bars.id, name: bars.name }).from(bars)
        .where(and(eq(bars.slug, barSlug), eq(bars.status, 'active'))).limit(1);
      if (!bar) continue;

      const title = `【热点】${topic.title}`.slice(0, 120);
      const sourceLabel = topic.url.includes('baidu.com') ? '百度热搜' : '公开热点';
      const markdown = [
        topic.description || '这条热点暂时只有标题，点开原文看看。',
        '',
        `[查看${sourceLabel}原文](${topic.url})`,
        '',
        '---',
        '由「热点播报」自动整理，每两小时更新一次。',
      ].join('\n');
      const { html, text } = renderContent(markdown);

      try {
        await db.transaction(async (tx) => {
          const [thread] = await tx.insert(threads).values([{
            barId: bar.id,
            authorId: bot.id,
            title,
            slug: `t-${hash.slice(0, 12)}`,
            status: 'open',
            lastPostAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          }]).$returningId();

          await tx.insert(posts).values([{
            threadId: thread.id,
            authorId: bot.id,
            parentId: null,
            floor: 1,
            contentMd: markdown,
            contentHtml: html,
            contentText: text,
            status: 'visible',
            createdAt: new Date(),
          }]);

          await tx.update(bars).set({
            threadCount: sql`thread_count + 1`,
            postCount: sql`post_count + 1`,
            lastThreadId: thread.id,
          }).where(eq(bars.id, bar.id));

          await tx.insert(hotTopicPosts).values([{
            fingerprint: hash,
            source: 'baidu',
            title,
            url: topic.url,
            barId: bar.id,
            threadId: thread.id,
            createdAt: new Date(),
          }]);
        });
        posted += 1;
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (code === 'ER_DUP_ENTRY') {
          skipped += 1;
          continue;
        }
        console.warn('[hotbot] post failed', error);
      }
    }

    if (posted || skipped) console.info(`[hotbot] posted=${posted} skipped=${skipped}`);
    return { posted, skipped, reason: 'ok' };
  } catch (error) {
    console.warn('[hotbot] run failed', error);
    return { posted: 0, skipped: 0, reason: 'error' };
  } finally {
    running = false;
  }
}

// Kept local to avoid importing sql only for a count expression.
export function startHotBotScheduler() {
  const interval = 2 * 60 * 60 * 1000;

  async function scheduleNext(delayOverride?: number) {
    let delay = delayOverride;
    if (delay === undefined) {
      const [latest] = await db.select({ createdAt: hotTopicPosts.createdAt })
        .from(hotTopicPosts)
        .orderBy(desc(hotTopicPosts.createdAt))
        .limit(1);
      const now = Date.now();
      const nextAt = latest ? latest.createdAt.getTime() + interval : now + 15_000;
      delay = Math.max(5_000, nextAt - now);
    }
    const timer = setTimeout(async () => {
      await runHotBot();
      await scheduleNext(interval);
    }, delay);
    timer.unref?.();
  }

  void scheduleNext();
  console.info('[hotbot] scheduler started: one post per 2h');
}

export function hotBotStatus() {
  return { running, lastRun };
}
