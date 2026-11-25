import { useRef, useState } from 'react';
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
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  if (!user) {
    return (
      <p className="muted small">
        <Link to="/login">登录</Link> 后回复
      </p>
    );
  }

  async function uploadImage(file: File) {
    if (uploading) return;
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const data = await api.upload<{ markdown: string; preview: string }>('/api/uploads', form);
      setContent((current) => `${current}${current ? '\n\n' : ''}${data.markdown}\n`);
      setPreviews((current) => [...current, data.preview]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '图片上传失败');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!content.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      await api.post(endpoint, { content });
      setContent('');
      setPreviews([]);
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
        placeholder={placeholder ?? '写下你的回复，支持 Markdown 与图片'}
        rows={compact ? 3 : 5}
      />
      {previews.length > 0 && (
        <div className="upload-previews">
          {previews.map((preview, index) => (
            <img src={preview} alt={`待发送图片 ${index + 1}`} key={`${index}-${preview.slice(-12)}`} />
          ))}
        </div>
      )}
      {error && <p className="form-error">{error}</p>}
      <div className="reply-actions">
        <label className="upload-btn">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadImage(file);
            }}
          />
          {uploading ? '上传中…' : '插入图片'}
        </label>
        <span className="muted small">支持 Markdown · 图片 8MB 内</span>
        <button className="btn primary sm" disabled={busy || uploading || !content.trim()}>
          {busy ? '提交中…' : '回复'}
        </button>
      </div>
    </form>
  );
}
