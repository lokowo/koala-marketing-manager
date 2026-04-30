# Koala PhD 后台重构与内容生成系统方案 v4（最终版）

> 参考 EASOVA (easova.com.au) 完整博客系统
> 适配 Koala Study Advisors 平台
> 包含：所有 UI 细节、自动化发布、分享规则、SEO、优化建议

---

## 一、路由与认证修复

| 问题 | 修复 |
|------|------|
| "/" 跳转后台 | "/" → 301 重定向 `/koala/home` |
| 后台无认证 | `/dashboard/*` 需 Supabase Auth，未登录 → 跳转 `/dashboard/login` |
| 无用模块 | 删除"今日发布任务"、"日历"、"发现中心"、旧"内容卡片生成器" |

---

## 二、后台侧边栏结构

```
Koala PhD Admin
├── 📊 仪表盘
│   ├── 用户数据（注册量、日活、AI对话次数、积分消耗趋势图）
│   ├── 内容数据（文章总数、总阅读量、总分享数、平均阅读完成率、SEO覆盖率）
│   ├── 教授库数据（总数、各校分布饼图、待审核数）
│   └── 实时数据（今日新增用户、今日文章浏览、今日AI对话数）
├── 📝 博客管理 Blog CMS
│   ├── 草稿箱
│   ├── 已发布
│   ├── 定时发布
│   └── 全部
├── ✨ AI 内容生成
│   ├── 单篇生成
│   ├── 批量生成（推荐主题）
│   └── 知识库内容（教授介绍 / 论文故事化 / 方向盘点）
├── 🤖 自动化管理
│   ├── 自动发布规则
│   ├── 发布日志
│   └── 社交媒体账号
├── 👨‍🏫 教授库管理
│   ├── 审核列表（Pending → Verified）
│   ├── 已发布
│   └── 数据采集控制台
├── 👥 用户管理
│   ├── 用户列表
│   ├── 订阅管理（Starter / Pro / Elite）
│   └── 积分管理
└── ⚙️ 系统设置
    ├── API Keys 管理
    └── 品牌设置
```

---

## 三、前端博客列表页（/koala/blog）

### 3.1 页面头部

**中文界面：**
```
📖 Koala 知识库

澳洲研究生百科
从申请攻略到科研方法，从导师选择到留学生活
——一站式了解澳洲研究型学位的方方面面
```

**英文界面：**
```
📖 Koala Knowledge Base

Australian Research Degree Encyclopedia
From application guides to research methods, from supervisor
selection to student life — your one-stop resource
```

### 3.2 搜索与筛选

```
🔍 搜索文章... 输入关键字后按 Enter    [搜索]

[全部] [申请攻略] [学术科研] [留学政策] [职业发展]
[导师关系] [科研方法] [留学生活] [大学院校]

                                ⏱ 最新发布  🔥 最热门

共 XX 篇文章 · 第 1/X 页
```

英文界面：分类标签全英文、排序改 Latest / Most Popular

### 3.3 文章卡片样式

#### 置顶文章（大卡片，横向 3 列）
```
┌─────────────────────────────┐
│ [封面图]                     │
│  ┌────────┐    ┌──────────┐ │
│  │申请攻略│    │📌 置顶    │ │
│  └────────┘    └──────────┘ │
│                             │
│ 套磁信写了20封0回复？可能是  │
│ 这3个致命错误...             │
│                             │
│ 简短摘要文字...              │
│                             │
│ 📅 30/04/2026  👁 126       │
└─────────────────────────────┘
```
- 封面图占卡片上半部分
- 左上角：分类标签 badge
- 右上角：橙色"📌 置顶"/"📌 Pinned" badge
- 标题（粗体，最多2行，超出省略号）
- 摘要（最多2行）
- 底部：日期 + 浏览数（👁 图标 + 数字）

#### 普通文章（列表卡片）
```
┌───────────────────────────────────────────────┐
│ [留学政策]  PhD 指南                    4月20日│
│                                               │
│ 澳洲 PhD 申请全流程：从选导师到发 Offer       │
│ 详解如何通过套磁、Research Proposal、面试三关..│
└───────────────────────────────────────────────┘
```

