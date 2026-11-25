import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';

type AchievementWallItem = {
  id: number;
  slug: string;
  name: string;
  description: string;
  icon: string;
  conditionType: string;
  threshold: number;
  unlocked: boolean;
  unlockedAt: string | null;
};

export function AchievementWallPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<AchievementWallItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ items: AchievementWallItem[] }>('/api/achievements')
      .then((data) => setItems(data.items))
      .finally(() => setLoading(false));
  }, [user]);

  const unlocked = items.filter((item) => item.unlocked).length;

  return (
    <div className="achievement-wall-page">
      <div className="page-head" data-reveal>
        <div>
          <p className="eyebrow"><span className="eyebrow-rule" />雅集印记</p>
          <h1>成就墙</h1>
          <p className="muted">
            {user ? `已解锁 ${unlocked} / ${items.length}` : '登录后查看自己的解锁进度'}
          </p>
        </div>
        <Link className="btn ghost sm" to={user ? `/u/${user.username}` : '/login'}>
          {user ? '回到主页' : '去登录'}
        </Link>
      </div>

      {loading ? <p className="muted">加载中…</p> : (
        <div className="achievement-wall-grid">
          {items.map((item, index) => (
            <div
              className={`wall-achievement ${item.unlocked ? 'unlocked' : 'locked'}`}
              key={item.id}
              data-reveal
              style={{ animationDelay: `${index * 45}ms` }}
            >
              <span className="wall-achievement-icon">{item.icon}</span>
              <div>
                <strong>{item.name}</strong>
                <p>{item.description}</p>
                <span className="muted small">
                  {item.unlocked ? '已解锁' : `条件：${item.conditionType} ≥ ${item.threshold}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
