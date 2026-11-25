import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { formatTime } from '../format';
import { useAuth } from '../auth';
import type { Category, ThreadSummary } from '../types';

export function HomePage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<{ categories: Category[] }>('/api/bars'),
      api.get<{ items: ThreadSummary[] }>('/api/threads?limit=20'),
    ])
      .then(([barsData, threadsData]) => {
        setCategories(barsData.categories);
        setThreads(threadsData.items);
      })
      .catch(() => setError('加载失败，请确认 API 服务已启动'))
      .finally(() => setLoading(false));
  }, []);

  const barCount = categories.reduce((sum, category) => sum + category.bars.length, 0);

  return (
    <div className="home">
      <section className="hero" data-reveal>
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
          <p className="hero-text">
            自由注册，直接发帖，楼中楼不限层级。没有邀请码，也没有发帖前审核。
            清谈不论高低，雅俗皆可入席。
          </p>
          <div className="hero-actions">
            <Link className="btn primary" to="/bars">浏览吧广场</Link>
            {user ? (
              <Link className="btn ghost" to="/new">发一个主题</Link>
            ) : (
              <Link className="btn ghost" to="/register">注册账号</Link>
            )}
          </div>
          <div className="hero-meta">
            <span>自由注册</span>
            <span>直接发帖</span>
            <span>楼中楼不限层级</span>
          </div>
        </div>

        <div className="hero-card">
          <span className="hero-card-seal">雅</span>
          <span className="hero-card-label">今日雅集</span>
          <strong>{barCount} 个吧</strong>
          <span className="hero-card-sub">内容直接发布 · 管理员事后处理</span>
          <span className="hero-card-rule" />
          <span className="hero-card-foot">清谈 · 分享 · 求助</span>
        </div>

        <div className="hero-vertical" aria-hidden="true">谈笑有鸿儒 · 往来无白丁</div>
      </section>

      {error && <p className="notice error">{error}</p>}

      <section className="section" data-reveal>
        <div className="section-head">
          <div className="section-title-wrap">
            <span className="section-index">壹</span>
            <h2>按分类逛吧</h2>
          </div>
          <Link className="section-link" to="/bars">查看全部 <span>→</span></Link>
        </div>
        {loading ? (
          <p className="muted">加载中…</p>
        ) : (
          <div className="category-grid">
            {categories.map((category, index) => (
              <div
                className="category-card"
                key={category.id}
                data-reveal
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <span className="card-corner tl" aria-hidden="true" />
                <span className="card-corner br" aria-hidden="true" />
                <div className="category-title">
                  <span className="category-mark">◆</span>
                  {category.name}
                </div>
                <div className="bar-links">
                  {category.bars.map((bar) => (
                    <Link key={bar.id} className="bar-link" to={`/b/${bar.slug}`}>
                      <span className="bar-link-name">
                        <span className="gold-dot" />
                        {bar.name}
                      </span>
                      <span className="muted small">{bar.threadCount} 主题</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section" data-reveal>
        <div className="section-head">
          <div className="section-title-wrap">
            <span className="section-index">贰</span>
            <h2>最新主题</h2>
          </div>
          <Link className="section-link" to="/bars">去发帖 <span>→</span></Link>
        </div>
        {loading ? (
          <p className="muted">加载中…</p>
        ) : threads.length === 0 ? (
          <div className="empty">
            <p>还没有主题。</p>
            <Link className="btn primary sm" to={user ? '/new' : '/register'}>
              {user ? '发第一帖' : '注册后发第一帖'}
            </Link>
          </div>
        ) : (
          <div className="thread-list">
            {threads.map((thread, index) => (
              <Link
                className="thread-row"
                key={thread.id}
                to={`/t/${thread.id}`}
                data-reveal
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <span className="thread-index">{String(index + 1).padStart(2, '0')}</span>
                <div className="thread-main">
                  <div className="thread-title">
                    {thread.isPinned && <span className="badge pinned">置顶</span>}
                    {thread.isFeatured && <span className="badge featured">精华</span>}
                    {thread.title}
                  </div>
                  <div className="thread-meta">
                    <span>{thread.barName}</span>
                    <span>@{thread.authorUsername}</span>
                    <span>{formatTime(thread.lastPostAt)}</span>
                  </div>
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
  );
}
