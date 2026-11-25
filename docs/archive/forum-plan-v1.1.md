# 论坛网站建设方案 v1.1

> 贴吧式综合社区 · 开放注册 · GitHub 托管 · 当前电脑 MySQL  
> 版本：v1.1 · 2026-11-24 · 状态：待确认  
> 本版替代 v1.0；旧版存档：[forum-plan-v1.0.md](archive/forum-plan-v1.0.md)

---

## 目录

1. [本次修订](#1-本次修订)
2. [结论先行](#2-结论先行)
3. [需求解读与边界](#3-需求解读与边界)
4. [产品定位](#4-产品定位)
5. [用户角色与权限](#5-用户角色与权限)
6. [功能规划](#6-功能规划)
7. [信息架构与页面](#7-信息架构与页面)
8. [核心业务流程](#8-核心业务流程)
9. [技术架构](#9-技术架构)
10. [部署方案：GitHub + 当前电脑 + 本地 MySQL](#10-部署方案github--当前电脑--本地-mysql)
11. [MySQL 数据模型](#11-mysql-数据模型)
12. [API 设计](#12-api-设计)
13. [关键实现要点](#13-关键实现要点)
14. [非功能需求](#14-非功能需求)
15. [测试与验收](#15-测试与验收)
16. [实施计划](#16-实施计划)
17. [成本预算](#17-成本预算)
18. [运营与增长](#18-运营与增长)
19. [风险与应对](#19-风险与应对)
20. [待确认问题](#20-待确认问题)
21. [附录](#21-附录)

---

## 1. 本次修订

| 项目 | v1.0 | v1.1（本版） |
|---|---|---|
| 社区定位 | 垂直、小而精 | 综合社区，参考百度贴吧的「吧」结构 |
| 注册方式 | 邀请制 + 邮箱 | 直接开放注册，但保留邮箱验证、验证码、新用户限流 |
| 数据库 | PostgreSQL | 当前电脑的 MySQL 8.0+ |
| 搜索 | Meilisearch | MySQL FULLTEXT ngram，后续可换 Meilisearch |
| 部署 | 国内云服务器 + Docker | GitHub 托管代码 / CI，应用与 MySQL 跑当前电脑，Cloudflare Tunnel 提供公网访问 |
| 新增核心 | — | 吧目录、关注吧、吧主 / 小吧主、楼中楼、签到与等级（P1）、创建吧申请（P1） |
| 风险重点 | 冷启动 | 内容安全、垃圾广告、家庭电脑可用性、数据备份 |

**一句话结论：** 做一个贴吧式的综合论坛，先由管理员建 6–8 个「吧」，开放注册但必须做邮箱验证和防刷；技术用 Next.js + 当前电脑 MySQL；GitHub 负责代码和 CI，应用通过 Cloudflare Tunnel 对外提供 HTTPS。**GitHub Pages 不能运行这个论坛，也不能连接你电脑上的 MySQL。**

---

## 2. 结论先行

| 决策项 | 建议 |
|---|---|
| 产品形态 | 贴吧式综合社区：以「吧」为组织单位，每个吧有主题、帖子、楼层、楼中楼、吧主 |
| 首发范围 | 管理员先建 6–8 个吧；用户自由注册、自由发帖；用户创建吧放到 P1 |
| 注册策略 | 开放注册，但必须：邮箱验证 + 图形/行为验证码 + 新用户发帖限额 |
| 内容策略 | 综合话题可以，但违法违规内容零容忍；新用户前 3 帖进入人工审核 |
| 技术路线 | Next.js（App Router）+ TypeScript + MySQL 8.0+ + Drizzle ORM；搜索用 MySQL FULLTEXT ngram |
| 运行环境 | 当前电脑运行 Next.js 与 MySQL；GitHub 只做代码托管、Issue、Actions CI |
| 公网访问 | Cloudflare Tunnel 暴露 `http://localhost:3000`，不开放路由器端口，不暴露 3306 |
| 自动部署 | GitHub Actions 构建 + 手动/计划任务拉取；不建议在个人电脑上长期跑 self-hosted runner |
| 工期 | 2 人约 10–12 周；1 人约 16–20 周；先发 v0.5，再补楼中楼和吧务 |
| 成本 | 电脑电费 + 域名 + 备份，约 ¥0–300/月；不含人力 |

---

## 3. 需求解读与边界

### 3.1 「各方各面都可以」怎么落地

综合论坛不等于没有边界。建议：

- **内容分类无限，但结构有限**：用「分区 → 吧」两层组织，吧可以覆盖科技、生活、娱乐、游戏、学习、职场、情感、站务等；
- **首发由管理员建吧**：避免一上来出现几百个空吧、垃圾吧；
- **用户创建吧放 P1**：申请 → 审核 → 通过后创建，申请人成为吧主；
- **话题不受限，但规则先行**：每个吧必须有吧规，站规明确禁止违法、色情、暴力、诈骗、侵权、人肉等；时政、宗教、民族等敏感议题单独设规则，必要时不开对应吧；
- **不做「匿名发帖」**：匿名会显著增加治理成本。

### 3.2 「参考百度贴吧」要抄什么、不抄什么

| 贴吧能力 | 本方案 | 优先级 |
|---|---|---|
| 吧（主题社区） | 保留，核心对象 | P0 |
| 吧主 / 小吧主 | 保留，管理员指派 + 申请 | P0 / P1 |
| 主题帖 / 楼层 | 保留 | P0 |
| 楼中楼 | 保留，限制一层嵌套 | P0 |
| 关注吧 / 签到 / 等级 | 保留，但签到与等级可后置 | P1 |
| 精品 / 置顶 / 吧规 | 保留 | P0 |
| 点赞 / 收藏 / @ / 分享 | 保留 | P0 |
| 举报 / 封禁 / 申诉 | 保留，且必须比贴吧更透明 | P0 |
| 吧广场 / 分类 / 搜索 | 保留 | P0 |
| 会员 / 广告 / 商业化 | 不在 MVP | P2 |
| 贴吧品牌、UI、内容 | 不复制 | — |

### 3.3 「直接开放注册」的真实代价

开放注册会带来三类问题：

1. **垃圾广告**：装修、博彩、色情、引流；
2. **攻击与辱骂**：综合话题更容易冲突；
3. **违法违规内容**：需要审核、举报、留存、配合处置。

因此建议把「开放注册」定义为：

- 不需要邀请码；
- 仍然需要邮箱验证；
- 仍然需要验证码；
- 新用户有发帖 / 发链接 / 上传图片的限制；
- 前 3 帖进入人工审核队列。

如果完全不做邮箱验证，只靠验证码和限流，广告量通常会在一周内失控。**开放注册 ≠ 无门槛。**

### 3.4 「部署到 GitHub」的两种含义

| 你的意思 | 是否可行 | 说明 |
|---|---|---|
| 代码托管到 GitHub，Actions 做 CI/CD | ✅ 可行 | 本方案采用 |
| 用 GitHub Pages 托管整个论坛 | ❌ 不可行 | Pages 只能放静态 HTML/CSS/JS，不能运行 Next.js 服务端，也不能连接你电脑的 MySQL |
| GitHub Pages 放静态介绍页，论坛另找运行环境 | ✅ 可行 | 介绍页可以，论坛主站不行 |

**本方案默认：** GitHub 负责代码、Issue、Pull Request、Actions；论坛实际运行在当前电脑；MySQL 也在当前电脑；公网访问通过 Cloudflare Tunnel。

> 如果你的目标就是「完全免费、只用 GitHub Pages」，那必须改成「静态前端 + 云端 API + 云数据库」，本地 MySQL 无法参与。具体取舍见第 10 节。

---

## 4. 产品定位

### 4.1 一句话定位

**一个可以关注不同主题「吧」、自由发帖讨论的综合社区。**

与百度贴吧的区别：

- 更轻：去掉复杂广告、会员、游戏化入口；
- 更干净：默认无广告，先做内容体验；
- 更可检索：帖子 SEO 友好，站内搜索可用；
- 更透明：举报处理、封禁理由、申诉入口可见。

### 4.2 核心对象

```
分区 Category
  └── 吧 Bar
        ├── 吧主 / 小吧主
        ├── 吧规 / 简介
        ├── 关注成员
        └── 主题 Thread
              ├── 首楼 Post（floor 1）
              ├── 楼层 Post（floor 2..N）
              └── 楼中楼 Post（depth 1，不限 floor）
```

### 4.3 首批吧建议

| 分区 | 吧 | 说明 |
|---|---|---|
| 科技 | 互联网 | 产品、平台、行业讨论 |
| 科技 | 编程 | 语言、工具、求助 |
| 生活 | 生活 | 日常、消费、经验 |
| 生活 | 情感 | 关系、困惑、倾诉 |
| 娱乐 | 影视 | 剧、电影、综艺 |
| 娱乐 | 游戏 | 游戏、攻略、组队 |
| 学习 | 学习 | 考试、方法、资料 |
| 职场 | 职场 | 求职、工作、行业 |
| 站务 | 公告 | 站点规则、更新 |
| 站务 | 反馈 | Bug、建议、申诉 |

不用一次建全；先 6–8 个，有人讨论再扩。

### 4.4 设计原则

1. **吧是入口**：首页要让用户快速找到「我感兴趣的吧」；
2. **帖子是内容**：列表突出标题、作者、回复数、最后活跃；
3. **楼中楼要克制**：只允许一层嵌套，避免无限盖楼；
4. **移动优先**：先设计 375px，再扩桌面；
5. **审核可见**：待审、隐藏、删除都要有状态说明；
6. **开放但可控**：注册开放，发帖有分级限制；
7. **不过度设计**：MVP 不做私信、推荐算法、会员、广告。

---

## 5. 用户角色与权限

### 5.1 角色

| 角色 | 说明 |
|---|---|
| 游客 | 未登录，可浏览公开吧与帖子 |
| 注册用户 | 完成邮箱验证，可发帖、回复、点赞、收藏、举报 |
| 吧成员 | 关注了某个吧，可签到、接收吧内通知 |
| 小吧主 | 由吧主任命，可删帖、封禁本吧用户 |
| 吧主 | 管理本吧：吧规、置顶、加精、小吧主任命、封禁 |
| 管理员 | 全站：建吧、分类、用户、审核、配置、审计 |

### 5.2 权限矩阵

| 操作 | 游客 | 注册用户 | 吧成员 | 小吧主 | 吧主 | 管理员 |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| 浏览公开吧 / 帖子 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 发主题 / 回复 | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| 楼中楼回复 | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| 点赞 / 收藏 | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| 关注吧 / 签到 | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| 上传图片 | — | 限制 | 限制 | ✓ | ✓ | ✓ |
| 举报 | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| 删除自己的帖子 | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| 置顶 / 加精 / 锁帖 | — | — | — | ✓ | ✓ | ✓ |
| 删除他人帖子 | — | — | — | ✓ | ✓ | ✓ |
| 禁言 / 封禁本吧 | — | — | — | ✓ | ✓ | ✓ |
| 任命小吧主 | — | — | — | — | ✓ | ✓ |
| 创建吧 | — | — | — | — | 申请 | ✓ |
| 全站封禁 / 删吧 | — | — | — | — | — | ✓ |
| 访问站务后台 | — | — | — | — | — | ✓ |

### 5.3 等级与限制（建议）

| 等级 | 条件 | 发帖限制 | 其他 |
|---|---|---:|---|
| L1 新用户 | 注册即得 | 1 帖/天，5 回复/天 | 不能发链接、不能上传 |
| L2 | 注册满 7 天 + 10 条回复 | 5 帖/天，30 回复/天 | 可发链接 |
| L3 | 注册满 30 天 + 50 个赞 | 10 帖/天，100 回复/天 | 可上传图片、可申请创建吧 |
| L4 | 吧主提名 / 管理员授予 | 20 帖/天 | 可申请小吧主 |

等级规则放后台配置，不写死在代码里。

---

## 6. 功能规划

### 6.1 P0（首个可公测版本）

| 模块 | 功能 | 人日 |
|---|---|---:|
| 账号 | 邮箱注册、登录、验证、找回密码、验证码 | 6 |
| 账号 | 个人主页、头像、简介、我的帖子 | 4 |
| 吧 | 分区、吧列表、吧主页、吧规、吧头像 | 6 |
| 吧 | 关注 / 取消关注、成员数 | 3 |
| 主题 | 发帖、编辑、软删除、草稿 | 6 |
| 主题 | 置顶、加精、锁定、移动 | 4 |
| 回复 | 楼层回复、引用、@ | 5 |
| 回复 | 楼中楼（一层嵌套、展开/收起） | 6 |
| 互动 | 点赞、收藏、分享 | 3 |
| 通知 | 被回复、被引用、被 @、吧务、系统 | 5 |
| 搜索 | 吧、主题、用户；中文搜索 | 5 |
| 举报 | 举报主题 / 回复 / 用户，原因枚举 | 3 |
| 审核 | 待审队列、通过、隐藏、删除、禁言、封禁 | 7 |
| 吧务 | 吧主 / 小吧主管理本吧 | 6 |
| 站务 | 用户、吧、内容、举报、配置、审计 | 7 |
| 反垃圾 | 限流、验证码、新用户限制、关键词、影子封禁 | 6 |
| SEO | SSR、Metadata、Sitemap、RSS、JSON-LD | 5 |
| 部署 | MySQL、环境变量、Tunnel、备份脚本 | 5 |
| 测试 | 单元、集成、E2E、压测 | 6 |

**合计约 98 人日**（含测试与部署，不含设计与内容）。按 2 人并行、每周 5 天，约 10 周；按 1 人，约 19–20 周。

> 如果要把「用户创建吧」放进 MVP，再加 6–8 人日，并增加审核负担；建议放 P1。

### 6.2 P1

| 功能 | 说明 | 人日 |
|---|---|---:|
| 用户创建吧 | 申请表、审核、通过后申请人为吧主 | 6 |
| 吧主申请 | 无吧主的吧可申请 | 3 |
| 签到 / 经验 / 头衔 | 提升日活，但不要做成复杂游戏 | 6 |
| 图片 / 表情 | 上传、压缩、EXIF 清除 | 5 |
| 热门 / 榜单 | 近 7 天热度，离线计算 | 3 |
| 邮件摘要 | 每周精选，含退订 | 3 |
| 数据看板 | 发帖、活跃、留存、举报 | 3 |
| 深色模式 | 系统跟随 | 2 |

### 6.3 P2

- 私信 / 聊天；
- 个性化推荐；
- 会员 / 广告 / 支付；
- 视频 / 直播；
- 开放 API；
- 多语言；
- 原生 App。

### 6.4 版本路线

| 版本 | 目标 | 内容 |
|---|---|---|
| v0.5 | 内测 | 注册、登录、建吧（管理员）、发帖、楼层回复、点赞、举报、基础后台、部署 |
| v1.0 | 公测 | 楼中楼、关注吧、吧务后台、搜索、SEO、反垃圾、审核、备份 |
| v1.1 | 运营 | 签到、等级、创建吧申请、图片、热门、邮件摘要 |
| v1.5 | 增长 | 榜单、活动、吧主激励、数据看板 |
| v2.0 | 商业化 | 会员、赞助、广告（谨慎） |

---

## 7. 信息架构与页面

### 7.1 站点地图

```
首页 /
├── 吧广场 /bars
│   └── 吧 /b/[slug]
│       ├── 发帖 /b/[slug]/new
│       └── 主题 /t/[threadId]
│           └── 楼中楼锚点 /t/[threadId]#post-[postId]
├── 我关注的吧 /me/bars
├── 搜索 /search?q=&type=bar|thread|user
├── 用户 /u/[username]
├── 通知 /notifications
├── 收藏 /bookmarks
├── 设置 /settings
├── 登录 /login
├── 注册 /register
├── 站规 /rules
├── 创建吧 /create-bar（P1）
├── 吧务后台 /mod/[slug]
│   ├── 概览
│   ├── 帖子管理
│   ├── 成员 / 封禁
│   └── 吧规 / 小吧主
├── 站务后台 /admin
│   ├── 概览
│   ├── 用户
│   ├── 吧 / 分类
│   ├── 内容
│   ├── 举报 / 审核
│   └── 配置 / 审计
└── 系统页 /404 /500 /maintenance
```

### 7.2 页面清单

| 路由 | 页面 | 核心元素 | 渲染 |
|---|---|---|---|
| `/` | 首页 | 推荐吧、最新主题、热门、分类、发帖入口 | ISR / 短缓存 |
| `/bars` | 吧广场 | 分类、全部吧、成员数、最新更新 | ISR |
| `/b/[slug]` | 吧主页 | 吧头像、简介、关注、签到、吧规、置顶、精品、主题列表 | ISR 30s |
| `/b/[slug]/new` | 发帖页 | 吧说明、标题、正文、预览、草稿 | 动态 |
| `/t/[id]` | 主题页 | 标题、正文、楼层、楼中楼、点赞、收藏、举报、回复框 | 动态 + 短缓存 |
| `/u/[username]` | 用户主页 | 头像、简介、等级、主题、回复、关注吧 | 动态 |
| `/me/bars` | 我关注的吧 | 列表、取消关注、签到入口 | 动态 |
| `/notifications` | 通知 | 未读、全部、标记已读 | 动态 |
| `/bookmarks` | 收藏 | 收藏主题、取消 | 动态 |
| `/search` | 搜索 | 类型筛选、结果高亮、空结果建议 | 动态 |
| `/create-bar` | 创建吧 | 名称、 slug、分类、说明、审核状态 | 动态（P1） |
| `/mod/[slug]` | 吧务后台 | 帖子、成员、封禁、吧规、小吧主 | 动态 |
| `/admin/*` | 站务后台 | 用户、吧、内容、举报、配置 | 动态 noindex |
| `/rules` | 站规 | 规则、举报、申诉、隐私 | 静态 |

### 7.3 首页线框

```
┌────────────────────────────────────────────────────────┐
│ Logo   首页   吧广场   搜索          [登录] [注册]     │
├────────────────────────────────────────────────────────┤
│ 一个可以关注不同主题「吧」的社区        [+ 发帖]       │
├────────────────────────────────────────┬───────────────┤
│ 最新主题 / 热门 / 精品        [切换]   │ 推荐吧         │
│ ┌────────────────────────────────────┐ │ 科技 / 生活    │
│ │ 标题                                │ │ 娱乐 / 学习    │
│ │ 吧 · 作者 · 回复 · 最后活跃        │ │ 查看全部 →     │
│ └────────────────────────────────────┘ │               │
│ ...                                    │ 站务公告       │
├────────────────────────────────────────┴───────────────┤
│ 页脚：关于 · 站规 · 隐私 · 举报 · RSS · 备案号（如适用）│
└────────────────────────────────────────────────────────┘
```

### 7.4 吧主页线框

```
┌────────────────────────────────────────────────────────┐
│ 吧头像  吧名称  «关注»  «签到»      成员 12,340        │
│ 简介：这里讨论……                                       │
│ 吧规：……                                    [发帖]    │
├────────────────────────────────────────────────────────┤
│ 置顶主题                                                │
│ 精品主题                                                │
│ 最新 / 热门 / 精品                                      │
│ ┌────────────────────────────────────────────────────┐ │
│ │ 标题                          作者  回复  最后活跃 │ │
│ └────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

### 7.5 主题页线框

```
┌────────────────────────────────────────────────────────┐
│ 吧名 / 主题标题                                        │
│ 作者 · 时间 · 浏览 · 回复 · 标签                       │
├────────────────────────────────────────────────────────┤
│ #1  作者                                               │
│     正文                                               │
│     赞 · 收藏 · 分享 · 举报                            │
├────────────────────────────────────────────────────────┤
│ #2  作者                                               │
│     回复内容                                           │
│     └ 楼中楼 3 条  [展开]                              │
│       回复者：内容                                     │
│     赞 · 回复 · 举报                                  │
├────────────────────────────────────────────────────────┤
│ 回复框：Markdown / 预览 / 提交                         │
└────────────────────────────────────────────────────────┘
```

### 7.6 移动端

- 底部导航：首页、吧广场、发帖、通知、我的；
- 吧主页顶部：关注 + 签到 + 发帖；
- 主题页：楼层卡片、楼中楼折叠、底部固定回复；
- 管理操作收进「更多」菜单，避免误触。

---

## 8. 核心业务流程

### 8.1 开放注册

1. 用户填写邮箱、用户名、密码，勾选协议；
2. 图形/行为验证码；
3. 发送验证邮件（24 小时有效）；
4. 点击验证后账号 `active`；
5. 登录写入 HttpOnly Session Cookie；
6. 新用户进入 L1，受发帖限额；
7. 同一 IP 注册频率限制：3 次/小时、10 次/天。

**如果跳过邮箱验证：** 至少保留验证码 + IP 限流 + 新用户前 3 帖人工审核；否则不建议公开。

### 8.2 关注吧与签到

1. 用户在吧主页点「关注」；
2. 写入 `bar_members`，`bars.member_count + 1`；
3. 关注后可在 `/me/bars` 看到；
4. 签到（P1）：写入 `checkins`，按唯一键防重复；
5. 签到增加经验，升级由后台规则计算；
6. 取消关注只删成员关系，不删历史帖子。

### 8.3 发主题

1. 进入 `/b/[slug]/new`；
2. 阅读吧规与模板；
3. 标题 5–120 字，正文 Markdown；
4. 客户端每 10 秒存草稿；
5. 提交校验：登录、邮箱已验证、未被封禁、吧权限、频率、长度、敏感词；
6. 新用户 / 命中风险规则 → `threads.status = 'pending'`、首楼 `posts.status = 'pending'`；
7. 审核通过 → 主题与首楼可见，版块计数 +1，写 outbox；
8. 返回主题页或「审核中」提示。

**事务：** 创建线程 + 首楼 + outbox 同一事务；待审不计入公开计数。

### 8.4 楼层与楼中楼

**楼层回复：**

1. 主题未锁定、用户未被禁言；
2. `SELECT ... FOR UPDATE` 锁定主题行；
3. `floor = COALESCE(MAX(floor), 1) + 1`；
4. 插入 `posts`，`depth = 0`，`floor = 新楼层`；
5. 更新 `threads.reply_count`、`last_post_at`；
6. 通知主题作者；
7. 清缓存。

**楼中楼：**

1. 用户点击某楼层「回复」；
2. `parent_id = 目标楼层`，`root_id = 目标楼层的 root_id 或 id`；
3. `depth = 1`，`floor = NULL`；
4. 不允许对楼中楼再嵌套（`depth` 最大 1）；
5. `threads.reply_count + 1`；
6. 通知被回复者；
7. 主题页按 `root_id` 批量查询楼中楼，避免 N+1。

### 8.5 举报、审核与申诉

1. 举报原因：垃圾广告、辱骂攻击、色情低俗、侵权、其他；
2. 写入 `reports`，`status = 'open'`；
3. 吧务后台 / 站务后台按时间排序；
4. 处理：忽略、隐藏、删除、警告、禁言 1/7/30 天、封禁；
5. 写 `moderation_actions` 与审计日志；
6. 通知被处理人，附理由与申诉入口；
7. 申诉进入站务后台，7 天内处理；
8. 处理结果通知举报人（可匿名）。

**SLA：** 普通 24 小时；色情、诈骗、违法 2 小时。

### 8.6 创建吧（P1）

1. 用户达到 L3，提交 `/create-bar`；
2. 名称、slug、分类、说明、初始吧规；
3. 管理员审核；
4. 通过：创建 `bars`，申请人写入 `bar_moderators` 为 `owner`；
5. 拒绝：写理由，用户可修改后重提；
6. 同一用户最多 1 个待审申请。

### 8.7 通知

| 事件 | 接收人 | 渠道 |
|---|---|---|
| 主题被回复 | 主题作者 | 站内 |
| 楼层被回复 | 被回复作者 | 站内 |
| 楼中楼被回复 | 被回复者 | 站内 |
| 被引用 / 被 @ | 相关用户 | 站内 |
| 吧务操作 | 被处理人 | 站内 + 邮件 |
| 举报结果 | 举报人 | 站内 |
| 系统公告 | 全站 / 吧成员 | 站内 |
| 每周精选 | 订阅用户 | 邮件（含退订） |

通知先写库 + outbox，邮件由 worker 异步发送，不阻塞发帖。

---

## 9. 技术架构

### 9.1 选型

| 层次 | 选择 | 理由 |
|---|---|---|
| 前端 / SSR | Next.js（App Router）+ TypeScript | SSR/SEO、前后端一体 |
| UI | Tailwind CSS + shadcn/ui | 快速、可定制 |
| 编辑器 | Markdown（textarea + 预览） | 简单、易审核 |
| API | Route Handlers / Server Actions + Zod | 少一层服务 |
| ORM | Drizzle ORM + `mysql2` | SQL 透明、迁移轻 |
| 数据库 | MySQL 8.0+（推荐 8.4 LTS） | 当前电脑已安装，运维简单 |
| 搜索 | MySQL FULLTEXT ngram | 不引入额外服务；中文可用 |
| 缓存 / 限流 | 进程内 LRU + MySQL；Redis 可选 | 单机简单；后续再加 Redis |
| 文件 | 本地磁盘 `UPLOAD_DIR` | 不依赖对象存储；备份即可 |
| 认证 | Better Auth（MySQL adapter） | 邮箱密码、验证、Session |
| 邮件 | Resend / SES / 阿里云邮件推送 | 事务邮件 |
| 部署 | 当前 Windows 电脑 + Node 22 + pnpm | 贴合现有环境 |
| 公网入口 | Cloudflare Tunnel | 不开放端口、自动 HTTPS |
| CI | GitHub Actions | 安装、lint、test、build |
| 监控 | Sentry + Uptime Kuma + pino | 错误、可用性、日志 |
| 测试 | Vitest + Playwright + k6 | 单元、E2E、压测 |

> 不建议在这个阶段引入 Kubernetes、独立搜索集群、微服务。单机 + MySQL 足够支撑早期。

### 9.2 架构图

```
┌──────────────┐
│   浏览器     │
└──────┬───────┘
       │ HTTPS
┌──────▼──────────────────────┐
│ Cloudflare Tunnel           │
│ forum.example.com           │
└──────┬──────────────────────┘
       │ http://localhost:3000
┌──────▼──────────────────────┐
│ 当前电脑                     │
│ Next.js 应用（SSR/API）      │
│ 本地文件 uploads/            │
│ MySQL 8.0+（127.0.0.1:3306）  │
└──────────────────────────────┘

GitHub：代码 / Issue / PR / Actions（lint、test、build）
备份：mysqldump + uploads 压缩 → 外部硬盘或云盘
```

### 9.3 代码组织

```
forum/
├── src/
│   ├── app/
│   │   ├── (site)/
│   │   ├── (auth)/
│   │   ├── mod/
│   │   └── admin/
│   ├── modules/
│   │   ├── auth/
│   │   ├── bars/
│   │   ├── threads/
│   │   ├── posts/
│   │   ├── notifications/
│   │   ├── moderation/
│   │   └── search/
│   ├── db/
│   │   ├── schema.ts
│   │   ├── migrations/
│   │   └── queries/
│   ├── lib/
│   └── components/
├── uploads/            # 本地文件，不进 git
├── scripts/backup.ps1
├── tests/
├── .env.example
├── next.config.ts
└── package.json
```

### 9.4 渲染与缓存

| 页面 | 策略 | 失效 |
|---|---|---|
| 首页 / 吧广场 | ISR 30–60s | 发帖、建吧后 tag 失效 |
| 吧主页 | ISR 30s | 发帖、删帖、关注后失效 |
| 主题页 | 动态 + 10s 缓存 | 回复、楼中楼、删帖后失效 |
| 用户主页 | 动态 | 资料变更 |
| 管理后台 | 动态 noindex | — |

单机优先用 Next.js 缓存 + 进程内 LRU；不要为了缓存引入 Redis。等出现多实例或限流需要共享状态，再加 Redis。

---

## 10. 部署方案：GitHub + 当前电脑 + 本地 MySQL

### 10.1 先明确：GitHub Pages 不行

GitHub Pages 只能托管静态文件：

- 不能运行 Next.js 的 SSR / API；
- 不能连接你电脑上的 MySQL；
- 不能处理登录、发帖、上传；
- 不能执行数据库迁移。

所以「论坛主站放 GitHub Pages + 数据库用本地 MySQL」在技术上无法成立。可行的组合是：

| 组合 | 代码 | 运行 | 数据库 | 公网 | 适合 |
|---|---|---|---|---|---|
| A（本方案） | GitHub | 当前电脑 | 当前电脑 MySQL | Cloudflare Tunnel | 个人项目、内测、低成本 |
| B | GitHub | 云服务器 | 云 MySQL | 云服务器 | 正式运营 |
| C | GitHub Pages | 浏览器静态 | 云 API | 云服务 | 纯静态 + 外部 API |
| D | GitHub | 当前电脑 | 当前电脑 MySQL | 仅局域网 | 开发 / 内部使用 |

### 10.2 推荐拓扑（方案 A）

```
GitHub 仓库
  ├── main 分支
  ├── GitHub Actions：pnpm lint / test / build
  └── （可选）GHCR 镜像

当前 Windows 电脑
  ├── Node 22 + pnpm
  ├── Next.js 应用：127.0.0.1:3000
  ├── MySQL 8.4：127.0.0.1:3306
  ├── uploads/：本地文件
  └── Cloudflare Tunnel：https://forum.example.com

外部
  ├── Cloudflare：DNS / TLS / Tunnel
  ├── 邮件服务
  └── 备份：外部硬盘或云盘
```

### 10.3 首次部署步骤（Windows）

1. 安装 Node.js 22 LTS、pnpm、MySQL 8.4；
2. 创建数据库与账号：

```sql
CREATE DATABASE forum CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'forum'@'127.0.0.1' IDENTIFIED BY 'change-me-strong';
CREATE USER 'forum'@'localhost' IDENTIFIED BY 'change-me-strong';
GRANT ALL PRIVILEGES ON forum.* TO 'forum'@'127.0.0.1';
GRANT ALL PRIVILEGES ON forum.* TO 'forum'@'localhost';
FLUSH PRIVILEGES;
```

3. 修改 MySQL 配置（`my.ini`）：

```ini
[mysqld]
character-set-server=utf8mb4
collation-server=utf8mb4_0900_ai_ci
ngram_token_size=2
```

4. 重启 MySQL；
5. 配置 `.env.local`：

```env
DATABASE_URL="mysql://forum:change-me-strong@127.0.0.1:3306/forum"
AUTH_SECRET="至少 32 字节随机字符串"
APP_URL="https://forum.example.com"
UPLOAD_DIR="D:/forum-data/uploads"
EMAIL_FROM="noreply@example.com"
SMTP_URL="smtp://..."
```

6. `pnpm install`、`pnpm db:migrate`、`pnpm build`、`pnpm start`；
7. 用 NSSM 或任务计划程序把应用注册为 Windows 服务，开机自启；
8. 安装 `cloudflared`，创建 Tunnel：

```powershell
cloudflared tunnel login
cloudflared tunnel create forum
cloudflared tunnel route dns forum forum.example.com
cloudflared tunnel run forum
```

9. 配置 Cloudflare Tunnel 的 ingress 指向 `http://localhost:3000`；
10. 用 Uptime Kuma / Cloudflare Health 检查；
11. 写备份脚本，加入任务计划程序。

### 10.4 GitHub 负责什么

- 代码托管、Issue、PR、Code Review；
- Actions：`pnpm install`、`lint`、`test`、`build`；
- 可选：构建 Docker 镜像推送到 GHCR；
- **不把 MySQL 密码、AUTH_SECRET 写进仓库**；
- 不把 `uploads/`、备份、数据库文件提交到 git。

GitHub Actions 示例（只做 CI，不做生产部署）：

```yaml
name: ci
on:
  push:
    branches: [main]
  pull_request:
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build
```

**集成测试：** CI 里加 `mysql:8.4` service（或连接专用测试库），设置独立的 `DATABASE_URL`；不要让测试跑在生产库。

**为什么不做自动部署：** GitHub 托管 runner 无法访问你家里的 MySQL；self-hosted runner 等于把 GitHub Actions 的权限放到个人电脑上，有安全风险。更稳的做法是：CI 通过后，在电脑上手动执行 `git pull` + `pnpm build` + 重启服务，或用计划任务在低峰期拉取。

### 10.5 公网访问与安全

- 只暴露 3000 给 Tunnel，**不要**在路由器上映射 3306；
- MySQL 绑定 `127.0.0.1`，不要监听 `0.0.0.0`；
- Windows 防火墙只允许本地回环和必要端口；
- 使用强密码，`.env` 不进 git；
- Cloudflare 开启 WAF / 速率限制（免费套餐有限）；
- 应用层限流：注册、登录、发帖、搜索、举报；
- 备份加密；
- 电脑设置自动登录、开机自启、断电恢复后自动启动；
- 建议配 UPS，避免突然断电损坏 MySQL。

### 10.6 家庭电脑的可用性

必须承认：

- 电脑睡眠 / 重启 / 断网 / 停电 → 站点不可用；
- 家庭上传带宽有限，图片多时体验下降；
- 没有 SLA；
- 不适合正式商业运营。

建议：

- 关闭睡眠，设置高性能但限制功耗；
- 用 Uptime Kuma 监控，掉线发邮件/Telegram；
- 每周检查磁盘、MySQL 错误日志；
- 每日备份，至少保留 7 天；
- 如果访问量增长，迁移到云服务器（方案 B），数据库一并迁移。

### 10.7 如果一定要 GitHub Pages

只能这样：

- GitHub Pages 放静态介绍页 / 文档；
- 论坛前端放 Pages，但数据通过云端 API；
- 云数据库（PlanetScale / Railway / Aiven 等）；
- 本地 MySQL 无法参与；
- 需要额外服务，成本与复杂度都上升。

这不是本方案，不建议为了「免费托管」牺牲可用性。

---

## 11. MySQL 数据模型

### 11.1 约定

- MySQL 8.0+，推荐 8.4 LTS；不要用 MariaDB 5.7；
- 所有表 `InnoDB`，`utf8mb4`，`utf8mb4_0900_ai_ci`；
- 主键 `BIGINT UNSIGNED AUTO_INCREMENT`；
- 时间 `DATETIME(3)`，统一存 UTC，前端按用户时区展示；
- 状态用 `VARCHAR + CHECK`，不用 MySQL `ENUM`，避免迁移痛苦；
- 计数允许短暂不一致，但发布/删除事务内必须更新；
- 内容软删除；用户注销匿名化；
- 认证表（account/session/verification）由 Better Auth 迁移管理，不在业务 DDL 中展开；
- 不在数据库存明文密码。

### 11.2 核心 DDL

```sql
CREATE DATABASE IF NOT EXISTS forum
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE forum;

CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  email_verified_at DATETIME(3) NULL,
  username VARCHAR(32) NOT NULL,
  display_name VARCHAR(64) NOT NULL,
  avatar_url VARCHAR(512) NULL,
  bio VARCHAR(500) NOT NULL DEFAULT '',
  user_role VARCHAR(16) NOT NULL DEFAULT 'member',
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  user_level INT NOT NULL DEFAULT 1,
  user_exp INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_seen_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_email (email),
  UNIQUE KEY uk_users_username (username),
  KEY idx_users_status (status),
  CONSTRAINT chk_users_role CHECK (user_role IN ('member', 'admin')),
  CONSTRAINT chk_users_status CHECK (status IN ('active', 'suspended', 'deleted'))
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
  visibility VARCHAR(16) NOT NULL DEFAULT 'public',
  post_permission VARCHAR(16) NOT NULL DEFAULT 'member',
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
  CONSTRAINT chk_bars_visibility CHECK (visibility IN ('public', 'members', 'private')),
  CONSTRAINT chk_bars_post_permission CHECK (post_permission IN ('member', 'trusted', 'moderator')),
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
  CONSTRAINT chk_threads_status CHECK (status IN ('open', 'locked', 'pending', 'deleted'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE posts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  thread_id BIGINT UNSIGNED NOT NULL,
  author_id BIGINT UNSIGNED NOT NULL,
  parent_id BIGINT UNSIGNED NULL,
  root_id BIGINT UNSIGNED NULL,
  depth TINYINT UNSIGNED NOT NULL DEFAULT 0,
  floor INT UNSIGNED NULL,
  content_md MEDIUMTEXT NOT NULL,
  content_html MEDIUMTEXT NOT NULL,
  content_text MEDIUMTEXT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'visible',
  edited_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_posts_thread_floor (thread_id, floor),
  KEY idx_posts_thread_root (thread_id, root_id, created_at),
  KEY idx_posts_parent (parent_id),
  KEY idx_posts_author (author_id, created_at),
  FULLTEXT KEY ft_posts_content (content_text) WITH PARSER ngram,
  CONSTRAINT fk_posts_thread FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE,
  CONSTRAINT fk_posts_author FOREIGN KEY (author_id) REFERENCES users(id),
  CONSTRAINT chk_posts_status CHECK (status IN ('visible', 'pending', 'hidden', 'deleted')),
  CONSTRAINT chk_posts_depth CHECK (depth <= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE tags (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(64) NOT NULL,
  name VARCHAR(32) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_tags_slug (slug),
  UNIQUE KEY uk_tags_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE thread_tags (
  thread_id BIGINT UNSIGNED NOT NULL,
  tag_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (thread_id, tag_id),
  KEY idx_thread_tags_tag (tag_id),
  CONSTRAINT fk_thread_tags_thread FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE,
  CONSTRAINT fk_thread_tags_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
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
    notification_type IN ('reply', 'nested_reply', 'mention', 'moderation', 'system', 'bar')
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
  CONSTRAINT chk_reports_status CHECK (report_status IN ('open', 'reviewing', 'resolved', 'rejected'))
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
                    'pin', 'unpin', 'feature', 'unfeature', 'transfer')
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE attachments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uploader_id BIGINT UNSIGNED NOT NULL,
  post_id BIGINT UNSIGNED NULL,
  object_key VARCHAR(255) NOT NULL,
  mime_type VARCHAR(64) NOT NULL,
  size_bytes BIGINT UNSIGNED NOT NULL,
  width INT UNSIGNED NULL,
  height INT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_attachments_object_key (object_key),
  KEY idx_attachments_post (post_id),
  CONSTRAINT fk_attachments_uploader FOREIGN KEY (uploader_id) REFERENCES users(id),
  CONSTRAINT fk_attachments_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE checkins (
  user_id BIGINT UNSIGNED NOT NULL,
  bar_id BIGINT UNSIGNED NOT NULL,
  checkin_date DATE NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id, bar_id, checkin_date),
  KEY idx_checkins_bar (bar_id, checkin_date),
  CONSTRAINT fk_checkins_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_checkins_bar FOREIGN KEY (bar_id) REFERENCES bars(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE bar_applications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  applicant_id BIGINT UNSIGNED NOT NULL,
  category_id INT UNSIGNED NOT NULL,
  name VARCHAR(64) NOT NULL,
  slug VARCHAR(64) NOT NULL,
  description VARCHAR(500) NOT NULL DEFAULT '',
  application_status VARCHAR(16) NOT NULL DEFAULT 'pending',
  reviewed_by BIGINT UNSIGNED NULL,
  review_note VARCHAR(500) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  reviewed_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_bar_applications_slug (slug),
  KEY idx_bar_applications_status (application_status, created_at),
  CONSTRAINT fk_bar_applications_user FOREIGN KEY (applicant_id) REFERENCES users(id),
  CONSTRAINT fk_bar_applications_category FOREIGN KEY (category_id) REFERENCES categories(id),
  CONSTRAINT fk_bar_applications_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_bar_applications_status CHECK (
    application_status IN ('pending', 'approved', 'rejected')
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE outbox (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  topic VARCHAR(64) NOT NULL,
  payload JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  processed_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_outbox_pending (processed_at, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

> 以上 DDL 已在 MySQL 8.4.9 上实际执行通过；全文索引与中文 `ngram` 检索也做了插入验证。你本机版本若低于 8.0.16，`CHECK` 约束不会生效，建议直接升级到 8.4 LTS。

### 11.3 MySQL 注意事项

| 事项 | 做法 |
|---|---|
| 大小写不敏感 | 列/表统一 `utf8mb4_0900_ai_ci`，邮箱、用户名唯一 |
| 无部分索引 | 用复合索引，把状态放进索引前列 |
| 无 `RETURNING` | 插入后用 `LAST_INSERT_ID()` 或再查一次 |
| 无 `ON CONFLICT` | 用 `INSERT ... ON DUPLICATE KEY UPDATE` |
| 无 `timestamptz` | 统一 `DATETIME(3)`，应用层存 UTC |
| 无 `citext` | 用 `utf8mb4_0900_ai_ci` 排序规则 |
| UUID 主键 | 用 `BIGINT AUTO_INCREMENT`，索引更小、分页更简单 |
| 中文全文检索 | FULLTEXT + ngram，`ngram_token_size=2` |
| JSON | `JSON` 类型，MySQL 8 支持 JSON 函数 |
| 行锁 | `SELECT ... FOR UPDATE`；队列可用 `SKIP LOCKED` |

**ngram 配置：** 在 `my.ini` 的 `[mysqld]` 加 `ngram_token_size=2`，重启后重建 FULLTEXT 索引。中文短语搜索用 `MATCH ... AGAINST`，短词（1 个字）可能需要 `LIKE` 兜底。

**索引长度：** `utf8mb4` 下索引前缀不要超过 3072 字节；本方案字段都远低于上限。

**迁移：** Drizzle Kit 生成 SQL 迁移；生产库先备份，再执行迁移。

### 11.4 数据约定

- 时间统一按 UTC 写入；`mysql2` 连接设置 `timezone: 'Z'`，或在每次连接执行 `SET time_zone = '+00:00'`；
- 主题 / 帖子软删除：`deleted_at` + `status`；前台过滤；
- 吧软删除：`status = 'deleted'`，不物理删；
- 用户注销：邮箱改占位、用户名改 `deleted_xxx`，保留内容；
- 计数：发布/删除事务内更新 `threads.reply_count`、`bars.thread_count`、`bars.post_count`；
- 浏览量：进程内聚合 + 每 60 秒批量回写，避免热点行锁；
- 楼中楼：`depth <= 1`，`floor` 为 `NULL`；
- 待审：`threads.status = 'pending'`、首楼 `posts.status = 'pending'`，不计数、不进搜索、不进 RSS。

---

## 12. API 设计

### 12.1 风格

- REST + JSON；
- 写操作必须登录，服务端逐次校验权限；
- Zod 校验，失败 422；
- 游标分页；
- 创建类接口支持 `Idempotency-Key`；
- 错误格式：

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "操作过于频繁，请稍后再试",
    "details": { "retryAfter": 30 }
  }
}
```

### 12.2 接口

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| `GET` | `/api/bars?category=&cursor=` | 否 | 吧列表 |
| `GET` | `/api/bars/:slug` | 否 | 吧详情 + 吧规 |
| `POST` | `/api/bars/:slug/follow` | 是 | 关注 / 取消 |
| `POST` | `/api/bars/:slug/checkin` | 是 | 签到（P1） |
| `GET` | `/api/threads?bar=&sort=&cursor=` | 否 | 主题列表 |
| `POST` | `/api/threads` | 是 | 发主题（含首楼） |
| `GET` | `/api/threads/:id` | 否 | 主题详情 + 首楼 |
| `PATCH` | `/api/threads/:id` | 是 | 编辑 |
| `DELETE` | `/api/threads/:id` | 是 | 软删除 |
| `POST` | `/api/threads/:id/pin` | 吧务 | 置顶 |
| `POST` | `/api/threads/:id/feature` | 吧务 | 加精 |
| `POST` | `/api/threads/:id/lock` | 吧务 | 锁定 |
| `GET` | `/api/threads/:id/posts?cursor=` | 否 | 楼层 + 楼中楼 |
| `POST` | `/api/threads/:id/posts` | 是 | 楼层回复 |
| `POST` | `/api/posts/:id/replies` | 是 | 楼中楼回复 |
| `POST` | `/api/posts/:id/like` | 是 | 点赞 / 取消 |
| `POST` | `/api/threads/:id/bookmark` | 是 | 收藏 / 取消 |
| `GET` | `/api/bookmarks?cursor=` | 是 | 收藏列表 |
| `GET` | `/api/search?q=&type=&cursor=` | 否 | 搜索吧 / 主题 / 用户 |
| `GET` | `/api/notifications?cursor=` | 是 | 通知 |
| `POST` | `/api/notifications/read` | 是 | 批量已读 |
| `POST` | `/api/reports` | 是 | 举报 |
| `GET` | `/api/me` | 是 | 当前用户 |
| `PATCH` | `/api/me` | 是 | 更新资料 |
| `GET` | `/api/me/bars` | 是 | 我关注的吧 |
| `POST` | `/api/bar-applications` | L3 | 创建吧申请（P1） |
| `GET` | `/api/mod/:bar/reports` | 吧务 | 本吧举报 |
| `POST` | `/api/mod/:bar/reports/:id/resolve` | 吧务 | 处理 |
| `POST` | `/api/mod/:bar/users/:id/sanction` | 吧务 | 禁言 / 封禁 |
| `GET` | `/api/admin/reports` | 管理员 | 全站举报 |
| `POST` | `/api/admin/bars` | 管理员 | 创建吧 |
| `POST` | `/api/admin/users/:id/sanction` | 管理员 | 全站处罚 |

### 12.3 分页

```json
{
  "items": [],
  "nextCursor": "MjAyNi0xMS0yNFQwODowMDowMFp8MTAyNA==",
  "hasMore": true
}
```

游标编码 `(last_post_at, id)` 或 `(created_at, id)`；排序字段必须与游标一致。

### 12.4 限流

| 动作 | 维度 | 限制 |
|---|---|---|
| 注册 | IP | 3 次/小时，10 次/天 |
| 登录 | IP + 账号 | 5 次/分钟，20 次/小时 |
| 发主题 | 用户 + IP | 1 次/分钟，L1 1 次/天 |
| 楼层回复 | 用户 | 5 次/分钟，50 次/天 |
| 楼中楼 | 用户 | 10 次/分钟，100 次/天 |
| 搜索 | IP | 30 次/分钟 |
| 举报 | 用户 | 10 次/天 |
| 上传 | 用户 | 20 次/小时 |

限流先做进程内令牌桶；重启即清空，可接受。后续多实例再换 Redis。

---

## 13. 关键实现要点

### 13.1 主题列表查询

```sql
SELECT t.id, t.title, t.reply_count, t.view_count, t.last_post_at,
       t.is_pinned, t.is_featured,
       u.username, u.avatar_url
FROM threads t
JOIN users u ON u.id = t.author_id
WHERE t.bar_id = ?
  AND t.status IN ('open', 'locked')
  AND t.deleted_at IS NULL
  AND (t.last_post_at, t.id) < (?, ?)
ORDER BY t.is_pinned DESC, t.last_post_at DESC, t.id DESC
LIMIT ?;
```

置顶帖单独查，不参与游标分页；索引 `(bar_id, status, is_pinned, last_post_at)`。

### 13.2 发主题事务

```ts
const threadStatus = needsReview ? 'pending' : 'open';
const postStatus = needsReview ? 'pending' : 'visible';

await db.transaction(async (tx) => {
  const [thread] = await tx.insert(threads).values({
    barId, authorId: user.id, title, slug, status: threadStatus,
  }).$returningId();

  await tx.insert(posts).values({
    threadId: thread.id, authorId: user.id, floor: 1,
    depth: 0, contentMd, contentHtml, contentText,
    status: postStatus,
  });

  if (!needsReview) {
    await tx.update(bars).set({
      threadCount: sql`thread_count + 1`,
      postCount: sql`post_count + 1`,
      lastThreadId: thread.id,
    }).where(eq(bars.id, barId));
  }

  await tx.insert(outbox).values({
    topic: needsReview ? 'thread.pending' : 'thread.created',
    payload: { threadId: thread.id },
  });
});
```

审核通过时：更新 `threads.status` 与首楼 `posts.status`，补计数，写 `thread.created`，清缓存。

### 13.3 楼层并发

```sql
START TRANSACTION;
SELECT id FROM threads WHERE id = ? FOR UPDATE;
SELECT COALESCE(MAX(floor), 1) + 1 AS next_floor FROM posts WHERE thread_id = ?;
INSERT INTO posts (thread_id, author_id, floor, depth, ...) VALUES (...);
UPDATE threads SET reply_count = reply_count + 1, last_post_at = NOW(3) WHERE id = ?;
COMMIT;
```

唯一键 `(thread_id, floor)` 兜底；冲突时重试 2 次。楼中楼不分配 floor，直接插入 `depth=1`。

### 13.4 楼中楼查询

先查顶层：

```sql
SELECT * FROM posts
WHERE thread_id = ? AND depth = 0 AND status = 'visible'
ORDER BY floor
LIMIT ?;
```

再按 `root_id` 批量查一层：

```sql
SELECT * FROM posts
WHERE thread_id = ?
  AND depth = 1
  AND root_id IN (...)
  AND status = 'visible'
ORDER BY created_at;
```

不要逐楼查询，避免 N+1。UI 默认折叠，显示「楼中楼 N 条」。

### 13.5 中文搜索

```sql
SELECT id, title,
       MATCH(title) AGAINST (? IN NATURAL LANGUAGE MODE) AS score
FROM threads
WHERE bar_id = ?
  AND status IN ('open', 'locked')
  AND MATCH(title) AGAINST (? IN NATURAL LANGUAGE MODE)
ORDER BY score DESC, last_post_at DESC
LIMIT 20;
```

- `ngram_token_size=2`，适合中文双字词；
- 单字查询用 `LIKE '%字%'` 兜底，但要限制范围；
- 帖子内容搜索同理，`posts.content_text` 上建 FULLTEXT；
- 结果高亮由前端做，不要把 HTML 拼进 SQL。

### 13.6 反垃圾

```
注册
  → 邮箱验证
  → IP / 设备频率限制
  → 验证码
发帖
  → 关键词
  → 新用户前 3 帖人工
  → 链接 / 图片权限
  → 影子封禁
运营
  → 举报队列
  → 封禁 / 申诉
  → 关键词库每周更新
```

**建议：** 开放注册首月，新用户发帖全部进入人工队列；等量上来再按风险分级。

### 13.7 通知

- 回复：通知主题作者 + 被回复楼层作者（去重，排除操作者）；
- 楼中楼：通知被回复者 + 主题作者（可配置）；
- 引用 / @：解析 Markdown，最多 5 人；
- 吧务：通知被处理人，附理由；
- 事务写 `notifications` + `outbox`；
- worker 每 5 秒消费，失败重试 3 次。

### 13.8 图片上传

MVP 可以先用本地磁盘：

1. `POST /api/uploads`，`multipart/form-data`；
2. 校验类型：JPEG / PNG / WebP / GIF；
3. 单文件 5MB，每帖最多 9 张；
4. 用 `sharp` 压缩、转 WebP、清除 EXIF；
5. 存 `UPLOAD_DIR/yyyy/mm/{uuid}.webp`；
6. 数据库存相对路径；
7. 通过 Next.js 静态路由或 Caddy 提供；
8. 备份 `uploads/` 与 MySQL 同一周期。

不要相信客户端 MIME；用文件头判断。不要执行图片；不要保留原始文件名。

### 13.9 SEO

- 主题页 SSR 输出标题、正文、作者、时间；
- `generateMetadata` 输出 title / description / canonical / OG；
- JSON-LD：`DiscussionForumPosting`；
- `sitemap.xml` 分页提交；
- `robots.txt` 禁止 `/admin`、`/mod`、`/api`、`/search`；
- RSS：`/feed.xml`、`/b/[slug]/feed.xml`；
- 已删除内容返回 410；
- 列表分页 self-canonical，避免重复。

### 13.10 权限

```ts
const user = await requireUser();
const bar = await getBarBySlug(slug);
await assertCanPost(user, bar);
await assertNotMuted(user.id, bar.id);
await assertRateLimit(`post:${user.id}`, 1, 60);
```

前端隐藏按钮不等于权限控制；每个 Server Action / Route Handler 都要重新校验。

---

## 14. 非功能需求

### 14.1 性能

| 指标 | 目标 |
|---|---|
| LCP（移动 4G） | < 3s |
| TTFB（主题页） | < 800ms |
| 列表查询 P95 | < 200ms |
| 发帖 P95 | < 1s |
| 并发 | 50–100 在线 |
| 可用性 | 尽力而为，不承诺 99.9% |

家庭电脑 + 家庭带宽决定了上限；Cloudflare 缓存静态资源可以缓解。图片多时优先压缩、懒加载、限制尺寸。

### 14.2 安全

- 密码 Argon2id / scrypt（由认证库决定）；
- Session：HttpOnly + Secure + SameSite=Lax；
- 写操作校验 Origin / CSRF；
- Markdown 渲染 allowlist 清洗，禁止 `<script>`、`on*`、`iframe`；
- CSP；
- 上传校验真实类型、限制体积、剥离 EXIF；
- SQL 全部参数化；
- MySQL 只监听 127.0.0.1；
- Cloudflare Tunnel 不暴露源站端口；
- `.env` 不进 git；
- 管理后台二次验证（P1）；
- 审计日志 180 天；
- 备份加密；
- 依赖扫描。

### 14.3 合规（需法务确认）

| 事项 | 说明 | 建议 |
|---|---|---|
| ICP 备案 | 公网可访问 + 自定义域名，通常需要 | 上线前 2–4 周启动 |
| 公安联网备案 | 上线后按要求 | 咨询当地公安网安 |
| 用户协议 / 隐私政策 | 收集邮箱、IP、日志 | 请律师审阅 |
| 内容审核 | 综合话题风险更高 | 人工 + 关键词 + 举报 |
| 日志留存 | 网络日志不少于 6 个月 | 数据库 + 日志 |
| 账号信息 | 可能涉及真实身份核验 | 邮箱未必足够，确认是否要手机号 |
| 未成年人保护 | 内容分级、未成年人模式 | 按适用规则 |
| AI 生成内容 | 可能需要显著标识 | 发布页提示 |
| 个人信息 | 最小化、可导出、可注销 | 产品与后台支持 |

> Cloudflare Tunnel 不改变网站的实际托管地，也不替代备案。具体要求以当地通信管理、网信、公安部门为准。

### 14.4 备份

- MySQL 每日 `mysqldump --single-transaction`，保留 7 天；
- 每周全量归档，保留 30 天；
- `uploads/` 每日增量 / 每周全量；
- 备份到外部硬盘 + 云盘各一份；
- 每月做一次恢复演练；
- 备份文件加密；
- 记录备份失败告警。

```powershell
mysqldump --single-transaction --routines --triggers `
  -u forum -p forum > D:\forum-backup\forum-$(Get-Date -Format yyyyMMdd).sql
```

### 14.5 可观测性

- Sentry 捕获前后端异常；
- Uptime Kuma 监控首页、登录、发帖；
- pino 结构化日志：requestId、userId、route、latency；
- 告警：5xx、MySQL 连接数、磁盘、备份失败、Tunnel 掉线；
- 每周看一次日志，不要等出事才看。

---

## 15. 测试与验收

### 15.1 测试

| 层级 | 工具 | 覆盖 |
|---|---|---|
| 单元 | Vitest | 权限、限流、Markdown 清洗、slug |
| 集成 | Vitest + 测试库 | 发帖事务、楼层并发、楼中楼、通知 |
| E2E | Playwright | 注册、登录、发帖、回复、点赞、举报、后台 |
| 压测 | k6 | 首页 50 QPS、主题页 30 QPS、发帖 2 QPS |
| 安全 | OWASP ZAP | XSS、CSRF、越权、上传 |

### 15.2 E2E 场景

1. 开放注册 → 邮箱验证 → 登录 → 发第一帖 → 审核通过；
2. 用户关注吧 → 取消关注 → 成员数正确；
3. 发主题 → 楼层回复 → 楼中楼回复 → 通知正确；
4. 举报回复 → 吧主隐藏 → 作者收到通知 → 申诉；
5. 被禁言用户发帖 → 明确错误；
6. 普通用户访问 `/admin` → 403；
7. 删除主题 → 410 → 搜索消失；
8. 中文搜索「编程」→ 结果正确；
9. 手机端完成发帖、回复、举报。

### 15.3 验收清单

- [ ] 开放注册、邮箱验证、验证码可用；
- [ ] 登录、找回密码、Session 正常；
- [ ] 管理员可建吧、分类、指派吧主；
- [ ] 用户可关注吧、发帖、楼层回复、楼中楼；
- [ ] 点赞、收藏、@、通知可用；
- [ ] 举报、审核、禁言、封禁、申诉可用；
- [ ] 吧务后台只能管理本吧；
- [ ] 中文搜索可用；
- [ ] 主题页可被搜索引擎抓取；
- [ ] 新用户限流生效；
- [ ] MySQL 备份与恢复演练通过；
- [ ] Cloudflare Tunnel HTTPS 可访问；
- [ ] 50 并发压测无错误；
- [ ] 无 P0/P1 安全问题。

---

## 16. 实施计划

### 16.1 阶段（2 人并行）

| 阶段 | 周期 | 目标 | 交付 |
|---|---|---|---|
| 0. 准备 | 第 0–1 周 | 环境、仓库、MySQL、Tunnel | 可访问的空站点 |
| 1. 账号与吧 | 第 2–4 周 | 注册、登录、建吧、吧主页 | 能注册、能看吧 |
| 2. 发帖与回复 | 第 5–6 周 | 主题、楼层、点赞、举报 | 内容闭环 |
| 3. 楼中楼与通知 | 第 7 周 | 楼中楼、通知、@ | 讨论体验 |
| 4. 吧务与审核 | 第 8–9 周 | 吧务后台、审核、封禁、申诉 | 可治理 |
| 5. 搜索与 SEO | 第 10 周 | 中文搜索、Metadata、Sitemap | 可被找到 |
| 6. 加固与公测 | 第 11–12 周 | 压测、备份、安全、种子内容 | 公开测试 |

### 16.2 里程碑

| 里程碑 | 时间 | 标准 |
|---|---|---|
| M1 可注册可看吧 | 第 4 周末 | 开放注册、6 个吧、吧主页 |
| M2 可发帖可回复 | 第 6 周末 | 主题、楼层、点赞、举报 |
| M3 可治理 | 第 9 周末 | 吧务、审核、封禁、申诉 |
| M4 可公测 | 第 12 周末 | 搜索、SEO、备份、50 并发、无 P0 |

### 16.3 人力

| 角色 | 投入 | 职责 |
|---|---|---|
| 全栈 | 1.5–2 人 | 前后端、MySQL、部署 |
| 设计 | 0.3 人 | 首页、吧、主题、移动端 |
| 运营 / 审核 | 0.5 人 | 种子内容、吧规、审核值班 |
| 测试 | 0.2 人 | 回归、安全、压测 |

**单人开发：** 16–20 周；建议先砍掉签到、等级、创建吧、图片，保留「注册 + 吧 + 发帖 + 楼层 + 举报 + 基础后台」。

### 16.4 第一周清单

- [ ] 确认 GitHub 是代码托管还是 Pages；
- [ ] 安装 Node 22、pnpm、MySQL 8.4；
- [ ] 创建 `forum` 数据库与账号；
- [ ] 设置 `ngram_token_size=2`；
- [ ] 建仓库、`.env.example`、CI；
- [ ] 搭 Next.js 骨架 + 登录页；
- [ ] 配 Cloudflare Tunnel；
- [ ] 写备份脚本；
- [ ] 画首页 / 吧 / 主题三张线框；
- [ ] 准备 10 篇种子帖。

---

## 17. 成本预算

### 17.1 当前电脑方案

| 项目 | 成本 | 说明 |
|---|---:|---|
| 电脑电费 | ¥50–150/月 | 取决于功耗与电价；电脑本来常开则边际更低 |
| 域名 | ¥60–100/年 | 稳定 Tunnel 与品牌需要 |
| Cloudflare Tunnel | ¥0 | 免费套餐足够 |
| Cloudflare DNS / TLS | ¥0 | 免费 |
| 备份云盘 | ¥10–30/月 | 也可用外部硬盘 |
| 邮件 | ¥0–100/月 | 事务邮件 |
| 短信 | ¥25–50/月 | 可选，若要求手机验证 |
| UPS | ¥300–600 一次性 | 强烈建议 |
| **合计** | **¥0–300/月** | 不含人力与推广 |

### 17.2 云服务器替代

| 项目 | 成本 |
|---|---:|
| 2C4G 云服务器 | ¥100–300/月 |
| 云 MySQL | ¥0–100/月（可用同机 MySQL） |
| 对象存储 / CDN | ¥20–50/月 |
| 备份 | ¥10–20/月 |
| **合计** | **¥150–450/月** |

如果站点开始有稳定流量，建议迁到云服务器；家庭电脑适合内测和个人项目，不适合承担正式社区。

### 17.3 人力

MVP 约 98 人日；按 ¥800–1,500/人日，约 ¥7.8–14.7 万。实际以团队构成为准。

---

## 18. 运营与增长

### 18.1 冷启动

1. 先建 6–8 个吧，每吧 10–20 篇种子帖；
2. 邀请 30–50 名种子用户，但不发邀请码，直接开放注册；
3. 运营账号每帖 24 小时内回复；
4. 每周一个固定话题；
5. 把优质内容摘要分发到外部，附原文链接。

### 18.2 吧主

- 首批吧主由管理员指定；
- 给吧主培训：删帖、封禁、置顶、加精、处理举报；
- 吧主不活跃 30 天，进入提醒 / 替换流程；
- 吧主不能删站务公告，不能修改站点规则。

### 18.3 内容治理

- 站规：禁止违法、色情、暴力、诈骗、人肉、侵权、广告；时政 / 宗教 / 民族等敏感议题按规则限制；
- 吧规：每个吧一页，吧主可补充，但不能低于站规；
- 新用户前 3 帖人工；
- 举报 24 小时处理，紧急 2 小时；
- 封禁必须写理由，用户可申诉；
- 每月公开一次治理数据（举报量、处理量）。

### 18.4 SEO

- 主题页 SSR；
- 标题具体，避免「求助」「一个问题」；
- 内部链接：相关主题、吧、标签；
- Sitemap / RSS；
- 不要把低质量列表页全部提交；
- 删除内容 410。

### 18.5 数据

- 注册 → 验证率；
- 登录 → 发帖转化；
- 吧关注 → 发帖；
- 7 日 / 30 日留存；
- 举报量、处理时长；
- 搜索无结果率；
- 新用户首帖审核通过率。

先接 Umami / Plausible 自建，不要上复杂数仓。

### 18.6 商业化（后续）

- 会员：自定义头像、签名、置顶；
- 赞助吧：明确标注；
- 招聘 / 合作；
- 不建议早期放广告，容易伤内容。

---

## 19. 风险与应对

| 风险 | 影响 | 应对 |
|---|---|---|
| 误以为 GitHub Pages 能跑论坛 | 高 | 本方案明确：Pages 只能静态；动态应用跑电脑 |
| 家庭电脑断电 / 断网 / 睡眠 | 高 | UPS、关闭睡眠、开机自启、Uptime 告警、云服务器备选 |
| 开放注册被广告淹没 | 高 | 邮箱验证、验证码、新用户限额、前 3 帖审核、影子封禁 |
| 综合话题违规内容 | 高 | 站规、关键词、人工审核、举报、留痕、法务确认 |
| MySQL 数据丢失 | 高 | 每日备份、每周归档、异地、恢复演练 |
| 本地 MySQL 被公网访问 | 高 | 绑定 127.0.0.1、防火墙、不映射 3306 |
| Cloudflare Tunnel 掉线 | 中 | 服务化、自动重启、监控 |
| 家庭上传带宽不足 | 中 | 图片压缩、限制尺寸、CDN 缓存、迁移云 |
| 备案周期 | 中 | 第 0 周启动；未备案先局域网 |
| 范围蔓延 | 高 | 冻结 P0；创建吧 / 签到 / 图片进 P1 |
| 吧主滥用权限 | 中 | 操作留痕、申诉、管理员复核、吧主培训 |
| 关键人依赖 | 中 | 文档、脚本、备份、交接 |
| 贴吧品牌 / 版权 | 中 | 不复制名称、UI、内容；只借鉴结构 |

---

## 20. 待确认问题

1. **GitHub 的确切含义**：代码托管 + CI，还是 GitHub Pages 静态托管？
2. **公网访问**：只局域网，还是 Cloudflare Tunnel + 自定义域名？
3. **域名与备案**：是否已有域名？是否接受 ICP 备案周期？
4. **邮箱验证**：是否接受？如果不接受，是否接受更严格的审核？
5. **手机号**：是否要求绑定？这会显著降低垃圾注册，但增加成本和门槛。
6. **首批吧**：用建议的 8 个，还是你指定分类？
7. **用户创建吧**：MVP 就要，还是 P1？
8. **审核人力**：每天能投入多少时间？开放注册后这是硬约束。
9. **内容红线**：哪些话题不允许？需要提前写进站规。
10. **预算**：是否接受域名、UPS、备份的少量成本？

---

## 21. 附录

### 21.1 环境变量示例

```env
DATABASE_URL="mysql://forum:change-me@127.0.0.1:3306/forum"
AUTH_SECRET="至少 32 字节随机字符串"
APP_URL="https://forum.example.com"
UPLOAD_DIR="D:/forum-data/uploads"
EMAIL_FROM="noreply@example.com"
SMTP_URL="smtp://user:pass@smtp.example.com:587"
```

### 21.2 MySQL 配置

```ini
[mysqld]
character-set-server=utf8mb4
collation-server=utf8mb4_0900_ai_ci
ngram_token_size=2
max_connections=100
innodb_buffer_pool_size=512M
```

按电脑内存调整；4GB 内存的电脑不要把 `innodb_buffer_pool_size` 设得太大。

### 21.3 Cloudflare Tunnel 配置

```yaml
tunnel: forum
credentials-file: C:\Users\<you>\.cloudflared\<tunnel-id>.json

ingress:
  - hostname: forum.example.com
    service: http://localhost:3000
  - service: http_status:404
```

运行：

```powershell
cloudflared tunnel run forum
```

用 NSSM 注册为 Windows 服务，开机自启。

### 21.4 上线检查

- [ ] 域名解析 / Tunnel / HTTPS；
- [ ] MySQL 只监听 127.0.0.1；
- [ ] `.env` 不在 git；
- [ ] 管理员强密码 + 二次验证（P1）；
- [ ] 用户协议 / 隐私 / 站规；
- [ ] 举报入口；
- [ ] 备份脚本 + 恢复演练；
- [ ] Uptime 监控；
- [ ] 限流 / 验证码；
- [ ] robots / sitemap / RSS；
- [ ] 404 / 500 / 维护页；
- [ ] 手机真机测试；
- [ ] 压测 / 安全扫描；
- [ ] 审核值班表；
- [ ] 种子内容；
- [ ] 备案（如适用）。

### 21.5 参考

- 百度贴吧：只参考「吧 + 帖子 + 楼中楼 + 吧主」的结构，不复制品牌、UI、内容；
- Discourse：信息组织与审核流程；
- Hacker News：列表效率；
- V2EX：简洁与节点文化。

---

> 本方案 v1.1 基于你的三个决定：综合贴吧式、GitHub 托管、当前电脑 MySQL、开放注册。  
> 最重要的两个提醒：**GitHub Pages 不能运行这个论坛**；**开放注册必须配合验证与审核，否则广告会失控**。
