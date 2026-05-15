# SKILL: Koala PhD Web Page 生成

> Claude Code 在创建或重做任何页面时，读此文件 + DESIGN.md

---

## 触发条件

当 Jay 说以下任何一种时触发:
- "做一个 XX 页面"
- "重做 pricing / 首页 / 博客 / 教授库"
- "参考 Open Design 设计一个页面"
- "把这个 HTML 转成 React 组件"

---

## 执行流程

### Step 1: 读设计规范
```
先读 docs/design-system/DESIGN.md，确认色彩、字体、间距、组件规范。
```

### Step 2: 确认页面类型
根据需求选择结构模板:

| 页面类型 | 结构 | 参考 |
|---------|------|------|
| 营销落地页 | Hero → Features → CTA → Footer | pricing, 首页 |
| 数据列表页 | Filter bar → Card grid → Pagination | 教授库, 博客列表 |
| 详情页 | Breadcrumb → Content → Sidebar → Related | 教授详情, 博客文章 |
| Dashboard | Sidebar → Header → Content grid | Admin 后台 |
| 表单页 | Header → Form card → Help text | 登录, 注册, 设置 |
| AI 工具页 | Input area → Result area → History | 6 个 AI 模式 |

### Step 3: 技术实现

**框架**: Next.js 16 App Router + TypeScript
**样式**: Tailwind CSS（优先用 Tailwind class，复杂动效用 CSS variables）
**组件**: 函数式组件 + Hooks
**图标**: Lucide React（`import { Icon } from 'lucide-react'`）

**文件结构**:
```
app/koala/[page-name]/
├── page.tsx          ← 主页面（server component if possible）
├── components/       ← 页面私有组件
│   ├── HeroSection.tsx
│   ├── PricingCard.tsx
│   └── ...
└── loading.tsx       ← Skeleton loading
```

### Step 4: 响应式

**断点**（Tailwind 默认）:
- `sm`: 640px  — 手机横屏
- `md`: 768px  — 平板
- `lg`: 1024px — 笔记本
- `xl`: 1280px — 桌面

**规则**:
- 移动端优先（base 样式 = 手机）
- 网格: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- 间距: 用 `clamp()` 或 Tailwind responsive prefix
- 导航: 移动端汉堡菜单
- 卡片: 移动端全宽，桌面端网格

### Step 5: 质量检查

生成完成后自查:
- [ ] 色彩是否来自 DESIGN.md 的色板？
- [ ] 标题是否用 font-light (300)？
- [ ] 中文字体 fallback 是否包含 PingFang SC？
- [ ] 卡片是否有 hover 状态？
- [ ] 移动端按钮高度 ≥ 44px？
- [ ] 是否有 loading 骨架屏？
- [ ] 中英混排是否加了空格？
- [ ] 是否避免了 Anti-Patterns 清单里的所有项？

---

## Tailwind 色彩映射速查

把 DESIGN.md 的 CSS variables 转成 Tailwind 时用:

```js
// tailwind.config.ts 扩展（如果需要）
colors: {
  brand: {
    DEFAULT: 'oklch(58% 0.18 255)',      // --accent
    hover:   'oklch(50% 0.18 255)',      // --accent-hover
    subtle:  'oklch(95% 0.04 255)',      // --accent-subtle
    muted:   'oklch(88% 0.06 255)',      // --accent-muted
  },
  elite: {
    bg:      'oklch(16% 0.02 260)',      // --elite-bg
    surface: 'oklch(22% 0.02 260)',      // --elite-surface
    fg:      'oklch(95% 0.005 250)',     // --elite-fg
  }
}
```

或者直接在 class 里用 arbitrary values: `bg-[oklch(58%_0.18_255)]`

---

## 页面模板: 营销页（如 Pricing）

```tsx
export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav: 56px, sticky, 毛玻璃 */}
      <nav className="sticky top-0 z-50 h-14 border-b border-gray-200
                       bg-white/80 backdrop-blur-xl backdrop-saturate-150">
        {/* ... */}
      </nav>

      {/* Hero: 居中, 大标题 font-light */}
      <section className="mx-auto max-w-[1200px] px-[clamp(16px,4vw,32px)]
                          pt-[clamp(48px,8vw,80px)] pb-[clamp(32px,5vw,48px)]
                          text-center">
        <h1 className="font-light text-3xl md:text-4xl lg:text-5xl
                       tracking-tight text-gray-900">
          页面标题
        </h1>
        <p className="mt-4 mx-auto max-w-xl text-gray-500">
          副标题描述
        </p>
      </section>

      {/* Content: 卡片网格 */}
      <section className="mx-auto max-w-[1200px] px-[clamp(16px,4vw,32px)]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3
                        gap-[clamp(16px,3vw,24px)]">
          {/* Cards */}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-20 py-8 text-center text-sm text-gray-400">
        © 2026 Koala PhD 考拉博士
      </footer>
    </div>
  )
}
```
