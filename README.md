# 论坛 MVP

一个贴吧式的综合讨论社区：吧、主题、楼层、无限楼中楼、开放注册、无发帖前审核。

视觉方向：**象牙白 + 古铜金 · 东方雅致 · 衬线标题 + 无衬线正文 · 强氛围动效**。  
用宣纸底、墨色、印章、金线、噪点与缓慢漂浮的金尘，做“华丽但克制”的东方编辑感。

- 前端：Vite + React + TypeScript + HashRouter
- 后端：Fastify + Drizzle ORM + MySQL 8.4
- 部署：GitHub Pages（静态前端）+ 当前电脑 API + ngrok 免费 dev domain

![首页](docs/screenshots/home.png)

![主题与楼中楼](docs/screenshots/thread-expanded.png)

![登录页](docs/screenshots/login.png)

![个人主页](docs/screenshots/profile.png)

![通知](docs/screenshots/notifications.png)

![搜索](docs/screenshots/search.png)

![成就墙](docs/screenshots/achievements.png)

![等级榜](docs/screenshots/leaderboard.png)

---

## 当前地址

| 用途 | 地址 |
|---|---|
| 公网前端 | <https://berlin-blog.github.io/forum/> |
| GitHub 仓库 | <https://github.com/Berlin-blog/forum> |
| 本地前端 | <http://127.0.0.1:5173/> |
| 本地 API | <http://127.0.0.1:3002/api/health> |
| 公网 API | <https://promotion-surpass-jazz.ngrok-free.dev/api/health> |

> 公网 API 是 ngrok 免费隧道；浏览器直接打开可能先看到 ngrok 警告页。前端请求会带 `ngrok-skip-browser-warning: 1` 绕过。

---

## 本地启动

### 1. 启动项目 MySQL

```powershell
D:\code\work\forum\scripts\start-mysql.ps1
```

项目使用独立的 MySQL 实例：

- 端口：`3307`
- 数据目录：`forum/data/mysql`
- 数据库：`forum`
- 用户：`forum` / `forum_dev_password`

不碰系统原有的 `MySQL84` 服务（它占用 3306，并且被另一个任务排期应用使用）。

### 2. 安装依赖

```powershell
cd D:\code\work\forum
pnpm install
```

### 3. 初始化数据库

```powershell
pnpm --filter api db:migrate
```

已有用户升级后，可补一次称号 / 成就同步：

```powershell
pnpm --filter api db:sync-growth
```

### 4. 启动 API

```powershell
pnpm --filter api start
```

API 监听 `127.0.0.1:3002`。

### 5. 启动前端

```powershell
pnpm --filter web dev --host 127.0.0.1
```

打开 <http://127.0.0.1:5173/>。

### 6. 启动 ngrok

```powershell
D:\code\work\forum\scripts\start-ngrok.ps1
```

或手动：

```powershell
ngrok http 3002 --url https://promotion-surpass-jazz.ngrok-free.dev
```

前端 API 地址在 [apps/web/public/config.js](apps/web/public/config.js)。

---

## 目录

```
forum/
├── apps/
│   ├── api/                 # Fastify + MySQL
│   │   ├── migrations/      # 0001_init.sql / 0002_social_growth.sql
│   │   └── src/
│   │       ├── routes/      # auth / bars / threads / posts / users / me / notifications
│   │       ├── db/          # schema / client / migrate
│   │       └── lib/         # auth / guard / content / progression
│   └── web/                 # Vite + React
│       ├── public/config.js # 运行时 API 地址
│       └── src/
│           ├── pages/       # 首页 / 吧 / 主题 / 登录 / 注册
│           └── components/  # Layout / PostNode / ReplyForm
├── scripts/                 # 启停脚本
├── docs/                    # 方案与截图
└── pnpm-workspace.yaml
```

---

## 已实现

