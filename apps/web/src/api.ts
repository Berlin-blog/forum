export const apiBase = (
  window.__FORUM_CONFIG__?.apiBase ?? 'http://127.0.0.1:3002'
).replace(/\/+$/, '');

export function fixContentHtml(html: string) {
  return html.replace(/(src|href)="\/uploads\//g, `$1="${apiBase}/uploads/`);
}

const TOKEN_KEY = 'forum_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function describeApiError(err: unknown, fallback = '请求失败') {
  if (err instanceof ApiError) {
    if (err.status === 401) return '登录已失效，请重新登录';
    if (err.status === 403) return '没有权限执行这个操作';
    if (err.status === 404) return '目标不存在或已被删除';
    if (err.status === 409) return err.message || '操作冲突，请刷新后再试';
    if (err.status === 413) return '内容或图片超过大小限制';
    if (err.status === 429) return '操作太频繁，请稍后再试';
    if (err.status >= 500) return '服务暂时不可用，请稍后重试';
    return err.message || fallback;
  }
  if (err instanceof TypeError) {
    return '网络或 API 暂时不可用，内容已保存为草稿';
  }
  return fallback;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  headers.set('ngrok-skip-browser-warning', '1');
  if (init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${apiBase}${path}`, { ...init, headers });
  const contentType = res.headers.get('content-type') ?? '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const error = typeof data === 'object' && data?.error
      ? data.error
      : { code: 'REQUEST_FAILED', message: '请求失败' };
    throw new ApiError(res.status, error.code, error.message);
  }

  return data as T;
}

export const api = {
  get<T>(path: string) {
    return request<T>(path);
  },
  post<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },
  patch<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: 'PATCH',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },
  upload<T>(path: string, form: FormData) {
    return request<T>(path, { method: 'POST', body: form });
  },
  delete<T>(path: string) {
    return request<T>(path, { method: 'DELETE' });
  },
};
