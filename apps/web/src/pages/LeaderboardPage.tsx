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
  exp: number;
  titleName: string | null;
  titleIcon: string | null;
};

export function LeaderboardPage() {
  const [items, setItems] = useState<Leader[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ items: Leader[] }>('/api/leaderboard?limit=50')
      .then((data) => setItems(data.items))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="leaderboard-page">
      <div className="page-head" data-reveal>
        <div>
          <p className="eyebrow"><span className="eyebrow-rule" />清谈榜</p>
          <h1>等级榜</h1>
          <p className="muted">以等级与经验为序，记录每一位久坐清谈的人。</p>
        </div>
      </div>

      {loading ? <p className="muted">加载中…</p> : (
        <div className="leaderboard-list" data-reveal>
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
                <span className="muted small">@{item.username} · {item.exp} 经验</span>
              </div>
              {item.rank <= 3 && <span className="leader-medal">{item.rank === 1 ? '魁' : item.rank === 2 ? '亚' : '季'}</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
