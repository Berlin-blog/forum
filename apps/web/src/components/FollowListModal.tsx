import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { LevelBadge } from './Growth';

type FollowUser = {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  level: number;
  titleName: string | null;
  titleIcon: string | null;
};

type Props = {
  username: string;
  mode: 'followers' | 'following';
  onClose: () => void;
};

export function FollowListModal({ username, mode, onClose }: Props) {
  const [items, setItems] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ items: FollowUser[] }>(`/api/users/${encodeURIComponent(username)}/${mode}`)
      .then((data) => setItems(data.items))
      .finally(() => setLoading(false));
  }, [username, mode]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="follow-modal" onClick={(event) => event.stopPropagation()}>
        <div className="follow-modal-head">
          <div>
            <span className="eyebrow">{mode === 'followers' ? '粉丝' : '关注'}</span>
            <h2>{mode === 'followers' ? '粉丝列表' : '关注列表'}</h2>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {loading ? <p className="muted">加载中…</p> : items.length === 0 ? (
          <p className="muted">暂时还没有人。</p>
        ) : (
          <div className="follow-list">
            {items.map((item) => (
              <Link className="follow-row" key={item.id} to={`/u/${item.username}`} onClick={onClose}>
                <span className="user-dot">{item.displayName.slice(0, 1)}</span>
                <div>
                  <strong>{item.displayName}</strong>
                  <span className="muted small">@{item.username}</span>
                  {item.titleName && <span className="follow-title">{item.titleIcon} {item.titleName}</span>}
                </div>
                <LevelBadge level={item.level} compact />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
