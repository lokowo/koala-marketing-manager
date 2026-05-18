## Context

`app/dashboard/koala/layout.tsx` 第 70-95 行定义了侧边栏 nav 数组。知识库页面在 `/dashboard/koala/knowledge-base`，但 nav 中没有对应入口。现有 `scripts/seed-knowledge-base.ts` 使用 Claude 生成内容再 embedding（运行慢、依赖 Claude API），用户需要一个纯静态版本 `.mjs`。

## Goals / Non-Goals

**Goals:**
- Admin 侧边栏显示知识库入口
- 提供可直接运行的静态 seed 脚本

**Non-Goals:**
- 不修改知识库页面本身
- 不替换现有 `seed-knowledge-base.ts`（两个脚本共存）

## Decisions

1. 菜单位置：放在"数据分析"和"系统设置"之间，图标用 📚
2. seed 脚本用 `.mjs` 格式（可直接 `node scripts/seed-knowledge-base.mjs` 运行，不需 tsx）
3. 使用 `dotenv` 加载 `.env.local`，复用 OpenAI 和 Supabase 环境变量
