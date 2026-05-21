# Koala PhD Design System
# 考拉博士 · 设计规范 v1.0

> 所有 Koala PhD 页面和组件必须遵循此规范。
> Claude Code 在创建/修改任何 UI 之前，先读此文件。

---

## 1. Brand Identity 品牌定位

**产品**: Koala PhD — AI 驱动的学术匹配平台，帮助中国学生找到澳洲 PhD 导师
**受众**: 20-30 岁中国留学生（主要），澳洲大学教授（次要）
**语言**: 中文为主界面语言，英文为辅（教授信息、学术内容）
**调性**: 专业可信 + 年轻亲和 + 科技感。不是冰冷的学术系统，也不是花哨的消费 app。
**一句话**: "像一个懂学术的朋友，帮你对接最合适的导师"

### 品牌关键词
- 专业但不刻板
- 智能但不炫技
- 温暖但不幼稚
- 高效但不冰冷

### 吉祥物
考拉（Koala）— 澳洲标志，传递友好、可靠的感觉。可用于空状态、loading、成就徽章等。

---

## 2. Color 色彩

基于 OKLCh 色彩空间，确保感知均匀性。Tailwind 映射写在括号里。

### 主色板（Light Mode — 前台用户页面）

```css
:root {
  /* 背景层级 */
  --bg:              oklch(99% 0.002 240);      /* 页面背景 · bg-slate-50 */
  --surface:         oklch(100% 0 0);            /* 卡片/容器 · bg-white */
  --surface-raised:  oklch(98% 0.004 240);       /* 悬浮卡片 · bg-gray-50 */

  /* 文字层级 */
  --fg:              oklch(18% 0.012 250);       /* 主文字 · text-gray-900 */
  --fg-secondary:    oklch(40% 0.012 250);       /* 副文字 · text-gray-600 */
  --muted:           oklch(54% 0.012 250);       /* 辅助文字 · text-gray-500 */
  --placeholder:     oklch(68% 0.008 250);       /* 占位符 · text-gray-400 */

  /* 品牌主色 — 学术蓝 */
  --accent:          oklch(58% 0.18 255);        /* 主按钮/链接 · blue-600 */
  --accent-hover:    oklch(50% 0.18 255);        /* 主按钮悬浮 · blue-700 */
  --accent-subtle:   oklch(95% 0.04 255);        /* 浅蓝背景 · blue-50 */
  --accent-muted:    oklch(88% 0.06 255);        /* 标签背景 · blue-100 */

  /* 边框 */
  --border:          oklch(92% 0.005 250);       /* 默认边框 · border-gray-200 */
  --border-hover:    oklch(85% 0.008 250);       /* 悬浮边框 · border-gray-300 */

  /* 语义色 */
  --success:         oklch(62% 0.17 145);        /* 成功/积分获得 · green-500 */
  --success-bg:      oklch(95% 0.04 145);        /* 成功背景 */
  --warning:         oklch(75% 0.15 75);         /* 警告 · amber-400 */
  --warning-bg:      oklch(95% 0.04 75);         /* 警告背景 */
  --error:           oklch(58% 0.22 25);         /* 错误/积分消耗 · red-500 */
  --error-bg:        oklch(95% 0.04 25);         /* 错误背景 */

  /* 特殊 */
  --elite-bg:        oklch(16% 0.02 260);        /* 旗舰/高级卡片深色背景 */
  --elite-surface:   oklch(22% 0.02 260);
  --elite-fg:        oklch(95% 0.005 250);       /* 深色卡片上的文字 */
  --elite-muted:     oklch(60% 0.01 250);
  --elite-border:    oklch(30% 0.02 260);

  /* 阴影 */
  --shadow-sm:       0 1px 2px rgba(50,50,93,0.08);
  --shadow-md:       0 4px 12px rgba(50,50,93,0.10), 0 1px 3px rgba(0,0,0,0.06);
  --shadow-lg:       0 8px 24px rgba(50,50,93,0.12), 0 2px 8px rgba(0,0,0,0.08);
}
```

### 管理后台色板（Light Mode — Admin 专用）
继承主色板，以下覆盖：
```css
:root[data-theme="admin"] {
  --bg:              oklch(97% 0.003 240);       /* 稍深的背景区分前后台 */
  --accent:          oklch(52% 0.16 255);        /* 稍深的蓝，更沉稳 */
}
```

### 色彩使用规则
- **不要**在浅色背景上使用浅色文字
- **不要**同时用超过 2 种语义色
- 积分增加用 `--success`（绿），积分消耗用 `--error`（红）
- 高级/付费功能用 `--elite-*` 深色系
- AI 功能区域可用 `--accent-subtle` 背景区分

---

## 3. Typography 字体

