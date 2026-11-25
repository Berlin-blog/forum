import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { ReplyForm } from '../components/ReplyForm';
import { PostNode } from '../components/PostNode';
import { formatTime } from '../format';
import type { FirstPost, Post, ThreadDetail } from '../types';

export function ThreadPage() {
  const { id = '' } = useParams();
  const threadId = Number(id);
  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [firstPost, setFirstPost] = useState<FirstPost | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const [threadData, postData] = await Promise.all([
      api.get<{ thread: ThreadDetail; firstPost: FirstPost | null }>(`/api/threads/${threadId}`),
      api.get<{ items: Post[] }>(`/api/threads/${threadId}/posts?limit=30`),
    ]);
    setThread(threadData.thread);
    setFirstPost(threadData.firstPost);
    setPosts(postData.items);
  }, [threadId]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() => setError('主题不存在，或者 API 服务没启动'))
      .finally(() => setLoading(false));
  }, [load]);

  if (loading) return <p className="muted">加载中…</p>;
  if (error) return <p className="notice error">{error}</p>;
  if (!thread) return null;

  const locked = thread.status !== 'open';

  return (
    <div className="thread-page">
      <nav className="breadcrumb">
        <Link to="/">首页</Link>
        <span>/</span>
        <Link to={`/b/${thread.barSlug}`}>{thread.barName}</Link>
        <span>/</span>
        <span>主题</span>
      </nav>

      <header className="thread-header">
        <h1>{thread.title}</h1>
        <div className="thread-meta">
          <span>@{thread.authorUsername}</span>
          <span>{formatTime(thread.createdAt)}</span>
          <span>{thread.viewCount} 浏览</span>
          <span>{thread.replyCount} 回复</span>
          {locked && <span className="badge locked">已锁定</span>}
        </div>
      </header>

      {firstPost && (
        <article className="first-post">
          <div className="post-head">
            <span className="post-author">{thread.authorName}</span>
            <span className="muted small">楼主</span>
          </div>
          <div className="post-content" dangerouslySetInnerHTML={{ __html: firstPost.contentHtml }} />
        </article>
      )}

      <section className="posts">
        {posts.filter((post) => post.floor !== 1).map((post) => (
          <PostNode key={post.id} post={post} depth={0} onChanged={load} />
        ))}
        {posts.filter((post) => post.floor !== 1).length === 0 && (
          <p className="muted">还没有回复，来抢二楼。</p>
        )}
      </section>

      <section className="reply-box">
        <div className="section-head">
          <h2>回复主题</h2>
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