### 3.4 置顶规则
- 最多 **3 篇** 文章可同时置顶
- 置顶文章始终排在最前面，以大卡片形式展示
- 超过 3 篇时，新置顶自动取消最早的一篇
- 后台可一键"置顶"/"取消置顶"
- 置顶文章之间按手动排序（可拖拽调整顺序）

---

## 四、前端文章详情页

### 4.1 完整结构
```
← 返回博客

[留学政策]  📅 2026年4月30日  ⏱ 5 分钟阅读  👁 126

┌──────────────────────────────────────────┐
│ 🌐 此文章提供英文版本            切换英文  │
└──────────────────────────────────────────┘

# 文章标题

正文（Markdown 渲染，含文内插图）

[标签1] [标签2] [标签3] [标签4] [标签5]

───────────────────────────────────────────

🔗 分享:  [f] [𝕏] [in] [💬] [📷] [📍] [微信] [📧] [📋] [...]

                          [和考拉学长聊聊我的申请 →]

───────────────────────────────────────────

相关文章
[文章1] [文章2] [文章3]
```

### 4.2 各元素说明

| 元素 | 中文界面 | 英文界面 |
|------|---------|---------|
| 返回 | ← 返回博客 | ← Back to Blog |
| 阅读时间 | 5 分钟阅读 | 5 min read |
| 浏览数 | 👁 126 | 👁 126 |
| 双语栏 | 🌐 此文章提供英文版本 [切换英文] | 🌐 This article is also available in Chinese [Switch to Chinese] |
| CTA | 和考拉学长聊聊我的申请 → | Chat with Koala about my application → |
| 阅读进度条 | 页面顶部金色进度条，随滚动填充 | 同 |

### 4.3 浏览数逻辑
- 每次页面加载 +1（同一用户 24h 内只计 1 次，基于 cookie/IP）
- 数据存 `blog_posts.view_count`
- **后台可手动调整**（见第五章）

---

## 五、后台博客 CMS

### 5.1 顶部操作栏
```
博客管理 Blog CMS
AI 生成文章自动保存到草稿箱，编辑确认后点击 📨 一键发布

[🌐 查看博客]  [✨ 批量SEO]  [✏️ AI 生成]  [+ 新建文章]
```

### 5.2 Tab
```
📝 草稿箱    ✅ 已发布    🕐 定时发布    📋 全部
```

### 5.3 文章列表每条显示

```
┌──────────────────────────────────────────────────────────────┐
│ [缩略图]  📌置顶  已发布  申请攻略/Application Guide         │
│           👁 126  SEO  双语                    [📌] [✏️] [🗑] │
│                                                              │
│ 套磁信写了20封0回复？可能是这3个致命错误                      │
│ Cold Email: 20 Emails, 0 Replies? These 3 Mistakes Might Be  │
│ the Reason                                                   │
│                                                              │
│ 摘要文字...                                                   │
│                                                              │
│ [PhD申请] [套磁信] [UNSW] [Australia] +2                     │
└──────────────────────────────────────────────────────────────┘
```

#### 各 badge 说明
| Badge | 颜色 | 含义 |
|-------|------|------|
| 📌 置顶 | 橙色 | 文章已置顶 |
| 已发布 | 绿色 | 文章已上线 |
| 草稿 | 灰色 | 文章为草稿 |
| 定时 | 蓝色 | 文章已设定定时发布 |
| SEO | 绿色 | SEO 元数据已生成 |
| 双语 | 绿色 | 中英文内容均已生成 |
| 👁 数字 | 灰色 | 浏览次数 |

#### 操作按钮（每条右侧）
| 按钮 | 功能 |
|------|------|
| 📌 / 取消📌 | 置顶 / 取消置顶 |
| ✏️ | 编辑文章（打开编辑弹窗） |
| 🗑 | 删除文章（需二次确认） |

### 5.4 浏览数后台可调

在编辑文章弹窗中，增加：
```
统计数据（仅管理员可见）
├── 👁 浏览数: [126]  ← 可手动输入修改
├── 🔗 分享数: [23]   ← 可手动输入修改
└── 📊 阅读完成率: 67% ← 只读
```
用途：初期文章可适当调高浏览数，营造热度