### 字体栈
```css
:root {
  --font-display: -apple-system, BlinkMacSystemFont, 'SF Pro Display',
                  'PingFang SC', 'Noto Sans SC', system-ui, sans-serif;
  --font-body:    -apple-system, BlinkMacSystemFont, 'SF Pro Text',
                  'PingFang SC', 'Noto Sans SC', system-ui, sans-serif;
  --font-mono:    'SF Mono', 'JetBrains Mono', 'Fira Code',
                  ui-monospace, Menlo, monospace;
}
```

**关键**: 中文字体必须在 fallback 链里（PingFang SC → Noto Sans SC）。不用额外加载 Google Fonts,系统字体够用且性能最好。

### 字号体系（Tailwind 映射）

| 用途 | 大小 | 行高 | 字重 | Tailwind |
|------|------|------|------|----------|
| 页面大标题 | clamp(28px, 4.5vw, 44px) | 1.1 | 300 | text-3xl~5xl font-light |
| 区块标题 | clamp(22px, 3vw, 30px) | 1.2 | 300 | text-2xl~3xl font-light |
| 卡片标题 | 18-20px | 1.3 | 500 | text-lg~xl font-medium |
| 正文 | 15-16px | 1.6 | 400 | text-base |
| 辅助文字 | 13-14px | 1.5 | 400 | text-sm |
| 标签/徽章 | 11-12px | 1.4 | 500 | text-xs font-medium |
| 代码/数据 | 13px | 1.5 | 400 | text-sm font-mono |

### 字体使用规则
- 大标题用 `font-light`（300）而不是 `font-bold` — 这是 Koala PhD 的视觉标识
- 正文永远 400
- 中文不要用斜体（渲染难看）
- `letter-spacing: -0.02em` 用于大标题
- 中文标题后跟英文副标题时，英文用 `--muted` 色

---

## 4. Spacing 间距

### 基础单位: 4px

| Token | 值 | 用途 |
|-------|-----|------|
| xs | 4px | 图标与文字间距 |
| sm | 8px | 紧凑元素间距 |
| md | 12px | 表单元素内间距 |
| base | 16px | 卡片内间距、列表项间距 |
| lg | 24px | 区块内间距 |
| xl | 32px | 区块间距 |
| 2xl | 48px | 主要 section 间距 |
| 3xl | 64-80px | 页面顶部/底部留白 |

### 响应式间距
使用 `clamp()` 而不是断点跳变:
```css
padding: clamp(16px, 4vw, 32px);           /* 容器水平内间距 */
padding-top: clamp(48px, 8vw, 80px);       /* 页面头部留白 */
gap: clamp(16px, 3vw, 24px);               /* 网格间距 */
```

### 最大宽度
```css
--max-w:       1200px;     /* 内容区最大宽度 */
--max-w-text:  680px;      /* 纯文本阅读区（博客正文） */
--max-w-form:  480px;      /* 表单/登录框 */
```

---

## 5. Layout 布局

### 页面结构
```
Nav (56px 高, sticky, 毛玻璃背景)
  ↓
Hero / 页面头部 (居中, max-w 内)
  ↓
Content sections (max-w 内, 各 section 间 48-80px)
  ↓
Footer (简洁, 一行)
```

### Nav 导航
- 高度: 56px
- 背景: `rgba(255,255,255,0.82)` + `backdrop-filter: blur(16px) saturate(1.6)`
- 底部: 1px `--border`
- 左: Logo + 品牌名（竖排: Koala PhD / 考拉博士）
- 右: 导航链接 + CTA 按钮
- 移动端: 隐藏链接,显示汉堡菜单

### 卡片
- 背景: `--surface`
- 边框: 1px `--border`
- 圆角: 8-12px
- 阴影: `--shadow-sm` (默认), `--shadow-md` (悬浮)
- 内间距: 24px
- 悬浮状态: `border-color: --border-hover` + `shadow-md`

### 网格
- 定价卡: 3-4 列 (桌面), 1 列 (移动)
- 功能列表: 2-3 列 (桌面), 1 列 (移动)
- AI 工具卡片: 2-3 列网格
- 教授列表: 单列卡片流

---

## 6. Components 组件规范

### 按钮

| 类型 | 样式 | 用途 |
|------|------|------|
| Primary | bg: --accent, text: white, radius: 6px | 主要操作(购买/提交) |
| Secondary | bg: transparent, border: --border, text: --fg | 次要操作(取消/返回) |
| Ghost | bg: transparent, text: --accent | 文字链接式按钮 |
| Danger | bg: --error, text: white | 危险操作(删除) |
| Elite | bg: --elite-bg, text: white | 高级功能 CTA |

