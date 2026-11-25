import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { LevelBadge } from '../components/Growth';
import { formatTime } from '../format';
import type { Bar } from '../types';

type Manager = {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  level: number;
  modRole: string;
  createdAt: string;
};

type Member = {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  level: number;
  joinedAt: string;
};

type ManageData = {
  bar: Bar & { rules: string | null; createdBy: number | null };
  moderators: Manager[];
  members: Member[];
  memberTotal: number;
  isOwner: boolean;
};

export function BarManagePage() {
  const { slug = '' } = useParams();
  const [data, setData] = useState<ManageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState('');
  const [saving, setSaving] = useState(false);
  const [modUsername, setModUsername] = useState('');

  async function load() {
    const result = await api.get<ManageData>(`/api/bars/${encodeURIComponent(slug)}/manage`);
    setData(result);
    setName(result.bar.name);
    setDescription(result.bar.description);
    setRules(result.bar.rules ?? '');
    setLoading(false);
  }

  useEffect(() => {
    load().catch((err) => {
      setError(err instanceof ApiError ? err.message : '加载失败');
      setLoading(false);
    });
  }, [slug]);

  async function saveBar(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const result = await api.patch<{ bar: ManageData['bar'] }>(`/api/bars/${encodeURIComponent(slug)}`, {
        name,
        description,
        rules,
      });
      setData((current) => current ? { ...current, bar: result.bar } : current);
      setMessage('吧资料已保存');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function addModerator(event: React.FormEvent) {
    event.preventDefault();
    if (!modUsername.trim()) return;
    setError('');
    try {
      const result = await api.post<{ moderators: Manager[] }>(
        `/api/bars/${encodeURIComponent(slug)}/moderators`,
        { username: modUsername.trim() },
      );
      setData((current) => current ? { ...current, moderators: result.moderators } : current);
      setModUsername('');
      setMessage('已添加小吧主');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '添加失败');
    }
  }

  async function removeModerator(userId: number) {
    if (!window.confirm('移除这个小吧主？')) return;
    const result = await api.delete<{ moderators: Manager[] }>(
      `/api/bars/${encodeURIComponent(slug)}/moderators/${userId}`,
    );
    setData((current) => current ? { ...current, moderators: result.moderators } : current);
  }

  async function removeMember(userId: number) {
    if (!window.confirm('把这个成员移出本吧？')) return;
    const result = await api.delete<{ memberCount: number }>(
      `/api/bars/${encodeURIComponent(slug)}/members/${userId}`,
    );
    setData((current) => current ? {
      ...current,
      members: current.members.filter((member) => member.id !== userId),
      memberTotal: result.memberCount,
    } : current);
  }

  if (loading) return <p className="muted">加载中…</p>;
  if (error && !data) return <p className="notice error">{error}</p>;
  if (!data) return null;

  return (
    <div className="bar-manage-page">
      <nav className="breadcrumb">
        <Link to="/bars">吧广场</Link>
        <span>/</span>
        <Link to={`/b/${slug}`}>{data.bar.name}</Link>
        <span>/</span>
        <span>管理</span>
      </nav>

      <div className="page-head" data-reveal>
        <div>
          <p className="eyebrow"><span className="eyebrow-rule" />吧主后台</p>
          <h1>{data.bar.name} · 管理</h1>
          <p className="muted">修改吧资料、任命小吧主、管理成员。</p>
        </div>
        <Link className="btn ghost sm" to={`/b/${slug}`}>回到吧</Link>
      </div>

      {message && <p className="notice">{message}</p>}
      {error && <p className="notice error">{error}</p>}

      <form className="panel form" onSubmit={saveBar} data-reveal>
        <div className="section-head">
          <div className="section-title-wrap">
            <span className="section-index">设</span>
            <h2>吧资料</h2>
          </div>
        </div>
        <label>
          吧名称
          <input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={64} required />
        </label>
        <label>
          简介
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={500} />
        </label>
        <label>
          吧规
          <textarea value={rules} onChange={(event) => setRules(event.target.value)} rows={5} maxLength={10000} placeholder="写下本吧的规则、氛围和底线。" />
        </label>
        <div className="form-actions">
          <span className="muted small">吧规会显示在吧主页</span>
          <button className="btn primary sm" disabled={saving}>{saving ? '保存中…' : '保存'}</button>
        </div>
      </form>

      <section className="panel manage-section" data-reveal>
        <div className="section-head">
          <div className="section-title-wrap">
            <span className="section-index">仆</span>
            <h2>小吧主</h2>
          </div>
          <span className="muted small">{data.moderators.length} 人</span>
        </div>
        <div className="manage-user-list">
          {data.moderators.map((moderator) => (
            <div className="manage-user-row" key={moderator.id}>
              <span className="user-dot">{moderator.displayName.slice(0, 1)}</span>
              <div>
                <strong>{moderator.displayName}</strong>
                <span className="muted small">@{moderator.username} · {moderator.modRole === 'owner' ? '吧主' : '小吧主'}</span>
              </div>
              <LevelBadge level={moderator.level} compact />
              {data.isOwner && moderator.modRole !== 'owner' && (
                <button className="link-btn danger" onClick={() => void removeModerator(moderator.id)}>移除</button>
              )}
            </div>
          ))}
        </div>
        {data.isOwner && (
          <form className="manage-inline-form" onSubmit={addModerator}>
            <input
              value={modUsername}
              onChange={(event) => setModUsername(event.target.value)}
              placeholder="输入用户名，任命为小吧主"
              maxLength={32}
            />
            <button className="btn primary sm" disabled={!modUsername.trim()}>添加小吧主</button>
          </form>
        )}
      </section>

      <section className="panel manage-section" data-reveal>
        <div className="section-head">
          <div className="section-title-wrap">
            <span className="section-index">众</span>
            <h2>成员</h2>
          </div>
          <span className="muted small">{data.memberTotal} 人</span>
        </div>
        {data.members.length === 0 ? <p className="muted">还没有成员。</p> : (
          <div className="manage-user-list">
            {data.members.map((member) => (
              <div className="manage-user-row" key={member.id}>
                <span className="user-dot">{member.displayName.slice(0, 1)}</span>
                <div>
                  <strong>{member.displayName}</strong>
                  <span className="muted small">@{member.username} · {formatTime(member.joinedAt)} 加入</span>
                </div>
                <LevelBadge level={member.level} compact />
                <button className="link-btn danger" onClick={() => void removeMember(member.id)}>移出</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
