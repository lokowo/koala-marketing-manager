## Why

知识库管理页面 (`/dashboard/koala/knowledge-base`) 已创建但未在 Admin 侧边栏导航中注册，Admin 无法通过菜单进入。同时需要一个静态 seed 脚本提供初始知识数据。

## What Changes

- 在 Admin 侧边栏导航中添加"知识库"菜单入口（位于"数据分析"下方、"系统设置"上方）
- 创建 `scripts/seed-knowledge-base.mjs` 静态 seed 脚本，包含 19 条预设知识条目（8 条 Go8 大学 + 5 条申请流程 + 3 条套磁信 + 3 条平台使用），自动生成 embedding 后存入 `knowledge_chunks` 表

## Capabilities

### New Capabilities
（无新 capability，属于现有功能的配置修复和数据填充）

### Modified Capabilities

## Impact

- **修改文件**: `app/dashboard/koala/layout.tsx` — nav 数组添加一项
- **新增文件**: `scripts/seed-knowledge-base.mjs` — 静态 seed 脚本
- **依赖**: OpenAI embedding API（脚本运行时调用）
