import { useEffect, useRef, useState } from 'react';
import { api, ApiError, fixContentHtml } from '../api';
import { useAuth } from '../auth';
import { usePreferences } from '../preferences';
import { formatTime } from '../format';
import type { Post } from '../types';
import { ReplyForm } from './ReplyForm';

type Props = {
  post: Post;
  depth: number;
  onChanged?: () => void | Promise<void>;
};

export function PostNode({ post, depth, onChanged }: Props) {
  const { user } = useAuth();
  const { preferences } = usePreferences();
  const [children, setChildren] = useState<Post[] | null>(null);
  const [childTotal, setChildTotal] = useState(post.childCount);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.contentMd);
  const [localHtml, setLocalHtml] = useState(post.contentHtml);
  const [saving, setSaving] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState('');
  const autoLoaded = useRef(false);

  const count = childTotal;
  const canEdit = user && (user.id === post.authorId || user.userRole === 'admin');
  const hasMoreChildren = children !== null && children.length < childTotal;

  useEffect(() => {
    setLocalHtml(post.contentHtml);
  }, [post.contentHtml]);

  async function loadChildren(offset = 0) {
    if (offset === 0) setLoading(true);
    else setLoadingMore(true);
    try {
      const data = await api.get<{ items: Post[]; total: number }>(
        `/api/posts/${post.id}/children?limit=20&offset=${offset}`,
      );
      setChildTotal(data.total);
      if (offset === 0) setChildren(data.items);
      else setChildren((current) => [...(current ?? []), ...data.items]);
      setOpen(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  async function toggleChildren() {
    if (open) {
      setOpen(false);
      return;
    }
    if (children) {
      setOpen(true);
      return;
    }
    await loadChildren();
  }

  useEffect(() => {
    if (!preferences.autoExpandReplies || post.childCount === 0 || autoLoaded.current) return;
    autoLoaded.current = true;
    void loadChildren();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferences.autoExpandReplies, post.childCount]);

  async function handleCreated() {
    setChildren(null);
    await loadChildren();
    setShowReply(false);
    await onChanged?.();
  }

  async function saveEdit() {
    if (saving || !editContent.trim()) return;
    setSaving(true);
    setError('');
    try {
      const data = await api.patch<{ post: Post }>(`/api/posts/${post.id}`, { content: editContent });
      setLocalHtml(data.post.contentHtml);
      setEditContent(data.post.contentMd);
      setEditing(false);
      await onChanged?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function deletePost() {
    if (!window.confirm('删除这条回复？')) return;
    try {
      await api.delete(`/api/posts/${post.id}`);
      setDeleted(true);
      await onChanged?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '删除失败');
    }
  }

  if (deleted) return null;

  return (
    <article className={`post-node depth-${Math.min(depth, 3)}`} data-depth={depth} data-reveal>
      <span className="post-seal" aria-hidden="true">{post.floor ? '层' : '复'}</span>
      <div className="post-head">
        <span className="post-author">{post.authorName}</span>
        <span className="muted small">@{post.authorUsername}</span>
        {post.floor ? <span className="floor">#{post.floor}</span> : <span className="floor nested">楼中楼</span>}
        <time className="muted small">{formatTime(post.createdAt)}</time>
        {post.editedAt && <span className="muted small">已编辑</span>}
      </div>

      {editing ? (
        <div className="edit-form compact-edit">
          <textarea value={editContent} onChange={(event) => setEditContent(event.target.value)} rows={4} />
          {error && <p className="form-error">{error}</p>}
          <div className="form-actions">
            <button className="btn ghost sm" onClick={() => setEditing(false)}>取消</button>
            <button className="btn primary sm" onClick={() => void saveEdit()} disabled={saving || !editContent.trim()}>
              {saving ? '保存中…' : '保存'}
            </button>
          </div>
        </div>
      ) : (
        <div className="post-content" dangerouslySetInnerHTML={{ __html: fixContentHtml(localHtml) }} />
      )}

      <div className="post-actions">
        {count > 0 && (
          <button className="link-btn" onClick={toggleChildren} disabled={loading}>
            {loading ? '加载中…' : open ? `收起 ${count} 条回复` : `展开 ${count} 条回复`}
          </button>
        )}
        <button className="link-btn" onClick={() => setShowReply((value) => !value)}>
          {showReply ? '取消回复' : '回复'}
        </button>
        {canEdit && !editing && (
          <>
            <button className="link-btn" onClick={() => setEditing(true)}>编辑</button>
            <button className="link-btn danger" onClick={() => void deletePost()}>删除</button>
          </>
        )}
      </div>

      {error && !editing && <p className="form-error">{error}</p>}

      {showReply && (
        <ReplyForm
          endpoint={`/api/posts/${post.id}/replies`}
          onCreated={handleCreated}
          compact
          placeholder={`回复 ${post.authorName}`}
        />
      )}

      {open && children && children.length > 0 && (
        <div className="children">
          {children.map((child) => (
            <PostNode key={child.id} post={child} depth={depth + 1} onChanged={onChanged} />
          ))}
          {hasMoreChildren && (
            <div className="load-more-wrap compact-load-more">
              <button className="btn ghost sm" onClick={() => void loadChildren(children.length)} disabled={loadingMore}>
                {loadingMore ? '加载中…' : '加载更多回复'}
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