### 5.5 新建/编辑文章弹窗

```
┌─────────────────────────────────────────────────────┐
│ 新建文章 / 编辑文章                               ✕ │
│                                                     │
│ 分类 Category  [🤖 AI推荐]   原始语言                │
│ [申请攻略 ▼]                [中文 Chinese ▼]         │
│                                                     │
│ 标签 Tags（逗号分隔）                    [🏷️ AI生成]  │
│ [PhD申请, 套磁信, UNSW, Australia]                   │
│                                                     │
│ 封面图 Cover Image                    [🎨 AI生成封面] │
│ [https://...]  [预览]                                │
│                                                     │
│ ┌──────────┬──────────────┐  [🌐 AI翻译到English]    │
│ │ 中文内容  │ English Content│                        │
│ └──────────┴──────────────┘                          │
│                                                     │
│ 标题（中文）                                         │
│ [                                          ]         │
│ 摘要（中文，≤150字）                                  │
│ [                                          ]         │
│ 正文（中文 · Markdown）                               │
│ [                                          ]         │
│                                                     │
│ ─── 统计数据（仅管理员）─────────────────             │
│ 👁 浏览数: [126]   🔗 分享数: [23]                    │
│                                                     │
│ ─── 发布设置 ────────────────────────────             │
│ 发布状态: [草稿 Draft ▼]                              │
│   └─ 草稿 / 已发布 / 定时发布                         │
│ 置顶: [☐ 置顶此文章]                                 │
│ 定时发布时间: [2026-05-01 09:00]（仅定时时显示）      │
│                                                     │
│                            [取消]  [预览]  [💾 保存]  │
└─────────────────────────────────────────────────────┘
```

### 5.6 批量操作
- 列表支持多选（复选框）
- 批量操作按钮：
  - 批量发布
  - 批量转草稿
  - 批量删除（需确认）
  - 批量生成 SEO
  - 批量生成英文翻译

---

## 六、AI 内容生成弹窗

### 6.1 单篇生成
```
发布方式: [保存草稿 ▼]
文章主题: [输入框]
提示: 主题越具体，质量越高。建议包含关键词、地区、时间。
分类: [申请攻略 ▼]
风格: [学长分享 ▼]  (专业权威 / 学长分享 / 新闻报道)
文章插图: [无插图 ▼]  (无 / 1张 / 2张 / 3张)

[✏️ 生成文章 (中文撰写 → 英文翻译 → SEO优化)]
```

### 6.2 批量生成（推荐主题）
```
发布方式: [保存草稿 ▼]

基于 Google + Bing 双源实时新闻推荐主题
(XX 条新闻源)                    [🔄 刷新主题]

☐ 主题标题 1
  [分类标签] [风格标签]
  🌐 来源: SBS News · 2026-04-30

☐ 主题标题 2
  ...

[全选] [取消全选]   已选 X 篇 (预计 X-X 秒)

文章插图: [无插图 ▼]  每篇AI自动生成

[⚡ 一键生成 X 篇文章（草稿）]
```

---

## 七、自动化内容发布系统（新增！）

### 7.1 自动化规则设置

后台"自动化管理"页面：

```
┌──────────────────────────────────────────────┐
│ 🤖 自动化发布规则                             │
│                                              │
│ ── 自动生成 ────────────────────────────────  │
│ [☑] 每日自动生成博客文章                      │
│     频率: [每天 1 篇 ▼]                       │
│     时间: [09:00 AEST ▼]                      │
│     发布方式: [保存草稿 ▼]                     │
│     分类偏好: [自动轮换 ▼]                     │
│     风格: [随机 ▼]                            │
│     插图: [1张 ▼]                             │
│                                              │
│ ── 自动发布到社交媒体 ────────────────────── │
│ [☑] 发布文章后自动同步到:                      │
│     [☑] X / Twitter    账号: @KoalaStudy ✅   │
│     [☑] LinkedIn       账号: Koala Study ✅   │
│     [☐] 小红书          账号: 未关联 [关联]    │
│     [☐] WeChat 公众号   账号: 未关联 [关联]    │
│                                              │
│ ── 定时发布队列 ──────────────────────────── │
│ [☑] 草稿自动排队发布                           │
│     每日发布数: [2 篇 ▼]                       │
│     发布时间: [10:00, 18:00 AEST]             │
│     发布间隔: [至少 4 小时 ▼]                  │
│                                              │
│ ── 知识库内容自动生成 ──────────────────────  │
│ [☑] 每周自动生成教授介绍                       │
│     频率: [每周 3 篇 ▼]                        │
│     选择方式: [H-index最高且未介绍 ▼]          │
│                                              │
│ [☑] 每周自动生成论文故事                       │
│     频率: [每周 2 篇 ▼]                        │
│     选择方式: [最新论文 ▼]                     │
│                                              │
│                              [💾 保存规则]     │
└──────────────────────────────────────────────┘
```

