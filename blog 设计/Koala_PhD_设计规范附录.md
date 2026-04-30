# Koala PhD 设计规范附录（配合 v4 方案使用）

> 字体排版、色彩、间距、组件设计、响应式、状态处理等完整视觉规范
> 参考学术论文排版 + EASOVA 设计系统 + 现代 Web 最佳实践

---

## 一、字体系统 Typography

### 1.1 字体选择

学术论文常用字体：英文 Times New Roman / Palatino / Garamond，中文 宋体 / 仿宋。
Koala 作为学术平台，博客正文采用**衬线体**（Serif）营造学术权威感，UI/导航用**无衬线体**（Sans-serif）保持现代感。

| 用途 | 中文字体 | 英文字体 | Google Fonts 加载 |
|------|---------|---------|-----------------|
| UI/导航/按钮 | Noto Sans SC（思源黑体）| Inter | `Inter`, `Noto+Sans+SC` |
| 文章正文 | Noto Serif SC（思源宋体）| Source Serif 4 | `Source+Serif+4`, `Noto+Serif+SC` |
| 代码/引用来源 | — | JetBrains Mono | `JetBrains+Mono` |

**Google Fonts 加载代码：**
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;700&family=Noto+Serif+SC:wght@400;600;700&family=Source+Serif+4:ital,wght@0,400;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

**CSS 变量：**
```css
:root {
  /* 字体族 */
  --font-ui: 'Inter', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-article: 'Source Serif 4', 'Noto Serif SC', Georgia, 'Times New Roman', serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}
```

### 1.2 字体层级（Typography Scale）

#### 博客文章详情页

| 元素 | 中文 | 英文 | 字号 | 字重 | 行高 | 字间距 | 字体 |
|------|------|------|------|------|------|--------|------|
| 文章标题 H1 | 标题 | Title | 32px / 2rem | 700 Bold | 1.3 | 0 | --font-article |
| 章节标题 H2 | 二级标题 | Section | 24px / 1.5rem | 600 SemiBold | 1.4 | 0.01em | --font-article |
| 子标题 H3 | 三级标题 | Subsection | 20px / 1.25rem | 600 SemiBold | 1.4 | 0.01em | --font-article |
| 正文 Body | 正文 | Body | 17px / 1.0625rem | 400 Regular | 1.8 | 0.02em | --font-article |
| 引用 Blockquote | 引用 | Quote | 16px / 1rem | 400 Regular (Italic英文) | 1.7 | 0.02em | --font-article |
| 图片说明 Caption | 说明 | Caption | 13px / 0.8125rem | 400 Regular | 1.5 | 0.03em | --font-ui |
| 来源标注 Source | 来源 | Source | 12px / 0.75rem | 400 Regular | 1.5 | 0.03em | --font-mono |
| 标签 Tag | 标签 | Tag | 13px / 0.8125rem | 500 Medium | 1 | 0.05em | --font-ui |
| 元信息 Meta | 日期等 | Date | 14px / 0.875rem | 400 Regular | 1.5 | 0.02em | --font-ui |

#### UI 界面（非文章）

| 元素 | 字号 | 字重 | 字体 |
|------|------|------|------|
| 页面大标题 | 28px | 700 | --font-ui |
| 页面副标题 | 16px | 400 | --font-ui |
| 导航栏 | 14px | 500 | --font-ui |
| 按钮 | 14px | 600 | --font-ui |
| 输入框文字 | 15px | 400 | --font-ui |
| 输入框占位符 | 15px | 400 | --font-ui |
| 小标签/Badge | 12px | 600 | --font-ui |
| 底部导航 | 11px | 500 | --font-ui |

### 1.3 文章 Markdown 渲染样式

