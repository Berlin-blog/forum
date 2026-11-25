import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { formatTime } from '../format';
import type { Bar } from '../types';

type SearchThread = {
  id: number;
  title: string;
  replyCount: number;
  createdAt: string;
  barSlug: string;
  barName: string;
  authorName: string;
  authorUsername: string;
  excerpt: string;
};

type SearchResult = {
  query: string;
  bars: Bar[];
  users: Array<{
    id: number;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    level: number;
    bio: string;
  }>;
  threads: SearchThread[];
};

type SearchType = 'all' | 'bar' | 'thread' | 'user';

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const initial = params.get('q') ?? '';
  const initialType = (params.get('type') as SearchType) || 'all';
  const [query, setQuery] = useState(initial);
  const [type, setType] = useState<SearchType>(initialType);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function search(q: string, nextType: SearchType) {
    if (!q.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.get<SearchResult>(
        `/api/search?q=${encodeURIComponent(q.trim())}&type=${nextType}`,
      );
      setResult(data);
      setParams({ q: q.trim(), type: nextType });
    } catch {
      setError('搜索失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initial.trim()) void search(initial, initialType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    void search(query, type);
  }

  function switchType(nextType: SearchType) {
    setType(nextType);
    if (query.trim()) void search(query, nextType);
  }

  const total = result ? result.bars.length + result.users.length + result.threads.length : 0;

  return (
    <div className="search-page">
      <div className="page-head" data-reveal>
        <div>
          <p className="eyebrow"><span className="eyebrow-rule" />寻</p>
          <h1>搜索</h1>
          <p className="muted">找人、找吧、找一段清谈。</p>
        </div>
      </div>

      <form className="search-form panel" onSubmit={submit} data-reveal>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="输入关键词，例如：编程、读书、Demo"
          autoFocus
          maxLength={64}
        />
        <button className="btn primary" disabled={loading || !query.trim()}>
          {loading ? '搜索中…' : '搜索'}
        </button>
      </form>

      <div className="search-tabs">
        {([
          ['all', '全部'],
          ['thread', '主题'],
          ['bar', '吧'],
          ['user', '用户'],
        ] as Array<[SearchType, string]>).map(([key, label]) => (
          <button
            key={key}
            className={type === key ? 'active' : ''}
            onClick={() => switchType(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="notice error">{error}</p>}
      {result && <p className="muted small">找到 {total} 条结果</p>}

      {result && result.threads.length > 0 && (
        <section className="search-section" data-reveal>
          <div className="section-head">
            <div className="section-title-wrap">
              <span className="section-index">帖</span>
              <h2>主题</h2>
            </div>
          </div>
          <div className="search-list">
            {result.threads.map((thread) => (
              <Link className="search-thread" key={thread.id} to={`/t/${thread.id}`}>
                <strong>{thread.title}</strong>
                <p>{thread.excerpt || '暂无摘要'}</p>
                <span className="muted small">
                  {thread.barName} · @{thread.authorUsername} · {formatTime(thread.createdAt)} · {thread.replyCount} 回复
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {result && result.bars.length > 0 && (
        <section className="search-section" data-reveal>
          <div className="section-head">
            <div className="section-title-wrap">
              <span className="section-index">吧</span>
              <h2>吧</h2>
            </div>
          </div>
          <div className="search-user-grid">
            {result.bars.map((bar) => (
              <Link className="search-user-card" key={bar.id} to={`/b/${bar.slug}`}>
                <span className="bar-avatar">{bar.name.slice(0, 1)}</span>
                <span>
                  <strong>{bar.name}</strong>
                  <small className="muted">{bar.description || '暂无简介'}</small>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {result && result.users.length > 0 && (
        <section className="search-section" data-reveal>
          <div className="section-head">
            <div className="section-title-wrap">
              <span className="section-index">人</span>
              <h2>用户</h2>
            </div>
          </div>
          <div className="search-user-grid">
            {result.users.map((user) => (
              <Link className="search-user-card" key={user.id} to={`/u/${user.username}`}>
                <span className="avatar small-avatar">{user.displayName.slice(0, 1)}</span>
                <span>
                  <strong>{user.displayName}</strong>
                  <small className="muted">@{user.username} · Lv.{user.level}</small>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {result && total === 0 && (
        <div className="empty">
          <p>没有找到「{result.query}」。</p>
          <p className="muted">换一个更短的关键词，或者去发一个新帖。</p>
        </div>
      )}

      {!result && !loading && (
        <div className="empty">
          <p>输入关键词开始搜索。</p>
          <p className="muted">支持中文，主题会同时匹配标题与首楼正文。</p>
        </div>
      )}
    </div>
  );
}
