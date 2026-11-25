import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { formatTime } from '../format';
import type { Bar, ThreadSummary } from '../types';

export function BarPage() {
  const { slug = '' } = useParams();
  const { user } = useAuth();
  const [bar, setBar] = useState<Bar | null>(null);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<{ bar: Bar }>(`/api/bars/${slug}`),
      api.get<{ items: ThreadSummary[] }>(`/api/threads?bar=${encodeURIComponent(slug)}&limit=30`),
    ])
      .then(([barData, threadData]) => {
        setBar(barData.bar);
        setFollowing(Boolean(barData.bar.isFollowing));
        setThreads(threadData.items);
        setError('');
      })
      .catch(() => setError('这个吧不存在，或者 API 服务没启动'))
      .finally(() => setLoading(false));
  }, [slug]);

  async function toggleFollow() {
    if (!user) return;
    const data = await api.post<{ following: boolean; memberCount: number }>(`/api/bars/${slug}/follow`, {});
    setFollowing(data.following);
    setBar((current) => current ? { ...current, memberCount: data.memberCount } : current);
  }

  if (loading) return <p className="muted">加载中…</p>;
  if (error) return <p className="notice error">{error}</p>;
  if (!bar) return null;

  return (
    <div>
      <section className="bar-hero" data-reveal>
        <div className="bar-avatar large">{bar.name.slice(0, 1)}</div>
        <div className="bar-hero-main">
          <p className="eyebrow"><span className="eyebrow-rule" />吧</p>
          <h1>{bar.name}</h1>
          <p className="muted">{bar.description || '暂无简介'}</p>
          <div className="bar-stats">
            <span><strong>{bar.threadCount}</strong> 主题</span>
            <span><strong>{bar.postCount}</strong> 帖子</span>
            <span><strong>{bar.memberCount}</strong> 关注</span>
          </div>
        </div>
        <div className="bar-hero-actions">
          {user ? (
            <button className={`btn ${following ? 'ghost' : 'primary'} sm`} onClick={toggleFollow}>
              {following ? '已关注' : '关注此吧'}
            </button>
          ) : (
            <Link className="btn ghost sm" to="/login">登录后关注</Link>
          )}
          <Link className="btn primary sm" to={`/b/${bar.slug}/new`}>发主题</Link>
        </div>
        <span className="bar-hero-seal">谈</span>
      </section>

      <section className="section" data-reveal>
        <div className="section-head">
          <div className="section-title-wrap">
            <span className="section-index">录</span>
            <h2>主题列表</h2>
          </div>
          <span className="muted small">按最后回复排序</span>
        </div>
        {threads.length === 0 ? (
          <div className="empty">
            <p>这个吧还没有主题。</p>
            <Link className="btn primary sm" to={`/b/${bar.slug}/new`}>发第一帖</Link>
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
