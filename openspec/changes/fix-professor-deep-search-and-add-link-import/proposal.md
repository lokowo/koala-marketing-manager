## Why

AI 深度搜索在生产环境 100% 失败（Vercel 日志显示 `/api/professors/auto-search` 路由全部报错）。用户搜 "Xianghai An" 点击 AI 深搜后只看到"很抱歉，AI 也未找到该教授的信息"，但该教授在 Google 和大学官网均可搜到。同时，「粘贴链接导入教授」功能的 API 和 UI 虽已存在，但未经过端到端验证。

## What Changes

### A: 修复 AI 深度搜索生产环境错误

代码已存在于 `professorAutoAdd.ts` 的 `searchClaudeCandidates()` — 使用 Claude Haiku + `web_search_20250305` tool。

需要排查的故障点：
- Claude API 调用是否在 Vercel 上超时（Haiku + web_search 可能超过函数默认超时）
- `web_search_20250305` tool 参数格式是否正确（`name` 字段 vs `type` 字段）
- Anthropic SDK 版本兼容性
- Rate limit / API key 配置是否在生产环境正确加载
- 错误被 catch 吞掉后返回空数组，前端显示"未找到"而非真实错误

修复后验证：搜索 "Xianghai An" → AI 深搜返回该教授信息

### B: 验证并修复粘贴链接导入功能

API (`/api/professors/import-from-url`) 和 UI 已实现，需要：
- 端到端测试：粘贴 `https://profiles.sydney.edu.au/xianghai.an` → 成功导入
- 验证去重逻辑：重复粘贴 → 提示已存在
- 验证积分奖励：导入成功后 +10 积分
- 验证域名白名单：非白名单 URL → 拒绝
- 修复可能存在的 bug

## Capabilities

### New Capabilities
_(none — 代码已存在，本次是诊断 + 修复 + 验证)_

### Modified Capabilities
_(none)_

## Impact

- `app/lib/services/professorAutoAdd.ts` — `searchClaudeCandidates()` 可能需要修复 tool 参数、超时设置、错误处理
- `app/api/professors/auto-search/route.ts` — 可能需要增加超时配置（`maxDuration`）、改进错误日志
- `app/api/professors/import-from-url/route.ts` — 端到端验证，可能需要小修
- `app/koala/professors/ProfessorsClient.tsx` — 深搜/导入 UI 的错误展示可能需要改进
- Vercel 函数超时配置 — 深搜可能需要更长的 `maxDuration`

## Acceptance Tests

1. 搜索 "Xianghai An" → AI 深度搜索能找到该教授（不报错）
2. 粘贴 `https://profiles.sydney.edu.au/xianghai.an` → 成功导入教授信息
3. 导入后教授出现在搜索结果中
4. 用户获得 +10 积分奖励
5. 重复粘贴同一链接 → 提示"已存在"
6. 粘贴非白名单链接 → 友好错误提示
