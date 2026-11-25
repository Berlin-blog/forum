# 论坛网站建设方案

> 版本：v1.0 · 2026-11-24  
> 状态：待评审  
> 范围：从 0 到 1 搭建一个以「主题讨论」为核心的 Web 论坛，覆盖产品、技术、实施、成本与运营。

---

## 目录

1. [结论先行](#1-结论先行)
2. [项目背景与目标](#2-项目背景与目标)
3. [产品定位与设计原则](#3-产品定位与设计原则)
4. [用户角色与权限](#4-用户角色与权限)
5. [功能规划](#5-功能规划)
6. [信息架构与页面](#6-信息架构与页面)
7. [核心业务流程](#7-核心业务流程)
8. [技术架构](#8-技术架构)
9. [数据模型](#9-数据模型)
10. [API 设计](#10-api-设计)
11. [关键实现要点](#11-关键实现要点)
12. [非功能需求](#12-非功能需求)
13. [测试与验收](#13-测试与验收)
14. [实施计划](#14-实施计划)
15. [成本预算](#15-成本预算)
16. [运营与增长](#16-运营与增长)
17. [风险与应对](#17-风险与应对)
18. [待确认问题](#18-待确认问题)
19. [附录](#19-附录)

---

## 1. 结论先行

| 决策项 | 建议 | 理由 |
|---|---|---|
| 产品形态 | 响应式 Web + 可选 PWA，不做原生 App | 论坛核心是内容与搜索，Web 成本最低、SEO 最好 |
| 社区定位 | 先做「小而精」的垂直主题社区，3–5 个版块 | 大而全的综合论坛冷启动极难，垂直社区更容易形成讨论氛围 |
| 首发范围 | 邀请制 + 邮箱注册，先积累 50–100 篇种子内容 | 空论坛没有留存，先有内容再开放 |
| 技术路线 | Next.js 全栈单体 + PostgreSQL + Redis + Meilisearch | 一人或小团队可在 8 周内交付，后续可平滑拆分 |
| 部署方式 | 国内云服务器 + Docker Compose，完成 ICP 备案 | 面向国内用户时访问速度与合规都更稳 |
| 节奏 | 6–8 周 MVP，2 周公测，之后按数据迭代 | 避免一次性堆功能，先验证「有人发、有人回」 |
| 预算 | 基础设施约 ¥200–450/月（早期），人力另计 | 早期流量小，无需一上来就上 K8s 和托管集群 |

**一句话方案：** 用 Next.js 做前后端一体的论坛，PostgreSQL 存内容，Redis 做缓存与限流，Meilisearch 做中文搜索；先交付「注册登录、版块、发帖、回复、通知、举报审核、后台、SEO」这条最小闭环，8 周完成 MVP，再用 2 周公测。

---

## 2. 项目背景与目标

### 2.1 背景

当前需求是搭建一个论坛形式的网站。论坛与博客、IM、问答社区的区别在于：

- **内容按主题沉淀**，可被搜索和长期引用；
- **讨论是异步的**，允许长文、引用、多轮回复；
- **需要秩序**，版块、版规、版主、举报与审核缺一不可；
- **依赖冷启动**，没有种子内容和种子用户，功能再多也不会有人来。

因此本方案不把「功能数量」作为目标，而是把「让第一批用户顺利发帖并获得回复」作为 MVP 的核心。

### 2.2 项目目标

**业务目标**

- 上线一个可公开访问、可持续运营的论坛站点；
- 3 个月内完成种子内容与种子用户积累；
- 6 个月内形成稳定的日常讨论，具备自然搜索流量。

**产品目标**

- 新用户 5 分钟内完成「浏览 → 注册 → 发第一帖」；
- 每个新主题在 24 小时内至少获得 1 条回复（早期靠运营介入）；
- 举报在 24 小时内得到处理；
- 移动端完成核心操作不高于 3 次点击。

### 2.3 成功指标（建议）

| 指标 | 上线 1 个月 | 上线 3 个月 | 上线 6 个月 |
|---|---:|---:|---:|
| 注册用户 | 100 | 500 | 3,000 |
| 日活（DAU） | 20 | 80 | 300 |
| 周新增主题 | 15 | 50 | 150 |
| 主题回复率 | 50% | 65% | 75% |
| 7 日留存 | 15% | 20% | 25% |
| 举报处理中位数 | < 24h | < 12h | < 8h |

> 以上为建议值，需结合定位、推广预算和内容供给能力调整。

### 2.4 前提假设

- 面向中文用户，主要访问来自移动端；
- 初期由 1–2 名开发者 + 兼职设计/运营推进；
- 预算有限，优先采用开源与自托管方案；
- 不涉及复杂的交易、支付和会员体系（可作为二期）。

---

## 3. 产品定位与设计原则

### 3.1 定位

建议先明确一个**可一句话说清的主题**，例如：

- 「独立开发者的产品与增长讨论区」
- 「本地摄影爱好者的作品与器材交流区」
- 「某开源项目的使用与插件社区」

定位越具体，越容易回答「为什么来你这里而不是去即刻、小红书、V2EX、贴吧」。如果暂时没有明确主题，建议先做「小圈子的私域论坛」，用邀请制控制内容质量。

### 3.2 设计原则

1. **内容优先**：列表页突出标题、摘要、作者、最后回复时间，减少装饰性元素。
2. **低门槛表达**：发帖页提供标题建议、版块说明、Markdown 工具栏和草稿自动保存。
3. **秩序可见**：版规、置顶、精华、举报入口、处理结果都应对用户可见。
4. **移动优先**：先设计 375px 宽度，再扩展到桌面。
5. **可运营**：任何内容都能被隐藏、锁定、置顶、加精、迁移；任何用户都能被禁言、封禁。
6. **不过度设计**：MVP 不做实时聊天、复杂积分商城、算法推荐流、原生 App。

### 3.3 差异化建议

| 方向 | 做法 | 成本 |
|---|---|---|
| 内容质量 | 发帖引导模板、精华区、每周精选 | 低 |
| 身份与信任 | 信任等级、版主制度、真实头像 | 中 |
| 可检索 | 好的站内搜索 + SEO 友好的主题页 | 中 |
| 线下连接 | 同城活动、作品评选 | 高 |
| 工具集成 | 如开发版块支持代码块、Issue 链接 | 低 |

### 3.4 视觉与交互方向

- **风格**：内容优先、留白、低饱和，避免重渐变和装饰性插画；
- **字体**：系统 UI 字体，正文 16px / 行高 1.7，标题 24–32px；
- **色彩**：1 个主色 + 中性灰，另配成功 / 警告 / 危险语义色；支持深色模式；
- **布局**：桌面内容最大宽度约 1100px，移动端单栏；移动端底部固定「发帖」入口；
- **组件**：主题列表、楼层卡片、标签、头像、空状态、骨架屏、分页 / 加载更多；
- **参考**：Discourse 的信息组织、V2EX 的简洁、Hacker News 的列表效率，但不照搬。

### 3.5 关键体验指标

| 场景 | 目标 |
|---|---|
| 首屏看到最新主题 | 不需要滚动 |
| 发帖入口 | 任意页面 1 次点击可达 |
| 回复框 | 主题页底部直达，不需要跳转 |
| 移动端发帖 | 3 步内完成（选版块、写内容、提交） |
| 空状态 | 必须给出下一步动作 |
| 错误提示 | 说明原因 + 给出解决办法 |

---

## 4. 用户角色与权限

### 4.1 角色定义

| 角色 | 说明 |
|---|---|
| 游客 | 未登录，可浏览公开版块与主题 |
| 注册用户 | 完成邮箱验证，可发帖、回复、举报 |
| 信任用户 | 达到信任等级或由版主提名，可上传图片、发链接、创建标签 |
| 版主 | 由管理员指派，管理指定版块的内容与用户 |
| 管理员 | 全局配置、用户管理、审核队列、数据查看 |

### 4.2 权限矩阵

| 操作 | 游客 | 注册用户 | 信任用户 | 版主 | 管理员 |
|---|:---:|:---:|:---:|:---:|:---:|
| 浏览公开内容 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 发主题 / 回复 | — | ✓ | ✓ | ✓ | ✓ |
| 上传图片 | — | — | ✓ | ✓ | ✓ |
| 编辑自己的内容 | — | ✓ | ✓ | ✓ | ✓ |
| 删除自己的内容 | — | ✓（软删） | ✓ | ✓ | ✓ |
| 点赞 / 收藏 | — | ✓ | ✓ | ✓ | ✓ |
| 举报 | — | ✓ | ✓ | ✓ | ✓ |
| 置顶 / 锁定 / 加精 | — | — | — | ✓ | ✓ |
| 隐藏 / 删除他人内容 | — | — | — | ✓ | ✓ |
| 禁言 / 封禁 | — | — | — | ✓（本版块） | ✓（全局） |
| 访问管理后台 | — | — | — | ✓（有限） | ✓ |
| 修改站点配置 | — | — | — | — | ✓ |

### 4.3 信任等级（建议）

| 等级 | 条件 | 权益 |
|---|---|---|
| L0 | 注册 0–1 天 | 每日 1 帖、不能发链接、不能上传 |
| L1 | 注册满 7 天且有 3 条有效回复 | 每日 5 帖、可发链接 |
| L2 | 注册满 30 天、获得 10 个赞 | 可上传图片、可创建标签 |
| L3 | 版主提名 | 进入审核辅助队列、可参与版规讨论 |

等级由后台可配置，避免写死在代码里。

---

## 5. 功能规划

优先级定义：**P0 = MVP 必须有；P1 = 公测后 1–2 个月；P2 = 后续增强。**

### 5.1 功能清单

| 模块 | 功能 | 优先级 | 说明 | 预估人日 |
|---|---|---|---|---:|
| 账号 | 邮箱注册 / 登录 / 找回密码 | P0 | 邮箱验证 + Argon2id 密码哈希 | 3 |
| 账号 | 手机号绑定 / 验证码登录 | P1 | 国内合规与防刷需要，按实际情况 | 2 |
| 账号 | 第三方登录（微信 / GitHub） | P2 | 依赖备案与开放平台审核 | 3 |
| 账号 | 个人主页、头像、简介 | P0 | 头像可先走默认生成 | 2 |
| 版块 | 分区 / 版块 / 版块简介 / 版规 | P0 | 后台可配置 | 3 |
| 主题 | 发主题、编辑、软删除 | P0 | 标题 5–80 字，正文 Markdown | 6 |
| 主题 | 置顶、加精、锁定、迁移 | P0 | 版主与管理员操作 | 3 |
| 主题 | 草稿自动保存 | P1 | 本地 + 服务端 | 2 |
| 回复 | 楼层回复、引用、@ | P0 | 扁平楼层 + 引用块 | 5 |
| 编辑器 | Markdown、预览、代码块 | P0 | 图片上传 P1 开放 | 5 |
| 上传 | 图片压缩、EXIF 清除、WebP/AVIF | P1 | 限制 5MB、最多 9 张 | 3 |
| 互动 | 点赞、收藏 | P1 | MVP 可先只做点赞 | 2 |
| 标签 | 标签创建、绑定、标签页 | P1 | 先由管理员维护标签 | 2 |
| 搜索 | 标题 + 正文搜索、筛选 | P0 | Meilisearch；MVP 可先标题搜索 | 4 |
| 通知 | 被回复、被引用、被 @、系统通知 | P0 | 站内通知；邮件摘要 P1 | 4 |
| 举报 | 举报主题 / 回复 / 用户 | P0 | 原因枚举 + 补充说明 | 3 |
| 审核 | 待审队列、通过 / 隐藏 / 删除 | P0 | 先人工，后接机器审核 | 4 |
| 后台 | 用户、版块、内容、举报、配置 | P0 | 独立布局，权限校验 | 6 |
| 后台 | 操作审计日志 | P1 | 谁在何时做了什么 | 2 |
| SEO | SSR、Metadata、Sitemap、RSS | P0 | 论坛增长的关键 | 4 |
| SEO | JSON-LD、Open Graph、Canonical | P1 | 主题页结构化数据 | 2 |
| 数据 | 基础统计（发帖、活跃、留存） | P1 | 先接轻量统计 | 2 |
| 体验 | 深色模式、快捷键 | P2 | 不影响主流程 | 2 |
| 反垃圾 | 限流、验证码、关键词、影子封禁 | P0 | 必须在开放注册前完成 | 4 |

**MVP 合计约 55–65 人日**（不含设计与内容准备）。按 1.5 人并行、每周 5 个工作日计算，约 7–8 周。

### 5.2 明确不做（MVP）

- 实时聊天 / 私信（可先用邮件联系）；
- 复杂积分、等级商城、虚拟货币；
- 个性化推荐流；
- 原生 App；
- 多租户 / 多站点；
- 付费会员与支付；
- 全文 AI 问答。

这些不是永远不做，而是不进入第一版，避免拖慢上线。

### 5.3 版本路线

| 版本 | 主题 | 核心内容 |
|---|---|---|
| v0.1 | 内部可用 | 登录、版块、发帖、回复、基础后台 |
| v0.5 | 邀请内测 | 搜索、通知、举报、审核、个人主页 |
| v1.0 | 公开公测 | SEO、上传、点赞收藏、标签、限流、统计 |
| v1.5 | 运营增强 | 邮件摘要、精华周刊、勋章、信任等级权益 |
| v2.0 | 增长 | 推荐、活动、会员、开放 API（按需） |

---

## 6. 信息架构与页面

### 6.1 站点地图

```
首页 /
├── 分区 /c/[categorySlug]
│   └── 版块 /b/[boardSlug]
│       └── 主题 /t/[threadId]/[slug]
│           └── 回复锚点 /t/[threadId]/[slug]#post-[postId]
├── 发主题 /new?board=[boardSlug]
├── 搜索 /search?q=&board=&sort=
├── 标签 /tag/[tagSlug]
├── 用户 /u/[username]
├── 通知 /notifications
├── 收藏 /bookmarks
├── 设置 /settings（资料、账号、安全）
├── 登录 /login
├── 注册 /register
├── 站规 /rules
├── 管理后台 /admin
│   ├── 概览 /admin
│   ├── 内容 /admin/threads
│   ├── 审核 /admin/reports
│   ├── 用户 /admin/users
│   ├── 版块 /admin/boards
│   └── 配置 /admin/settings
└── 系统页 /404 /500 /maintenance
```

### 6.2 页面清单

| 路由 | 页面 | 核心元素 | 渲染策略 |
|---|---|---|---|
| `/` | 首页 | 站点介绍、最新主题、热门、公告、发帖入口 | ISR 30–60s |
| `/c/[slug]` | 分区页 | 分区说明、版块列表、最近更新 | ISR 60s |
| `/b/[slug]` | 版块页 | 版规、置顶、主题列表、排序、分页 | ISR 30s |
| `/t/[id]/[slug]` | 主题页 | 标题、正文、楼层、引用、操作、回复框 | 动态 + 短缓存 |
| `/new` | 发帖页 | 版块选择、标题、正文、预览、草稿 | 动态 |
| `/search` | 搜索页 | 关键词、筛选、结果高亮 | 动态 |
| `/u/[username]` | 用户主页 | 头像、简介、主题、回复、统计 | 动态 |
| `/notifications` | 通知页 | 未读、全部、标记已读 | 动态 |
| `/settings` | 设置页 | 资料、头像、密码、邮箱、注销 | 动态 |
| `/login`、`/register` | 登录注册 | 表单、验证、协议勾选 | 静态 |
| `/tag/[tagSlug]` | 标签页 | 标签说明、关联主题、排序 | 动态 |
| `/bookmarks` | 收藏页 | 收藏的主题、取消收藏 | 动态 |
| `/rules` | 站规页 | 社区规则、举报说明、申诉渠道 | 静态 |
| `/admin/*` | 管理后台 | 列表、筛选、批量操作、审计 | 动态，禁止索引 |

### 6.3 首页线框

```
┌────────────────────────────────────────────────────┐
│ Logo     首页   版块   搜索           [登录] [注册] │
├────────────────────────────────────────────────────┤
│ 一句话定位                          [+ 发布主题]   │
├──────────────────────────────────┬─────────────────┤
│ 最新主题 / 热门 / 精华   [排序]  │ 社区公告        │
│ ┌──────────────────────────────┐ │ 版块导航        │
│ │ 标题                          │ │ 活跃用户        │
│ │ 作者 · 版块 · 回复 · 最后活跃 │ │ 本周精选        │
│ └──────────────────────────────┘ │                 │
│ ...                              │                 │
├──────────────────────────────────┴─────────────────┤
│ 页脚：关于 · 站规 · 隐私 · 举报 · RSS · 备案号     │
└────────────────────────────────────────────────────┘
```

### 6.4 主题页线框

```
┌────────────────────────────────────────────────────┐
│ 面包屑：首页 / 技术 / 如何设计一个论坛的冷启动      │
├────────────────────────────────────────────────────┤
│ 标题                                      [关注]   │
│ 作者 · 时间 · 浏览 · 回复 · 标签                   │
│ ┌────────────────────────────────────────────────┐ │
│ │ 正文（Markdown 渲染）                          │ │
│ │                                                │ │
│ └────────────────────────────────────────────────┘ │
│ 操作：赞 · 收藏 · 分享 · 举报 · 编辑               │
├────────────────────────────────────────────────────┤
│ #2  回复者  时间                                  │
│     > 引用 #1                                     │
│     回复内容                                       │
│     赞 · 回复 · 举报                              │
│ ...                                                │
├────────────────────────────────────────────────────┤
│ 回复编辑器（Markdown / 预览 / 提交）               │
└────────────────────────────────────────────────────┘
```

### 6.5 导航与命名建议

- 一级导航不超过 5 项：首页、版块、搜索、通知、头像菜单；
- 版块名用名词短语，不用口号；
- 按钮文案统一：`发布主题`、`回复`、`保存草稿`、`提交审核`；
- 空状态必须给出下一步动作，例如「这个版块还没有主题，来发第一帖」。

---

## 7. 核心业务流程

### 7.1 注册与登录

1. 用户填写邮箱、用户名、密码，勾选用户协议与隐私政策；
2. 服务端校验邮箱唯一、用户名唯一、密码强度；
3. 发送验证邮件（有效期 24 小时）；
4. 用户点击验证链接，账号状态变为 `active`；
5. 登录成功后写入 HttpOnly Session Cookie，记录 `last_seen_at`；
6. 连续登录失败 5 次触发 15 分钟锁定。

**MVP 简化：** 邮箱验证 + 密码登录；手机号和第三方登录放到 P1。

### 7.2 发主题

1. 选择版块，阅读版规与发帖模板；
2. 填写标题、正文，实时预览；
3. 客户端草稿每 10 秒保存到 localStorage；登录用户同步到服务端；
4. 提交时服务端校验权限、频率、长度、敏感词；
5. 进入审核策略：
   - 信任用户 / 版主：`threads.status = 'open'`、首楼 `posts.status = 'visible'`，直接发布；
   - 新用户或命中风险规则：两者均为 `pending`，进入审核队列；
6. 审核通过后，将主题与首楼改为可见，更新版块计数与缓存，并写入搜索索引；
7. 返回主题页：直接发布提示「发布成功」，待审提示「已提交，审核通过后展示」。

**事务要求：** 创建主题、创建首楼、写入 outbox 必须在同一事务内完成；待审内容在通过前不计入版块计数，也不进入公开列表、搜索和 RSS。

### 7.3 回复与引用

1. 用户在主题页底部或某楼层点击「回复」；
2. 编辑器预填引用块（`> 作者：内容摘要`）；
3. 提交后校验主题是否锁定、用户是否被禁言、频率是否超限；
4. 写入 `posts`，`floor = max(floor) + 1`；
5. 更新 `threads.reply_count`、`last_post_at`；
6. 写入通知任务：通知主题作者、被引用者、被 @ 的用户；
7. 清除主题页与版块列表缓存。

**并发控制：** 楼层号通过 `select ... for update` 锁定主题行，或使用数据库唯一约束 + 重试，避免重复楼层。

### 7.4 举报与审核

1. 用户点击举报，选择原因（垃圾广告、人身攻击、色情低俗、侵权、其他）；
2. 写入 `reports`，状态 `open`；
3. 后台队列按时间排序，版主可认领；
4. 处理动作：忽略、隐藏内容、删除内容、警告、禁言 1/7/30 天、封禁；
5. 写入 `moderation_actions` 与审计日志；
6. 通知举报人处理结果（可匿名化展示）；
7. 对被处理内容更新状态并清理缓存。

**SLA：** 24 小时内处理；紧急内容（色情、诈骗、违法）2 小时内。

### 7.5 通知

| 事件 | 接收人 | 渠道 |
|---|---|---|
| 主题被回复 | 主题作者 | 站内 + 邮件摘要 |
| 楼层被回复 | 被回复楼层作者 | 站内 |
| 被引用 | 被引用作者 | 站内 |
| 被 @ | 被提及用户 | 站内 |
| 内容被审核 / 删除 | 作者 | 站内 |
| 被禁言 / 封禁 | 用户 | 站内 + 邮件 |
| 每周精选 | 订阅用户 | 邮件（含退订链接） |

通知采用「写库 + 异步投递」：业务事务只写 `notifications` 与 `outbox`，邮件由 worker 消费，避免阻塞主流程。

---

## 8. 技术架构

### 8.1 技术选型

| 层次 | 推荐 | 理由 | 备选 |
|---|---|---|---|
| 前端 / SSR | Next.js（App Router）+ TypeScript | SSR/SEO 好、前后端一体、生态成熟 | Remix、Nuxt |
| UI | Tailwind CSS + shadcn/ui | 开发快、可定制、无锁定 | Ant Design、Chakra |
| 编辑器 | Markdown（textarea + 预览） | 简单可靠、易审核 | Tiptap、Lexical |
| API | Route Handlers / Server Actions + Zod | 少一层服务、类型安全 | NestJS、Fastify |
| ORM | Drizzle ORM | SQL 透明、迁移轻 | Prisma |
| 数据库 | PostgreSQL 17+ | 事务、JSONB、全文检索、成熟 | MySQL |
| 缓存 / 队列 | Redis 7 + BullMQ | 限流、会话、异步任务 | Upstash |
| 搜索 | Meilisearch | 中文分词友好、部署简单 | Elasticsearch、pg_trgm |
| 对象存储 | S3 兼容（OSS / R2 / MinIO） | 预签名上传、CDN 友好 | 本地磁盘（仅开发） |
| 邮件 | Resend / SES / 阿里云邮件推送 | 事务邮件 API 简单 | SMTP |
| 认证 | Better Auth 或 Auth.js | 邮箱密码、OAuth、Session 开箱即用 | 自研 |
| 部署 | Docker Compose + Caddy | 单机可维护、成本低 | Vercel + Neon（海外） |
| 监控 | Sentry + Uptime Kuma + pino | 错误、可用性、结构化日志 | 云监控 |
| 测试 | Vitest + Playwright + k6 | 单元、端到端、压测 | Jest |

> 版本以实施时的稳定版为准，不在方案中锁死小版本号。

### 8.2 架构图

```
                    ┌─────────────────────────┐
                    │  浏览器 / 移动 Web / PWA │
                    └────────────┬────────────┘
                                 │ HTTPS
                    ┌────────────▼────────────┐
                    │  Caddy（TLS / 反代 / 压缩）│
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  Next.js 应用（单体）     │
                    │  SSR / RSC / API / 后台  │
                    └──┬──────┬──────┬──────┬──┘
                       │      │      │      │
              ┌────────▼─┐ ┌──▼───┐ ┌▼────┐ ┌▼──────────┐
              │PostgreSQL│ │Redis │ │Meili│ │S3 对象存储│
              │  主数据   │ │缓存/ │ │search│ │  图片/附件 │
              │          │ │限流/ │ │      │ │           │
              │          │ │队列  │ └─────┘ └───────────┘
              └──────────┘ └──┬───┘
                              │
                       ┌──────▼──────┐
                       │ Worker      │
                       │ 邮件/搜索同步│
                       │ 通知/统计    │
                       └─────────────┘
```

### 8.3 代码组织（模块化单体）

```
forum/
├── src/
│   ├── app/                    # 路由、页面、布局
│   │   ├── (site)/
│   │   ├── (auth)/
│   │   └── admin/
│   ├── modules/
│   │   ├── auth/
│   │   ├── boards/
│   │   ├── threads/
│   │   ├── posts/
│   │   ├── notifications/
│   │   ├── moderation/
│   │   └── search/
│   ├── db/                     # schema、迁移、查询
│   ├── lib/                    # 邮件、存储、限流、日志
│   └── components/             # UI 组件
├── public/
├── tests/
├── docker-compose.yml
└── Dockerfile
```

**原则：** 按业务模块组织，不按技术层堆文件；模块之间通过显式函数调用，不共享内部实现；搜索、邮件、统计通过 outbox 解耦。

### 8.4 渲染与缓存策略

| 页面 | 策略 | 失效方式 |
|---|---|---|
| 首页 / 版块列表 | ISR 30–60s 或 `unstable_cache` | 发帖、删帖后按 tag 失效 |
| 主题详情 | 动态渲染，短缓存 10s | 新回复后失效 |
| 用户主页 | 动态 | 资料变更后失效 |
| 搜索 | 动态，不缓存 | — |
| 管理后台 | 动态，`noindex` | — |

**缓存键建议：**

- `board:{slug}:page:{cursor}`
- `thread:{id}:detail`
- `home:latest`
- `user:{id}:profile`

**降级：** Redis 不可用时，限流降级为进程内令牌桶；发帖、登录等敏感操作在无法可靠限流时拒绝或转入人工审核，不能直接放行。

---

## 9. 数据模型

### 9.1 实体关系

```
users 1──N threads 1──N posts
users 1──N posts
categories 1──N boards 1──N threads
threads N──M tags
users 1──N notifications
users 1──N reports
boards N──M users（版主）
```

### 9.2 核心 DDL（PostgreSQL）

```sql
create extension if not exists pg_trgm;
create extension if not exists citext;

create type user_status as enum ('active', 'suspended', 'deleted');
create type board_visibility as enum ('public', 'members', 'private');
create type thread_status as enum ('open', 'locked', 'pending', 'deleted');
create type post_status as enum ('visible', 'pending', 'hidden', 'deleted');
create type report_status as enum ('open', 'reviewing', 'resolved', 'rejected');

create table users (
  id                uuid primary key default gen_random_uuid(),
  email             citext not null unique,
  email_verified_at timestamptz,
  username          citext not null unique,
  display_name      text not null,
  avatar_url        text,
  bio               text not null default '',
  role              text not null default 'member'
                    check (role in ('member', 'admin')),
  trust_level       smallint not null default 0,
  status            user_status not null default 'active',
  created_at        timestamptz not null default now(),
  last_seen_at      timestamptz
);

create table categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  sort_order int not null default 0
);

create table boards (
  id              uuid primary key default gen_random_uuid(),
  category_id     uuid not null references categories(id),
  slug            text not null unique,
  name            text not null,
  description     text not null default '',
  rules           text not null default '',
  visibility      board_visibility not null default 'public',
  post_permission text not null default 'member'
                   check (post_permission in ('member', 'trusted', 'moderator')),
  thread_count    int not null default 0,
  post_count      int not null default 0,
  last_thread_id  uuid,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now()
);

create table board_moderators (
  board_id uuid not null references boards(id) on delete cascade,
  user_id  uuid not null references users(id) on delete cascade,
  primary key (board_id, user_id)
);

create table threads (
  id           uuid primary key default gen_random_uuid(),
  board_id     uuid not null references boards(id),
  author_id    uuid not null references users(id),
  title        text not null,
  slug         text not null,
  status       thread_status not null default 'open',
  is_pinned    boolean not null default false,
  is_featured  boolean not null default false,
  reply_count  int not null default 0,
  view_count   int not null default 0,
  last_post_at timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  unique (board_id, slug)
);

create table posts (
  id               uuid primary key default gen_random_uuid(),
  thread_id        uuid not null references threads(id) on delete cascade,
  author_id        uuid not null references users(id),
  parent_id        uuid references posts(id),
  floor            int not null,
  content_markdown text not null,
  content_html     text not null,
  status           post_status not null default 'visible',
  edited_at        timestamptz,
  created_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  unique (thread_id, floor)
);

create table tags (
  id   uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name citext not null unique
);

create table thread_tags (
  thread_id uuid not null references threads(id) on delete cascade,
  tag_id    uuid not null references tags(id) on delete cascade,
  primary key (thread_id, tag_id)
);

create table reactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  post_id    uuid not null references posts(id) on delete cascade,
  kind       text not null default 'like' check (kind in ('like')),
  created_at timestamptz not null default now(),
  unique (user_id, post_id, kind)
);

create table bookmarks (
  user_id    uuid not null references users(id) on delete cascade,
  thread_id  uuid not null references threads(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, thread_id)
);

create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  type       text not null check (type in ('reply', 'quote', 'mention', 'moderation', 'system')),
  actor_id   uuid references users(id) on delete set null,
  thread_id  uuid references threads(id) on delete cascade,
  post_id    uuid references posts(id) on delete cascade,
  payload    jsonb not null default '{}',
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create table reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references users(id),
  target_type text not null check (target_type in ('thread', 'post', 'user')),
  target_id   uuid not null,
  reason      text not null check (reason in ('spam', 'abuse', 'sexual', 'infringement', 'other')),
  detail      text not null default '',
  status      report_status not null default 'open',
  handled_by  uuid references users(id),
  resolution  text,
  created_at  timestamptz not null default now(),
  handled_at  timestamptz
);

create table moderation_actions (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references users(id),
  action      text not null,
  target_type text not null,
  target_id   uuid not null,
  board_id    uuid references boards(id),
  reason      text not null default '',
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);

create table attachments (
  id          uuid primary key default gen_random_uuid(),
  uploader_id uuid not null references users(id),
  post_id     uuid references posts(id) on delete set null,
  object_key  text not null unique,
  mime_type   text not null,
  size_bytes  bigint not null,
  width       int,
  height      int,
  created_at  timestamptz not null default now()
);

-- 事务内写入，worker 消费；用于搜索同步、邮件、统计
create table outbox (
  id           bigserial primary key,
  topic        text not null,
  payload      jsonb not null,
  created_at   timestamptz not null default now(),
  processed_at timestamptz
);
```

> 认证框架（Better Auth / Auth.js）会自动管理 `accounts`、`sessions`、`verification` 等表，不在上面的业务 DDL 中展开；`users` 只保留业务字段。

### 9.3 索引

```sql
create index threads_board_last_idx
  on threads (board_id, last_post_at desc)
  where deleted_at is null and status in ('open', 'locked');

create index threads_pinned_idx
  on threads (board_id, is_pinned desc, last_post_at desc)
  where deleted_at is null and status in ('open', 'locked');

create index threads_author_idx
  on threads (author_id, created_at desc);

create index threads_title_trgm_idx
  on threads using gin (title gin_trgm_ops);

create index posts_thread_idx
  on posts (thread_id, floor);

create index posts_author_idx
  on posts (author_id, created_at desc);

create index thread_tags_tag_idx
  on thread_tags (tag_id);

create index reactions_post_idx
  on reactions (post_id, kind);

create index notifications_user_idx
  on notifications (user_id, read_at, created_at desc);

create index reports_status_idx
  on reports (status, created_at);

create index reports_target_idx
  on reports (target_type, target_id);

create index attachments_post_idx
  on attachments (post_id);

create index outbox_pending_idx
  on outbox (created_at)
  where processed_at is null;
```

### 9.4 数据约定

- 所有内容软删除：`deleted_at` 非空即视为删除，前台过滤；
- 计数字段允许短暂不一致，但事务内必须更新；
- 浏览量先写 Redis，每 60 秒批量回写，避免热点行锁；
- 时间统一 `timestamptz`，前端按用户时区展示；
- 用户注销采用匿名化：保留 `id` 与内容，邮箱替换为不可达占位地址，用户名改为 `deleted_xxx`；
- 不在数据库存明文密码，使用 Argon2id 哈希。

---

## 10. API 设计

### 10.1 风格

- REST + JSON，路径使用复数名词；
- 所有写操作要求登录，服务端逐次校验权限；
- 请求体用 Zod 校验，失败返回 422；
- 列表使用游标分页，避免深分页；
- 创建类接口支持 `Idempotency-Key`；
- 错误格式统一：

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "操作过于频繁，请稍后再试",
    "details": { "retryAfter": 30 }
  }
}
```

### 10.2 接口清单

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| `GET` | `/api/boards` | 否 | 分区、版块树 |
| `GET` | `/api/threads?board=&sort=&cursor=&limit=` | 否 | 主题列表，`sort=latest\|hot\|featured` |
| `POST` | `/api/threads` | 是 | 创建主题（含首楼） |
| `GET` | `/api/threads/:id` | 否 | 主题详情 + 首楼 |
| `PATCH` | `/api/threads/:id` | 是 | 编辑标题 / 正文 |
| `DELETE` | `/api/threads/:id` | 是 | 软删除 |
| `POST` | `/api/threads/:id/pin` | 版主 | 置顶 / 取消 |
| `POST` | `/api/threads/:id/lock` | 版主 | 锁定 / 解锁 |
| `POST` | `/api/threads/:id/feature` | 版主 | 加精 / 取消 |
| `GET` | `/api/threads/:id/posts?cursor=` | 否 | 楼层列表 |
| `POST` | `/api/threads/:id/posts` | 是 | 回复 |
| `PATCH` | `/api/posts/:id` | 是 | 编辑 |
| `DELETE` | `/api/posts/:id` | 是 | 软删除 |
| `POST` | `/api/posts/:id/like` | 是 | 点赞 / 取消 |
| `POST` | `/api/threads/:id/bookmark` | 是 | 收藏 / 取消 |
| `GET` | `/api/bookmarks?cursor=` | 是 | 收藏列表 |
| `GET` | `/api/search?q=&board=&cursor=` | 否 | 搜索 |
| `GET` | `/api/notifications?cursor=` | 是 | 通知列表 |
| `POST` | `/api/notifications/read` | 是 | 批量已读 |
| `POST` | `/api/reports` | 是 | 举报 |
| `GET` | `/api/me` | 是 | 当前用户 |
| `PATCH` | `/api/me` | 是 | 更新资料 |
| `POST` | `/api/uploads/presign` | 信任用户 | 获取上传签名 |
| `GET` | `/api/admin/reports?status=` | 版主 | 举报队列 |
| `POST` | `/api/admin/reports/:id/resolve` | 版主 | 处理举报 |
| `POST` | `/api/admin/users/:id/sanction` | 版主 | 禁言 / 封禁 |

### 10.3 分页约定

```json
{
  "items": [],
  "nextCursor": "eyJjcmVhdGVkQXQiOiIyMDI2LTExLTI0VDA3OjAwOjAwWiIsImlkIjoiLi4uIn0",
  "hasMore": true
}
```

游标编码 `(created_at, id)` 或 `(last_post_at, id)`，排序字段必须与游标一致。

### 10.4 限流建议

| 动作 | 维度 | 限制 |
|---|---|---|
| 登录 | IP + 账号 | 5 次 / 分钟 |
| 注册 | IP | 3 次 / 小时 |
| 发主题 | 用户 | 3 次 / 10 分钟，20 次 / 天 |
| 回复 | 用户 | 10 次 / 分钟，100 次 / 天 |
| 上传 | 用户 | 20 次 / 小时 |
| 搜索 | IP | 30 次 / 分钟 |
| 举报 | 用户 | 10 次 / 天 |

限流用 Redis 滑动窗口或令牌桶，命中后返回 429 + `Retry-After`。

---

## 11. 关键实现要点

### 11.1 列表查询与游标分页

```sql
select t.id, t.title, t.slug, t.reply_count, t.view_count,
       t.last_post_at, t.is_pinned, t.is_featured,
       u.username as author_name, u.avatar_url
from threads t
join users u on u.id = t.author_id
where t.board_id = $1
  and t.status in ('open', 'locked')
  and t.deleted_at is null
  and (t.last_post_at, t.id) < ($2, $3)
order by t.last_post_at desc, t.id desc
limit $4;
```

置顶帖单独查询并拼在首页，不参与游标分页。

### 11.2 发帖事务

```ts
const threadStatus = needsReview ? 'pending' : 'open';
const postStatus = needsReview ? 'pending' : 'visible';

await db.transaction(async (tx) => {
  const [thread] = await tx.insert(threads).values({
    boardId,
    authorId: user.id,
    title,
    slug,
    status: threadStatus,
  }).returning();

  await tx.insert(posts).values({
    threadId: thread.id,
    authorId: user.id,
    floor: 1,
    contentMarkdown,
    contentHtml,
    status: postStatus,
  });

  // 待审内容不计入公开计数，审核通过时再补
  if (!needsReview) {
    await tx.update(boards).set({
      threadCount: sql`thread_count + 1`,
      postCount: sql`post_count + 1`,
      lastThreadId: thread.id,
    }).where(eq(boards.id, boardId));
  }

  await tx.insert(outbox).values({
    topic: needsReview ? 'thread.pending' : 'thread.created',
    payload: { threadId: thread.id },
  });
});
```

审核中的内容不进入公开列表、搜索索引和 RSS；审核通过后由后台在同一事务中更新状态、版块计数，并写入 `thread.created` 事件触发缓存与搜索同步。

### 11.3 审核流水线

```
提交内容
  → 频率 / 长度 / 权限校验
  → 敏感词库匹配
  → 机器审核（文本 + 图片）
  → 风险分级
      ├── 低风险：直接发布
      ├── 中风险：进入人工队列（对用户展示“审核中”）
      └── 高风险：拒绝并提示
  → 人工复核
  → 记录 moderation_actions
```

**建议：** MVP 先做「敏感词 + 新用户前 3 帖人工审核」，不要一上来接复杂 AI；等日均发帖超过 100 再引入机器审核。

### 11.4 搜索同步

- 业务事务写 `outbox`；
- worker 用 `select ... for update skip locked` 拉取未处理事件，避免多实例重复消费；
- 每 5 秒批量写入 Meilisearch；
- 事件包含 `thread.created`、`thread.pending`、`thread.updated`、`thread.deleted`、`post.created`；
- 索引字段：`id`、`title`、`content`、`boardId`、`boardName`、`authorName`、`tags`、`createdAt`、`lastPostAt`；
- 可过滤字段：`boardId`、`tags`；
- 排序：`createdAt`、`lastPostAt`；
- 失败重试 3 次，仍失败写入死信表并告警；
- 只索引可见内容，`pending` / `hidden` / `deleted` 一律从索引移除。

**中文分词：** Meilisearch 自带 CJK 处理，明显优于 PostgreSQL 默认分词；如果坚持用 Postgres，需要 `zhparser` 扩展。

**降级：** Meilisearch 不可用时，搜索回退到 PostgreSQL `pg_trgm` 标题匹配，并在页面提示「搜索结果可能不完整」。

### 11.5 通知扇出

- 回复：通知主题作者 + 被回复楼层作者（去重，排除操作者本人）；
- 引用：解析引用块中的作者，通知被引用者；
- @：正则提取 `@username`，限制最多 5 人；
- 审核：通知内容作者；
- 所有通知先写库，再写 outbox；
- 邮件摘要每小时合并一次，避免每帖一封邮件。

### 11.6 计数与缓存

| 数据 | 方式 | 一致性 |
|---|---|---|
| 回复数 | 事务内 `+1` | 强一致 |
| 主题数 / 帖子数 | 发布时事务内 `+1` | 强一致 |
| 浏览量 | Redis `INCR`，每分钟回写 | 最终一致 |
| 首页最新 | 缓存 30s | 最终一致 |
| 主题详情 | 缓存 10s | 最终一致 |

待审内容在通过前不计数；审核拒绝不计数；已发布内容被删除时回滚计数，避免列表数字虚高。

缓存失效通过 Next.js `revalidateTag` 或 Redis 版本号实现，避免全站清空。

**热门排序（P1）：** 候选集限定近 7 天，`score = 2*log10(replies+1) + log10(views+1) - age_hours/48`；每小时离线计算一次并写入 Redis ZSET，首页只读前 20，不在请求时实时计算。

### 11.7 图片上传

1. 客户端请求 `/api/uploads/presign`，服务端校验权限与配额；
2. 返回 S3 预签名 URL；
3. 客户端直传对象存储；
4. 回调确认，服务端校验 MIME、大小、图片尺寸；
5. 异步生成缩略图，转为 WebP/AVIF，清除 EXIF；
6. 只允许 `image/jpeg`、`image/png`、`image/webp`、`image/gif`；
7. 单文件 5MB、每帖最多 9 张；
8. 存储桶禁止公开列目录，通过 CDN 签名或公开读 + 随机 key。

### 11.8 SEO

- 主题页 SSR 输出完整正文与标题；
- `generateMetadata` 输出 title、description、canonical、Open Graph；
- JSON-LD：`DiscussionForumPosting`；
- `sitemap.xml` 包含版块与主题，分页提交；
- `robots.txt` 禁止 `/admin`、`/api`、`/search`；
- RSS：`/feed.xml`、`/b/[slug]/feed.xml`；
- URL 使用 ID + slug，例如 `/t/abc123/thread-title`，避免标题变更导致 404；
- 404 与 410 区分：已删除内容返回 410，减少无效抓取。

### 11.9 权限校验

```ts
// 伪代码：所有写操作必须经过服务端 guard
const user = await requireUser();
const board = await getBoardBySlug(input.boardSlug);
await assertCanPost(user, board);        // 版块权限、封禁、信任等级
await assertRateLimit(`post:${user.id}`, 3, 600);
```

**原则：** 前端隐藏按钮不等于权限控制；每个 Server Action / Route Handler 都要重新校验。

---

## 12. 非功能需求

### 12.1 性能

| 指标 | 目标 |
|---|---|
| LCP（移动 4G） | < 2.5s |
| TTFB（主题页） | < 500ms |
| 列表查询 P95 | < 150ms |
| 发帖接口 P95 | < 800ms |
| 首页可交互 | < 3s |
| 可用性 | 99.5%（早期） |

**手段：** 图片懒加载与尺寸声明、字体子集化、列表游标分页、缓存、数据库索引、避免 N+1 查询。

### 12.2 安全

- 密码 Argon2id，登录失败计数与锁定；
- Session 使用 HttpOnly + Secure + SameSite=Lax Cookie；
- 写操作校验 Origin / CSRF Token；
- Markdown 渲染使用 allowlist 清洗 HTML，禁止 `<script>`、`on*`、`iframe`；
- 内容安全策略（CSP），禁止内联脚本（Next.js nonce）；
- 所有 SQL 通过 ORM 参数化，禁止字符串拼接；
- 上传校验真实文件类型，剥离 EXIF，限制体积；
- 依赖漏洞扫描（`pnpm audit`、Dependabot）；
- 管理后台强制二次验证（P1）；
- 审计日志保留至少 180 天；
- 备份加密，凭证不进代码库。

### 12.3 合规（需法务确认）

面向中国大陆提供论坛服务，通常需要关注：

| 事项 | 说明 | 建议 |
|---|---|---|
| ICP 备案 | 域名与服务器在境内需备案 | 上线前 2–4 周启动 |
| 经营资质 | 若收取会员费、广告费，可能涉及经营性 ICP 许可证 | 商业模式确定后确认 |
| 公安联网备案 | 网站上线后按要求办理 | 咨询当地公安网安 |
| 用户协议 / 隐私政策 | 明确收集范围、用途、注销方式 | 请律师审阅 |
| 内容审核 | 建立审核、举报、处置机制 | 人工 + 关键词 + 机器 |
| 日志留存 | 网络日志留存不少于 6 个月 | 数据库 + 日志系统 |
| 账号信息 | 可能涉及真实身份核验 | 按业务形态确认 |
| 未成年人保护 | 建立未成年人模式与内容分级 | 按适用规则处理 |
| AI 生成内容 | 如允许发布 AI 生成内容，可能需要显著标识 | 发布页加勾选与提示 |
| 个人信息 | 最小化收集、可导出、可注销 | 产品与后台都要支持 |

> 本节仅为工程视角的提醒，不构成法律意见；具体要求以当地通信管理、网信、公安部门为准。

### 12.4 可访问性

- 语义化 HTML，标题层级正确；
- 所有交互可键盘操作，焦点可见；
- 对比度满足 WCAG AA；
- 图片有 alt，表单有 label；
- 错误提示与成功提示使用 `aria-live`；
- 支持 200% 缩放不破版。

### 12.5 备份与可观测性

- PostgreSQL 每日全量，保留 7 天；WAL 归档保留 7 天；每周归档异地保留 30 天；
- 对象存储开启版本控制或生命周期；
- 每月做一次恢复演练；
- Sentry 捕获前后端异常；
- Uptime Kuma 监控首页、登录、发帖接口；
- 结构化日志（pino），包含 requestId、userId、route、latency；
- 关键告警：5xx 比例、数据库连接数、队列积压、磁盘使用率。

---

## 13. 测试与验收

### 13.1 测试金字塔

| 层级 | 工具 | 覆盖 |
|---|---|---|
| 单元 | Vitest | 权限、限流、Markdown 清洗、工具函数 |
| 集成 | Vitest + Testcontainers | 发帖事务、楼层并发、通知写入 |
| 端到端 | Playwright | 注册、登录、发帖、回复、举报、后台处理 |
| 压测 | k6 | 首页 100 QPS、主题页 50 QPS、发帖 5 QPS |
| 安全 | OWASP ZAP | XSS、CSRF、越权、上传 |

### 13.2 关键 E2E 场景

1. 新用户注册 → 验证邮箱 → 登录 → 发第一帖 → 收到审核通过通知；
2. 用户 A 发帖，用户 B 回复并引用，A 收到站内通知；
3. 用户举报回复，版主在后台隐藏，作者收到通知；
4. 被禁言用户尝试发帖，返回明确错误；
5. 普通用户访问 `/admin`，返回 403；
6. 删除主题后，前台 410，搜索结果不再出现；
7. 移动端完成发帖、回复、举报。

### 13.3 MVP 验收清单

- [ ] 邮箱注册、验证、登录、找回密码可用；
- [ ] 版块与主题可创建、编辑、软删除；
- [ ] 回复、引用、@ 可用；
- [ ] 站内通知可达，未读数正确；
- [ ] 举报可提交，后台可处理，结果可通知；
- [ ] 管理员可建版块、指派版主、禁言用户；
- [ ] 首页、版块、主题页移动端可用；
- [ ] 主题页可被搜索引擎抓取，Sitemap 正常；
- [ ] 发帖、回复、登录有限流；
- [ ] 备份与恢复演练通过；
- [ ] 无 P0/P1 安全问题；
- [ ]  Lighthouse 移动端 Performance ≥ 80，Accessibility ≥ 90。

---

## 14. 实施计划

### 14.1 阶段安排（1.5 人并行）

| 阶段 | 周期 | 目标 | 交付 |
|---|---|---|---|
| 0. 准备 | 第 0 周 | 定方向、定技术、启动备案 | 需求清单、线框、域名、备案材料 |
| 1. 骨架 | 第 1 周 | 项目可跑、可登录 | 仓库、CI、数据库、认证、布局 |
| 2. 内容闭环 | 第 2–3 周 | 能发帖、能回复 | 版块、主题、楼层、Markdown、权限 |
| 3. 互动与秩序 | 第 4–5 周 | 能通知、能举报、能管理 | 通知、举报、审核、后台、限流 |
| 4. 体验与 SEO | 第 6 周 | 可被搜索、移动端可用 | 响应式、Metadata、Sitemap、RSS、图片 |
| 5. 加固 | 第 7 周 | 可上线 | 测试、压测、备份、监控、安全修复 |
| 6. 内测 | 第 8 周 | 种子用户可用 | 邀请码、种子内容、反馈修复 |
| 7. 公测 | 第 9–10 周 | 对外开放 | 站规、运营计划、数据看板、公告 |

### 14.2 每周节奏

- 周一：确定本周范围与验收标准；
- 周二至周四：开发 + 每日 15 分钟同步；
- 周五：演示、回归、更新风险清单；
- 每周至少留半天处理技术债与线上问题。

### 14.3 人力配置

| 角色 | 投入 | 职责 |
|---|---|---|
| 全栈开发 | 1.0–1.5 人 | 前后端、数据库、部署 |
| 设计 | 0.3 人 | 首页、主题页、移动端、空状态 |
| 运营 / 内容 | 0.3 人 | 种子内容、版规、种子用户、审核 |
| 测试 | 0.2 人 | 验收、回归、安全测试 |

**单人开发：** 预计 10–12 周，建议先砍掉标签、收藏、邮件摘要，保留核心闭环。

### 14.4 里程碑

| 里程碑 | 时间 | 判定标准 |
|---|---|---|
| M1 可登录可发帖 | 第 3 周末 | 内网完成注册、发帖、回复 |
| M2 可管理 | 第 5 周末 | 举报、审核、禁言、后台可用 |
| M3 可上线 | 第 7 周末 | 备份、监控、限流、SEO 就绪 |
| M4 可公测 | 第 9 周末 | 50 名种子用户、100 篇内容、无 P0 缺陷 |

### 14.5 第一周行动清单

- [ ] 确认定位、名称、域名与部署区域；
- [ ] 如部署在国内，立即启动 ICP 备案；
- [ ] 冻结 MVP 清单与「明确不做」清单；
- [ ] 画首页、版块页、主题页三张线框；
- [ ] 建仓库、CI、Docker Compose 与测试数据库；
- [ ] 准备 10 篇种子内容，验证发帖模板是否好用；
- [ ] 写出版规与审核规则初稿；
- [ ] 确认第一周可演示的垂直切片（登录 → 发帖 → 回复）。

---

## 15. 成本预算

### 15.1 基础设施（早期，人民币）

| 项目 | 规格 | 月成本 | 备注 |
|---|---|---:|---|
| 云服务器 | 2C4G，40GB SSD | ¥120–200 | 应用 + 数据库 + Redis 同机 |
| 对象存储 | 50GB + 流量 | ¥10–30 | 图片与附件 |
| CDN | 按量 | ¥20–50 | 图片与静态资源 |
| 域名 | .com / .cn | ¥5/月（年付） | 首年促销另计 |
| 邮件 | 3,000 封/月 | ¥0–100 | 事务邮件 |
| 短信 | 500 条/月 | ¥25–50 | 视是否启用 |
| 备份 | 异地 50GB | ¥10–20 | 可用对象存储 |
| 监控 | 自建 | ¥0 | Sentry 免费额度 |
| SSL | Let's Encrypt | ¥0 | Caddy 自动续期 |
| **合计** | | **¥200–450/月** | 不含人力与推广 |

> 如果使用托管数据库、Redis 与搜索服务，月成本会上升到 ¥800–1,500；早期不建议。

### 15.2 一次性投入

| 项目 | 预算 | 说明 |
|---|---:|---|
| 域名 | ¥60–100/年 | 建议同时注册品牌域名 |
| 设计 | ¥0–5,000 | 可先用模板，后续再请设计师 |
| 备案 | ¥0 | 自行办理，时间成本 2–4 周 |
| 法务 | ¥1,000–5,000 | 用户协议、隐私政策审阅 |
| 内容种子 | ¥0–3,000 | 邀请制可降低 |
| 监控 / 日志 | ¥0 | 先用免费额度 |

### 15.3 人力成本

按外包或全职折算，MVP 约 55–65 人日。若按 ¥800–1,500/人日估算，开发成本约 ¥4.4–9.8 万；实际以团队构成为准。

---

## 16. 运营与增长

### 16.1 冷启动

1. **先内容后用户**：上线前准备 50–100 篇高质量主题，每篇都有明确的问题或观点；
2. **邀请 30–50 名种子用户**：优先找愿意回答问题、能写长文的人；
3. **运营账号带头回复**：每个新主题 24 小时内至少 1 条有信息量的回复；
4. **每周一个固定话题**：降低发帖门槛，形成节奏；
5. **把优质内容摘要分发到外部**：在即刻、小红书、公众号、相关微信群发布摘要并附原文链接，避免全文重复造成 SEO 分流；

### 16.2 内容运营

- 版规：每个版块一页，说明「发什么、不发什么、怎么发」；
- 模板：提问、分享、求助、作品展示各一个模板；
- 精华：每周由版主提名，首页展示；
- 周刊：每周邮件/站内汇总 5–10 篇；
- 归档：低质量内容下沉，不删除，保留可检索性。

### 16.3 用户运营

- 欢迎信：注册后说明站规、发帖指南、可关注的版块；
- 新人任务：完善资料、发第一帖、回复一次；
- 信任等级：明确权益，避免黑箱；
- 版主招募：从活跃用户中选，给权限与培训；
- 流失召回：30 天未登录发送一次精选邮件。

### 16.4 SEO 与增长

| 手段 | 说明 | 优先级 |
|---|---|---|
| 长尾标题 | 鼓励「具体问题 + 具体场景」的标题 | P0 |
| 内部链接 | 相关主题、标签、版块推荐 | P0 |
| 结构化数据 | DiscussionForumPosting | P1 |
| Sitemap / RSS | 提交搜索引擎 | P0 |
| 外部分发 | 社群、公众号、即刻 | P1 |
| 合作版块 | 与垂直社群共建 | P2 |
| 付费投放 | 早期不建议 | P2 |

### 16.5 数据看板

- 新增注册、验证率、登录率；
- 发帖人数、发帖数、回复率；
- 次日 / 7 日 / 30 日留存；
- 各版块活跃度与内容供给；
- 举报量、处理时长、违规率；
- 搜索关键词与无结果率。

先接轻量统计（如 Plausible 自建或 Umami），不要一开始就上复杂数仓。

### 16.6 商业化（后续）

- 会员：自定义头像、主题置顶、专属版块；
- 赞助版块：明确标注「赞助」，不影响版规；
- 招聘 / 合作信息版块；
- 不建议早期植入广告，容易伤害内容体验。

---

## 17. 风险与应对

| 风险 | 影响 | 概率 | 应对 |
|---|---|---|---|
| 冷启动失败，没人发帖 | 高 | 高 | 邀请制、种子内容、运营带头回复、每周话题 |
| 备案周期不可控 | 高 | 中 | 第 0 周启动；先用海外测试环境，不对外 |
| 垃圾广告与攻击 | 中 | 高 | 限流、验证码、新用户审核、影子封禁、关键词 |
| 审核人力不足 | 中 | 中 | 先小范围开放；审核 SLA；版主分权 |
| 范围蔓延，延期 | 高 | 高 | 冻结 MVP 清单；P1/P2 进 backlog |
| 性能问题 | 中 | 中 | 游标分页、索引、缓存、压测 |
| 数据丢失 | 高 | 低 | 每日备份、WAL、恢复演练 |
| 合规问题 | 高 | 中 | 法务审阅、备案、举报入口、日志留存 |
| 关键人依赖 | 中 | 中 | 文档、部署脚本、README、交接 |
| 内容侵权 | 中 | 中 | 投诉入口、删除流程、重复侵权处理 |

---

## 18. 待确认问题

1. **主题定位**：技术、生活、行业、兴趣，还是某个项目的用户社区？
2. **是否邀请制**：首发开放注册，还是邀请码 + 人工审核？
3. **目标规模**：日活 100、1,000 还是 10,000？这会影响是否拆分服务。
4. **部署区域**：国内（需备案）还是海外（可用 Vercel）？
5. **登录方式**：邮箱、手机号、微信、GitHub，优先级如何？
6. **内容形态**：纯文字，还是需要图片、代码块、附件、视频？
7. **预算与时间**：6–8 周上线是否可接受？是否有设计资源？
8. **商业化**：是否有会员、广告、赞助的计划？会影响信息架构。
9. **品牌与域名**：是否已有名称、域名、Logo？
10. **合规责任**：谁负责备案、用户协议、内容审核与日常值班？

---

## 19. 附录

### 19.1 建议的初始版块

| 分区 | 版块 | 说明 |
|---|---|---|
| 社区 | 公告 | 站点规则、版本更新、活动 |
| 社区 | 新手报到 | 降低第一次发帖门槛 |
| 讨论 | 主题讨论 | 核心版块，按定位命名 |
| 讨论 | 经验分享 | 长文、教程、复盘 |
| 讨论 | 求助问答 | 具体问题，鼓励采纳答案 |
| 反馈 | 站点反馈 | Bug、建议、功能请求 |
| 管理 | 版主事务 | 仅版主可见 |

### 19.2 发帖模板示例

```markdown
## 背景
（为什么要发这个帖：你遇到了什么、想讨论什么）

## 我的做法 / 观点
（已经尝试了什么、你怎么看）

## 想讨论的问题
1.
2.

## 补充材料
（链接、截图、代码，注意去除隐私信息）
```

### 19.3 技术决策记录（ADR）建议

把以下决策写成短文档，避免后续反复：

- ADR-001：为什么选择 Next.js 单体而不是前后端分离；
- ADR-002：为什么选择 PostgreSQL 而不是 MySQL；
- ADR-003：为什么选择 Meilisearch 而不是 Elasticsearch；
- ADR-004：为什么 MVP 不做实时通知；
- ADR-005：为什么内容采用软删除。

### 19.4 上线检查清单

- [ ] 域名解析、HTTPS、HSTS；
- [ ] ICP 备案号展示在页脚；
- [ ] 用户协议、隐私政策、站规可访问；
- [ ] 举报入口在每个主题与回复上；
- [ ] 管理员账号与强密码；
- [ ] 数据库备份与恢复演练；
- [ ] 错误监控与 uptime 监控；
- [ ] 限流与验证码；
- [ ] robots.txt、sitemap.xml、RSS；
- [ ] 404 / 500 / 维护页；
- [ ] 移动端真机测试；
- [ ] 压测与安全扫描；
- [ ] 运营值班表与审核 SLA；
- [ ] 种子内容与欢迎邮件。

---

> 本方案为 v1.0 建议稿。确认定位、预算与部署区域后，可拆分为「产品需求文档」「技术设计文档」「实施排期」三份执行文档。
