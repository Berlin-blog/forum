# 论坛网站建设方案 v1.3

> 零成本方案 · 贴吧式综合社区 · GitHub Pages 静态前端 · 当前电脑 API/MySQL · ngrok 免费开发域名  
> 版本：v1.3 · 2026-11-24 · 状态：待实施  
> 旧版存档：[v1.0](archive/forum-plan-v1.0.md) · [v1.1](archive/forum-plan-v1.1.md) · [v1.2](archive/forum-plan-v1.2.md)  
> v1.3 修订：隧道从 Cloudflare Quick Tunnel 改为 **ngrok 免费 dev domain**；保留管理员事后处理；仓库公开。配置步骤见 [ngrok-setup.md](ngrok-setup.md)。  
> 当前实例：前端 `https://berlin-blog.github.io/forum/`，API 端口 `3002`（`3001` 已被本机任务排期应用占用），dev domain `promotion-surpass-jazz.ngrok-free.dev`，公网 `/api/health` 已验证。  
> 实现状态（2026-11-25）：注册 / 登录、吧列表、主题、楼层、无限楼中楼、点赞、举报与管理员事后处理接口已跑通；并已加入用户创建吧、关注吧 / 关注用户、个人主页、通知中心、1–20 级经验 / 签到、称号佩戴与成就。运行说明见 [README](../README.md)，截图见 [docs/screenshots](screenshots/)。

---

## 目录