- 用户名 + 密码注册 / 登录 / 退出
- Bearer token 会话（数据库存 SHA-256 哈希）
- 吧列表、分类、吧主页
- **用户创建吧**：创建者自动成为吧主
- 关注 / 取消关注吧
- 发主题、主题列表、主题详情
- **图文发帖 / 图片回复**：图片压缩为 WebP，8MB 内
- 顶层回复
- **无限层楼中楼**：`parent_id` 自关联，前端逐层展开
- 点赞帖子
- **搜索**：吧 / 主题 / 用户，支持标题与首楼正文
- **个人主页**：等级、称号、粉丝/关注、关注的吧、主题、回复、成就
- **关注用户 / 粉丝**：粉丝 / 关注列表弹层
- **通知中心**：被回复、升级、被关注
- **1–20 级经验系统**：发帖、回复、被回复、签到获取经验，每日上限
- **签到**：每日一次
- **称号**：14 个等级称号，可佩戴 / 卸下
- **成就**：16 个成就，独立成就墙
- **等级榜**：按等级与经验排序
- **每日任务**：签到、发帖、回复、收到回复四个进度
- 管理员事后处理接口（举报、封禁、隐藏主题 / 帖子）
- Markdown 渲染 + HTML 清洗
- GitHub Pages 部署 workflow

## 首页与性能

- 首页改为杂志式编辑布局：精选、正在发生、游园、等级榜、今日课业、签到
- 首页只请求一个聚合接口 `/api/home`，不再串行请求吧列表 + 主题 + 任务
- 减少粒子数量、移除 reveal 的模糊滤镜、移动端关闭金尘并启用 `content-visibility`
- 图片上传后压缩为 WebP 并内嵌到内容，避免 ngrok 免费版插页挡住图片；原文件同时保存在 `uploads/`

## 成长系统

| 行为 | 经验 | 每日上限 |
|---|---:|---:|
| 发主题 | +5 | 15 |
| 发回复 / 楼中楼 | +3 | 15 |
| 被回复 | +2 | 10 |
| 签到 | +5 | 5 |

等级门槛（累计经验）：

| 等级 | 累计经验 |
|---|---:|
| L1 → L2 | 10 |
| L2 → L3 | 110 |
| L3 → L4 | 310 |
| L4 → L5 | 660 |
| L5 → L6 | 1,160 |
| L10 | 4,660 |
| L15 | 12,410 |
| L20 | 23,910 |

称号按等级自动解锁：初入雅集 L1、煮茶客 L3、听雨人 L5、藏书家 L8、山中宰相 L12、雅集主人 L16、清谈传奇 L20。

## 未实现

- 举报 / 审核后台 UI
- 吧主后台 UI
- 邮箱 / 找回密码
- 完整管理后台页面
- 图片内容审核
- 会员 / 广告 / 支付

---

