import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { CheckInButton, LevelBadge, XpBar } from '../components/Growth';
import { HomeSkeleton } from '../components/Skeleton';
import { formatTime } from '../format';
import type { Category, Progress, ThreadSummary } from '../types';

type Leader = {
  rank: number;
  id: number;
  username: string;
  displayName: string;
  level: number;
  exp: number;
  titleName: string | null;
  titleIcon: string | null;
};

type DailyTask = {
  key: string;
  label: string;
  description: string;
  progress: number;
  target: number;
  reward: string;
  done: boolean;
};

type HomeData = {
  categories: Category[];
  latest: ThreadSummary[];
  featured: ThreadSummary[];
  leaderboard: Leader[];
  tasks: DailyTask[];
  stats: { users: number; threads: number; bars: number };
  userProgress: Progress | null;
};

function ThreadMeta({ thread }: { thread: ThreadSummary }) {
  return (
    <div className="thread-meta">
      <span>{thread.barName}</span>
      <span>@{thread.authorUsername}</span>
      <span>{formatTime(thread.lastPostAt)}</span>
    </div>
  );
}

export function HomePage() {
  const { user } = useAuth();
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<HomeData>('/api/home')
      .then(setData)
      .catch(() => setError('加载失败，请确认 API 服务已启动'))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return <HomeSkeleton />;
  }

  if (error || !data) {
    return <p className="notice error">{error || '加载失败'}</p>;
  }

  const featuredMain = data.featured[0];
  const featuredRest = data.featured.slice(1, 3);
  const barCount = data.categories.reduce((sum, category) => sum + category.bars.length, 0);

  return (
    <div className="home">
      <section className="hero home-hero" data-reveal>
        <div className="hero-ink" aria-hidden="true" />
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="eyebrow-rule" />
            东方雅集 · 贴吧式社区
          </p>
          <h1 className="hero-title">
            <span className="hero-line">找一个</span>
            <span className="hero-line"><em>感兴趣</em>的吧，</span>
            <span className="hero-line">开始讨论。</span>
          </h1>
          <p className="hero-text">清谈不论高低，雅俗皆可入席。</p>
          <div className="hero-actions">
            <Link className="btn primary" to="/bars">浏览吧广场</Link>
            {user ? (
              <Link className="btn ghost" to="/new">发一个主题</Link>
            ) : (
              <Link className="btn ghost" to="/register">注册账号</Link>
            )}
          </div>
          <div className="hero-meta">
            <span>{data.stats.users} 位来客</span>
            <span>{data.stats.threads} 个主题</span>
            <span>{data.stats.bars} 个吧</span>
          </div>
        </div>

        <div className="hero-card featured-card">
          <span className="hero-card-seal">雅</span>
          <span className="hero-card-label">今日雅集 · 精选</span>
          {featuredMain ? (
            <>
              <Link className="featured-card-title" to={`/t/${featuredMain.id}`}>{featuredMain.title}</Link>
              <ThreadMeta thread={featuredMain} />
              <span className="hero-card-rule" />
              <Link className="featured-card-link" to={`/t/${featuredMain.id}`}>入席一读 <span>→</span></Link>
            </>
          ) : (
            <span className="hero-card-sub">还没有精选主题，去发第一帖。</span>
          )}
          <span className="hero-card-foot">清谈 · 分享 · 求助</span>
        </div>

        <div className="hero-vertical" aria-hidden="true">谈笑有鸿儒 · 往来无白丁</div>
      </section>

      <div className="home-grid">
        <div className="home-main">
          <section className="section home-featured" data-reveal>
            <div className="section-head">
              <div className="section-title-wrap">
                <span className="section-index">选</span>
                <h2>本周清谈</h2>
              </div>
              <Link className="section-link" to="/bars">去逛逛 <span>→</span></Link>
            </div>
            {featuredMain ? (
              <div className="featured-layout">
                <Link className="featured-main" to={`/t/${featuredMain.id}`}>
                  <span className="featured-number">01</span>
                  <div>
                    <h3>{featuredMain.title}</h3>
                    <ThreadMeta thread={featuredMain} />
                    <p className="featured-excerpt">
                      {featuredMain.replyCount > 0
                        ? `${featuredMain.replyCount} 条回复正在等待你的加入。`
                        : '一席初开，等你落座。'}
                    </p>
                  </div>
                  <span className="featured-arrow">→</span>
                </Link>
                <div className="featured-side">
                  {featuredRest.length ? featuredRest.map((thread, index) => (
                    <Link className="featured-side-row" key={thread.id} to={`/t/${thread.id}`}>
                      <span className="featured-side-number">0{index + 2}</span>
                      <div>
                        <strong>{thread.title}</strong>
                        <ThreadMeta thread={thread} />
                      </div>
                    </Link>
                  )) : (
                    <div className="featured-side-row">
                      <span className="featured-side-number">02</span>
                      <div>
                        <strong>下一席，等你来开</strong>
                        <span className="muted small">去发一个主题，让这里热闹起来。</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="empty"><p>还没有主题。</p></div>
            )}
          </section>

          <section className="section" data-reveal>
            <div className="section-head">
              <div className="section-title-wrap">
                <span className="section-index">新</span>
                <h2>正在发生</h2>
              </div>
              <span className="muted small">按最后回复排序</span>
            </div>
            {data.latest.length === 0 ? (
              <div className="empty">
                <p>还没有主题。</p>
                <Link className="btn primary sm" to={user ? '/new' : '/register'}>
                  {user ? '发第一帖' : '注册后发第一帖'}
                </Link>
              </div>
            ) : (
              <div className="thread-list">
                {data.latest.map((thread, index) => (
                  <Link
                    className="thread-row"
                    key={thread.id}
                    to={`/t/${thread.id}`}
                    data-reveal
                    style={{ animationDelay: `${index * 45}ms` }}
                  >
                    <span className="thread-index">{String(index + 1).padStart(2, '0')}</span>
                    <div className="thread-main">
                      <div className="thread-title">
                        {thread.isPinned && <span className="badge pinned">置顶</span>}
                        {thread.isFeatured && <span className="badge featured">精华</span>}
                        {thread.authorRole === 'bot' && <span className="bot-badge">机器人</span>}
                        {thread.title}
                      </div>
                      <ThreadMeta thread={thread} />
                    </div>
                    <div className="thread-stats">
                      <strong>{thread.replyCount}</strong>
                      <span>回复</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="home-side">
          {user && data.userProgress && (
            <section className="panel home-side-card" data-reveal>
              <div className="side-card-head">
                <span className="side-card-kicker">我的席位</span>
                <Link className="section-link" to={`/u/${user.username}`}>主页 <span>→</span></Link>
              </div>
              <div className="side-user">
                <span className="user-dot">{user.displayName.slice(0, 1)}</span>
                <div>
                  <strong>{user.displayName}</strong>
                  <span className="muted small">@{user.username}</span>
                </div>
                <LevelBadge level={data.userProgress.level} />
              </div>
              <XpBar progress={data.userProgress} />
              <CheckInButton />
            </section>
          )}

          <section className="panel home-side-card" data-reveal>
            <div className="side-card-head">
              <span className="side-card-kicker">清谈榜</span>
              <Link className="section-link" to="/leaderboard">全部 <span>→</span></Link>
            </div>
            <div className="mini-leaderboard">
              {data.leaderboard.map((leader) => (
                <Link className="mini-leader-row" key={leader.id} to={`/u/${leader.username}`}>
                  <span className={`mini-rank rank-${leader.rank}`}>{String(leader.rank).padStart(2, '0')}</span>
                  <span className="user-dot mini-dot">{leader.displayName.slice(0, 1)}</span>
                  <span className="mini-leader-main">
                    <strong>{leader.displayName}</strong>
                    <small>{leader.titleName ?? `Lv.${leader.level}`}</small>
                  </span>
                  <span className="mini-level">Lv.{leader.level}</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="panel home-side-card" data-reveal>
            <div className="side-card-head">
              <span className="side-card-kicker">今日课业</span>
              <Link className="section-link" to={user ? `/u/${user.username}` : '/login'}>详情 <span>→</span></Link>
            </div>
            {data.tasks.length ? (
              <div className="daily-task-list">
                {data.tasks.map((task) => (
                  <div className={`daily-task ${task.done ? 'done' : ''}`} key={task.key}>
                    <div className="daily-task-head">
                      <strong>{task.label}</strong>
                      <span className="muted small">{task.progress} / {task.target}</span>
                    </div>
                    <p>{task.description} · {task.reward}</p>
                    <div className="daily-task-track"><span style={{ width: `${Math.min(100, (task.progress / task.target) * 100)}%` }} /></div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted small">登录后查看今日任务，发帖、回复、签到都能积累经验。</p>
            )}
            <Link className="side-foot-link" to="/achievements">去成就墙看看 <span>→</span></Link>
          </section>

          <section className="panel home-side-card home-quote" data-reveal>
            <span className="quote-seal">记</span>
            <p>“清谈可以饱，梦想接无由。”</p>
            <span className="muted small">— 今日一记</span>
          </section>
        </aside>
      </div>

      <section className="section home-categories" data-reveal>
        <div className="section-head">
          <div className="section-title-wrap">
            <span className="section-index">园</span>
            <h2>游园 · 按分类逛吧</h2>
          </div>
          <Link className="section-link" to="/bars">全部 <span>→</span></Link>
        </div>
        <div className="category-grid compact-grid">
          {data.categories.map((category, index) => (
            <div className="category-card" key={category.id} data-reveal style={{ animationDelay: `${index * 60}ms` }}>
              <div className="category-title">
                <span className="category-mark">◆</span>
                {category.name}
              </div>
              <div className="bar-links">
                {category.bars.map((bar) => (
                  <Link key={bar.id} className="bar-link" to={`/b/${bar.slug}`}>
                    <span className="bar-link-name"><span className="gold-dot" />{bar.name}</span>
                    <span className="muted small">{bar.threadCount} 主题</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
