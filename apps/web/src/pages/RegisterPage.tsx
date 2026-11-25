import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../api';
import { useAuth } from '../auth';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await register(username, password, displayName);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '注册失败');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <aside className="auth-aside" aria-hidden="true">
        <span className="auth-aside-seal">集</span>
        <span className="auth-aside-kicker">东方雅集 · 入席</span>
        <h2>雅俗共赏<br />来者不拒</h2>
        <p>不必递帖，不必通名。<br />取一个名字，便可入席。</p>
        <span className="auth-aside-rule" />
        <span className="auth-aside-foot">— 雅集小引</span>
      </aside>

      <form className="panel form auth-form" onSubmit={submit} data-reveal>
        <span className="auth-seal">集</span>
        <span className="card-corner tl" aria-hidden="true" />
        <span className="card-corner br" aria-hidden="true" />
        <p className="eyebrow"><span className="eyebrow-rule" />开放注册</p>
        <h1>创建账号</h1>
        <p className="muted">不需要邮箱、邀请码或验证码。已有账号？<Link to="/login">登录</Link></p>

        <label>
          用户名
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="3–32 位，支持中文、字母、数字"
            minLength={3}
            maxLength={32}
            autoComplete="username"
            required
          />
        </label>
        <label>
          显示名
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="别人看到的名字"
            maxLength={64}
            required
          />
        </label>
        <label>
          密码
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="至少 8 位"
            minLength={8}
            autoComplete="new-password"
            required
          />
        </label>

        {error && <p className="form-error">{error}</p>}
        <p className="muted small">没有邮箱找回；忘记密码需要管理员重置。</p>
        <button className="btn primary" disabled={busy}>{busy ? '注册中…' : '注册并登录'}</button>
      </form>
    </div>
  );
}
