import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { GridSkeleton } from '../components/Skeleton';

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
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked' | 'level' | 'condition' | 'weekly'>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    api.get<{ items: TitleItem[] }>('/api/titles')
      .then((data) => setItems(data.items))
      .finally(() => setLoading(false));
  }, [user]);

  const unlocked = items.filter((item) => item.unlocked).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (q && !`${item.name} ${item.description} ${item.slug}`.toLowerCase().includes(q)) return false;
      if (filter === 'unlocked') return item.unlocked;
      if (filter === 'locked') return !item.unlocked;
      if (filter === 'level') return !item.conditionType;
      if (filter === 'condition') return Boolean(item.conditionType) && item.conditionType !== 'weekly_rank';
      if (filter === 'weekly') return item.conditionType === 'weekly_rank';
      return true;
    });
  }, [items, filter, query]);

  const filters: Array<[typeof filter, string]> = [
    ['all', '全部'],
    ['unlocked', '已解锁'],
    ['locked', '未解锁'],
    ['level', '等级'],
    ['condition', '行为'],
    ['weekly', '周榜限时'],
  ];

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

      {loading ? <GridSkeleton count={12} /> : (
        <>
          <div className="title-filter-bar">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索称号名或描述"
              aria-label="搜索称号"
            />
            <span className="muted small">筛选 {filtered.length} / {items.length}</span>
          </div>
          <div className="search-tabs title-tabs">
            {filters.map(([key, label]) => (
              <button key={key} className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>
                {label}
              </button>
            ))}
          </div>
          {filtered.length === 0 ? (
            <div className="empty"><p>没有符合条件的称号。</p></div>
          ) : (
            <div className="achievement-wall-grid">
              {filtered.map((item, index) => (
                <div
                  className={`wall-achievement title-wall-card ${item.unlocked ? 'unlocked' : 'locked'}`}
                  key={item.id}
                  data-reveal
                  style={{ animationDelay: `${Math.min(index, 8) * 25}ms` }}
                >
                  <span className="wall-achievement-icon">{item.icon}</span>
                  <div>
                    <strong>{item.name}</strong>
                    <p>{item.description}</p>
                    <span className="muted small">
                      {item.unlocked
                        ? item.expiresAt ? '已解锁 · 限时称号' : '已解锁'
                        : item.conditionType
                          ? item.conditionType === 'weekly_rank'
                            ? `每周第 ${item.conditionThreshold} 名`
                            : `${conditionLabels[item.conditionType] ?? item.conditionType} ≥ ${item.conditionThreshold}`
                          : `Lv.${item.minLevel} 解锁`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