## 关键接口

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/health` | 健康检查 |
| `GET` | `/api/home` | 首页聚合（吧、精选、最新、榜单、任务） |
| `GET` | `/api/search?q=&type=` | 搜索吧 / 主题 / 用户 |
| `POST` | `/api/uploads` | 上传图片（8MB 内） |
| `POST` | `/api/auth/register` | 注册 |
| `POST` | `/api/auth/login` | 登录 |
| `POST` | `/api/auth/logout` | 退出 |
| `GET` | `/api/me` | 当前用户 |
| `GET` | `/api/bars` | 分类 + 吧 |
| `POST` | `/api/bars` | 用户创建吧 |
| `GET` | `/api/bars/:slug` | 吧详情 / 是否关注 |
| `POST` | `/api/bars/:slug/follow` | 关注 / 取消关注吧 |
| `GET` | `/api/me/bars` | 我关注的吧 |
| `GET` | `/api/threads?bar=&limit=&offset=` | 主题列表 |
| `POST` | `/api/threads` | 发主题 |
| `GET` | `/api/threads/:id` | 主题 + 首楼 |
| `GET` | `/api/threads/:id/posts` | 顶层楼层 |
| `POST` | `/api/threads/:id/posts` | 顶层回复 |
| `GET` | `/api/posts/:id/children` | 直接子回复 |
| `POST` | `/api/posts/:id/replies` | 楼中楼回复（不限层级） |
| `POST` | `/api/posts/:id/like` | 点赞 / 取消 |
| `POST` | `/api/checkin` | 每日签到 |
| `GET` | `/api/me/checkin` | 今日签到状态 |
| `GET` | `/api/me/titles` | 我的称号 |
| `POST` | `/api/me/title` | 佩戴 / 卸下称号 |
| `PATCH` | `/api/me` | 修改资料 |
| `GET` | `/api/notifications` | 通知列表 |
| `GET` | `/api/notifications/unread-count` | 未读数 |
| `POST` | `/api/notifications/read` | 全部已读 |
| `GET` | `/api/me/daily-tasks` | 每日任务 |
| `GET` | `/api/leaderboard` | 等级榜 |
| `GET` | `/api/achievements` | 成就墙（含解锁状态） |
| `POST` | `/api/reports` | 提交举报 |
| `GET` | `/api/admin/reports` | 管理员：举报列表 |
| `POST` | `/api/admin/reports/:id/resolve` | 管理员：处理举报 |
| `POST` | `/api/admin/users/:id/sanction` | 管理员：封禁 / 解封 |
| `POST` | `/api/admin/threads/:id/hide` | 管理员：隐藏 / 恢复主题 |
| `POST` | `/api/admin/posts/:id/hide` | 管理员：隐藏 / 恢复帖子 |
| `GET` | `/api/users/:username` | 用户主页（统计 / 关注吧 / 主题 / 回复 / 称号 / 成就） |
| `GET` | `/api/users/:username/followers` | 粉丝列表 |
| `GET` | `/api/users/:username/following` | 关注列表 |
| `POST` | `/api/users/:username/follow` | 关注 / 取消关注用户 |

认证：

```http
Authorization: Bearer <token>
```

---

## 数据库

- MySQL 8.4，`utf8mb4_0900_ai_ci`
- 主键 `BIGINT UNSIGNED AUTO_INCREMENT`
- `posts.parent_id` 自关联，无 `depth` 限制
- 顶层楼层 `floor` 唯一；楼中楼 `floor = NULL`
- `threads` / `posts` 有 FULLTEXT ngram 索引
- 迁移文件：[0001_init.sql](apps/api/migrations/0001_init.sql)、[0002_social_growth.sql](apps/api/migrations/0002_social_growth.sql)、[0003_more_growth.sql](apps/api/migrations/0003_more_growth.sql)、[0004_attachments.sql](apps/api/migrations/0004_attachments.sql)

---

## GitHub Pages

已上线：<https://berlin-blog.github.io/forum/>

仓库包含：

- [.github/workflows/deploy-web.yml](.github/workflows/deploy-web.yml)（build + deploy 两个 job）
- [.github/workflows/api-ci.yml](.github/workflows/api-ci.yml)

更新流程：

1. push `main`
2. GitHub Actions 构建 `apps/web`
3. 自动部署到 Pages
4. API 和 MySQL 仍然跑在当前电脑

---

## 管理员

- 已创建 `admin` 账号；初始强密码在交付消息里，没有写进仓库
- 重置密码：

```powershell
D:\code\work\forum\scripts\reset-admin-password.ps1
```

- 管理接口：举报列表、处理举报、封禁 / 解封用户、隐藏 / 恢复主题和帖子

---

## 安全提醒

- `.env` 已加入 `.gitignore`，不要提交
- ngrok authtoken 只保存在本机 `ngrok.yml`
- 管理后台、举报、封禁 UI 还没接；目前公开站点请勿存放敏感内容
- 无发帖限制、无发帖前审核，垃圾内容需要管理员事后清理
- 生产使用前请换掉 `forum_dev_password` 并配置强密码

---

## 文档

- [建设方案 v1.3](docs/forum-plan.md)
- [ngrok 配置指南](docs/ngrok-setup.md)
- [v1.2 存档](docs/archive/forum-plan-v1.2.md)
