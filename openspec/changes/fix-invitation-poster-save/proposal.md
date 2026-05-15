## Why

邀请海报「保存海报」按钮在多个场景下失败：
1. 移动端（微信/Safari）`window.open()` 被弹窗拦截器阻止，用户无任何反馈
2. iOS Safari 不支持通过 `<a>.click()` 下载 data URL / blob URL
3. html2canvas 对 data URL `<img>` 存在 tainted canvas 风险，`toDataURL()` 可能抛 SecurityError

核心文件：`app/components/SharePoster.tsx`（html2canvas 截图 → 下载/打开新窗口）

## What Changes

- 重写 `SharePoster.tsx` 的 `handleSave` 保存逻辑：
  - html2canvas 截图成功后，不再尝试 `window.open` 或 `<a>.click()`
  - 改为在 Modal 内直接展示生成的图片（`<img src={dataUrl}>`），提示用户长按保存
  - 桌面端保留 `<a download>` 自动触发下载作为主路径
- 增强错误处理：html2canvas 失败时给出明确提示
- 保持海报 UI 设计不变

## Capabilities

### New Capabilities
- `poster-save-flow`: 海报保存流程重写，兼容移动端长按保存和桌面端自动下载

### Modified Capabilities
_无需修改现有 spec。_

## Impact

- **前端**: `app/components/SharePoster.tsx` — 重写保存逻辑和状态管理
- **API**: 无变更（`app/api/share/poster/route.ts` 不受影响）
- **依赖**: 无新依赖（html2canvas + qrcode 保持不变）
