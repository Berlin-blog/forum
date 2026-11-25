import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';

type TitleItem = {
  id: number;
  slug: string;
  name: string;
  description: string;
  icon: string;
  minLevel: number;
  conditionType: string | null;
  conditionThreshold: number | null;
  unlocked: boolean;
  acquiredAt: string | null;
  expiresAt: string | null;
};

const conditionLabels: Record<string, string> = {
  bars_created: '创建吧',
  bar_members: '吧成员',
  replies: '回复',
  followers: '粉丝',
  likes_received: '获赞',
  checkins: '签到',
  threads: '主题',
  night_posts: '深夜发帖',
  weekly_rank: '周榜排名',
};

export function TitlesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<TitleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ items: TitleItem[] }>('/api/titles')
      .then((data) => setItems(data.items))
      .finally(() => setLoading(false));
  }, [user]);

  const unlocked = items.filter((item) => item.unlocked).length;

  return (
    <div className="achievement-wall-page">
      <div className="page-head" data-reveal>
        <div>
          <p className="eyebrow"><span className="eyebrow-rule" />称号图鉴</p>
          <h1>称号墙</h1>
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
              className={`wall-achievement title-wall-card ${item.unlocked ? 'unlocked' : 'locked'}`}
              key={item.id}
              data-reveal
              style={{ animationDelay: `${index * 25}ms` }}
            >
              <span className="wall-achievement-icon">{item.icon}</span>
              <div>
                <strong>{item.name}</strong>
                <p>{item.description}</p>
                <span className="muted small">
                  {item.unlocked
                    ? item.expiresAt ? '已解锁 · 限时称号' : '已解锁'
                    : item.conditionType
                      ? `${conditionLabels[item.conditionType] ?? item.conditionType} ≥ ${item.conditionThreshold}`
                      : `Lv.${item.minLevel} 解锁`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
