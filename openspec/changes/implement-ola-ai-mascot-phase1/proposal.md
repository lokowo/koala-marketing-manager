## Why

Koala PhD 需要一个有辨识度的 AI 形象来替代当前抽象的 SVG 考拉头像。引入 Ola（小欧）——一只戴博士帽的考拉吉祥物（类似 Duolingo 的 Duo），拥有 8 种表情状态，覆盖 AI 对话头像、Loading、空状态、浮动入口等全站 AI 触点，提升品牌识别度和用户情感连接。参考设计文件 `ola-8-expressions-complete.html` 已有 SVG 参考（但该文件目前不存在于项目中，需用户提供或从 prompt 描述生成）。

## What Changes

- **新增 Ola 形象资产生成脚本**：`scripts/generate-ola-images.mjs`，使用 gpt-image-1 API 生成 8 种表情 × 2 种尺寸（512px/128px）PNG + SVG + 48px 头像 SVG，共 25 个文件输出到 `public/images/ola/`
- **新增 OlaAvatar 组件**：替代现有 `app/koala/components/KoalaAvatar.tsx` 中的 `KoalaAvatar`，支持 8 种表情状态和 4 种尺寸，sm/md 用 SVG、lg/xl 用 PNG，带 PNG→SVG fallback
- **新增 OlaWidget 浮动按钮组件**：Ola welcome 头像 + 绿色边框环，点击打开 AI 对话面板，替代现有聊天入口（如果存在）
- **新增 OlaLoading 组件**：Ola thinking 表情 + "小欧正在思考..." 文字 + 气泡动画，替代 AI 回复生成中的 loading spinner
- **新增 OlaEmpty 组件**：Ola sleepy 表情 + message + 可选 action 按钮，用于全站空状态/无结果场景
- **替换导航栏**：`app/koala/components/TopNavBar.tsx` 中 "Koala AI" → "Ola AI" + OlaAvatar 头像
- **替换 AI 对话界面**：`app/koala/chat/page.tsx` 中 AI 消息头像 → OlaAvatar，欢迎语更新为 Ola 人设
- **替换空状态**：教授库搜索无结果、收藏为空、博客无文章等场景使用 OlaEmpty
- **新增 404 页面**：`app/not-found.tsx` 使用 OlaEmpty

## Capabilities

### New Capabilities
- `ola-asset-generation`: gpt-image-1 脚本生成 Ola 8 表情 PNG/SVG 资产，输出到 public/images/ola/
- `ola-component-library`: OlaAvatar / OlaWidget / OlaLoading / OlaEmpty 四个组件，支持多状态、多尺寸、深浅色模式
- `ola-site-integration`: 全站 AI 触点替换——导航栏、对话头像、loading、空状态、404、欢迎语

### Modified Capabilities
（无现有 spec 需要修改，本次为纯新增能力）

## Impact

**文件变更（新增）**：
- `scripts/generate-ola-images.mjs` — 资产生成脚本
- `public/images/ola/` — 25 个图片文件（16 PNG + 8 SVG + 1 avatar SVG）
- `app/koala/components/ola/OlaAvatar.tsx`
- `app/koala/components/ola/OlaWidget.tsx`
- `app/koala/components/ola/OlaLoading.tsx`
- `app/koala/components/ola/OlaEmpty.tsx`
- `app/not-found.tsx`

**文件变更（修改）**：
- `app/koala/components/KoalaAvatar.tsx` — KoalaAvatar 保留但标记 deprecated，新代码使用 OlaAvatar
- `app/koala/components/TopNavBar.tsx` — "Koala AI" → "Ola AI" + 头像
- `app/koala/chat/page.tsx` — AI 消息头像替换 + 欢迎语更新
- `app/koala/professors/ProfessorsClient.tsx` — 搜索空状态使用 OlaEmpty
- `app/koala/matches/page.tsx` — 收藏/申请信空状态使用 OlaEmpty
- `app/koala/blog/page.tsx` — 无文章空状态使用 OlaEmpty

**依赖**：
- OpenAI API（gpt-image-1）— 仅脚本使用，不引入新的运行时依赖
- 无新 npm 包依赖

**风险**：
- gpt-image-1 生成的图片风格一致性需人工审核
- 全站替换涉及 ~8 个文件，需逐一验证深浅色模式