```css
.article-content {
  font-family: var(--font-article);
  font-size: 17px;
  line-height: 1.8;
  color: var(--color-text-primary);
  letter-spacing: 0.02em;
}

.article-content h2 {
  font-size: 24px;
  font-weight: 600;
  margin-top: 2.5em;
  margin-bottom: 0.8em;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--color-border-light);
  color: var(--color-text-heading);
}

.article-content h3 {
  font-size: 20px;
  font-weight: 600;
  margin-top: 2em;
  margin-bottom: 0.6em;
  color: var(--color-text-heading);
}

.article-content p {
  margin-bottom: 1.5em;
  text-align: justify;  /* 两端对齐，学术风格 */
}

.article-content blockquote {
  margin: 1.5em 0;
  padding: 1em 1.5em;
  border-left: 4px solid var(--color-primary-gold);
  background: var(--color-bg-warm);
  font-style: italic;  /* 英文斜体，中文保持正常 */
  color: var(--color-text-secondary);
}

.article-content blockquote:lang(zh) {
  font-style: normal;  /* 中文不用斜体 */
}

.article-content code {
  font-family: var(--font-mono);
  font-size: 14px;
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 4px;
}

.article-content a {
  color: var(--color-primary-gold-dark);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.article-content img {
  width: 100%;
  border-radius: 8px;
  margin: 1.5em 0;
}

.article-content figcaption,
.article-content .image-caption {
  font-family: var(--font-ui);
  font-size: 13px;
  color: var(--color-text-muted);
  text-align: center;
  margin-top: -0.5em;
  margin-bottom: 1.5em;
}

/* 来源引注 */
.article-content .source-citation {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-text-muted);
}

/* 列表 */
.article-content ul, .article-content ol {
  padding-left: 1.5em;
  margin-bottom: 1.5em;
}

.article-content li {
  margin-bottom: 0.5em;
}

/* 表格 */
.article-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.5em 0;
  font-size: 15px;
}

.article-content th {
  background: var(--color-bg-warm);
  font-weight: 600;
  text-align: left;
  padding: 10px 12px;
  border-bottom: 2px solid var(--color-primary-gold);
}

.article-content td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-border-light);
}

/* 分割线 */
.article-content hr {
  border: none;
  border-top: 1px solid var(--color-border-light);
  margin: 2em 0;
}
```

---

## 二、色彩系统 Colors

### 2.1 品牌色（Koala 考拉学长）

```css
:root {
  /* 主色 — 金色（考拉品牌色）*/
  --color-primary-gold: #C5975B;
  --color-primary-gold-light: #D4AE7A;
  --color-primary-gold-lighter: #F0E4D0;
  --color-primary-gold-dark: #A67B3D;

  /* 背景 */
  --color-bg-cream: #FDF8F0;        /* 主背景（温暖奶油色）*/
  --color-bg-warm: #FAF5ED;          /* 卡片/引用背景 */
  --color-bg-white: #FFFFFF;         /* 纯白（博客正文区）*/
  --color-bg-dark: #1A2332;          /* 深色（header/footer）*/

  /* 文字 */
  --color-text-primary: #1A1A1A;     /* 正文 */
  --color-text-heading: #0D0D0D;     /* 标题（更深）*/
  --color-text-secondary: #4A4A4A;   /* 二级文字 */
  --color-text-muted: #8A8A8A;       /* 辅助文字（日期、说明）*/
  --color-text-on-dark: #FFFFFF;     /* 深色背景上的文字 */
  --color-text-on-gold: #FFFFFF;     /* 金色背景上的文字 */

  /* 边框 */
  --color-border-light: #E8E0D4;
  --color-border-medium: #D0C4B0;

  /* 状态色 */
  --color-success: #16A34A;          /* 绿色（已发布、SEO、双语）*/
  --color-warning: #F59E0B;          /* 橙色（置顶、定时）*/
  --color-error: #DC2626;            /* 红色（删除、错误）*/
  --color-info: #3B82F6;             /* 蓝色（定时发布）*/
  --color-draft: #9CA3AF;            /* 灰色（草稿）*/

  /* 阴影 */
  --shadow-card: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-card-hover: 0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04);
  --shadow-gold: 0 2px 8px rgba(197,151,91,0.25);
}
```

### 2.2 Badge 颜色对照