### 7.2 自动化流程

```
Cron Job 定时触发 →
  1. 搜索最新新闻（Google + Bing RSS）
  2. AI 选题（避免与已有文章重复）
  3. AI 生成中文文章
  4. AI 翻译英文
  5. AI 生成 SEO 元数据
  6. 异步生成封面图 + 文内插图
  7. 保存为草稿 或 直接发布（根据规则）
  8. 若设置了社交媒体同步 → 自动发布到关联平台
  9. 记录发布日志
```

### 7.3 发布日志

```
┌──────────────────────────────────────────────────┐
│ 📋 发布日志                                       │
│                                                  │
│ 2026-04-30 10:00  ✅ 自动生成                     │
│   "澳洲485签证重大改革"                           │
│   → 博客已发布 ✅                                 │
│   → X/Twitter 已发布 ✅                           │
│   → LinkedIn 已发布 ✅                            │
│                                                  │
│ 2026-04-30 09:00  ✅ 自动生成                     │
│   "Nature2026十大科研突破"                         │
│   → 博客草稿 📝（待审核）                         │
│                                                  │
│ 2026-04-29 18:00  ❌ 生成失败                     │
│   错误: OpenAI API timeout                        │
│   [重试]                                         │
└──────────────────────────────────────────────────┘
```

### 7.4 社交媒体 API 集成

| 平台 | 集成方式 | 自动发布内容 |
|------|---------|-----------|
| X / Twitter | Twitter API v2 | 标题 + 摘要(≤280字) + hashtags + URL |
| LinkedIn | LinkedIn API | 标题 + 摘要 + URL + hashtags |
| 小红书 | 暂不支持 API，生成文案到剪贴板 | 标题 + 摘要 + 标签 |
| WeChat 公众号 | WeChat MP API | 完整图文消息 |

不支持 API 的平台 → 生成对应格式的文案 → admin 手动复制发布（或通过 Claude 浏览器自动化）

---

## 八、分享功能

### 8.1 分享按钮组
Facebook → X → LinkedIn → 小红书 → Instagram → WeChat → Email → 复制链接 → "..." (Web Share API 系统面板)

### 8.2 语种跟随规则
- 分享内容语种 = 当前 UI 界面语言
- 链接带 `?lang=zh` 或 `?lang=en`
- 打开链接自动显示对应语言

### 8.3 各平台格式

#### X / Twitter (≤280字符)
```
{标题}

{摘要前80字}...

#{标签1} #{标签2} #{标签3} #KoalaStudy
{URL}?lang={语言}&utm_source=twitter&utm_medium=social
```

#### LinkedIn
```
{标题}

{摘要全文}

Read more → {URL}?lang={语言}&utm_source=linkedin

#KoalaStudy #AustraliaPhD #{标签1}
```

#### 小红书
```
{标题} 📚✨

{摘要前150字}...

🔗 完整文章: {URL}?lang=zh&utm_source=xiaohongshu

#{标签1} #{标签2} #澳洲留学 #PhD申请 #考拉学长
```

#### WeChat
```
{标题}

{摘要全文}

👉 阅读全文: {URL}?lang=zh&utm_source=wechat
```

#### Instagram (复制到剪贴板)
```
{标题} 📚

{摘要前200字}...

🔗 Link in bio
#{标签} #AustraliaPhD #KoalaStudy #澳洲留学
```

