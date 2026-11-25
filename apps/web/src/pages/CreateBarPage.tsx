import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import type { Category } from '../types';

export function CreateBarPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<{ categories: Category[] }>('/api/bars')
      .then((data) => {
        setCategories(data.categories);
        if (data.categories[0]) setCategoryId(data.categories[0].id);
      })
      .catch(() => setError('加载分类失败'));
  }, []);

  if (authLoading) return <p className="muted">加载中…</p>;
  if (!user) {
    return (
      <div className="empty">
        <h1>登录后才能创建吧</h1>
        <p className="muted">创建者会自动成为吧主。</p>
        <Link className="btn primary" to="/login">去登录</Link>
      </div>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const data = await api.post<{ bar: { slug: string } }>('/api/bars', {
        name,
        slug: slug.trim() || undefined,
        description,
        categoryId,
      });
      navigate(`/b/${data.bar.slug}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '创建失败');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="form-page">
      <div className="page-head" data-reveal>
        <div>
          <p className="eyebrow"><span className="eyebrow-rule" />开吧</p>
          <h1>创建一个新的吧</h1>
          <p className="muted">给一个小圈子起个名字。创建者自动成为吧主。</p>
        </div>
        <span className="page-head-seal">开</span>
      </div>

      <form className="panel form" onSubmit={submit} data-reveal>
        <span className="card-corner tl" aria-hidden="true" />
        <span className="card-corner br" aria-hidden="true" />
        <label>
          吧名称
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="例如：读书"
            minLength={2}
            maxLength={64}
            required
          />
        </label>
        <label>
          吧地址（可选）
          <input
            value={slug}
            onChange={(event) => setSlug(event.target.value.toLowerCase())}
            placeholder="reading，只允许小写字母、数字、短横线"
            pattern={'[a-z0-9\\-]+'}
            maxLength={64}
          />
        </label>
        <label>
          分类
          <select value={categoryId} onChange={(event) => setCategoryId(Number(event.target.value))}>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </label>
        <label>
          简介
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="这个吧讨论什么？"
            rows={4}
            maxLength={500}
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <span className="muted small">创建后即可发帖、管理本吧</span>
          <button className="btn primary" disabled={busy || !name.trim()}>创建吧</button>
        </div>
      </form>
    </div>
  );
}
