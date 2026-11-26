import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { LevelBadge } from './Growth';

type FollowUser = {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  level: number;
  titleName: string | null;
  titleIcon: string | null;
  isFollowing: boolean;
  isSelf: boolean;
};

type Props = {
  username: string;
  mode: 'followers' | 'following';
  onClose: () => void;
};

export function FollowListModal({ username, mode, onClose }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      const focusable = dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, textarea, [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [onClose]);

  useEffect(() => {
    api.get<{ items: FollowUser[] }>(`/api/users/${encodeURIComponent(username)}/${mode}`)
      .then((data) => setItems(data.items))
      .finally(() => setLoading(false));
  }, [username, mode]);

  async function toggleFollow(item: FollowUser) {
    if (!user || busyId) return;
    setBusyId(item.id);
    try {
      const data = await api.post<{ following: boolean }>(
        `/api/users/${encodeURIComponent(item.username)}/follow`,
        {},
      );
      setItems((current) => current.map((row) => (
        row.id === item.id ? { ...row, isFollowing: data.following } : row
      )));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="follow-modal"
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="follow-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="follow-modal-head">
          <div>
            <span className="eyebrow">{mode === 'followers' ? '粉丝' : '关注'}</span>
            <h2 id="follow-modal-title">{mode === 'followers' ? '粉丝列表' : '关注列表'}</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="关闭">×</button>
        </div>

        {loading ? <p className="muted">加载中…</p> : items.length === 0 ? (
          <p className="muted">暂时还没有人。</p>
        ) : (
          <div className="follow-list">
            {items.map((item) => (
              <div className="follow-row" key={item.id}>
                <Link className="follow-user" to={`/u/${item.username}`} onClick={onClose}>
                  <span className="user-dot">{item.displayName.slice(0, 1)}</span>
                  <span className="follow-user-main">
                    <strong>{item.displayName}</strong>
                    <span className="muted small">@{item.username}</span>
                    {item.titleName && <span className="follow-title">{item.titleIcon} {item.titleName}</span>}
                  </span>
                </Link>
                <LevelBadge level={item.level} compact />
                {!item.isSelf && (
                  user ? (
                    <button
                      className={`btn ${item.isFollowing ? 'ghost' : 'primary'} sm`}
                      disabled={busyId === item.id}
                      onClick={() => void toggleFollow(item)}
                    >
                      {busyId === item.id ? '…' : item.isFollowing ? '已关注' : '关注'}
                    </button>
                  ) : (
                    <Link className="btn ghost sm" to="/login">登录</Link>
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
