# ngrok 配置指南（Windows）

> 目标：把当前电脑的论坛 API `http://127.0.0.1:3002` 暴露成 HTTPS 地址，供 GitHub Pages 上的静态前端调用。  
> 适用：ngrok 免费计划，不买域名、不付费。  
> 官方文档：[Get Started](https://ngrok.com/docs/start) · [Free static dev domains](https://ngrok.com/blog/free-static-domains-ngrok-users) · [Free plan limits](https://ngrok.com/docs/pricing-limits/free-plan-limits) · [Windows 下载](https://ngrok.com/download/windows)

> **当前本机实际配置：**  
> - 论坛 API 端口：`3002`（`3001` 已被本机另一个任务排期应用占用）  
> - ngrok dev domain：`promotion-surpass-jazz.ngrok-free.dev`  
> - 已验证公网地址：`https://promotion-surpass-jazz.ngrok-free.dev/api/health`

---

## 0. 先看懂你截图里的三个入口

你截图里的页面是 ngrok 的「Where do you want to begin?」：

| 卡片 | 用途 | 本项目是否需要 |
|---|---|---|
| **Share Localhost** | 把本机端口暴露成公网 URL | ✅ 选这个 |
| Gateway | 云端网关、WAF、负载均衡、API 网关 | ❌ 不需要 |
| AI Gateway | 代理大模型 API | ❌ 不需要 |

**操作：点第一张卡片 `Share Localhost` 下方的 `Get started`。**  
如果已经点进别的页面，不影响；直接按下面的步骤走。

---

## 1. 注册 / 登录 ngrok

1. 打开 <https://dashboard.ngrok.com/signup>；
2. 用邮箱或 GitHub 注册；
3. 登录后进入 Dashboard。

免费计划不需要付费，但需要账号。  
免费计划包含 **1 个自动分配的开发域名**，形如：

```
https://abc123xyz.ngrok-free.dev
```

这个域名长期属于你的账号，重启 ngrok 也不会变。这正是它比 Cloudflare Quick Tunnel 好的地方。

---

## 2. 安装 ngrok（Windows）

### 方式 A：WinGet（推荐）

```powershell
winget install ngrok -s msstore
```

### 方式 B：Scoop

```powershell
scoop install ngrok
```

### 方式 C：直接下载

从 <https://ngrok.com/download/windows> 下载 Windows amd64 zip，解压后把 `ngrok.exe` 放到一个在 PATH 里的目录，例如：

```
C:\Tools\ngrok\ngrok.exe
```

验证：

```powershell
ngrok version
```

如果提示找不到命令，重新打开 PowerShell，或把目录加入 PATH。

---

## 3. 配置 authtoken

1. 登录 Dashboard；
2. 打开 **Getting Started**（或 **Agent authtoken**）页面；
3. 复制 **Your Authtoken**；
4. 在 PowerShell 执行：

```powershell
ngrok config add-authtoken <你的 authtoken>
```

成功后会写入：

```
C:\Users\<你>\.config\ngrok\ngrok.yml
```

或旧版本的 `%LOCALAPPDATA%\ngrok\ngrok.yml`。

> 不要把 authtoken 提交到 GitHub，也不要发到公开聊天里。它相当于 ngrok 账号的钥匙。

---

## 4. 找到你的免费开发域名

1. 登录 Dashboard；
2. 打开 **Gateway → Domains**（或 **Universal Gateway → Domains**）；
3. 找到 **Dev Domain**，形如：

```
abc123xyz.ngrok-free.dev
```

4. 复制完整地址，后面命令要用：

```
https://abc123xyz.ngrok-free.dev
```

> 免费计划只有 1 个 dev domain，自动分配，不能自定义前缀。  
> 参考：[Static dev domains for all ngrok users](https://ngrok.com/blog/free-static-domains-ngrok-users)

---

## 5. 先启动本地 API

在启动 ngrok 之前，确保 API 已经跑起来：

```powershell
cd D:\code\work\forum
pnpm --filter api start
```

或如果你已经用 NSSM 注册了 `ForumAPI` 服务：

```powershell
nssm start ForumAPI
```

验证本地：

```powershell
Invoke-RestMethod http://127.0.0.1:3002/api/health
```

应该返回 JSON，例如：

```json
{ "ok": true }
```

如果本地 3002 不通，先别启动 ngrok；ngrok 只会把 502 暴露出去。

---

## 6. 启动 ngrok 隧道

在 PowerShell 执行：

```powershell
ngrok http 3002 --url https://abc123xyz.ngrok-free.dev
```

把 `abc123xyz.ngrok-free.dev` 换成你自己的 dev domain。

成功输出类似：

```
Session Status                online
Account                       you@example.com
Version                       3.x.x
Region                        ...
Forwarding                    https://abc123xyz.ngrok-free.dev -> http://localhost:3002
```

**保持这个窗口开着**，关闭窗口隧道就断了。

如果命令报错，试另一种写法：

```powershell
ngrok http --url=https://abc123xyz.ngrok-free.dev 3002
```

> ngrok CLI 版本不同，`--url` 的位置可能不同；两种都试一下。

---

## 7. 测试公网 API

### 用 curl

```powershell
curl.exe -H "ngrok-skip-browser-warning: 1" https://abc123xyz.ngrok-free.dev/api/health
```

### 用 PowerShell

```powershell
Invoke-RestMethod `
  -Uri "https://abc123xyz.ngrok-free.dev/api/health" `
  -Headers @{ "ngrok-skip-browser-warning" = "1" }
```

### 如果浏览器直接打开

浏览器直接访问 `https://.../api/health` 可能看到 ngrok 的警告页：

> You are about to visit ...

这是免费计划的 **browser interstitial**，不是你的 API 出错。  
API 请求必须带 `ngrok-skip-browser-warning` 头，或者用非浏览器 User-Agent。  
参考：[Free plan limits - Removing the interstitial](https://ngrok.com/docs/pricing-limits/free-plan-limits#removing-the-interstitial-page)

---

## 8. 配置前端 API 地址

修改：

```
apps/web/public/config.js
```

```js
window.__FORUM_CONFIG__ = {
  apiBase: 'https://abc123xyz.ngrok-free.dev',
  siteName: '论坛',
};
```

提交并 push：

```powershell
git add apps/web/public/config.js
git commit -m "chore: point web to ngrok dev domain"
git push
```

等 GitHub Pages 重新部署。

> `apiBase` 不要以 `/` 结尾；前端会自己拼 `/api/...`。

---

## 9. 关键：前端必须带 ngrok 跳过头

免费 ngrok 会对浏览器发起的请求展示警告页。  
如果前端 `fetch` 不带头，可能收到 HTML 而不是 JSON，表现为：

```
Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

在 API 客户端统一加：

```ts
const res = await fetch(`${apiBase}${path}`, {
  ...init,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': '1',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...init?.headers,
  },
});
```

### CORS 也要允许这个头

Fastify CORS 配置：

```ts
await app.register(cors, {
  origin: [
    'https://<username>.github.io',
    'http://localhost:5173',
  ],
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'ngrok-skip-browser-warning',
  ],
});
```

否则浏览器会报：

```
Request header field ngrok-skip-browser-warning is not allowed by Access-Control-Allow-Headers
```

> 自定义头会触发 CORS 预检（OPTIONS），所以每个写请求可能消耗 2 次 ngrok HTTP 请求。免费额度要注意。

---

## 10. 把 ngrok 注册成 Windows 服务（可选）

先确认手动运行正常，再用 NSSM：

```powershell
nssm install NgrokTunnel "C:\Tools\ngrok\ngrok.exe" "http 3002 --url https://abc123xyz.ngrok-free.dev"
nssm set NgrokTunnel AppDirectory "C:\Users\<你>"
nssm set NgrokTunnel Start SERVICE_AUTO_START
nssm start NgrokTunnel
```

注意：

- 服务运行账户要能读到 ngrok 配置（authtoken）；
- 如果读不到，设置环境变量 `NGROK_CONFIG` 指向 `ngrok.yml`；
- 免费计划最多 3 个并发 agent，不要重复启动多个；
- 服务化后仍然依赖电脑常开和网络。

---

## 11. 免费计划的硬限制

根据 ngrok 官方 Free Plan Limits（2026）：

| 资源 | 免费额度 |
|---|---:|
| HTTP 请求 | **20,000 / 月** |
| 出站流量 | **1 GB / 月** |
| 在线 endpoint | 3 |
| 并发 agent | 3 |
| 开发域名 | 1 |
| HTTP 请求速率 | 4,000 / 分钟 |
| 浏览器警告页 | 有 |

这意味着：

- 20,000 请求/月不算多；一个用户打开首页 + 主题页 + 发帖，可能消耗 5–10 次请求；
- 带自定义头的跨域请求会多一次 OPTIONS 预检，实际可用请求更少；
- 超过额度会报 `ERR_NGROK_727`（请求数）或 `ERR_NGROK_725`（流量）；
- 免费计划没有 SLA。

### 省额度做法

1. **不要每 60 秒轮询通知**；改成窗口聚焦时刷新 + 手动刷新；
2. 列表页缓存 60 秒，避免重复请求；
3. 首页用聚合接口，一次拿吧列表 + 最新主题 + 当前用户；
4. 不要在每个页面重复请求 `/api/me`；登录后缓存；
5. 图片不要走 API，MVP 不做上传；
6. 监控 ngrok Dashboard 的用量。

> 如果 20,000 请求/月不够，最省钱的替代是 Cloudflare Quick Tunnel（免费、无域名、地址会变、没有这个请求额度），或者升级 ngrok 付费计划。你要求零成本，所以先按免费额度设计。

---

## 12. 常见错误

| 现象 | 原因 | 解决 |
|---|---|---|
| `ERR_NGROK_6024` / 看到警告页 | 免费计划浏览器插页 | 请求加 `ngrok-skip-browser-warning` 头 |
| 前端报 `Unexpected token '<'` | 收到警告页 HTML | 同上；检查 CORS allowedHeaders |
| CORS 报错 `not allowed by Access-Control-Allow-Headers` | 后端没允许自定义头 | 加 `ngrok-skip-browser-warning` |
| 502 Bad Gateway | API 没启动 / 端口不对 | 先测 `http://127.0.0.1:3002/api/health` |
| `ERR_NGROK_108` | 同时运行的 agent 太多 | 关掉多余 ngrok 进程，免费最多 3 个 |
| `ERR_NGROK_727` | 月请求数用完 | 等下月重置，或换 Cloudflare Quick Tunnel |
| `ERR_NGROK_725` | 月流量用完 | 减少响应体积 / 换隧道 |
| `ngrok: command not found` | PATH 没配 | 重开 PowerShell，或加安装目录到 PATH |
| 域名不对 / 404 | 用了错误 dev domain | Dashboard → Domains 复制 |
| 重启后地址变了 | 用了随机 URL，没用 dev domain | 命令加 `--url https://<dev-domain>` |

---

## 13. 安全清单

- [ ] 只暴露 3002，不暴露 3306；
- [ ] MySQL 绑定 `127.0.0.1`；
- [ ] API 使用 Bearer token，不用 Cookie；
- [ ] CORS 只允许 Pages origin 和 localhost；
- [ ] authtoken 不进 git；
- [ ] ngrok Dashboard 开启双因素（如果提供）；
- [ ] 定期检查 ngrok 的 endpoint / agent 列表；
- [ ] 不在公开场合贴 dev domain 的敏感路径；
- [ ] 备份 MySQL；
- [ ] 电脑关闭睡眠，开机自启 API 与 ngrok。

---

## 14. 最短操作顺序

```text
1. 注册 ngrok
2. winget install ngrok -s msstore
3. ngrok config add-authtoken <token>
4. Dashboard → Domains，复制 xxx.ngrok-free.dev
5. 启动 API：pnpm --filter api start
6. ngrok http 3002 --url https://xxx.ngrok-free.dev
7. curl 测试 /api/health（带头）
8. 改 apps/web/public/config.js 的 apiBase
9. 前端 fetch 加 ngrok-skip-browser-warning
10. 后端 CORS allowedHeaders 加同名头
11. push，等 GitHub Pages 部署
12. 打开 Pages 地址测试注册 / 发帖
```

---

> 本文中的免费额度与命令以 ngrok 2026 年官方文档为准；ngrok 可能调整计划和限制，实施前再看一眼 [Free plan limits](https://ngrok.com/docs/pricing-limits/free-plan-limits)。