1. [本版变更](#1-本版变更)
2. [结论与硬约束](#2-结论与硬约束)
3. [可行性说明](#3-可行性说明)
4. [产品形态](#4-产品形态)
5. [功能范围](#5-功能范围)
6. [用户与权限](#6-用户与权限)
7. [页面与交互](#7-页面与交互)
8. [核心流程](#8-核心流程)
9. [技术架构](#9-技术架构)
10. [前端：GitHub Pages 静态站点](#10-前端github-pages-静态站点)
11. [后端：当前电脑 API](#11-后端当前电脑-api)
12. [数据库：MySQL](#12-数据库mysql)
13. [API 设计](#13-api-设计)
14. [部署与启动](#14-部署与启动)
15. [安全、运营与合规边界](#15-安全运营与合规边界)
16. [实施计划](#16-实施计划)
17. [成本](#17-成本)
18. [风险与应对](#18-风险与应对)
19. [待确认问题](#19-待确认问题)
20. [附录](#20-附录)

---

## 1. 本版变更

| 项目 | v1.1 | v1.2（本版） |
|---|---|---|
| 前端 | Next.js 全栈，部署在电脑 | Vite + React 静态 SPA，部署 GitHub Pages |
| 后端 | Next.js API 与前端同进程 | 独立 Fastify API，跑当前电脑，只通过隧道暴露 |
| 数据库 | 当前电脑 MySQL | 不变，当前电脑 MySQL 8.4 |
| 公网入口 | Cloudflare Tunnel + 自定义域名 | GitHub Pages 免费地址 + ngrok 免费 dev domain，无域名 |
| 楼中楼 | 限制一层 | **不限层级**，`parent_id` 自关联 |
| 发帖 / 回复 | 新用户限额 | **不设数量上限**，不做发帖前审核 |
| 审核 | 待审队列 | **取消发帖前审核**；保留举报、管理员事后删帖 / 封禁 |
| 注册 | 邮箱验证 + 验证码 | **用户名 + 密码，无邮箱**；忘记密码由管理员重置 |
| 成本 | 域名 + 电费 | **¥0**（不含电费；不买域名、不用付费服务） |
| 代价 | 家庭电脑可用性 | 电脑必须常开；ngrok 免费额度有限；SEO 很弱；垃圾内容风险高 |

**一句话：** 前端是纯静态 SPA，放 GitHub Pages；后端和 MySQL 跑当前电脑；用 ngrok 免费 dev domain 把 API 暴露到公网；不买域名、不限制发帖回复、不做发帖前审核、楼中楼不限层级。

### 1.1 v1.3 修订

| 项目 | v1.2 | v1.3 |
|---|---|---|
| 隧道 | Cloudflare Quick Tunnel，重启地址变化 | **ngrok 免费 dev domain**，地址稳定为 `xxx.ngrok-free.dev` |
| 前端请求 | 普通 fetch | 增加 `ngrok-skip-browser-warning: 1` 头，绕开免费版插页 |
| CORS | 允许 `Content-Type`、`Authorization` | 再允许 `ngrok-skip-browser-warning` |
| 免费额度 | 隧道无明确请求数限制 | **20,000 HTTP 请求/月、1 GB 出站/月**，需控制请求量 |
| 管理员 | 保留举报、删帖、封禁 | 不变 |
| 仓库 | 公开 | 不变，继续公开 |

---

## 2. 结论与硬约束

### 2.1 最终架构

```
用户浏览器
  │
  ├── https://<username>.github.io/<repo>/
  │      静态 SPA（HTML/JS/CSS，来自 GitHub Pages）
  │
  └── https://<dev-domain>.ngrok-free.dev/api/...
         ngrok 免费 dev domain → 当前电脑 127.0.0.1:3002
                        Fastify API
                        MySQL 8.4（127.0.0.1:3306）
```

### 2.2 不可回避的事实

1. **GitHub Pages 只能放静态文件**：不能跑 API、不能连 MySQL、不能做 SSR。
2. **浏览器不能直接连 MySQL**：必须经过 API。
3. **API 必须公网可达**：所以当前电脑要开一个端口，通过 ngrok 暴露；不能直接把 3306 暴露出去。
4. **ngrok 免费版有请求额度**：20,000 HTTP 请求/月、1 GB 出站/月；地址稳定，但额度用完 API 会报错。
5. **电脑必须常开**：关机、睡眠、断网、停电，论坛就不可用。
6. **没有域名**：Pages 地址是 `username.github.io/repo`；API 地址是 `xxx.ngrok-free.dev`。没有品牌域名。
7. **没有邮件服务**：不做邮箱验证、不做邮件找回密码；忘记密码由管理员重置。
8. **没有付费 CDN / 对象存储 / 数据库**：图片如果要上传，存本地磁盘；MVP 先不做图片。
9. **免费版有浏览器插页**：前端 fetch 必须带 `ngrok-skip-browser-warning` 头，否则可能收到 HTML 警告页。
10. **SEO 很弱**：SPA + hash 路由 + 无 SSR，搜索引擎收录差；这不是内容型论坛的理想形态。
11. **国内访问不稳定**：GitHub Pages 与 ngrok 域名在国内可能慢或被阻断；零成本无法解决。

### 2.3 能答应的

- 楼中楼不限层级；
- 不限制发帖数、回复数；
- 发帖无需审核，提交即展示；
- 开放注册；
- 当前电脑 MySQL；
- GitHub Pages 静态托管；
- 不买域名、不付任何服务费。

### 2.4 不能答应的

- GitHub Pages 直接跑论坛后端；
- 浏览器直连 MySQL；
- 零成本 + 稳定公网 + 自定义域名 + 国内高速 + SEO；
- 完全无人管理还能长期不被垃圾内容淹没。

---

## 3. 可行性说明

### 3.1 为什么选 Vite SPA，而不是 Next.js

Next.js 的静态导出（`output: 'export'`）要求所有动态路由在构建时已知；论坛的主题 ID、帖子 ID 是运行时数据，静态导出无法预生成。可以做 query 参数或 hash 路由绕过，但会失去 Next.js 的 SSR 价值，且 API 仍要单独部署。

因此前端直接用 **Vite + React SPA**：

- 构建产物是纯静态 `dist/`；
- GitHub Pages 直接托管；
- 用 `HashRouter`，刷新不会 404；
- 所有数据通过 `fetch` 调 API；
- 不需要 Node 运行时。

代价：没有 SSR、SEO 差、首屏依赖 JS。对零成本方案，这是合理取舍。

### 3.2 为什么 API 用 Fastify，而不是继续用 Next.js

前端已经静态化，API 只需要 JSON 接口：

- Fastify 轻、启动快、插件少；
- Drizzle + MySQL 直接；
- 不需要 React / SSR 依赖；
- 本地 Windows 上跑一个 Node 进程即可；
- 用 NSSM 注册为 Windows 服务，开机自启。

### 3.3 为什么用免费隧道

没有域名、没有公网 IP、不想花钱，可选：

| 方式 | 成本 | 稳定性 | 地址 |
|---|---|---|---|
| **ngrok 免费 dev domain** | ¥0 | 地址稳定，有月额度 | `https://xxx.ngrok-free.dev` |
| Cloudflare Quick Tunnel | ¥0 | 一般，重启变地址 | `https://random.trycloudflare.com` |
| localhost.run | ¥0 | 一般 | `https://xxx.lhr.life` |
| 路由器端口映射 + DDNS | ¥0 | 依赖公网 IP，暴露家庭网络 | 动态 IP |
| 购买域名 + 云服务器 | ¥ | 稳定 | 自定义域名 |

本方案默认 **ngrok 免费 dev domain**：账号免费，自动分配 1 个稳定的 `xxx.ngrok-free.dev` 地址，不需要买域名。代价是免费版每月 20,000 HTTP 请求、1 GB 出站流量，以及浏览器插页（API 请求需带 `ngrok-skip-browser-warning` 头）。如果额度不够，再换 Cloudflare Quick Tunnel 或升级付费。

详细步骤见 [ngrok-setup.md](ngrok-setup.md)。

### 3.4 这条路适合什么

适合：

- 个人项目、内测、小圈子；
- 能接受电脑常开；
- 能接受地址变化；
- 不追求 SEO 和国内高速；
- 愿意手动处理垃圾内容和违规内容。

不适合：

- 正式商业运营；
- 需要 99.9% 可用性；
- 需要备案、品牌、支付、广告；
- 不能接受内容风险。

---

## 4. 产品形态

### 4.1 定位

**一个贴吧式的综合社区：以「吧」为单位，用户自由注册、自由发帖、无限楼中楼。**

核心对象：

```
分区 Category
  └── 吧 Bar
        ├── 吧主 / 小吧主
        ├── 关注成员
        └── 主题 Thread
              └── 帖子 Post
                    └── 子帖子 Post（parent_id，不限层级）
```

### 4.2 首批吧

管理员先建 6–8 个，避免空壳：

| 分区 | 吧 |
|---|---|
| 科技 | 互联网、编程 |
| 生活 | 生活、情感 |
| 娱乐 | 影视、游戏 |
| 学习 | 学习 |
| 职场 | 职场 |
| 站务 | 公告、反馈 |

用户可以自由发帖；吧不能由用户创建（MVP），需要新吧由管理员加。

### 4.3 设计原则

1. **帖子即内容**：列表突出标题、作者、回复数、最后活跃；
2. **楼中楼无限**：数据层不限制，UI 逐层展开，不一次加载整棵树；
3. **不设配额**：不发帖数 / 回复数限制；分页只是展示，不是限制；
4. **不做发帖前审核**：提交即展示；管理员事后处理；
5. **极简依赖**：不引入 Redis、搜索服务、对象存储、邮件服务；
6. **零成本优先**：所有基础设施都在免费额度内；
7. **接受不完美**：没有域名、没有 SSR、没有 SLA。

---

## 5. 功能范围

### 5.1 MVP（P0）

| 模块 | 功能 | 人日 |
|---|---|---:|
| 账号 | 用户名注册、登录、退出、会话 | 5 |
| 账号 | 个人主页、头像 URL、简介 | 3 |
| 吧 | 分区、吧列表、吧主页、吧规 | 5 |
| 吧 | 关注 / 取消关注、成员数 | 2 |
| 主题 | 发帖、编辑、删除、置顶、加精、锁定 | 7 |
| 帖子 | 顶层回复、无限楼中楼、编辑、删除 | 10 |
| 互动 | 点赞、收藏 | 3 |
| 通知 | 被回复、被 @、吧务、系统 | 5 |
| 搜索 | 主题标题 + 帖子内容（MySQL FULLTEXT） | 4 |
| 举报 | 举报主题 / 帖子 / 用户 | 3 |
| 管理 | 吧主 / 小吧主管理本吧；管理员全站 | 8 |
| 前端 | 首页、吧、主题、登录、后台、移动端 | 18 |
| 后端 | 路由、校验、CORS、错误处理 | 8 |
| 部署 | Pages、API 服务、隧道、启动脚本 | 5 |
| 测试 | 单元、E2E、手工验收 | 6 |
| **合计** | | **92** |

按 2 人并行、每周 5 天：约 9–10 周；按 1 人：约 18–19 周。

> 不含设计、内容准备、图片上传、用户创建吧、签到、等级、邮件。

### 5.2 P1

- 图片上传（本地磁盘 + 压缩 + EXIF 清除）；
- 用户创建吧（管理员审核）；
- 标签；
- 深色模式；
- 吧内热门排序；
- 管理员数据看板；
- 导出备份。

### 5.3 明确不做

- 发帖前审核队列；
- 发帖 / 回复数量配额；
- 邮箱验证、邮件通知、邮件找回密码；
- 手机号、实名；
- 私信、聊天；
- 推荐算法；
- 会员、广告、支付；
- 原生 App；
- 多语言；
- 对象存储 / CDN。

---

## 6. 用户与权限

### 6.1 角色

| 角色 | 说明 |
|---|---|
| 游客 | 浏览公开吧、主题、帖子 |
| 注册用户 | 发帖、回复、楼中楼、点赞、收藏、举报 |
| 小吧主 | 由吧主任命，管理本吧内容与用户 |
| 吧主 | 管理本吧：置顶、加精、锁定、删帖、封禁、任命小吧主 |
| 管理员 | 建吧、分类、全站用户、内容、举报、配置 |

### 6.2 权限矩阵

| 操作 | 游客 | 注册用户 | 小吧主 | 吧主 | 管理员 |
|---|:---:|:---:|:---:|:---:|:---:|
| 浏览 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 发主题 / 回复 / 楼中楼 | — | ✓ | ✓ | ✓ | ✓ |
| 点赞 / 收藏 / 举报 | — | ✓ | ✓ | ✓ | ✓ |
| 编辑 / 删除自己的内容 | — | ✓ | ✓ | ✓ | ✓ |
| 置顶 / 加精 / 锁定 | — | — | ✓ | ✓ | ✓ |
| 隐藏 / 删除他人内容 | — | — | ✓ | ✓ | ✓ |
| 禁言 / 封禁本吧 | — | — | ✓ | ✓ | ✓ |
| 任命小吧主 | — | — | — | ✓ | ✓ |
| 建吧 / 分类 | — | — | — | — | ✓ |
| 全站封禁 / 删吧 | — | — | — | — | ✓ |
| 访问 `/admin` | — | — | — | — | ✓ |

### 6.3 没有等级和配额

- 不设信任等级；
- 不设每日发帖 / 回复上限；
- 不设新用户冷却；
- 注册后即可发帖；
- 分页、每页条数只是展示，不是配额；
- 管理员可以封禁，但不是自动限额。

---

## 7. 页面与交互

### 7.1 路由（HashRouter）

GitHub Pages 没有服务端路由，使用 hash：

| 页面 | 路由 |
|---|---|
| 首页 | `/#/` |
| 吧广场 | `/#/bars` |
| 吧主页 | `/#/b/:slug` |
| 发主题 | `/#/b/:slug/new` |
| 主题页 | `/#/t/:id` |
| 用户主页 | `/#/u/:username` |
| 登录 | `/#/login` |
| 注册 | `/#/register` |
| 通知 | `/#/notifications` |
| 我关注的吧 | `/#/me/bars` |
| 收藏 | `/#/bookmarks` |
| 搜索 | `/#/search?q=` |
| 吧务后台 | `/#/mod/:slug` |
| 站务后台 | `/#/admin` |

> 用 hash 是为了避免 GitHub Pages 刷新 404；代价是 URL 不美观、SEO 差。

### 7.2 首页

```
┌──────────────────────────────────────────────┐
│ Logo   首页   吧广场   搜索     登录 / 注册  │
├──────────────────────────────────────────────┤
│ 推荐吧 / 最新主题 / 热门                      │
│ ┌──────────────────────────────────────────┐ │
│ │ 标题  吧 · 作者 · 回复 · 最后活跃        │ │
│ └──────────────────────────────────────────┘ │
├──────────────────────────────────────────────┤
│ 页脚：站规 · 举报 · API 状态 · GitHub        │
└──────────────────────────────────────────────┘
```

### 7.3 主题页与无限楼中楼

```
┌──────────────────────────────────────────────┐
│ 吧名 / 标题                                   │
│ 作者 · 时间 · 浏览 · 回复                     │
├──────────────────────────────────────────────┤
│ #1 作者                                       │
│    正文                                       │
│    赞 · 收藏 · 回复 · 举报                    │
│    └ 子回复（展开 12 条）                     │
│       └ 子回复（展开 3 条）                   │
│          └ ...（不限层级，逐层加载）          │
├──────────────────────────────────────────────┤
│ #2 作者 ...                                   │
├──────────────────────────────────────────────┤
│ 回复框                                        │
└──────────────────────────────────────────────┘
```

**交互规则：**

- 顶层楼层分页，每页 20 条；
- 每个帖子显示直接子回复数 `childCount`；
- 点击「展开」调用 `GET /api/posts/:id/children`，只加载直接子级；
- 子级里继续展开，不限层级；
- 不一次加载整棵树，避免大数据量卡死；
- 删除父帖时，子帖不物理删除，标记隐藏；UI 显示「内容已删除」。

### 7.4 移动端

- 底部导航：首页、吧广场、发帖、通知、我的；
- 主题页底部固定回复框；
- 楼中楼缩进最大 3 层视觉，超过后平铺显示「继续查看」，但数据层级不限；
- 管理操作收进「更多」。

> 视觉缩进可以截断，数据不截断；这是 UI 取舍，不是功能限制。

---

## 8. 核心流程

### 8.1 注册

1. 用户名（3–32 字符，唯一）、密码（至少 8 位）、显示名；
2. 不需要邮箱、不需要验证码；
3. 服务端校验用户名唯一、密码强度、输入长度；
4. `argon2` 哈希密码；
5. 创建用户，直接可登录；
6. 没有邮箱找回；忘记密码由管理员在后台重置。

**代价：** 无法自助找回密码；垃圾注册无门槛。用户明确要求零成本、无限制，这里如实说明。

### 8.2 登录

1. 用户名 + 密码；
2. 校验 `password_hash`；
3. 创建 `sessions` 记录，返回随机 token；
4. 前端存 `localStorage`，后续请求带 `Authorization: Bearer <token>`；
5. 退出时调用 `/api/auth/logout`，服务端撤销 session；
6. 会话默认 30 天。

**为什么不用 Cookie：** GitHub Pages 与隧道 API 是跨站；第三方 Cookie 容易被浏览器拦截。Bearer token 更简单，但必须防 XSS。

### 8.3 发主题

1. 选择吧，填写标题、正文；
2. 提交后直接写 `threads` + 首楼 `posts`；
3. **不进入审核队列**；
4. 更新吧计数、`last_post_at`；
5. 返回主题页，立即可见；
6. 管理员事后可隐藏 / 删除。

### 8.4 顶层回复

1. 主题未锁定、用户未被封禁；
2. 锁定主题行，`floor = MAX(floor) + 1`；
3. 插入 `posts`，`parent_id = NULL`，`floor = 新楼层`；
4. 更新 `threads.reply_count`、`last_post_at`；
5. 通知主题作者；
6. 直接展示。

### 8.5 楼中楼（不限层级）

1. 用户点某个帖子的「回复」；
2. `parent_id = 目标帖子 id`，`floor = NULL`；
3. 插入 `posts`，更新父帖 `child_count + 1`、主题 `reply_count + 1`；
4. 通知被回复者；
5. 直接展示；
6. 子回复可继续被回复，层级不限；
7. UI 逐层展开，每次只取直接子级。

### 8.6 关注吧

1. 点「关注」写 `bar_members`；
2. `bars.member_count + 1`；
3. 取消关注删除记录，计数 -1；
4. 关注列表在 `/#/me/bars`（可并入用户主页）。

### 8.7 举报与事后处理

1. 用户举报主题 / 帖子 / 用户；
2. 写 `reports`，状态 `open`；
3. 吧主 / 管理员在后台看到；
4. 处理：忽略、隐藏、删除、警告、禁言、封禁；
5. 写 `moderation_actions`；
6. 通知被处理人；
7. **没有发帖前审核，只有事后处理。**

### 8.8 通知

- 被回复：通知被回复帖作者；
- 被 @：解析正文，最多 5 人；
- 吧务：通知被处理人；
- 系统：公告；
- 只做站内通知，不做邮件；
- 不做后台轮询；在窗口聚焦、手动刷新或进入通知页时拉取未读数；这是为了控制 ngrok 20,000 请求/月的免费额度。

---

## 9. 技术架构

### 9.1 选型

| 层 | 选择 | 理由 |
|---|---|---|
| 前端 | Vite + React + TypeScript | 纯静态、构建快、GitHub Pages 直接托管 |
| 路由 | React Router `HashRouter` | Pages 刷新不 404 |
| 样式 | Tailwind CSS + shadcn/ui | 快、可定制 |
| 数据请求 | TanStack Query | 缓存、重试、加载状态 |
| 后端 | Fastify + TypeScript | 轻、快、插件少 |
| 校验 | Zod | 请求体校验 |
| ORM | Drizzle ORM + `mysql2` | SQL 透明、迁移轻 |
| 数据库 | MySQL 8.4 LTS | 当前电脑已有 |
| 认证 | 自建 session token + `argon2` | 无邮箱、无第三方 |
| 搜索 | MySQL FULLTEXT ngram | 零额外服务 |
| 文件 | MVP 不做上传 | 零成本优先 |
| 隧道 | ngrok 免费 dev domain | 地址稳定、HTTPS、无需域名 |
| 前端托管 | GitHub Pages | 免费 |
| CI | GitHub Actions | 免费额度 |
| 监控 | Uptime Kuma（可选） | 自建、免费 |
| 测试 | Vitest + Playwright | 单元、E2E |

### 9.2 架构图

```
┌──────────────────────────────┐
│ GitHub Pages                 │
│ https://user.github.io/repo  │
│ 静态 SPA（Vite build）        │
└──────────────┬───────────────┘
               │ fetch + Bearer token
               │ CORS: 允许 Pages origin
┌──────────────▼───────────────┐
│ ngrok 免费 dev domain        │
│ https://xxx.ngrok-free.dev   │
└──────────────┬───────────────┘
               │ http://127.0.0.1:3002
┌──────────────▼───────────────┐
│ 当前电脑                     │
│ Fastify API                  │
│ MySQL 8.4（127.0.0.1:3306）  │
└──────────────────────────────┘

GitHub：代码 + Actions（构建前端、跑 API 测试）
```

### 9.3 仓库结构

```
forum/
├── apps/
│   ├── web/                 # Vite + React，部署 Pages
│   │   ├── public/config.js # API 地址，运行时读取
│   │   ├── src/
│   │   └── vite.config.ts
│   └── api/                 # Fastify + Drizzle，跑电脑
│       ├── src/
│       │   ├── routes/
│       │   ├── db/
│       │   ├── lib/
│       │   └── server.ts
│       ├── drizzle/
│       └── .env.example
├── packages/
│   └── shared/              # 共享类型 / Zod schema
├── scripts/
│   ├── start-api.ps1
│   ├── start-tunnel.ps1
│   └── backup.ps1
├── .github/workflows/
│   ├── deploy-web.yml
│   └── api-ci.yml
└── package.json
```

### 9.4 数据流

1. 浏览器加载 Pages 上的静态 SPA；
2. 读取 `config.js` 里的 `apiBase`；
3. 请求 API，带 `Authorization`；
4. API 校验 token，查 MySQL；
5. 返回 JSON；
6. 前端渲染。

没有 SSR、没有服务端 Cookie、没有同源代理。

---

## 10. 前端：GitHub Pages 静态站点

### 10.1 构建配置

```ts
// apps/web/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/forum/', // 仓库名；如果是 username.github.io 仓库，改成 '/'
  build: { outDir: 'dist' },
});
```

### 10.2 运行时 API 地址

不要把 API 地址写进编译产物，否则 API 地址一变就要重新构建。用 `public/config.js`：

```js
// apps/web/public/config.js
window.__FORUM_CONFIG__ = {
  apiBase: 'https://abc123xyz.ngrok-free.dev',
  siteName: '论坛',
};
```

`index.html` 在入口脚本之前加载：

```html
<script src="./config.js"></script>
```

如果更换 API 地址，只改这个文件，提交后 GitHub Pages 重新部署；不需要改业务代码。

### 10.3 HashRouter

```tsx
import { HashRouter } from 'react-router-dom';

<HashRouter>
  <App />
</HashRouter>
```

GitHub Pages 只认文件路径，不认 `/t/123` 这种服务端路由；hash 不会发给服务器，刷新不会 404。

### 10.4 API 客户端

```ts
const apiBase = window.__FORUM_CONFIG__.apiBase.replace(/\/$/, '');

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('forum_token');
  const res = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': '1',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) throw await res.json();
  return res.json();
}
```

> `ngrok-skip-browser-warning` 是自定义头，会触发 CORS 预检；后端 `allowedHeaders` 必须包含它，否则浏览器会拦截。每个跨域写请求可能消耗 2 次 ngrok HTTP 请求（OPTIONS + 实际请求），要算进免费额度。

### 10.5 GitHub Pages 部署

`.github/workflows/deploy-web.yml`：

```yaml
name: deploy-web
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter web build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: apps/web/dist
      - uses: actions/deploy-pages@v4
```

GitHub 仓库 Settings → Pages → Source 选 **GitHub Actions**。

> 免费账号的 GitHub Pages 只能从公开仓库发布；私有仓库发布 Pages 通常需要付费计划。零成本方案默认公开仓库。

### 10.6 前端限制

- 无 SSR，SEO 差；
- hash URL 不美观；
- 首屏要等 JS 加载；
- 大帖子树逐层加载，避免一次渲染过多；
- 需要处理 API 离线 / ngrok 额度用尽的提示。

---

## 11. 后端：当前电脑 API

### 11.1 运行方式

- Node.js 22 + Fastify；
- 只监听 `127.0.0.1:3002`；
- MySQL 只监听 `127.0.0.1:3306`；
- 用 NSSM 注册为 Windows 服务，开机自启；
- 通过 ngrok 免费 dev domain 暴露 3002。

### 11.2 CORS

GitHub Pages 的 origin 是 `https://<username>.github.io`（不带仓库路径）。API 只允许：

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

不要用 `origin: true` 或 `*` 放行所有来源；Bearer token 泄漏风险太高。

### 11.3 认证

- 注册：`username` + `password` + `display_name`；
- `argon2id` 哈希；
- 登录成功生成 32 字节随机 token；
- 数据库存 SHA-256(token)，不存明文；
- 前端存 `localStorage`；
- 每次请求 `Authorization: Bearer <token>`；
- 会话 30 天；退出撤销；
- 管理员可撤销用户全部会话（封禁时）。

### 11.4 无审核、无配额

- `POST /api/threads` 直接写库，不进入 pending；
- `POST /api/posts` 直接写库；
- 不做每日发帖 / 回复计数；
- 不做验证码；
- 不做邮箱验证；
- 只做输入校验、长度限制、SQL 参数化、HTML 清洗。

**这不是安全最佳实践，是按你的要求做的取舍。**

### 11.5 输入限制（不是用户配额）

为避免单请求打爆进程：

- JSON body 最大 1 MB；
- 标题 5–120 字；
- 正文最大 50,000 字；
- 图片 MVP 不支持；
- 每页最多 50 条；
- 这些是技术边界，不是发帖数量限制。

### 11.6 错误格式

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "请先登录"
  }
}
```

### 11.7 密码重置

没有邮件，只能：

- 管理员在后台生成一次性重置链接 / 临时密码；
- 或直接改数据库；
- 用户忘记密码时联系管理员。

---

## 12. 数据库：MySQL

### 12.1 约定

- MySQL 8.4 LTS；
- InnoDB，`utf8mb4`，`utf8mb4_0900_ai_ci`；
- 主键 `BIGINT UNSIGNED AUTO_INCREMENT`；
- 时间 `DATETIME(3)`，UTC；
- 状态 `VARCHAR + CHECK`；
- 帖子删除软删除；
- `posts.parent_id` 自关联，**不限层级**；
- 顶层帖子有 `floor`，子帖子 `floor = NULL`；
- 认证用 `sessions` 表，不存明文 token。

### 12.2 核心 DDL

```sql
CREATE DATABASE IF NOT EXISTS forum
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE forum;

CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(32) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(64) NOT NULL,
  avatar_url VARCHAR(512) NULL,
  bio VARCHAR(500) NOT NULL DEFAULT '',
  user_role VARCHAR(16) NOT NULL DEFAULT 'member',
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_seen_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_username (username),
  KEY idx_users_status (status),
  CONSTRAINT chk_users_role CHECK (user_role IN ('member', 'admin')),
  CONSTRAINT chk_users_status CHECK (status IN ('active', 'suspended', 'deleted'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE sessions (
  id CHAR(36) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  revoked_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_sessions_token_hash (token_hash),
  KEY idx_sessions_user (user_id, expires_at),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE categories (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(64) NOT NULL,
  name VARCHAR(64) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_categories_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE bars (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id INT UNSIGNED NOT NULL,
  slug VARCHAR(64) NOT NULL,
  name VARCHAR(64) NOT NULL,
  description VARCHAR(500) NOT NULL DEFAULT '',
  rules TEXT NULL,
  avatar_url VARCHAR(512) NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  sort_order INT NOT NULL DEFAULT 0,
  thread_count INT UNSIGNED NOT NULL DEFAULT 0,
  post_count INT UNSIGNED NOT NULL DEFAULT 0,
  member_count INT UNSIGNED NOT NULL DEFAULT 0,
  last_thread_id BIGINT UNSIGNED NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_bars_slug (slug),
  KEY idx_bars_category (category_id, sort_order),
  KEY idx_bars_status (status, member_count),
  CONSTRAINT fk_bars_category FOREIGN KEY (category_id) REFERENCES categories(id),
  CONSTRAINT fk_bars_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_bars_status CHECK (status IN ('active', 'hidden', 'deleted'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE bar_members (
  user_id BIGINT UNSIGNED NOT NULL,
  bar_id BIGINT UNSIGNED NOT NULL,
  joined_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id, bar_id),
  KEY idx_bar_members_bar (bar_id, joined_at),
  CONSTRAINT fk_bar_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bar_members_bar FOREIGN KEY (bar_id) REFERENCES bars(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE bar_moderators (
  bar_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  mod_role VARCHAR(16) NOT NULL DEFAULT 'moderator',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (bar_id, user_id),
  KEY idx_bar_moderators_user (user_id),
  CONSTRAINT fk_bar_moderators_bar FOREIGN KEY (bar_id) REFERENCES bars(id) ON DELETE CASCADE,
  CONSTRAINT fk_bar_moderators_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_bar_moderators_role CHECK (mod_role IN ('owner', 'moderator'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE threads (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  bar_id BIGINT UNSIGNED NOT NULL,
  author_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(120) NOT NULL,
  slug VARCHAR(160) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'open',
  is_pinned TINYINT(1) NOT NULL DEFAULT 0,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  reply_count INT UNSIGNED NOT NULL DEFAULT 0,
  view_count INT UNSIGNED NOT NULL DEFAULT 0,
  last_post_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_threads_bar_slug (bar_id, slug),
  KEY idx_threads_bar_last (bar_id, status, is_pinned, last_post_at),
  KEY idx_threads_bar_featured (bar_id, status, is_featured, last_post_at),
  KEY idx_threads_author (author_id, created_at),
  FULLTEXT KEY ft_threads_title (title) WITH PARSER ngram,
  CONSTRAINT fk_threads_bar FOREIGN KEY (bar_id) REFERENCES bars(id),
  CONSTRAINT fk_threads_author FOREIGN KEY (author_id) REFERENCES users(id),
  CONSTRAINT chk_threads_status CHECK (status IN ('open', 'locked', 'deleted'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE posts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  thread_id BIGINT UNSIGNED NOT NULL,
  author_id BIGINT UNSIGNED NOT NULL,
  parent_id BIGINT UNSIGNED NULL,
  floor INT UNSIGNED NULL,
  content_md MEDIUMTEXT NOT NULL,
  content_html MEDIUMTEXT NOT NULL,
  content_text MEDIUMTEXT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'visible',
  child_count INT UNSIGNED NOT NULL DEFAULT 0,
  edited_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_posts_thread_floor (thread_id, floor),
  KEY idx_posts_thread_parent (thread_id, parent_id, created_at),
  KEY idx_posts_parent (parent_id, created_at),
  KEY idx_posts_author (author_id, created_at),
  FULLTEXT KEY ft_posts_content (content_text) WITH PARSER ngram,
  CONSTRAINT fk_posts_thread FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE,
  CONSTRAINT fk_posts_author FOREIGN KEY (author_id) REFERENCES users(id),
  CONSTRAINT chk_posts_status CHECK (status IN ('visible', 'hidden', 'deleted'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE reactions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  target_type VARCHAR(16) NOT NULL,
  target_id BIGINT UNSIGNED NOT NULL,
  kind VARCHAR(16) NOT NULL DEFAULT 'like',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_reactions_user_target (user_id, target_type, target_id, kind),
  KEY idx_reactions_target (target_type, target_id, kind),
  CONSTRAINT fk_reactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_reactions_target CHECK (target_type IN ('thread', 'post')),
  CONSTRAINT chk_reactions_kind CHECK (kind IN ('like'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE bookmarks (
  user_id BIGINT UNSIGNED NOT NULL,
  thread_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id, thread_id),
  KEY idx_bookmarks_thread (thread_id),
  CONSTRAINT fk_bookmarks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bookmarks_thread FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  notification_type VARCHAR(16) NOT NULL,
  actor_id BIGINT UNSIGNED NULL,
  thread_id BIGINT UNSIGNED NULL,
  post_id BIGINT UNSIGNED NULL,
  payload JSON NOT NULL,
  read_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_notifications_user (user_id, read_at, created_at),
  KEY idx_notifications_thread (thread_id),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_notifications_thread FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT chk_notifications_type CHECK (
    notification_type IN ('reply', 'mention', 'moderation', 'system', 'bar')
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE reports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reporter_id BIGINT UNSIGNED NOT NULL,
  target_type VARCHAR(16) NOT NULL,
  target_id BIGINT UNSIGNED NOT NULL,
  reason VARCHAR(16) NOT NULL,
  detail VARCHAR(1000) NOT NULL DEFAULT '',
  report_status VARCHAR(16) NOT NULL DEFAULT 'open',
  handled_by BIGINT UNSIGNED NULL,
  resolution VARCHAR(500) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  handled_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_reports_status (report_status, created_at),
  KEY idx_reports_target (target_type, target_id),
  CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_id) REFERENCES users(id),
  CONSTRAINT fk_reports_handler FOREIGN KEY (handled_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_reports_target CHECK (target_type IN ('thread', 'post', 'user')),
  CONSTRAINT chk_reports_reason CHECK (reason IN ('spam', 'abuse', 'sexual', 'infringement', 'other')),
  CONSTRAINT chk_reports_status CHECK (report_status IN ('open', 'resolved', 'rejected'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE moderation_actions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_id BIGINT UNSIGNED NULL,
  bar_id BIGINT UNSIGNED NULL,
  action_type VARCHAR(32) NOT NULL,
  target_type VARCHAR(16) NOT NULL,
  target_id BIGINT UNSIGNED NOT NULL,
  reason VARCHAR(500) NOT NULL DEFAULT '',
  expires_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_moderation_target (target_type, target_id),
  KEY idx_moderation_bar (bar_id, created_at),
  CONSTRAINT fk_moderation_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_moderation_bar FOREIGN KEY (bar_id) REFERENCES bars(id) ON DELETE SET NULL,
  CONSTRAINT chk_moderation_target CHECK (target_type IN ('user', 'thread', 'post', 'bar')),
  CONSTRAINT chk_moderation_action CHECK (
    action_type IN ('hide', 'delete', 'restore', 'warn', 'mute', 'ban', 'unban',
                    'pin', 'unpin', 'feature', 'unfeature')
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

> 这份 DDL 不包含 `pending`、`depth`、`root_id`、`bar_applications`、`checkins`、`tags`、`attachments`、`outbox`。楼中楼只靠 `parent_id`，层级不限。
>
> 以上 DDL 已在 MySQL 8.4.9 上实际执行通过；用 4 层楼中楼和中文 FULLTEXT 检索做过插入验证。

### 12.3 关键索引说明

| 查询 | 索引 |
|---|---|
| 吧内主题列表 | `(bar_id, status, is_pinned, last_post_at)` |
| 吧内精品 | `(bar_id, status, is_featured, last_post_at)` |
| 顶层楼层 | `(thread_id, parent_id, created_at)` |
| 子回复 | `(parent_id, created_at)` |
| 用户发帖 | `(author_id, created_at)` |
| 通知 | `(user_id, read_at, created_at)` |
| 举报 | `(report_status, created_at)` |
| 中文搜索 | FULLTEXT `ngram` |

顶层楼层查询：

```sql
SELECT * FROM posts
WHERE thread_id = ?
  AND parent_id IS NULL
  AND status = 'visible'
ORDER BY floor
LIMIT ? OFFSET ?;
```

子回复查询：

```sql
SELECT * FROM posts
WHERE parent_id = ?
  AND status = 'visible'
ORDER BY created_at
LIMIT ? OFFSET ?;
```

子回复计数：

```sql
SELECT COUNT(*) FROM posts
WHERE parent_id = ? AND status = 'visible';
```

如果数据量大，`child_count` 在插入 / 隐藏时维护；MVP 可以直接 COUNT。

### 12.4 中文搜索

- `ngram_token_size=2`；
- `threads.title`、`posts.content_text` 建 FULLTEXT；
- 查询：

```sql
SELECT id, title
FROM threads
WHERE MATCH(title) AGAINST (? IN NATURAL LANGUAGE MODE)
ORDER BY MATCH(title) AGAINST (? IN NATURAL LANGUAGE MODE) DESC
LIMIT 20;
```

- 单字查询用 `LIKE` 兜底；
- 不引入 Meilisearch。

---

## 13. API 设计

### 13.1 认证

| 方法 | 路径 | 说明 |
|---|---|---|
| `POST` | `/api/auth/register` | 用户名、密码、显示名 |
| `POST` | `/api/auth/login` | 返回 token |
| `POST` | `/api/auth/logout` | 撤销当前 session |
| `GET` | `/api/me` | 当前用户 |
| `PATCH` | `/api/me` | 改显示名 / 头像 / 简介 |
| `POST` | `/api/me/password` | 改密码（需旧密码） |

### 13.2 吧

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| `GET` | `/api/bars` | 否 | 吧列表 |
| `GET` | `/api/bars/:slug` | 否 | 吧详情 |
| `POST` | `/api/bars/:slug/follow` | 是 | 关注 / 取消 |
| `GET` | `/api/me/bars` | 是 | 我关注的吧 |
| `POST` | `/api/admin/bars` | 管理员 | 建吧 |
| `PATCH` | `/api/admin/bars/:id` | 管理员 | 改吧 |
| `POST` | `/api/admin/bars/:id/moderators` | 管理员 | 指派吧主 |
| `POST` | `/api/mod/:bar/moderators` | 吧主 | 任命小吧主 |
| `DELETE` | `/api/mod/:bar/moderators/:userId` | 吧主 | 移除小吧主 |

### 13.3 主题

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| `GET` | `/api/threads?bar=&sort=&cursor=` | 否 | 主题列表 |
| `POST` | `/api/threads` | 是 | 发主题，立即可见 |
| `GET` | `/api/threads/:id` | 否 | 主题 + 首楼 |
| `PATCH` | `/api/threads/:id` | 作者 / 吧务 | 编辑 |
| `DELETE` | `/api/threads/:id` | 作者 / 吧务 | 软删除 |
| `POST` | `/api/threads/:id/pin` | 吧务 | 置顶 |
| `POST` | `/api/threads/:id/feature` | 吧务 | 加精 |
| `POST` | `/api/threads/:id/lock` | 吧务 | 锁定 |

### 13.4 帖子与楼中楼

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| `GET` | `/api/threads/:id/posts?cursor=` | 否 | 顶层楼层 |
| `POST` | `/api/threads/:id/posts` | 是 | 顶层回复 |
| `GET` | `/api/posts/:id/children?cursor=` | 否 | 直接子回复 |
| `POST` | `/api/posts/:id/replies` | 是 | 楼中楼回复，层级不限 |
| `PATCH` | `/api/posts/:id` | 作者 / 吧务 | 编辑 |
| `DELETE` | `/api/posts/:id` | 作者 / 吧务 | 软删除 |
| `POST` | `/api/posts/:id/like` | 是 | 点赞 / 取消 |
| `POST` | `/api/threads/:id/bookmark` | 是 | 收藏 / 取消 |

### 13.5 其他

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| `GET` | `/api/search?q=&type=&cursor=` | 否 | 搜索 |
| `GET` | `/api/notifications?cursor=` | 是 | 通知 |
| `POST` | `/api/notifications/read` | 是 | 批量已读 |
| `POST` | `/api/reports` | 是 | 举报 |
| `GET` | `/api/mod/:bar/reports` | 吧务 | 本吧举报 |
| `POST` | `/api/mod/:bar/reports/:id/resolve` | 吧务 | 处理 |
| `POST` | `/api/mod/:bar/users/:id/sanction` | 吧务 | 禁言 / 封禁 |
| `GET` | `/api/admin/reports` | 管理员 | 全站举报 |
| `POST` | `/api/admin/reports/:id/resolve` | 管理员 | 处理全站举报 |
| `POST` | `/api/admin/users/:id/reset-password` | 管理员 | 重置密码 |
| `POST` | `/api/admin/users/:id/sanction` | 管理员 | 全站处罚 |

### 13.6 分页

```json
{
  "items": [],
  "nextCursor": "MTIz",
  "hasMore": true
}
```

- 顶层楼层按 `floor` 分页；
- 子回复按 `created_at` 分页；
- 每页最多 50；
- 没有用户配额，只有展示分页。

### 13.7 CORS 与 token

- API 允许 Pages origin + localhost；
- 不使用 Cookie；
- `Authorization: Bearer <token>`；
- 预检请求允许 `Content-Type`、`Authorization`；
- 前端 `localStorage` 存 token；
- XSS 是主要风险，必须做 HTML 清洗 + CSP。

---

## 14. 部署与启动

### 14.1 GitHub Pages

1. 建仓库，推代码；
2. Settings → Pages → Source 选 **GitHub Actions**；
3. push `main` 触发 `deploy-web.yml`；
4. 访问 `https://<username>.github.io/<repo>/`；
5. 如果仓库名是 `<username>.github.io`，Vite `base` 改为 `/`。

### 14.2 本地 API

1. 安装 Node 22、pnpm、MySQL 8.4；
2. 建库：

```sql
CREATE DATABASE forum CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'forum'@'127.0.0.1' IDENTIFIED BY 'change-me';
GRANT ALL PRIVILEGES ON forum.* TO 'forum'@'127.0.0.1';
FLUSH PRIVILEGES;
```

3. `apps/api/.env`：

```env
DATABASE_URL="mysql://forum:change-me@127.0.0.1:3306/forum"
PORT=3002
CORS_ORIGINS="https://<username>.github.io,http://localhost:5173"
```

4. `pnpm --filter api build`；
5. `pnpm --filter api start`；
6. 用 NSSM 注册为 Windows 服务：

```powershell
nssm install ForumAPI "C:\Program Files\nodejs\node.exe" "D:\code\work\forum\apps\api\dist\server.js"
nssm set ForumAPI AppDirectory "D:\code\work\forum\apps\api"
nssm set ForumAPI Start SERVICE_AUTO_START
nssm start ForumAPI
```

### 14.3 ngrok 免费 dev domain

**首次配置：**

```powershell
winget install ngrok -s msstore
ngrok config add-authtoken <你的 authtoken>
ngrok http 3002 --url https://abc123xyz.ngrok-free.dev
```

`abc123xyz.ngrok-free.dev` 是 Dashboard → Gateway → Domains 里分配给你的免费 dev domain。

输出类似：

```
Forwarding  https://abc123xyz.ngrok-free.dev -> http://localhost:3002
```

把这个地址写入 `apps/web/public/config.js`：

```js
window.__FORUM_CONFIG__ = {
  apiBase: 'https://abc123xyz.ngrok-free.dev',
  siteName: '论坛',
};
```

提交后 GitHub Pages 重新部署。

**注意：**

- dev domain 是稳定的，重启 ngrok 不变；
- 免费版每月 **20,000 HTTP 请求 / 1 GB 出站流量**；
- 免费版有浏览器插页，前端 fetch 必须带 `ngrok-skip-browser-warning: 1`；
- 自定义头会触发 CORS 预检，每个写请求可能算 2 次 HTTP 请求；
- 按 20,000 请求/月估算，大约只能支撑 4,000–6,000 次页面浏览（取决于每页请求数和写操作）；
- 详细步骤见 [ngrok-setup.md](ngrok-setup.md)。

### 14.4 启动顺序

1. MySQL 服务（开机自启）；
2. API 服务（NSSM 开机自启）；
3. ngrok（NSSM 或手动）；
4. 测试 `https://abc123xyz.ngrok-free.dev/api/health`；
5. 确认 `config.js` 的 `apiBase` 是当前 dev domain；
6. 等 Pages 部署；
7. 打开 Pages 地址。

### 14.5 备份

- `mysqldump` 每日一次，保留 7 天；
- 外部硬盘 / 另一块磁盘；
- 没有云备份预算；
- 每月恢复演练一次。

```powershell
mysqldump --single-transaction -u forum -p forum > D:\forum-backup\forum-$(Get-Date -Format yyyyMMdd).sql
```

### 14.6 监控

- Uptime Kuma 可选；
- 监控 API `/health`；
- 监控 Pages 地址；
- ngrok 掉线 / 额度用尽后监控会失败。

---

## 15. 安全、运营与合规边界

### 15.1 安全

- 密码 `argon2id`；
- token 存 SHA-256，不存明文；
- API 只监听 127.0.0.1；
- MySQL 只监听 127.0.0.1；
- 不映射路由器端口；
- CORS 白名单；
- 输入校验、HTML 清洗、CSP；
- SQL 参数化；
- `localStorage` token 有 XSS 风险，必须严格清洗用户内容；
- 管理员账号强密码；
- 备份加密；
- 不把 `.env` 提交到 git。

### 15.2 无审核的代价

- 发帖立即公开，垃圾广告、辱骂、违法内容会直接出现；
- 没有自动拦截；
- 只能靠管理员事后删除 / 封禁；
- 没有发帖数量限制，攻击者可以刷屏；
- 没有验证码，脚本可以批量注册；
- 没有邮箱，无法验证身份。

**建议至少保留：**

- 举报入口；
- 管理员删帖 / 封禁；
- 输入长度限制；
- 备份；
- 定期手动清理。

### 15.3 合规

- 公开可访问的论坛涉及内容治理义务；
- 没有域名、没有备案，不代表没有责任；
- 如果面向中国大陆公开运营，备案、内容审核、日志留存、举报处置仍需考虑；
- 零成本方案不适合承担合规运营；
- 建议先小范围使用，或明确标注“个人测试站”。

### 15.4 国内访问

- GitHub Pages 在国内可能慢或被阻断；
- `ngrok-free.dev` 也可能不稳定；
- 没有域名、没有 CDN，无法优化；
- 如果主要用户在国内，这个方案体验会很差；
- 这是零成本与无域名带来的硬限制。

---

## 16. 实施计划

### 16.1 阶段（2 人）

| 阶段 | 周期 | 交付 |
|---|---|---|
| 0. 骨架 | 第 1 周 | monorepo、MySQL、Fastify 健康检查、Vite 页面、Pages 部署 |
| 1. 账号 | 第 2 周 | 注册、登录、session、个人主页 |
| 2. 吧与主题 | 第 3–4 周 | 吧列表、吧主页、发主题、主题列表 |
| 3. 帖子与楼中楼 | 第 5–6 周 | 顶层回复、无限楼中楼、展开、删除 |
| 4. 互动 | 第 7 周 | 点赞、收藏、关注、通知 |
| 5. 搜索与管理 | 第 8–9 周 | FULLTEXT 搜索、举报、吧务、站务后台 |
| 6. 加固 | 第 10 周 | 隧道、CORS、备份、E2E、移动端 |

### 16.2 单人

约 18–19 周。建议先砍掉搜索、通知、收藏，保留「注册 + 吧 + 发帖 + 无限楼中楼 + 管理删除」。

### 16.3 第一周清单

- [ ] 建 GitHub 仓库；
- [ ] 建 MySQL 库与账号；
- [ ] 搭 monorepo（web / api / shared）；
- [ ] Fastify `/health` 跑通；
- [ ] Vite 首页 + HashRouter 跑通；
- [ ] GitHub Pages 部署空站点；
- [ ] ngrok dev domain 跑通；
- [ ] 前端能请求 `/health`；
- [ ] 写 `config.js` 更新流程；
- [ ] 写备份脚本。

---

## 17. 成本

| 项目 | 成本 |
|---|---:|
| GitHub Pages | ¥0 |
| GitHub Actions | ¥0（公开仓库额度足够） |
| ngrok 免费 dev domain | ¥0（20,000 请求/月、1 GB 出站/月） |
| MySQL | ¥0（当前电脑） |
| Node.js / pnpm | ¥0 |
| 域名 | ¥0（不买） |
| 邮件 / 短信 | ¥0（不用） |
| 对象存储 / CDN | ¥0（不用） |
| 电费 | 电脑本来常开则边际成本接近 ¥0；24 小时新增约 ¥50–150/月 |
| 备份 | ¥0（本地硬盘） |
| **合计** | **¥0 服务费**（电费另计） |

> GitHub Pages 有 1GB 站点 / 100GB 月流量的软限制；Actions 公开仓库免费，私有仓库每月 2,000 分钟。ngrok 免费版有 20,000 请求/月、1 GB 出站/月的硬限制，无 SLA。

---

## 18. 风险与应对

| 风险 | 影响 | 应对 |
|---|---|---|
| GitHub Pages 国内访问慢 / 被阻断 | 高 | 接受；或换云服务器（要钱） |
| ngrok 免费额度用完（20,000 请求/月，1 GB/月） | 高 | 监控用量；减少轮询；换 Cloudflare Quick Tunnel 或等下月重置 |
| 电脑关机 / 睡眠 / 断网 / 停电 | 高 | 关闭睡眠、开机自启、UPS（要钱） |
| 无发帖限制被刷屏 | 高 | 管理员手动删；必要时加 Cloudflare 规则 |
| 无审核导致违法内容 | 高 | 举报 + 事后删除；小范围使用 |
| 无邮箱无法找回密码 | 中 | 管理员重置 |
| 登录无频率限制，可能被撞库 | 中 | 管理员强密码；必要时加失败延迟（不影响发帖配额） |
| localStorage token 被 XSS 窃取 | 高 | HTML 清洗、CSP、依赖审计 |
| CORS 配错 | 中 | 精确白名单，不用 `*` |
| 无限楼中楼导致页面过大 | 中 | 逐层加载，不一次加载整棵树 |
| MySQL 数据丢失 | 高 | 每日备份、外部硬盘、恢复演练 |
| GitHub Actions 免费额度 | 低 | 公开仓库；少跑无关任务 |
| 零成本无法合规运营 | 高 | 明确个人测试定位；不要公开大规模运营 |
| 免费隧道被滥用 / 限流 | 中 | 换隧道服务；减少请求 |
| 没有域名，品牌与分享差 | 中 | 接受；用 Pages 地址 |

---

## 19. 待确认问题

1. **ngrok 免费额度**：20,000 请求/月、1 GB/月，够不够用？如果不够，是否接受换 Cloudflare Quick Tunnel（地址会变）？
2. **图片上传**：MVP 是否完全不做？如果要做，只能存本地磁盘。
3. **吧的创建**：MVP 只由管理员建吧，可以吗？
4. **用户名规则**：是否允许中文用户名？是否允许修改用户名？
5. **内容红线**：哪些内容必须删？需要写进站规。
6. **国内访问**：如果 Pages / ngrok 打不开，是否能接受？是否有备用方案？
7. **电脑常开**：能否保证睡觉时也开机、不断网？

---

## 20. 附录

### 20.1 `config.js` 模板

```js
window.__FORUM_CONFIG__ = {
  apiBase: 'https://abc123xyz.ngrok-free.dev',
  siteName: '论坛',
};
```

### 20.2 `.env` 模板

```env
DATABASE_URL="mysql://forum:change-me@127.0.0.1:3306/forum"
PORT=3002
CORS_ORIGINS="https://<username>.github.io,http://localhost:5173"
```

### 20.3 `start-tunnel.ps1`

```powershell
$ErrorActionPreference = "Stop"
$domain = "https://abc123xyz.ngrok-free.dev"  # 换成你的 dev domain
Write-Host "启动 ngrok：$domain -> 127.0.0.1:3002"
ngrok http 3002 --url $domain
```

首次使用前先执行 `ngrok config add-authtoken <token>`。  
详细步骤见 [ngrok-setup.md](ngrok-setup.md)。

### 20.4 启动检查

- [ ] MySQL84 服务运行；
- [ ] API `/health` 返回 200；
- [ ] `ngrok` 进程运行；
- [ ] `config.js` 的 `apiBase` 是 `https://xxx.ngrok-free.dev`；
- [ ] 前端请求带 `ngrok-skip-browser-warning: 1`；
- [ ] 后端 CORS 允许这个头；
- [ ] Pages 已重新部署；
- [ ] 浏览器控制台无 CORS 错误；
- [ ] 注册 / 登录 / 发帖 / 楼中楼可用；
- [ ] 备份脚本已跑过一次；
- [ ] 管理员账号已创建。

### 20.5 管理员初始化

```sql
-- 先生成 argon2 哈希，再插入
INSERT INTO users (username, password_hash, display_name, user_role)
VALUES ('admin', '<argon2-hash>', '管理员', 'admin');
```

不要在生产库直接存明文密码。

---

> 本方案严格按「零成本 + GitHub Pages 静态前端 + 当前电脑 MySQL + ngrok 免费 dev domain + 无发帖限制 + 无发帖前审核 + 无限楼中楼」编写。  
> 它的优点是零服务费；缺点是依赖电脑常开、ngrok 免费额度有限、SEO 弱、国内访问不稳定、垃圾内容风险高。这些不是实现问题，是约束本身带来的代价。
