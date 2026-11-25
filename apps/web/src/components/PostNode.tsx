import { useState } from 'react';
import { api } from '../api';
import { formatTime } from '../format';
import type { Post } from '../types';
import { ReplyForm } from './ReplyForm';

type Props = {
  post: Post;
  depth: number;
  onChanged?: () => void | Promise<void>;
};

export function PostNode({ post, depth, onChanged }: Props) {
  const [children, setChildren] = useState<Post[] | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showReply, setShowReply] = useState(false);

  const count = children?.length ?? post.childCount;

  async function loadChildren() {
    setLoading(true);
    try {
      const data = await api.get<{ items: Post[] }>(`/api/posts/${post.id}/children?limit=50`);
      setChildren(data.items);
      setOpen(true);
    } finally {
      setLoading(false);
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

  async function handleCreated() {
    setChildren(null);
    await loadChildren();
    setShowReply(false);
    await onChanged?.();
  }

  return (
    <article className={`post-node depth-${Math.min(depth, 3)}`} data-depth={depth}>
      <div className="post-head">
        <span className="post-author">{post.authorName}</span>
        <span className="muted small">@{post.authorUsername}</span>
        {post.floor ? <span className="floor">#{post.floor}</span> : <span className="floor nested">楼中楼</span>}
        <time className="muted small">{formatTime(post.createdAt)}</time>
      </div>

      <div className="post-content" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />

      <div className="post-actions">
        {count > 0 && (
          <button className="link-btn" onClick={toggleChildren} disabled={loading}>
            {loading ? '加载中…' : open ? `收起 ${count} 条回复` : `展开 ${count} 条回复`}
          </button>
        )}
        <button className="link-btn" onClick={() => setShowReply((value) => !value)}>
          {showReply ? '取消回复' : '回复'}
        </button>
      </div>

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
        </div>
      )}
    </article>
  );
}
