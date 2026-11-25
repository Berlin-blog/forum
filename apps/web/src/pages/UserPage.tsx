import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { CheckInButton, LevelBadge } from '../components/Growth';
import { FollowListModal } from '../components/FollowListModal';
import { formatTime } from '../format';
import type { UserProfile } from '../types';

export function ProfilePage() {
  const { username = '' } = useParams();
  const { user, refresh } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [followMode, setFollowMode] = useState<'followers' | 'following' | null>(null);

  async function load() {
    const data = await api.get<UserProfile>(`/api/users/${encodeURIComponent(username)}`);
    setProfile(data);
    setDisplayName(data.user.displayName);
    setBio(data.user.bio);
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    load().catch(() => {
      setError('用户不存在');
      setLoading(false);
    });
  }, [username]);

  async function toggleFollow() {
    if (!profile) return;
    if (!user) {
      setMessage('请先登录');
      return;
    }
    const data = await api.post<{ following: boolean; followers: number }>(
      `/api/users/${encodeURIComponent(profile.user.username)}/follow`,
      {},
    );
    setProfile({
      ...profile,
      isFollowing: data.following,
      stats: { ...profile.stats, followers: data.followers },
    });
  }

  async function equipTitle(titleId: number | null) {
    if (!profile) return;
    try {
      await api.post('/api/me/title', { titleId });
      const title = profile.titles.find((item) => item.id === titleId) ?? null;
      setProfile({
        ...profile,
        equippedTitle: title,
        user: { ...profile.user, equippedTitleId: titleId },
      });
      await refresh();
      setMessage(title ? `已佩戴「${title.name}」` : '已卸下称号');
    } catch {
      setMessage('称号操作失败');
    }
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const data = await api.patch<{ user: UserProfile['user'] }>('/api/me', { displayName, bio });
      setProfile((current) => current ? { ...current, user: data.user } : current);
      setEditing(false);
      setMessage('资料已更新');
      await refresh();
    } catch {
      setMessage('保存失败');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="muted">加载中…</p>;
  if (error) return <p className="notice error">{error}</p>;
  if (!profile) return null;

  const { user: profileUser, stats } = profile;

  return (
    <div className="profile-page">
      <section className="profile-hero" data-reveal>
        <div className="avatar">{profileUser.displayName.slice(0, 1)}</div>
        <div className="profile-hero-main">
          <div className="profile-name-row">
            <h1>{profileUser.displayName}</h1>
            <LevelBadge level={profileUser.level} />
            {profile.equippedTitle && (
              <span className="equipped-title">
                <span className="equipped-title-icon">{profile.equippedTitle.icon}</span>
                {profile.equippedTitle.name}
              </span>
            )}
          </div>
          <p className="muted">@{profileUser.username} · {profileUser.userRole === 'admin' ? '管理员' : '成员'}</p>
          <p className="profile-bio">{profileUser.bio || '这个人很懒，还没有写简介。'}</p>
          <div className="profile-stats">
            <button className="stat-button" onClick={() => setFollowMode('followers')}><strong>{stats.followers}</strong> 粉丝</button>
            <button className="stat-button" onClick={() => setFollowMode('following')}><strong>{stats.following}</strong> 关注</button>
            <span><strong>{stats.threads}</strong> 主题</span>
            <span><strong>{stats.posts}</strong> 帖子</span>
            <span><strong>{stats.checkins}</strong> 签到</span>
            <span><strong>{stats.likesReceived}</strong> 获赞</span>
          </div>
        </div>
        <div className="profile-actions">
          {profile.isSelf ? (
            <button className="btn ghost sm" onClick={() => setEditing((value) => !value)}>
              {editing ? '收起编辑' : '编辑资料'}
            </button>
          ) : user ? (
            <button className={`btn ${profile.isFollowing ? 'ghost' : 'primary'} sm`} onClick={toggleFollow}>
              {profile.isFollowing ? '已关注' : '关注 / 成为粉丝'}
            </button>
          ) : (
            <Link className="btn ghost sm" to="/login">登录后关注</Link>
          )}
        </div>
        <span className="profile-seal">客</span>
      </section>

      {message && <p className="notice">{message}</p>}

      {editing && profile.isSelf && (
        <form className="panel form profile-edit" onSubmit={saveProfile} data-reveal>
          <label>
            显示名
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={64} required />
          </label>
          <label>
            简介
            <textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={500} rows={3} placeholder="写一句话介绍自己" />
          </label>
          <div className="form-actions">
            <span className="muted small">资料会展示在你的个人主页</span>
            <button className="btn primary sm" disabled={saving}>{saving ? '保存中…' : '保存'}</button>
          </div>
        </form>
      )}

      <div className="profile-layout">
        <div className="profile-main">
          {profile.isSelf && <CheckInButton />}

          <section className="section profile-section" data-reveal>
            <div className="section-head">
              <div className="section-title-wrap">
                <span className="section-index">吧</span>
                <h2>关注的吧</h2>
              </div>
              <span className="muted small">{profile.followedBars.length} 个</span>
            </div>
            {profile.followedBars.length === 0 ? (
              <p className="muted">还没有关注任何吧。</p>
            ) : (
              <div className="profile-bar-grid">
                {profile.followedBars.map((bar) => (
                  <Link key={bar.id} className="profile-bar-card" to={`/b/${bar.slug}`}>
                    <span className="bar-avatar">{bar.name.slice(0, 1)}</span>
                    <span>
                      <strong>{bar.name}</strong>
                      <small className="muted">{bar.threadCount} 主题</small>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="section profile-section" data-reveal>
            <div className="section-head">
              <div className="section-title-wrap">
                <span className="section-index">帖</span>
                <h2>最近主题</h2>
              </div>
            </div>
            {profile.threads.length === 0 ? (
              <p className="muted">还没有发布主题。</p>
            ) : (
              <div className="thread-list">
                {profile.threads.map((thread) => (
                  <Link className="thread-row" key={thread.id} to={`/t/${thread.id}`}>
                    <div className="thread-main">
                      <div className="thread-title">{thread.title}</div>
                      <div className="thread-meta">
                        <span>{thread.barName}</span>
                        <span>{formatTime(thread.lastPostAt)}</span>
                      </div>
                    </div>
                    <div className="thread-stats">
                      <strong>{thread.replyCount}</strong>
                      <span>回复</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="section profile-section" data-reveal>
            <div className="section-head">
              <div className="section-title-wrap">
                <span className="section-index">复</span>
                <h2>最近回复</h2>
              </div>
            </div>
            {profile.replies.length === 0 ? (
              <p className="muted">还没有回复内容。</p>
            ) : (
              <div className="reply-list">
                {profile.replies.map((reply) => (
                  <Link className="reply-card" key={reply.id} to={`/t/${reply.threadId}`}>
                    <p>{reply.contentText.slice(0, 120)}{reply.contentText.length > 120 ? '…' : ''}</p>
                    <span className="muted small">{reply.barName} · {reply.threadTitle} · {formatTime(reply.createdAt)}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="profile-side">
          <section className="panel profile-side-card" data-reveal>
            <div className="section-head">
              <div className="section-title-wrap">
                <span className="section-index">号</span>
                <h2>称号</h2>
              </div>
            </div>
            {profile.titles.length === 0 ? (
              <p className="muted">还没有获得称号。</p>
            ) : (
              <div className="title-list">
                {profile.titles.map((title) => (
                  <div className={`title-row ${profileUser.equippedTitleId === title.id ? 'active' : ''}`} key={title.id}>
                    <span className="title-icon">{title.icon}</span>
                    <div>
                      <strong>{title.name}</strong>
                      <p>{title.description}</p>
                    </div>
                    {profile.isSelf && (
                      <button className="link-btn" onClick={() => equipTitle(profileUser.equippedTitleId === title.id ? null : title.id)}>
                        {profileUser.equippedTitleId === title.id ? '卸下' : '佩戴'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="panel profile-side-card" data-reveal>
            <div className="section-head">
              <div className="section-title-wrap">
                <span className="section-index">成</span>
                <h2>成就</h2>
              </div>
              <Link className="section-link" to="/achievements">全部 <span>→</span></Link>
            </div>
            {profile.achievements.length === 0 ? (
              <p className="muted">还没有解锁成就。</p>
            ) : (
              <div className="achievement-grid">
                {profile.achievements.map((achievement) => (
                  <div className="achievement-card" key={achievement.id}>
                    <span className="achievement-icon">{achievement.icon}</span>
                    <strong>{achievement.name}</strong>
                    <p>{achievement.description}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>

      {followMode && (
        <FollowListModal
          username={profileUser.username}
          mode={followMode}
          onClose={() => setFollowMode(null)}
        />
      )}
    </div>
  );
}
