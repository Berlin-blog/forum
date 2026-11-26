import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { ListSkeleton } from '../components/Skeleton';
import { formatTime } from '../format';
import type { Bar, Category } from '../types';

const HISTORY_KEY = 'forum_search_history';
const HOT_SEARCHES = ['AI', '读书', '编程', '职场', '情感', '电影', '游戏', '热点'];

function readHistory() {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) as string[] : [];
  } catch {
    return [];
  }
}

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'));
  return (
    <>
      {parts.map((part, index) => (
        part.toLowerCase() === q.toLowerCase()
          ? <mark key={index}>{part}</mark>
          : <span key={index}>{part}</span>
      ))}
    </>
  );
}

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
  totals: { bars: number; users: number; threads: number };
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

type SearchType = 'all' | 'bar' | 'thread' | 'user';

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const initial = params.get('q') ?? '';
  const initialType = (params.get('type') as SearchType) || 'all';
  const [query, setQuery] = useState(initial);
  const [type, setType] = useState<SearchType>(initialType);
  const [bar, setBar] = useState(params.get('bar') ?? '');
  const [author, setAuthor] = useState(params.get('author') ?? '');
  const [categories, setCategories] = useState<Category[]>([]);
  const [history, setHistory] = useState<string[]>(readHistory);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  async function search(q: string, nextType: SearchType, offset = 0) {
    if (!q.trim()) return;
    if (offset === 0) {
      setLoading(true);
      setResult(null);
    } else {
      setLoadingMore(true);
    }
    setError('');
    try {
      const queryParams = new URLSearchParams({
        q: q.trim(),
        type: nextType,
        limit: '10',
        offset: String(offset),
      });
      if (bar) queryParams.set('bar', bar);
      if (author.trim()) queryParams.set('author', author.trim());
      const data = await api.get<SearchResult>(`/api/search?${queryParams.toString()}`);
      if (offset === 0) {
        setResult(data);
        setParams({ q: q.trim(), type: nextType, bar, author });
        const nextHistory = [q.trim(), ...history.filter((item) => item !== q.trim())].slice(0, 8);
        setHistory(nextHistory);
        try { window.localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory)); } catch { /* ignore */ }
      } else {
        setResult((current) => current ? {
          ...data,
          bars: [...current.bars, ...data.bars],
          users: [...current.users, ...data.users],
          threads: [...current.threads, ...data.threads],
        } : data);
      }
    } catch {
      setError('搜索失败，请稍后再试');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    api.get<{ categories: Category[] }>('/api/bars')
      .then((data) => setCategories(data.categories))
      .catch(() => undefined);
    if (initial.trim()) void search(initial, initialType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearHistory() {
    setHistory([]);
    try { window.localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    void search(query, type);
  }

  function switchType(nextType: SearchType) {
    setType(nextType);
    if (query.trim()) void search(query, nextType, 0);
  }

  const total = result?.total ?? 0;
  const currentCount = result ? result.bars.length + result.users.length + result.threads.length : 0;

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

      <div className="search-filter-panel">
        <label>
          吧
          <select value={bar} onChange={(event) => setBar(event.target.value)}>
            <option value="">全部吧</option>
            {categories.flatMap((category) => category.bars).map((item) => (
              <option key={item.id} value={item.slug}>{item.name}</option>
            ))}
          </select>
        </label>
        <label>
          作者
          <input
            value={author}
            onChange={(event) => setAuthor(event.target.value)}
            placeholder="用户名，可选"
            maxLength={32}
          />
        </label>
        {author && (
          <button type="button" className="btn ghost sm" onClick={() => setAuthor('')}>清除作者</button>
        )}
      </div>

      {(history.length > 0 || HOT_SEARCHES.length > 0) && (
        <div className="search-suggestions">
          {history.length > 0 && (
            <div className="suggestion-row">
              <span className="suggestion-label">最近</span>
              {history.map((item) => (
                <button key={item} className="suggestion-chip" onClick={() => { setQuery(item); void search(item, type); }}>
                  {item}
                </button>
              ))}
              <button className="suggestion-clear" onClick={clearHistory}>清空</button>
            </div>
          )}
          <div className="suggestion-row">
            <span className="suggestion-label">热门</span>
            {HOT_SEARCHES.map((item) => (
              <button key={item} className="suggestion-chip" onClick={() => { setQuery(item); void search(item, type); }}>
                {item}
              </button>
            ))}
          </div>
        </div>
      )}

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
      {loading && <ListSkeleton rows={4} />}
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
                <strong><Highlight text={thread.title} query={result.query} /></strong>
                <p><Highlight text={thread.excerpt || '暂无摘要'} query={result.query} /></p>
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

      {result && result.hasMore && (
        <div className="load-more-wrap">
          <button
            className="btn ghost"
            disabled={loadingMore}
            onClick={() => void search(query, type, result.offset + result.limit)}
          >
            {loadingMore ? '加载中…' : '加载更多'}
          </button>
          <span className="muted small">已显示 {currentCount} / {total}</span>
        </div>
      )}

      {result && total === 0 && (
        <div className="search-empty">
          <p>没有找到「{result.query}」。</p>
          <p className="muted">换一个更短的关键词，或者去这些地方逛逛：</p>
          <div className="search-empty-links">
            {categories.slice(0, 6).flatMap((category) => category.bars).slice(0, 6).map((item) => (
              <Link key={item.id} className="search-user-card" to={`/b/${item.slug}`}>
                <span className="bar-avatar">{item.name.slice(0, 1)}</span>
                <span><strong>{item.name}</strong><small className="muted">{item.threadCount} 主题</small></span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!result && !loading && (
        <div className="search-empty">
          <p>输入关键词开始搜索。</p>
          <p className="muted">支持中文，主题会匹配标题、首楼和所有回复。</p>
          <div className="search-empty-links">
            <Link className="btn ghost sm" to="/bars">浏览吧广场</Link>
            <Link className="btn ghost sm" to="/leaderboard">看清谈榜</Link>
            <Link className="btn ghost sm" to="/titles">逛称号墙</Link>
          </div>
        </div>
      )}
    </div>
  );
}
