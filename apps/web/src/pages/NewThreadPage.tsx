import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { useDraft } from '../components/useDraft';
import type { Category } from '../types';

export function NewThreadPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [barSlug, setBarSlug] = useState(slug ?? '');
  const [title, setTitle, clearTitle, titleHadDraft] = useDraft('forum:draft:new:title');
  const [content, setContent, clearContent, contentHadDraft] = useDraft('forum:draft:new:content');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (slug) setBarSlug(slug);
  }, [slug]);

  useEffect(() => {
    api.get<{ categories: Category[] }>('/api/bars')
      .then((data) => {
        setCategories(data.categories);
        if (!slug) {
          const first = data.categories.flatMap((category) => category.bars)[0];
          if (first) setBarSlug((current) => current || first.slug);
        }
      })
      .catch(() => setError('加载吧列表失败'));
  }, [slug]);

  const bars = useMemo(() => categories.flatMap((category) => category.bars), [categories]);

  if (authLoading) return <p className="muted">加载中…</p>;
  if (!user) {
    return (
      <div className="empty">
        <h1>登录后才能发帖</h1>
        <p className="muted">开放注册，不需要邀请码。</p>
        <div className="hero-actions">
          <Link className="btn primary" to="/login">登录</Link>
          <Link className="btn ghost" to="/register">注册</Link>
        </div>
      </div>
    );
  }

  async function uploadImage(file: File) {
    if (uploading) return;
    const alt = window.prompt('图片描述（可选，方便无障碍阅读）') ?? '';
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const data = await api.upload<{ markdown: string; preview: string }>('/api/uploads', form);
      const markdown = alt.trim()
        ? data.markdown.replace('![图片]', `![${alt.trim().replace(/[\]\n]/g, ' ')}]`)
        : data.markdown;
      setContent((current) => `${current}${current ? '\n\n' : ''}${markdown}\n`);
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
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const data = await api.post<{ threadId: number }>('/api/threads', {
        barSlug,
        title,
        content,
      });
      clearTitle();
      clearContent();
      navigate(`/t/${data.threadId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '发布失败');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="form-page">
      <div className="page-head" data-reveal>
        <div>
          <p className="eyebrow"><span className="eyebrow-rule" />发主题</p>
          <h1>开一个新讨论</h1>
          <p className="muted">标题写具体一点，正文支持 Markdown。提交后立即展示。</p>
        </div>
        <span className="page-head-seal">启</span>
      </div>

      <form className="panel form" onSubmit={submit} data-reveal>
        <span className="card-corner tl" aria-hidden="true" />
        <span className="card-corner br" aria-hidden="true" />
        <label>
          发布到
          <select value={barSlug} onChange={(event) => setBarSlug(event.target.value)} required>
            <option value="" disabled>选择吧</option>
            {bars.map((bar) => (
              <option key={bar.id} value={bar.slug}>{bar.name}</option>
            ))}
          </select>
        </label>

        <label>
          标题
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="例如：新手应该先学哪门编程语言？"
            minLength={5}
            maxLength={120}
            required
          />
        </label>

        <label>
          正文
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={'## 背景\n\n## 我的想法\n\n## 想讨论的问题'}
            rows={12}
            required
          />
        </label>

        {previews.length > 0 && (
          <div className="upload-previews">
            {previews.map((preview, index) => (
              <img src={preview} alt={`待发布图片 ${index + 1}`} key={`${index}-${preview.slice(-12)}`} />
            ))}
          </div>
        )}

        {error && <p className="form-error">{error}</p>}

        <div className="form-actions">
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
          <span className="muted small">
            {(titleHadDraft || contentHadDraft) ? '已恢复草稿 · ' : '草稿自动保存 · '}支持 Markdown · 图片 8MB 内
          </span>
          <button className="btn primary" disabled={busy || uploading || !title.trim() || !content.trim()}>
            {busy ? '发布中…' : '发布主题'}
          </button>
        </div>
      </form>
    </div>
  );
}
