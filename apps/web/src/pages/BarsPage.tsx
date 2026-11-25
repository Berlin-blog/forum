import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { Category } from '../types';

export function BarsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<{ categories: Category[] }>('/api/bars')
      .then((data) => setCategories(data.categories))
      .catch(() => setError('加载失败，请确认 API 服务已启动'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="eyebrow">吧广场</p>
          <h1>所有吧</h1>
          <p className="muted">选一个吧进去发帖；没有合适的，先在站务反馈里提。</p>
        </div>
      </div>

      {error && <p className="notice error">{error}</p>}
      {loading ? <p className="muted">加载中…</p> : (
        <div className="category-grid">
          {categories.map((category) => (
            <div className="category-card" key={category.id}>
              <div className="category-title">{category.name}</div>
              <div className="bar-cards">
                {category.bars.map((bar) => (
                  <Link key={bar.id} className="bar-card" to={`/b/${bar.slug}`}>
                    <div className="bar-avatar">{bar.name.slice(0, 1)}</div>
                    <div>
                      <strong>{bar.name}</strong>
                      <p>{bar.description || '暂无简介'}</p>
                      <span className="muted small">{bar.threadCount} 主题 · {bar.postCount} 帖子</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
