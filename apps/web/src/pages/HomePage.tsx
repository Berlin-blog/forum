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

  return (
    <div className="home">
      <section className="hero">
        <div>
          <p className="eyebrow">贴吧式综合社区</p>
          <h1>找一个感兴趣的吧，开始讨论。</h1>
          <p className="hero-text">
            自由注册，直接发帖，楼中楼不限层级。没有邀请码，也没有发帖前审核。
          </p>
          <div className="hero-actions">
            <Link className="btn primary" to="/bars">浏览吧广场</Link>
            {user ? (
              <Link className="btn ghost" to="/new">发一个主题</Link>
            ) : (
              <Link className="btn ghost" to="/register">注册账号</Link>
            )}
          </div>
        </div>
        <div className="hero-card">
          <span className="hero-card-label">当前状态</span>
          <strong>{categories.reduce((sum, category) => sum + category.bars.length, 0)} 个吧</strong>
          <span className="muted">内容直接发布 · 管理员事后处理</span>
        </div>
      </section>

      {error && <p className="notice error">{error}</p>}

      <section className="section">
        <div className="section-head">
          <h2>按分类逛吧</h2>
          <Link className="muted small" to="/bars">查看全部 →</Link>
        </div>
        {loading ? (
          <p className="muted">加载中…</p>
        ) : (
          <div className="category-grid">
            {categories.map((category) => (
              <div className="category-card" key={category.id}>
                <div className="category-title">{category.name}</div>
                <div className="bar-links">
                  {category.bars.map((bar) => (
                    <Link key={bar.id} className="bar-link" to={`/b/${bar.slug}`}>
                      <span>{bar.name}</span>
                      <span className="muted small">{bar.threadCount} 主题</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <h2>最新主题</h2>
          <Link className="muted small" to="/bars">去发帖 →</Link>
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
            {threads.map((thread) => (
              <Link className="thread-row" key={thread.id} to={`/t/${thread.id}`}>
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
