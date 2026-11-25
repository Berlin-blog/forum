import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import type { Progress } from '../types';

export function LevelBadge({ level, compact }: { level: number; compact?: boolean }) {
  const tier = level >= 15 ? 'high' : level >= 8 ? 'mid' : 'low';
  return (
    <span className={`level-badge ${tier} ${compact ? 'compact' : ''}`}>
      <span className="level-badge-mark">Lv</span>
      <strong>{level}</strong>
    </span>
  );
}

export function XpBar({ progress, showLabel = true }: { progress: Progress; showLabel?: boolean }) {
  return (
    <div className="xp-wrap">
      {showLabel && (
        <div className="xp-label">
          <span>Lv.{progress.level}</span>
          <span>{progress.level >= 20 ? '已至满级' : `${progress.currentLevelExp} / ${progress.levelNeed} 经验`}</span>
        </div>
      )}
      <div className="xp-track">
        <span className="xp-fill" style={{ width: `${progress.percent}%` }} />
      </div>
    </div>
  );
}

export function CheckInButton() {
  const { user, refresh } = useAuth();
  const [checkedIn, setCheckedIn] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user) return;
    api.get<{ checkedIn: boolean; progress: Progress }>('/api/me/checkin')
      .then((data) => {
        setCheckedIn(data.checkedIn);
        setProgress(data.progress);
      })
      .catch(() => undefined);
  }, [user]);

  if (!user) return null;

  async function checkin() {
    if (busy || checkedIn) return;
    setBusy(true);
    try {
      const data = await api.post<{ checkedIn: boolean; awarded: number; progress: Progress }>('/api/checkin', {});
      setCheckedIn(data.checkedIn);
      setProgress(data.progress);
      setMessage(data.awarded ? `签到成功 +${data.awarded} 经验` : '今天已经签到过了');
      await refresh();
    } catch {
      setMessage('签到失败，请稍后再试');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="checkin-box">
      <div className="checkin-top">
        <span className="checkin-label">每日签到</span>
        <button className={`btn ${checkedIn ? 'ghost' : 'primary'} sm`} onClick={checkin} disabled={busy || checkedIn}>
          {checkedIn ? '今日已签到' : busy ? '签到中…' : '签到 +5 经验'}
        </button>
      </div>
      {progress && <XpBar progress={progress} />}
      {message && <p className="muted small">{message}</p>}
    </div>
  );
}

export function NotificationBell() {
  const { user } = useAuth();
  const location = useLocation();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }

    function load() {
      api.get<{ count: number }>('/api/notifications/unread-count')
        .then((data) => setCount(data.count))
        .catch(() => undefined);
    }

    function clear() {
      setCount(0);
    }

    load();
    window.addEventListener('notifications-read', clear);
    return () => window.removeEventListener('notifications-read', clear);
  }, [user, location.pathname]);

  if (!user) return null;

  return (
    <Link className="notification-bell" to="/notifications" aria-label="通知">
      <span className="bell-icon">铃</span>
      {count > 0 && <span className="bell-count">{count > 99 ? '99+' : count}</span>}
    </Link>
  );
}