| Badge | 背景色 | 文字色 | 用途 |
|-------|-------|-------|------|
| 📌 置顶 / Pinned | #F97316 (橙) | #FFF | 置顶文章 |
| 已发布 / Published | #16A34A (绿) | #FFF | 已发布状态 |
| 草稿 / Draft | #9CA3AF (灰) | #FFF | 草稿状态 |
| 定时 / Scheduled | #3B82F6 (蓝) | #FFF | 定时发布 |
| SEO | #16A34A (绿) | #FFF | SEO 已生成 |
| 双语 / Bilingual | #16A34A (绿) | #FFF | 双语内容已生成 |
| 分类标签 | var(--color-bg-warm) | var(--color-text-primary) | 文章分类 |

---

## 三、间距系统 Spacing

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
}
```

| 用途 | 间距 |
|------|------|
| Badge 内边距 | 4px 8px |
| 标签 pill 内边距 | 6px 14px |
| 卡片内边距 | 16px-24px |
| 卡片间距 | 16px-24px |
| 章节间距（H2） | 上 40px / 下 12px |
| 段落间距 | 下 24px |
| 文章最大宽度 | 720px（正文区）|
| 页面最大宽度 | 1200px |

---

## 四、圆角系统 Border Radius

```css
:root {
  --radius-sm: 4px;    /* badge, tag */
  --radius-md: 8px;    /* 卡片, 输入框 */
  --radius-lg: 12px;   /* 大卡片, 弹窗 */
  --radius-xl: 16px;   /* 特殊容器 */
  --radius-pill: 9999px; /* 分类 pill, 按钮 pill */
}
```

---

## 五、组件设计

### 5.1 分类 Pill 标签

```
活跃状态：  背景 --color-primary-gold，文字 白色，pill 圆角
默认状态：  背景 透明，边框 --color-border-medium，文字 --color-text-secondary
悬停状态：  背景 --color-primary-gold-lighter，文字 --color-primary-gold-dark
```

### 5.2 文章卡片

**置顶大卡片：**
```
宽度：1/3 列（桌面 3 列，平板 2 列，手机 1 列）
封面图：宽高比 16:10，圆角 --radius-md（顶部）
分类 badge：左上角绝对定位，圆角 --radius-sm
置顶 badge：右上角绝对定位，橙色，圆角 --radius-sm
标题：--font-article, 18px, 700, 最多 2 行（line-clamp: 2）
摘要：--font-ui, 14px, 400, 最多 2 行
底部：日期 + 浏览数，14px, --color-text-muted
卡片阴影：--shadow-card
悬停阴影：--shadow-card-hover + translateY(-2px)
```

**普通列表卡片：**
```
全宽，左侧可选小缩略图（80x80, 圆角 --radius-sm）
左上分类标签：13px
标题：--font-article, 17px, 600
摘要：14px, 最多 1 行
右侧：日期
边框底部：1px solid --color-border-light
```

### 5.3 博客文章详情页宽度

```
正文容器：max-width: 720px, margin: 0 auto
文内图片：max-width: 100%（容器内全宽）
标签区：与正文同宽
分享栏：与正文同宽
相关文章：max-width: 1080px（3 列卡片）
```

### 5.4 阅读进度条

```css
.reading-progress {
  position: fixed;
  top: 0;
  left: 0;
  height: 3px;
  background: var(--color-primary-gold);
  z-index: 100;
  transition: width 0.1s ease;
}
```

### 5.5 双语切换栏

```css
.bilingual-banner {
  background: var(--color-primary-gold-lighter);
  border: 1px solid var(--color-primary-gold-light);
  border-radius: var(--radius-md);
  padding: 10px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  margin-bottom: 24px;
}

.bilingual-banner .icon { color: var(--color-primary-gold-dark); }
.bilingual-banner .switch-link {
  color: var(--color-primary-gold-dark);
  font-weight: 600;
  cursor: pointer;
}
```

### 5.6 CTA 按钮

```css
.cta-button {
  background: var(--color-primary-gold);
  color: white;
  font-family: var(--font-ui);
  font-size: 15px;
  font-weight: 600;
  padding: 12px 24px;
  border-radius: var(--radius-pill);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow: var(--shadow-gold);
  transition: all 0.2s ease;
}