按钮尺寸:
- sm: padding 7px 14px, font-size 13px
- md: padding 10px 20px, font-size 14px
- lg: padding 12px 24px, font-size 16px

过渡: `transition: all 0.15s ease`

### 输入框
- 高度: 40px (md), 36px (sm)
- 边框: 1px `--border`, focus 时 `--accent`
- 圆角: 6px
- 内间距: 0 12px
- focus ring: `box-shadow: 0 0 0 3px var(--accent-subtle)`
- placeholder: `--placeholder` 色

### 标签/徽章
- 背景: `--accent-subtle` 或语义色背景
- 文字: 对应的深色
- 圆角: 4px
- padding: 2px 8px
- font-size: 11-12px, font-weight: 500

### 对话/AI 气泡
- 用户消息: 靠右, `--accent` 背景, 白色文字
- AI 回复: 靠左, `--surface-raised` 背景, `--fg` 文字
- 圆角: 12px (对话气泡特有)

### Toast/通知
- 位置: 右上角, 距顶 16px
- 背景: `--surface`, 阴影: `--shadow-lg`
- 左侧 3px 色条表示类型（success/warning/error）
- 自动消失: 4 秒

---

## 7. Motion 动效

### 原则
- **有意义**: 只在帮助理解的地方加动效（页面切换、数据加载、操作反馈）
- **快速**: 大部分 150-300ms,不超过 500ms
- **不晃眼**: 不用弹跳、旋转等夸张效果

### 时间曲线
```css
--ease-out:    cubic-bezier(0.16, 1, 0.3, 1);    /* 元素进入 */
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);   /* 状态切换 */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* 按钮点击反馈（少用） */
```

### 常用动效
- 页面内容加载: fade-in + translateY(8px), 200ms
- 卡片悬浮: shadow + translateY(-2px), 150ms
- 按钮点击: scale(0.98), 100ms
- 抽屉/弹窗: translateX/translateY, 250ms
- Skeleton loading: shimmer 动画, 1.5s infinite

---

## 8. Voice & Tone 语气

### UI 文案规范
- **按钮**: 动词开头，2-4 个字（"开始匹配" / "生成套磁信" / "查看详情"）
- **空状态**: 友好引导，不是冷冰冰的"暂无数据"。例: "还没有匹配记录，试试 AI 选校吧 🐨"
- **错误提示**: 说清楚怎么解决，不只是说出了什么错。例: "网络连接失败，请检查网络后重试" 而不是 "Error 500"
- **加载状态**: 有趣但不过分。例: "正在搜索教授..." / "AI 正在分析你的背景..."
- **积分提示**: 消耗前告知成本。例: "本次匹配将消耗 2 积分（当前余额: 48）"

### 中英混排规则
- 中文与英文/数字之间加半角空格: "共 24,494 位教授"
- 专有名词保留英文: "Group of Eight"、"PhD"、"IELTS"
- 大学名用英文: "University of Melbourne" 而不是 "墨尔本大学"（教授信息场景）
- UI 标签中文优先,括号里可加英文: "套磁信 (Cover Letter)"

---

## 9. Anti-Patterns 禁止事项

### 绝对不要
- ❌ 紫色渐变白色背景（AI 生成标配，太 generic）
- ❌ Inter / Roboto 作为唯一字体（没有中文 fallback）
- ❌ 满屏 bold 文字（Koala PhD 用 light 标题）
- ❌ 圆角超过 16px（不是消费 app）
- ❌ 彩色 emoji 作为功能图标（用 SVG 线条图标）
- ❌ 深色模式下用纯白文字（用 oklch 95% 柔白）
- ❌ 无限嵌套阴影（一层 shadow 够了）
- ❌ 卡片里套卡片（扁平化，一层容器足够）
- ❌ 过度动效（学术平台不是游戏）
- ❌ 使用 Lucide/Heroicons 以外的图标库（保持一致性）

### 特别注意
- ⚠️ 中文排版: 不要用 text-justify（中文会出现奇怪间距）
- ⚠️ 移动端: 按钮最小高度 44px（触摸友好）
- ⚠️ 微信内浏览器: 不依赖 `<a download>`（微信里无效）
- ⚠️ iOS Safari: 注意 100vh 问题，用 `dvh` 或 JS 计算

---

## 10. 已确认设计模式

以下模式已在实际页面中验证通过，后续开发必须遵守。

### 产品分组规则
- **订阅产品** (`sub_*`): 蓝色 badge (`bg-blue-50 text-blue-600` / `dark:bg-blue-900/30 dark:text-blue-400`)
- **积分包** (`credit_*`): 紫色 badge (`bg-purple-50 text-purple-600` / `dark:bg-purple-900/30 dark:text-purple-400`)
- 分组之间用 section header 分隔（badge + 横线）