#### Email
```
Subject: {标题} | Koala Study Advisors

Hi,

{中文: 我在 Koala Study 看到了一篇好文章，分享给你：}
{英文: I found a great article on Koala Study, sharing with you:}

📖 {标题}
{摘要全文}

🔗 {URL}?lang={语言}&utm_source=email

— Shared via Koala Study Advisors
```

#### 复制链接 (点击后 toast: "已复制！"/"Copied!")
```
{标题} — {URL}?lang={语言}
```

#### "..." 更多 → Web Share API
```javascript
navigator.share({
  title: '{当前语言标题}',
  text: '{当前语言摘要}',
  url: '{URL}?lang={语言}'
});
// 不支持则隐藏此按钮
```

### 8.4 Open Graph + Twitter Card + JSON-LD

```html
<!-- Open Graph -->
<meta property="og:title" content="{标题}" />
<meta property="og:description" content="{摘要}" />
<meta property="og:image" content="{封面图}" />
<meta property="og:url" content="{URL}?lang={语言}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="Koala Study Advisors" />
<meta property="og:locale" content="zh_CN" />
<meta property="og:locale:alternate" content="en_AU" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{标题}" />
<meta name="twitter:description" content="{摘要}" />
<meta name="twitter:image" content="{封面图}" />
<meta name="twitter:site" content="@KoalaStudy" />

<!-- SEO -->
<meta name="description" content="{seoDescription}" />
<meta name="keywords" content="{seoKeywords}" />
<title>{seoTitle} | Koala Study Advisors</title>

<!-- 多语言 hreflang -->
<link rel="alternate" hreflang="zh" href="{URL}?lang=zh" />
<link rel="alternate" hreflang="en" href="{URL}?lang=en" />
<link rel="alternate" hreflang="x-default" href="{URL}" />

<!-- JSON-LD 结构化数据 -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "{标题}",
  "description": "{摘要}",
  "image": "{封面图}",
  "datePublished": "{发布日期ISO}",
  "dateModified": "{修改日期ISO}",
  "author": { "@type": "Organization", "name": "Koala Study Advisors" },
  "publisher": {
    "@type": "Organization",
    "name": "Koala Study Advisors",
    "logo": { "@type": "ImageObject", "url": "{logo URL}" }
  },
  "mainEntityOfPage": { "@type": "WebPage", "@id": "{URL}" },
  "inLanguage": "{zh/en}",
  "articleSection": "{分类}"
}
</script>
```

---

## 九、新闻源搜索范围

| 类别 | 关键词 |
|------|-------|
| A. 留学热点 | Australia international students 2026, Australian university admission, student visa changes, PhD scholarship Australia |
| B. 学术科研 | Australia research funding ARC, Nature Science Australia, PhD research breakthrough, academic publishing trends |
| C. 签证移民 | Australia immigration policy 2026, skilled visa, post-study work visa 485, PR pathway, Graduate visa |
| D. 就业职业 | Australia graduate employment, PhD career outcomes, academic job market, STEM jobs Australia |
| E. 大学动态 | Go8 Australia, University of Melbourne, UNSW, ANU, Monash, University of Sydney, QUT UTS Macquarie |
| F. 科研趋势 | AI research Australia, climate change research, biomedical, quantum computing, renewable energy |

每次：随机 8 个关键词 → Google News RSS + Bing News → 返回最新新闻

---

## 十、Prompts（完整）

### 10.1 选题推荐

有新闻时：以真实新闻为基础推荐主题
无新闻时：基于分类和热点推荐

共同规则：
- 最多 2/{count} 直接提到 PhD/博士
- 至少 3 篇聚焦新闻本身
- 8 个分类轮换覆盖
- 标题吸引人，不强塞 PhD 角度
- 不编造、不重复

输出：`[{title, category, style, newsIndex}]`

### 10.2 文章生成

品牌声音：考拉学长，温暖可靠
内容比例：80% 话题分析 + 20% 自然联系留学
长度：分析 1200-2000 字，指南 600-1000 字
格式：Markdown
SEO：自然嵌入关键词
引用：标注新闻源