.cta-button:hover {
  background: var(--color-primary-gold-dark);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(197,151,91,0.35);
}
```

### 5.7 分享按钮组

```
按钮尺寸：40x40px 圆形
默认：背景 transparent，border 1px --color-border-medium
悬停：背景 --color-bg-warm
图标大小：20px
间距：8px
"..."按钮：同样式
```

---

## 六、响应式断点

```css
/* 手机 */
@media (max-width: 640px) {
  文章标题 H1: 24px
  章节 H2: 20px
  正文: 16px
  置顶文章: 1 列
  普通文章: 全宽列表
  相关文章: 1 列滚动
  侧边距: 16px
}

/* 平板 */
@media (min-width: 641px) and (max-width: 1024px) {
  文章标题 H1: 28px
  置顶文章: 2 列
  相关文章: 2 列
  侧边距: 24px
}

/* 桌面 */
@media (min-width: 1025px) {
  文章标题 H1: 32px
  置顶文章: 3 列
  相关文章: 3 列
  正文最大宽度: 720px
  侧边距: auto
}
```

---

## 七、加载/空/错误状态

### 7.1 加载状态（Skeleton）
```
文章列表加载：
├── 封面图区域 → 灰色渐变动画矩形 (16:10)
├── 标题 → 灰色条 (宽 80%, 高 20px)
├── 摘要 → 灰色条 (宽 60%, 高 14px)
└── 底部 → 灰色条 (宽 30%, 高 12px)

文章正文加载：
├── 标题 → 灰色条 (宽 90%, 高 28px)
├── 正文段落 × 3 → 灰色条 (宽 100%, 高 16px × 4行)
└── 图片 → 灰色矩形 (16:10)

动画：shimmer 从左到右渐变
```

### 7.2 空状态
```
图标：📝（灰色，48px）
文字："还没有文章，点击 'AI 生成' 快速创建 SEO 优化文章"
英文："No articles yet. Click 'AI Generate' to create SEO-optimized articles"
按钮：[✏️ 开始生成]
```

### 7.3 错误状态
```
图标：⚠️（红色，48px）
文字："加载失败，请稍后重试"
英文："Failed to load. Please try again."
按钮：[🔄 重试]
```

### 7.4 Toast 通知
```css
.toast {
  position: fixed;
  bottom: 80px; /* 避开底部导航 */
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-bg-dark);
  color: white;
  padding: 12px 20px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-family: var(--font-ui);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  animation: slideUp 0.3s ease, fadeOut 0.3s ease 2.5s forwards;
}
```

用于：已复制！/ 文章已保存 / 发布成功 / 等操作反馈

---

## 八、图片规范

### 8.1 封面图
- 宽高比：16:10（或 1.6:1）
- 推荐尺寸：1200 × 750px
- 格式：WebP（优先）或 JPEG
- 质量：80%
- 最大文件：500KB

### 8.2 文内插图
- 最大宽度：720px（正文容器宽度）
- 推荐尺寸：1440 × 900px（2x 清晰度）
- 格式：WebP
- 加载：lazy loading（`loading="lazy"`）

### 8.3 缩略图（后台列表）
- 尺寸：80 × 80px
- 圆角：4px
- 裁切方式：cover 居中

---

## 九、动画与过渡

```css
:root {
  --transition-fast: 0.15s ease;
  --transition-normal: 0.2s ease;
  --transition-slow: 0.3s ease;
}

/* 卡片悬停 */
.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card-hover);
  transition: var(--transition-normal);
}

/* 按钮悬停 */
button:hover { transition: var(--transition-fast); }

/* 页面切换 */
.page-transition { transition: opacity var(--transition-slow); }

/* 骨架屏闪烁 */
@keyframes shimmer {
  0% { background-position: -200px 0; }
  100% { background-position: 200px 0; }
}

