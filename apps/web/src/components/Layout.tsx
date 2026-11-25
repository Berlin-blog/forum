import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

const siteName = window.__FORUM_CONFIG__?.siteName ?? '论坛';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="container topbar-inner">
          <Link className="brand" to="/">
            <span className="brand-mark">论</span>
            <span>{siteName}</span>
          </Link>

          <nav className="nav">
            <NavLink to="/" end>首页</NavLink>
            <NavLink to="/bars">吧广场</NavLink>
          </nav>

          <div className="topbar-user">
            {user ? (
              <>
                <Link className="user-chip" to={`/u/${user.username}`}>
                  {user.displayName}
                </Link>
                <button className="btn ghost sm" onClick={handleLogout}>退出</button>
              </>
            ) : (
              <>
                <Link className="btn ghost sm" to="/login">登录</Link>
                <Link className="btn primary sm" to="/register">注册</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container main">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <span>{siteName} · 贴吧式讨论社区</span>
          <span>零成本个人项目 · 内容由用户发布</span>
        </div>
      </footer>
    </div>
  );
}
