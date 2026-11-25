import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { formatTime } from '../format';
import type { User } from '../types';

type UserThread = {
  id: number;
  title: string;
  replyCount: number;
  lastPostAt: string;
  barSlug: string;
  barName: string;
};

export function UserPage() {
  const { username = '' } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [threads, setThreads] = useState<UserThread[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<{ user: User; threads: UserThread[] }>(`/api/users/${encodeURIComponent(username)}`)
      .then((data) => {
        setUser(data.user);
        setThreads(data.threads);
      })
      .catch(() => setError('用户不存在'));
  }, [username]);

  if (error) return <p className="notice error">{error}</p>;
  if (!user) return <p className="muted">加载中…</p>;

  return (
    <div>
      <section className="profile-hero">
        <div className="avatar">{user.displayName.slice(0, 1)}</div>
        <div>
          <h1>{user.displayName}</h1>
          <p className="muted">@{user.username} · {user.userRole === 'admin' ? '管理员' : '成员'}</p>
          <p>{user.bio || '这个人很懒，还没有写简介。'}</p>
          <p className="muted small">加入于 {formatTime(user.createdAt)}</p>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>最近发布的主题</h2>
        </div>
        {threads.length === 0 ? (
          <p className="muted">还没有发布主题。</p>
        ) : (
          <div className="thread-list">
            {threads.map((thread) => (
              <Link className="thread-row" key={thread.id} to={`/t/${thread.id}`}>
                <div className="thread-main">
                  <div className="thread-title">{thread.title}</div>
                  <div className="thread-meta">
                    <span>{thread.barName}</span>
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