/* Toast 弹出 */
@keyframes slideUp {
  from { transform: translateX(-50%) translateY(20px); opacity: 0; }
  to { transform: translateX(-50%) translateY(0); opacity: 1; }
}
```

---

## 十、可访问性 Accessibility

- 所有图片必须有 `alt` 属性（中英双语）
- 最小可点击区域：44 × 44px
- 文字与背景色对比度 ≥ 4.5:1（WCAG AA）
- 分享按钮有 `aria-label`
- 键盘导航支持（Tab 切换）
- `prefers-reduced-motion` 时禁用动画
- `<html lang="zh-CN">` 或 `<html lang="en-AU">` 根据语言切换

---

## 十一、Tailwind CSS 自定义配置

```javascript
// tailwind.config.js 扩展
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        ui: ['Inter', 'Noto Sans SC', 'sans-serif'],
        article: ['Source Serif 4', 'Noto Serif SC', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        gold: {
          DEFAULT: '#C5975B',
          light: '#D4AE7A',
          lighter: '#F0E4D0',
          dark: '#A67B3D',
        },
        cream: '#FDF8F0',
        warm: '#FAF5ED',
      },
      fontSize: {
        'article-h1': ['32px', { lineHeight: '1.3', fontWeight: '700' }],
        'article-h2': ['24px', { lineHeight: '1.4', fontWeight: '600' }],
        'article-h3': ['20px', { lineHeight: '1.4', fontWeight: '600' }],
        'article-body': ['17px', { lineHeight: '1.8', letterSpacing: '0.02em' }],
        'article-caption': ['13px', { lineHeight: '1.5' }],
        'article-source': ['12px', { lineHeight: '1.5' }],
      },
      maxWidth: {
        'article': '720px',
        'page': '1200px',
      },
      borderRadius: {
        'card': '8px',
        'pill': '9999px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        'gold': '0 2px 8px rgba(197,151,91,0.25)',
      },
    },
  },
}
```

---

## 十二、设计自检清单

在开发前确认以下所有项目已覆盖：

### 字体
- [ ] Google Fonts 已加载（Inter, Noto Sans SC, Source Serif 4, Noto Serif SC, JetBrains Mono）
- [ ] UI 用 --font-ui，文章用 --font-article，代码用 --font-mono
- [ ] 所有字号层级已定义（H1/H2/H3/Body/Caption/Source/Tag/Meta）
- [ ] 中文正文不使用斜体（`font-style: normal`）
- [ ] 英文引用使用斜体
- [ ] 文章正文两端对齐（`text-align: justify`）

### 色彩
- [ ] 品牌金色用于 CTA、进度条、分类 pill 活跃态、引用左边框
- [ ] 奶油色背景（`--color-bg-cream`）用于整体页面
- [ ] 白色背景用于文章正文区
- [ ] Badge 颜色对应正确（绿=已发布/SEO/双语，橙=置顶，灰=草稿，蓝=定时）
- [ ] 文字对比度 ≥ 4.5:1

### 布局
- [ ] 文章正文最大宽度 720px
- [ ] 页面最大宽度 1200px
- [ ] 置顶文章桌面 3 列、平板 2 列、手机 1 列
- [ ] 分享按钮 40×40px 可点击区域
- [ ] 底部导航预留空间

### 状态
- [ ] 加载态：骨架屏 shimmer 动画
- [ ] 空状态：图标 + 文字 + 操作按钮
- [ ] 错误态：图标 + 文字 + 重试按钮
- [ ] Toast：底部弹出，3 秒后消失

### 响应式
- [ ] 手机：字号缩小、单列、侧边距 16px
- [ ] 平板：2 列置顶、侧边距 24px
- [ ] 桌面：3 列置顶、正文 720px 居中

### 图片
- [ ] 封面图 16:10 比例
- [ ] WebP 格式优先
- [ ] lazy loading
- [ ] alt 属性中英双语

### 可访问性
- [ ] html lang 属性随语言切换
- [ ] 所有交互元素有 aria-label
- [ ] 键盘可导航
- [ ] reduced-motion 支持
