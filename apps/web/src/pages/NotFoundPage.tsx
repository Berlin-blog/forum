import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="empty">
      <p className="eyebrow">404</p>
      <h1>页面不存在</h1>
      <p className="muted">链接可能过期，或者地址写错了。</p>
      <Link className="btn primary" to="/">回首页</Link>
    </div>
  );
}
