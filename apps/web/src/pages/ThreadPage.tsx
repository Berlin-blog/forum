import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError, fixContentHtml } from '../api';
import { useAuth } from '../auth';
import { ReplyForm } from '../components/ReplyForm';
import { PostNode } from '../components/PostNode';
import { ThreadSkeleton } from '../components/Skeleton';
import { formatTime } from '../format';
import type { FirstPost, Post, ThreadDetail } from '../types';

export function ThreadPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const threadId = Number(id);
  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [firstPost, setFirstPost] = useState<FirstPost | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [threadData, postData] = await Promise.all([
      api.get<{ thread: ThreadDetail; firstPost: FirstPost | null }>(`/api/threads/${threadId}`),
      api.get<{ items: Post[]; total: number }>(`/api/threads/${threadId}/posts?limit=20`),
    ]);
    setThread(threadData.thread);
    setFirstPost(threadData.firstPost);
    setPosts(postData.items);
    setTotal(postData.total);
  }, [threadId]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() => setError('主题不存在，或者 API 服务没启动'))
      .finally(() => setLoading(false));
  }, [load]);

  async function loadMore() {
    if (loadingMore || posts.length >= total) return;
    setLoadingMore(true);
    try {
      const data = await api.get<{ items: Post[]; total: number }>(
        `/api/threads/${threadId}/posts?limit=20&offset=${posts.length}`,
      );
      setPosts((current) => [...current, ...data.items]);
      setTotal(data.total);
    } finally {
      setLoadingMore(false);
    }
  }

  function beginEdit() {
    if (!thread || !firstPost) return;
    setEditTitle(thread.title);
    setEditContent(firstPost.contentMd);
    setEditing(true);
  }

  async function saveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!thread || saving) return;
    setSaving(true);
    setError('');
    try {
      await api.patch(`/api/threads/${thread.id}`, { title: editTitle, content: editContent });
      setEditing(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function deleteThread() {
    if (!thread) return;
    if (!window.confirm('删除这个主题？主题下的回复也会一起隐藏。')) return;
    try {
      await api.delete(`/api/threads/${thread.id}`);
      navigate(`/b/${thread.barSlug}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '删除失败');
    }
  }

  if (loading) return <ThreadSkeleton />;
  if (error && !thread) return <p className="notice error">{error}</p>;
  if (!thread) return null;

  const locked = thread.status !== 'open';
  const visiblePosts = posts.filter((post) => post.floor !== 1);
  const canEdit = user && (user.id === thread.authorId || user.userRole === 'admin');

  return (
    <div className="thread-page">
      <nav className="breadcrumb">
        <Link to="/">首页</Link>
        <span>/</span>
        <Link to={`/b/${thread.barSlug}`}>{thread.barName}</Link>
        <span>/</span>
        <span>主题</span>
      </nav>

      {error && <p className="notice error">{error}</p>}

      <header className="thread-header" data-reveal>
        <div className="thread-header-main">
          <h1>{thread.title}</h1>
          <div className="thread-meta">
            <span>@{thread.authorUsername}</span>
            <span>{formatTime(thread.createdAt)}</span>
            <span>{thread.viewCount} 浏览</span>
            <span>{thread.replyCount} 回复</span>
            {locked && <span className="badge locked">已锁定</span>}
          </div>
        </div>
        <div className="thread-actions">
          {canEdit && !editing && (
            <>
              <button className="link-btn" onClick={beginEdit}>编辑主题</button>
              <button className="link-btn danger" onClick={() => void deleteThread()}>删除</button>
            </>
          )}
        </div>
        <span className="thread-seal">谈</span>
      </header>

      {firstPost && (
        <article className="first-post" data-reveal>
          <span className="first-post-seal">帖</span>
          <div className="post-head">
            <span className="post-author">{thread.authorName}</span>
            <span className="muted small">楼主</span>
            {firstPost.editedAt && <span className="muted small">已编辑</span>}
          </div>

          {editing ? (
            <form className="edit-form" onSubmit={saveEdit}>
              <label>
                标题
                <input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} minLength={5} maxLength={120} required />
              </label>
              <label>
                正文
                <textarea value={editContent} onChange={(event) => setEditContent(event.target.value)} rows={10} required />
              </label>
              <div className="form-actions">
                <button type="button" className="btn ghost sm" onClick={() => setEditing(false)}>取消</button>
                <button className="btn primary sm" disabled={saving}>{saving ? '保存中…' : '保存修改'}</button>
              </div>
            </form>
          ) : (
            <div className="post-content" dangerouslySetInnerHTML={{ __html: fixContentHtml(firstPost.contentHtml) }} />
          )}
        </article>
      )}

      <section className="posts">
        {visiblePosts.map((post) => (
          <PostNode key={post.id} post={post} depth={0} onChanged={load} />
        ))}
        {visiblePosts.length === 0 && (
          <p className="muted">还没有回复，来抢二楼。</p>
        )}
        {posts.length < total && (
          <div className="load-more-wrap">
            <button className="btn ghost" onClick={() => void loadMore()} disabled={loadingMore}>
              {loadingMore ? '加载中…' : '加载更多楼层'}
            </button>
            <span className="muted small">已显示 {visiblePosts.length} / {Math.max(0, total - 1)} 回复</span>
          </div>
        )}
      </section>

      <section className="reply-box" data-reveal>
        <div className="section-head">
          <div className="section-title-wrap">
            <span className="section-index">复</span>
            <h2>回复主题</h2>
          </div>
          <span className="muted small">直接展示，无审核</span>
        </div>
        {locked ? (
          <p className="notice">主题已锁定，不能再回复。</p>
        ) : (
          <ReplyForm
            endpoint={`/api/threads/${thread.id}/posts`}
            onCreated={load}
            placeholder="回复这个主题，支持 Markdown"
          />
        )}
      </section>
    </div>
  );
}
