import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Atmosphere, ScrollProgress } from './Atmosphere';
import { LevelBadge, NotificationBell } from './Growth';

const siteName = window.__FORUM_CONFIG__?.siteName ?? '论坛';

function MobileNav() {
  const { user } = useAuth();
  return (
    <nav className="mobile-nav" aria-label="移动端导航">
      <NavLink to="/" end><span>首</span><small>首页</small></NavLink>
      <NavLink to="/bars"><span>吧</span><small>吧广场</small></NavLink>
      <NavLink to="/search"><span>寻</span><small>搜索</small></NavLink>
      <NavLink to={user ? `/u/${user.username}` : '/login'}><span>我</span><small>我的</small></NavLink>
      <NavLink to="/settings"><span>设</span><small>设置</small></NavLink>
    </nav>
  );
}

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <div className="shell">
      <ScrollProgress />
      <Atmosphere />

      <header className="topbar">
        <div className="container topbar-inner">
          <Link className="brand" to="/">
            <span className="brand-seal">论</span>
            <span className="brand-text">
              <strong>{siteName}</strong>
              <small>东方雅集</small>
            </span>
          </Link>

          <span className="nav-divider" aria-hidden="true" />

          <nav className="nav">
            <NavLink to="/" end>首页</NavLink>
            <NavLink to="/bars">吧广场</NavLink>
            <NavLink to="/search">搜索</NavLink>
            <NavLink to="/settings">设置</NavLink>
          </nav>

          <div className="topbar-user">
            {user ? (
              <>
                <NotificationBell />
                <Link className="user-chip" to={`/u/${user.username}`}>
                  <span className="user-dot">{user.displayName.slice(0, 1)}</span>
                  <LevelBadge level={user.level} compact />
                  <span>{user.displayName}</span>
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

      <MobileNav />

      <footer className="footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <span className="footer-seal">雅</span>
            <span>{siteName} · 东方雅集</span>
          </div>
          <span className="footer-note">内容由用户发布 · 清谈为主，雅俗共赏</span>
        </div>
      </footer>
    </div>
  );
}
