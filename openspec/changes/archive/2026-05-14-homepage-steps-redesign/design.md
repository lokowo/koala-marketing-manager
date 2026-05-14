## 设计方案

### 卡片布局
- 容器：`flex flex-col lg:flex-row items-stretch gap-4 lg:gap-0`
- 每张卡片 `lg:flex-1` + `flex flex-col` 确保等高
- 卡片间箭头：desktop 用竖向虚线+大箭头图标，mobile 隐藏

### 统一卡片内容结构

```
┌──────────────────────────────┐
│ [48x48 图标]  STEP 0X        │  ← 图标+标签行
│                              │
│ 标题（text-lg font-bold）     │
│ 描述文字（text-xs 2-3行）     │
│                              │
│ ✅ 功能亮点 1                 │  ← 2个功能亮点
│ ✅ 功能亮点 2                 │
│                              │
│ ─────────────────────────── │  ← 分割线
│ ⏱ 底部信息                   │
└──────────────────────────────┘
```

### 三张卡片配色

| 卡片 | 主色 | 图标背景 | 卡片背景 |
|------|------|----------|----------|
| Step 01 聊背景 | #D4A843 金色 | `bg-[#D4A843]/15` | 深色渐变 `from-[#1A1A2E] to-[#2D2D4A]` |
| Step 02 AI匹配 | #4ECDC4 Teal | `bg-[#4ECDC4]/15 dark:bg-[#4ECDC4]/20` | 白色 / `dark:bg-[#0F1419]` |
| Step 03 写申请信 | #F59E0B 琥珀 | `bg-amber-100 dark:bg-amber-900/20` | 白色 / `dark:bg-[#0F1419]` |

### 第一张卡片装饰

- 右上装饰圆：`absolute -top-10 -right-10 w-32 h-32 bg-[#D4A843]/10 rounded-full`
- 左下装饰圆：`absolute -bottom-8 -left-8 w-24 h-24 bg-[#4ECDC4]/10 rounded-full`
- 右下考拉水印：`absolute right-4 bottom-4 text-[64px] opacity-[0.06]` 🐨

### Hover 效果

所有卡片：
- `group relative overflow-hidden`
- `hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300`
- 顶部渐变条：`absolute top-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity`
  - Step 01: `bg-gradient-to-r from-[#D4A843] to-[#c9a96e]`
  - Step 02: `bg-gradient-to-r from-[#4ECDC4] to-[#38b2ac]`
  - Step 03: `bg-gradient-to-r from-[#F59E0B] to-[#D4A843]`

### 箭头连接

Desktop 箭头区域（卡片之间 `w-12 shrink-0`）：
- 上下虚线段：`w-px h-4 border-l border-dashed border-gray-300 dark:border-[#D4A843]/30`
- 中间箭头：`ArrowRight` lucide 图标 `size-6 text-gray-400 dark:text-[#D4A843]/50`

### 点击行为

- 聊背景 → `/koala/chat?mode=path`
- AI匹配 → `/koala/discover`
- 写申请信 → `/koala/chat?mode=write`
- 未登录用户先弹登录框，登录后跳转（现有 `handleStepClick` 逻辑保留）

### 功能亮点数据

| 卡片 | 亮点1 | 亮点2 |
|------|-------|-------|
| 聊背景 | ✅ 覆盖 8 所 Go8 大学 | ✅ 中英文双语支持 |
| AI匹配 | ✅ {profCount} 导师库 | ✅ 实时招生状态 |
| 写申请信 | ✅ 个性化定制内容 | ✅ 支持批量生成 |

### 底部信息

| 卡片 | 底部文字 |
|------|----------|
| 聊背景 | ⏱ 约 2 分钟 |
| AI匹配 | ⚡ 30 秒出结果 |
| 写申请信 | 📧 ¥1/封起 |