输出：`{titleZh, excerptZh(≤150字), contentZh, tags(5-8), imageKeywords(3-5)}`

### 10.3 翻译
- 正文：保持 Markdown 格式、语气、专业度
- 标题：简洁 + SEO 友好

### 10.4 SEO 元数据
`{seoTitle(≤60), seoDescription(≤160), seoKeywords(≤10)}`

### 10.5 标签生成
5-8 个中英混合标签

### 10.6 分类推荐
8 选 1：`{category: "..."}`

---

## 十一、文章分类与风格

### 分类（8个）
| Key | 中文 | English |
|-----|------|---------|
| policy | 留学政策 | Policy & Visa |
| research | 学术科研 | Research & Science |
| university | 大学院校 | Universities |
| career | 职业发展 | Career Development |
| application | 申请攻略 | Application Guide |
| methodology | 科研方法 | Research Methods |
| supervisor | 导师关系 | Supervisor Relations |
| life | 留学生活 | Student Life |

### 风格（3种）
| Key | 描述 |
|-----|------|
| professional | 专业权威，数据详实 |
| casual | 学长分享，亲切真实 |
| news | 新闻报道，事实+点评 |

---

## 十二、图片生成

### 12.1 封面图
- 每个分类有对应 Prompt 模板
- 去重逻辑：搜索已有 → 排除已用 → 复用或新生成
- Prompt 格式：`Photorealistic, editorial, {categoryPrompt}, {tags}, DSLR, 4K, no text/watermarks/logos/faces`

### 12.2 文内插图
- 可选 0-3 张
- AI 规划插入位置（在哪个标题后）
- 每张提供：promptEn, altZh, altEn

---

## 十三、知识库内容生成

### 教授介绍卡片
输入：教授档案 → 输出：社交媒体风格介绍

### 论文故事化
输入：论文数据 → 输出：800-1200 字通俗科普

### 研究方向盘点
输入：领域关键词 → 检索知识库 → 输出：导师盘点文章

---

## 十四、完整生成流程

```
Step 1: AI 生成中文文章
Step 2: AI 翻译英文 (并行)
Step 3: AI 生成中英 SEO 元数据 (并行)
Step 4: 计算阅读时间（中文 300字/分，英文 200词/分）
Step 5: 创建文章记录（不含图片，避免超时）
Step 6: 异步生成封面图（含去重）
Step 7: 异步生成文内插图（0-3张）
Step 8: 生成各平台分享文案模板（中/英）
Step 9: 生成 Open Graph + Twitter Card 元标签
Step 10: 若自动发布开启 → 同步到社交媒体
Step 11: 记录发布日志
```

---

## 十五、优化功能

### 15.1 阅读进度条
文章顶部金色进度条，随滚动填充

### 15.2 考拉学长浮动 AI 助手
博客页右下角考拉头像 → 迷你对话框 → 引导进入 /koala/chat

### 15.3 文章收藏/书签
登录用户可收藏 → 个人中心查看

### 15.4 相关教授推荐
文章涉及某研究方向 → 文末推荐匹配导师
"对这个方向感兴趣？看看这些导师 →"

### 15.5 文章系列/专题
多篇文章组成系列（如"套磁信系列"）
详情页显示系列导航

### 15.6 热门文章 Widget
首页/侧边栏 "🔥 本周热门" Top 5
基于 view_count + share_count 加权

### 15.7 评论/讨论区
文章底部评论（需登录）
考拉学长 AI 可参与回复

### 15.8 Newsletter 订阅
博客底部邮箱订阅框
每周自动发送新文章摘要（Resend API）

### 15.9 RSS Feed
`/api/rss` 自动生成
便于订阅和第三方抓取

### 15.10 Google Search Console
自动提交 sitemap.xml
文章发布后 ping Google 索引

### 15.11 阅读完成率追踪
Intersection Observer 追踪滚动到底
记录 50% / 75% / 100% 完成率
反馈到仪表盘

### 15.12 文章预览
发布前可"预览"查看前端效果
新窗口打开预览模式

### 15.13 内容质量检查
生成后自动检查：
- 字数是否达标
- 是否包含必要的 SEO 关键词
- 标签数量是否 5-8 个
- 摘要是否 ≤150 字
- 标题是否包含关键信息

