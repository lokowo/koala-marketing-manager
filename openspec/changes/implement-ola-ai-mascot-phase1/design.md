## Context

Koala PhD 当前使用一个内联 SVG 组件 `KoalaAvatar`（`app/koala/components/KoalaAvatar.tsx`）作为 AI 头像，是一个简单的灰色考拉脸。该组件在 `chat/page.tsx` 中用于 AI 消息头像和 loading 状态。导航栏（TopNavBar）中 "Koala AI" 是纯文字+图标。空状态使用 emoji 图标（matches/page.tsx 中的 `EmptyState` 组件）。

目标是引入 Ola（小欧）形象——一只戴绿色博士帽的卡通考拉，拥有 8 种表情状态，全面替换现有 AI 视觉元素。

**约束**：
- 不新增 npm 依赖
- 资产生成脚本使用已有的 OPENAI_API_KEY
- 组件放在 `app/koala/components/ola/` 下，遵循项目现有结构
- 必须支持深色/浅色模式

## Goals / Non-Goals

**Goals:**
- 生成 Ola 8 种表情的 PNG（512px + 128px）和 SVG 资产
- 创建可复用的 Ola 组件库（OlaAvatar, OlaWidget, OlaLoading, OlaEmpty）
- 替换全站 AI 触点：对话头像、loading、导航栏、空状态
- 新增 404 页面
- 保持所有现有功能不变

**Non-Goals:**
- 不替换 `UserAvatar` 组件（用户头像保持不变）
- 不改变 AI 对话逻辑或 API
- 不修改后台 /dashboard 的任何 UI
- 不做 Ola 动画系统（仅 CSS 简单动画）
- 不做 Ola 的语音/音效

## Decisions

### 1. 组件位置：`app/koala/components/ola/`

**选择**：在现有 `app/koala/components/` 下创建 `ola/` 子目录
**替代方案**：放在项目根 `components/` 或 `src/components/`——但项目实际使用的是 `app/koala/components/`，遵循现有结构。
**理由**：Ola 组件只用于前台 `/koala/*` 页面，不用于后台 dashboard。

### 2. 图片资产策略：SVG + PNG 双轨

**选择**：
- sm (32px) / md (48px) → 使用 SVG（矢量清晰，体积小）
- lg (128px) / xl (512px) → 使用 gpt-image-1 生成的 PNG（表现力强）
- PNG 加载失败时 fallback 到 SVG

**替代方案**：全部用 SVG 或全部用 PNG
**理由**：SVG 在小尺寸下锐利且加载快；PNG 在大尺寸下表现力更好，gpt-image-1 可以生成比手工 SVG 更丰富的细节。双轨兼顾性能和视觉质量。

### 3. OlaAvatar 替换策略：渐进替换 KoalaAvatar

**选择**：保留 `KoalaAvatar` 组件不删除，但将 `chat/page.tsx` 中的 `KoalaAvatar` import 改为 `OlaAvatar`
**替代方案**：直接修改 KoalaAvatar 组件内部实现
**理由**：KoalaAvatar 是一个简单的 inline SVG，OlaAvatar 是基于图片文件的组件，架构完全不同。保留旧组件可作为 fallback，后续再统一清理。

### 4. OlaWidget 浮动按钮：不创建

**选择**：暂不创建 OlaWidget 浮动按钮组件
**理由**：当前项目中不存在浮动聊天按钮。底部导航栏（BottomTabBar）已有 "Koala AI" / chat 入口，桌面端顶部导航也有入口。新增浮动按钮会与已有导航重复。改为在 BottomTabBar 的 chat 图标位置替换为 Ola 头像即可。

**修正**：根据用户需求，仍然创建 OlaWidget 组件。但将其定位为可选组件，不自动挂载到全局 layout，而是按需导入。

### 5. 空状态替换：OlaEmpty 替换局部 EmptyState

**选择**：在 `matches/page.tsx` 中将 EmptyState 函数替换为 OlaEmpty import，在 `ProfessorsClient.tsx` 中替换空搜索结果的 UI
**替代方案**：创建全局 EmptyState wrapper
**理由**：空状态散落在各个页面的局部组件中，逐个替换最安全，不会影响未涉及的页面。

### 6. 资产生成：独立脚本，手动运行

**选择**：`scripts/generate-ola-images.mjs` 使用 Node.js 原生 fetch 调用 OpenAI Images API，输出到 `public/images/ola/`
**替代方案**：用 openai npm 包
**理由**：不引入新依赖。直接用 fetch + `OPENAI_API_KEY` 调用 REST API 即可。脚本生成后图片 commit 到仓库，运行时不需要 API key。

### 7. SVG 来源：从 prompt 描述手工创建

**选择**：由于 `ola-8-expressions-complete.html` 参考文件不存在于项目中，SVG 将按照 prompt 描述中的视觉规格手工创建简化版
**理由**：SVG 仅用于 sm/md 尺寸（32-48px），只需保留核心特征（头、耳朵、眼睛、鼻子、帽子），复杂度类似现有 KoalaAvatar 的 inline SVG 风格。

## Risks / Trade-offs

- **[gpt-image-1 风格一致性]** → 8 个表情的生成图可能风格不统一。缓解：prompt 模板统一描述基础形象，只变化表情部分。生成后需人工审核，不满意可重新生成。
- **[PNG 文件体积]** → 16 个 PNG 文件可能增加仓库体积。缓解：512px PNG 约 200-400KB 每张，128px 约 30-60KB，总计约 4-8MB，在合理范围内。
- **[SVG 与 PNG 视觉差异]** → sm 尺寸用 SVG、lg 尺寸用 PNG，切换时可能有视觉不连贯。缓解：SVG 保持相同配色方案和形状语言。
- **[替换遗漏]** → 全站替换可能遗漏某些页面。缓解：通过 grep 搜索 `KoalaAvatar`、`EmptyState`、emoji 空状态来确保覆盖完整。

## Migration Plan

1. 运行 `scripts/generate-ola-images.mjs` 生成 PNG 资产（需要 OPENAI_API_KEY）
2. 创建 SVG 文件（手工）
3. 创建 4 个 Ola 组件
4. 逐文件替换：chat/page.tsx → TopNavBar → matches/page.tsx → ProfessorsClient.tsx → blog/page.tsx → not-found.tsx
5. 验证深色/浅色模式
6. 验证移动端

**回滚**：将 import 从 OlaAvatar 改回 KoalaAvatar 即可恢复，所有旧组件保留不删。
