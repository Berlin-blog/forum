import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../api';
import { useAuth } from '../auth';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '登录失败');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="panel form auth-form" onSubmit={submit}>
        <p className="eyebrow">欢迎回来</p>
        <h1>登录</h1>
        <p className="muted">没有账号？<Link to="/register">直接注册</Link></p>

        <label>
          用户名
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />
        </label>
        <label>
          密码
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
        </label>

        {error && <p className="form-error">{error}</p>}
        <button className="btn primary" disabled={busy}>{busy ? '登录中…' : '登录'}</button>
      </form>
    </div>
  );
}