---

## 十六、数据库新增表

### blog_posts 表
```sql
CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_zh TEXT NOT NULL,
  title_en TEXT,
  excerpt_zh TEXT,
  excerpt_en TEXT,
  content_zh TEXT NOT NULL,
  content_en TEXT,
  category TEXT NOT NULL,
  style TEXT DEFAULT 'casual',
  tags TEXT[] DEFAULT '{}',
  cover_image_url TEXT,
  image_keywords TEXT[] DEFAULT '{}',
  
  -- SEO
  seo_title_zh TEXT,
  seo_title_en TEXT,
  seo_description_zh TEXT,
  seo_description_en TEXT,
  seo_keywords_zh TEXT,
  seo_keywords_en TEXT,
  
  -- 统计（可手动调整）
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  read_completion_rate FLOAT DEFAULT 0,
  
  -- 发布
  status TEXT DEFAULT 'draft',  -- draft / published / scheduled
  is_pinned BOOLEAN DEFAULT false,
  pin_order INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  
  -- 元数据
  reading_time_zh INTEGER,  -- 分钟
  reading_time_en INTEGER,
  original_language TEXT DEFAULT 'zh',
  news_source TEXT,
  news_source_url TEXT,
  news_source_date DATE,
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_blog_posts_status ON blog_posts(status);
CREATE INDEX idx_blog_posts_category ON blog_posts(category);
CREATE INDEX idx_blog_posts_pinned ON blog_posts(is_pinned);
CREATE INDEX idx_blog_posts_published ON blog_posts(published_at DESC);
```

### blog_images 表（图片库，去重复用）
```sql
CREATE TABLE blog_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  category TEXT,
  used_as_cover_by UUID REFERENCES blog_posts(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### blog_in_article_images 表（文内插图）
```sql
CREATE TABLE blog_in_article_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  insert_after_heading TEXT,
  alt_zh TEXT,
  alt_en TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### automation_logs 表（自动化日志）
```sql
CREATE TABLE automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,  -- 'generate' / 'publish' / 'social_sync'
  post_id UUID REFERENCES blog_posts(id),
  platform TEXT,  -- 'blog' / 'twitter' / 'linkedin' / 'wechat' / 'xiaohongshu'
  status TEXT NOT NULL,  -- 'success' / 'failed' / 'pending'
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### automation_rules 表（自动化规则）
```sql
CREATE TABLE automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type TEXT NOT NULL,  -- 'auto_generate' / 'auto_publish' / 'social_sync' / 'knowledge_content'
  is_enabled BOOLEAN DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 十七、关键约束总结

| 规则 | 说明 |
|------|------|
| 标题多样性 | 最多 2/8 篇直接提 PhD/博士 |
| 内容比例 | 80% 话题 + 20% 留学 |
| Koala 提及 | 最多 1-2 句文末 |
| 数据要求 | 真实数据+可靠来源 |
| 新闻引用 | 注明来源+日期 |
| 不可捏造 | 不编造新闻 |
| 去重 | 检查已有标题 |
| 封面图去重 | 排除已用 |
| 双语 | 中英文双版本 |
| SEO | title≤60, desc≤160, keywords |
| 分享语种 | 跟随 UI 语言 |
| UTM 追踪 | 全链路追踪 |
| OG 标签 | 动态生成 |
| Twitter Card | summary_large_image |
| JSON-LD | Article 结构化 |
| hreflang | 中英互指 |
| Web Share API | "..."系统分享 |
| 浏览数 | 24h 去重，后台可调 |
| 阅读时间 | 中 300字/分，英 200词/分 |
| 品牌声音 | 考拉学长 |
| 插图 | 0-3 张可选 |
| 发布方式 | 直接 / 草稿 / 定时 |
| 新闻源 | Google + Bing 双源 |
| 置顶 | 最多 3 篇，可手动排序 |
| 自动化 | 定时生成+自动发布+社交同步 |
| 批量操作 | 发布/删除/SEO/翻译 |
| 文章预览 | 发布前预览前端效果 |
| 质量检查 | 自动检查字数/SEO/标签/摘要 |
