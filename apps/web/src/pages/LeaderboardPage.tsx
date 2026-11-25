import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { LevelBadge } from '../components/Growth';

type Leader = {
  rank: number;
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  level: number;
  exp?: number;
  weeklyExp?: number;
  titleName: string | null;
  titleIcon: string | null;
};

type View = 'all' | 'weekly';

export function LeaderboardPage() {
  const [items, setItems] = useState<Leader[]>([]);
  const [view, setView] = useState<View>('all');
  const [weekStart, setWeekStart] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const endpoint = view === 'weekly' ? '/api/leaderboard/weekly' : '/api/leaderboard?limit=50';
    api.get<{ items: Leader[]; weekStart?: string }>(endpoint)
      .then((data) => {
        setItems(data.items);
        setWeekStart(data.weekStart ?? '');
      })
      .finally(() => setLoading(false));
  }, [view]);

  return (
    <div className="leaderboard-page">
      <div className="page-head" data-reveal>
        <div>
          <p className="eyebrow"><span className="eyebrow-rule" />清谈榜</p>
          <h1>{view === 'weekly' ? '本周清谈榜' : '等级榜'}</h1>
          <p className="muted">
            {view === 'weekly'
              ? `按本周经验排序，${weekStart ? `${weekStart} 起` : '每周一结算'}。前三名获得 7 天限时称号。`
              : '以等级与经验为序，记录每一位久坐清谈的人。demo、管理员、机器人不参与排名。'}
          </p>
        </div>
      </div>

      <div className="search-tabs leaderboard-tabs">
        <button className={view === 'all' ? 'active' : ''} onClick={() => setView('all')}>总榜</button>
        <button className={view === 'weekly' ? 'active' : ''} onClick={() => setView('weekly')}>本周榜</button>
      </div>

      {loading ? <p className="muted">加载中…</p> : (
        <div className="leaderboard-list" data-reveal>
          {items.length === 0 && <p className="muted">这一周还没有人上榜，去发帖或回复吧。</p>}
          {items.map((item) => (
            <Link className={`leader-row rank-${item.rank}`} key={item.id} to={`/u/${item.username}`}>
              <span className="leader-rank">{String(item.rank).padStart(2, '0')}</span>
              <span className="user-dot leader-avatar">{item.displayName.slice(0, 1)}</span>
              <div className="leader-main">
                <div className="leader-name">
                  <strong>{item.displayName}</strong>
                  <LevelBadge level={item.level} compact />
                  {item.titleName && (
                    <span className="leader-title">
                      {item.titleIcon} {item.titleName}
                    </span>
                  )}
                </div>
                <span className="muted small">
                  @{item.username} · {view === 'weekly' ? `${item.weeklyExp ?? 0} 本周经验` : `${item.exp ?? 0} 经验`}
                </span>
              </div>
              {item.rank <= 3 && <span className="leader-medal">{item.rank === 1 ? '魁' : item.rank === 2 ? '亚' : '季'}</span>}
            </Link>
          ))}
        </div>
      )}

      {view === 'weekly' && (
        <p className="muted small leaderboard-note">
          每周结算上一周经验，前三名自动获得「本周魁首 / 本周亚席 / 本周季席」，有效期 7 天。
        </p>
      )}
    </div>
  );
}