### 三 Tier 颜色映射
| Tier | 浅色模式 | 深色模式 | 圆点色 |
|------|---------|---------|--------|
| Standard | `#6b7280` (gray-500) | `#9ca3af` (gray-400) | `bg-gray-400` |
| Senior | `#d97706` (amber-600) | `#fbbf24` (amber-400) | `bg-amber-500` |
| Partner | `#9333ea` (purple-600) | `#c084fc` (purple-400) | `bg-purple-500` |

### 浅深模式 CSS Variable 用法
页面通过 CSS custom properties 实现浅深模式切换，不硬编码 hex：
```css
.tier-page {
  --text-primary: #111827;      /* 深色切换为 #f3f4f6 */
  --text-secondary: #6b7280;    /* 深色切换为 #9ca3af */
  --text-tertiary: #9ca3af;     /* 深色切换为 #6b7280 */
  --card-bg: #ffffff;           /* 深色切换为 #1f2937 */
  --card-border: #e5e7eb;       /* 深色切换为 #374151 */
  --surface-raised: #f9fafb;    /* 深色切换为 #111827 */
}
```
通过 `@media (prefers-color-scheme: dark)` 和 `.dark` 类双重覆盖。

### 数字输入
所有数字输入字段必须使用 `NumberInput` 组件（或等效逻辑），特性：
- 禁止 leading zeros（`007` → `7`）
- `inputMode="decimal"` 触发数字键盘
- 空值显示空字符串而非 `"0"`

### Metric Card 规范
顶部概览用统一 Metric Card 组件：
- 布局: `grid grid-cols-2 lg:grid-cols-4 gap-4`
- 背景: `var(--surface-raised)` (浅色 `#f9fafb` / 深色 `#111827`)
- 圆角: 8px, 内间距: 16px
- 标签: 13px `var(--text-secondary)` + ℹ️ tooltip（使用 `MetricLabel` 组件）
- 数值: 24px `font-medium` `var(--text-primary)` `tabular-nums`
- 分母为 0 时显示 "—" 或 "N/A"，禁止显示 0 或 0%

### 表格行规范
管理后台数据表格统一样式：
- 表头: 12px `uppercase` `tracking-[0.5px]` `var(--text-tertiary)` `font-medium`
- 行分隔: `1px solid var(--card-border)`
- hover 高亮: `background: var(--surface-raised)` (CSS hover)
- 销售列: 28px 头像圆 (字母 initial + 确定性 hash 颜色) + display_name (14px `font-medium`) + tier 标签 (11px `font-medium` 对应 tier 色)
- 佣金/金额列: 16px `font-medium` `tabular-nums` 绿色 (`var(--commission-green)`: 浅色 `#16a34a` / 深色 `#4ade80`)
- 状态列: 彩色 badge (11px `font-medium` `px-2.5 py-0.5 rounded`), 浅色/深色各一套配色
- Checkbox 列: `accent-blue-600 w-3.5 h-3.5`
- 数字对齐: `tabular-nums text-right`
- 日期: `text-xs tabular-nums whitespace-nowrap`

### Drill-down 展开面板规范
点击表格行展开详情：
- 背景: `var(--card-bg)`, 上下 `1px solid var(--card-border)` 边框
- 内间距: `px-6 py-5`
- 三列 grid: `grid-cols-1 md:grid-cols-3 gap-6`
  - 左列: 实体信息 (名称/邮箱/付款账户等)
  - 中列: 交易详情 (金额/产品/Stripe ID/佣金计算)
  - 右列: 时间线 (圆点 + 竖线，active 蓝色 / inactive 灰色)
- Section header: 11px `uppercase tracking-[0.5px] font-medium var(--text-tertiary)`
- Detail row: label `text-xs var(--text-tertiary)` / value `text-sm var(--text-primary)`, `justify-between`
- 每个关键字段旁 Copy 图标 (`IconCopy size={12}`), 点击复制 + Toast 反馈
- 销售名可点击弹出完整付款资料弹窗
- 弹窗: `max-w-sm`, `var(--card-bg)` 背景, avatar + 基本信息 + 付款资料列表

---

## 11. File Reference 文件参考

本设计系统配合以下文件使用:

```
docs/design-system/
├── DESIGN.md              ← 本文件（设计规范）
├── SKILL-web-page.md      ← Web 页面生成技能（Claude Code 用）
└── SKILL-component.md     ← 组件生成技能（Claude Code 用）
```

### 在 Claude Code 中使用

在项目根目录 `CLAUDE.md` 或 `.claude/settings.json` 中添加:

```
设计规范: 所有 UI 修改前先读 docs/design-system/DESIGN.md
```

这样 Claude Code 每次做 UI 工作时会自动参考此规范。
