import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { usePreferences } from '../preferences';
import { formatTime } from '../format';
import type { NotificationItem } from '../types';

function notificationText(item: NotificationItem) {
  if (item.type === 'reply' && item.actorName) {
    return `${item.actorName} 回复了你的帖子`;
  }
  if (item.type === 'system' && item.payload?.kind === 'level') {
    return `你升到了 Lv.${item.payload.level}`;
  }
  if (item.type === 'system' && item.payload?.kind === 'follow') {
    return `${item.actorName ?? '有人'} 关注了你`;
  }
  if (item.type === 'system') return '系统通知';
  if (item.type === 'moderation') return '吧务处理通知';
  return item.actorName ? `${item.actorName} 与你互动` : '新的消息';
}

export function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const { preferences } = usePreferences();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  async function load() {
    const data = await api.get<{ items: NotificationItem[] }>('/api/notifications');
    setItems(data.items);
    setLoading(false);
  }

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    load().catch(() => setLoading(false));
    if (!preferences.notificationPolling) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        load().catch(() => undefined);
      }
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [user, preferences.notificationPolling]);

  async function markRead(item: NotificationItem) {
    if (item.readAt) return;
    setItems((current) => current.map((row) => (
      row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row
    )));
    try {
      await api.post(`/api/notifications/${item.id}/read`, {});
      window.dispatchEvent(new Event('notifications-updated'));
    } catch {
      // Keep the optimistic state; the next poll will reconcile.
    }
  }

  async function markAllRead() {
    await api.post('/api/notifications/read', {});
    setItems((current) => current.map((item) => ({ ...item, readAt: new Date().toISOString() })));
    setMessage('全部标记为已读');
    window.dispatchEvent(new Event('notifications-read'));
  }

  if (authLoading) return <p className="muted">加载中…</p>;
  if (!user) {
    return (
      <div className="empty">
        <h1>登录后查看通知</h1>
        <Link className="btn primary" to="/login">去登录</Link>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <div className="page-head" data-reveal>
        <div>
          <p className="eyebrow"><span className="eyebrow-rule" />消息</p>
          <h1>通知</h1>
          <p className="muted">有人回复你、你升级时，都会留在这里。</p>
        </div>
        <button className="btn ghost sm" onClick={markAllRead}>全部已读</button>
      </div>

      {message && <p className="notice">{message}</p>}
      {loading ? <p className="muted">加载中…</p> : items.length === 0 ? (
        <div className="empty">
          <p>还没有通知。去发个帖，或者回复别人。</p>
        </div>
      ) : (
        <div className="notification-list" data-reveal>
          {items.map((item) => (
            <div
              className={`notification-row ${item.readAt ? '' : 'unread'}`}
              key={item.id}
              onClick={() => void markRead(item)}
            >
              <span className="notification-seal">{item.type === 'system' ? '级' : '复'}</span>
              <div className="notification-main">
                <p>
                  {item.threadId ? (
                    <Link to={`/t/${item.threadId}`}>{notificationText(item)}</Link>
                  ) : notificationText(item)}
                </p>
                {item.threadTitle && <span className="notification-sub">《{item.threadTitle}》</span>}
                <time className="muted small">{formatTime(item.createdAt)}</time>
              </div>
              {!item.readAt && <span className="unread-dot" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
