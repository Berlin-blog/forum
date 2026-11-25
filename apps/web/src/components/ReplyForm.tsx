import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';

type Props = {
  endpoint: string;
  onCreated: () => void | Promise<void>;
  compact?: boolean;
  placeholder?: string;
};

export function ReplyForm({ endpoint, onCreated, compact, placeholder }: Props) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!user) {
    return (
      <p className="muted small">
        <Link to="/login">登录</Link> 后回复
      </p>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!content.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      await api.post(endpoint, { content });
      setContent('');
      await onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '回复失败');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={compact ? 'reply-form compact' : 'reply-form'} onSubmit={submit}>
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder={placeholder ?? '写下你的回复，支持 Markdown'}
        rows={compact ? 3 : 5}
      />
      {error && <p className="form-error">{error}</p>}
      <div className="reply-actions">
        <span className="muted small">支持 Markdown · 提交后立即展示</span>
        <button className="btn primary sm" disabled={busy || !content.trim()}>
          {busy ? '提交中…' : '回复'}
        </button>
      </div>
    </form>
  );
}
