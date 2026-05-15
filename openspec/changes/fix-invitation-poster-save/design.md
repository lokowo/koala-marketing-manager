## Context

`SharePoster.tsx` 使用 html2canvas 将海报 DOM 转为 canvas，然后：
- 桌面：`document.createElement('a')` + `link.download` + `link.click()` 触发下载
- 移动：`window.open(blobUrl, '_blank')` 尝试新窗口显示图片，失败则 fallback 到 `<a>.click()`

两种移动端路径在微信/Safari 中均不可靠。

## Goals / Non-Goals

**Goals:**
- 移动端：html2canvas 成功后，在 Modal 内替换海报为生成的图片，提示「长按图片保存到相册」
- 桌面端：保留 `<a download>` 自动下载（这在 Chrome/Firefox/Edge 上可靠）
- html2canvas 失败时：显示明确的 fallback 提示

**Non-Goals:**
- 不改海报视觉设计
- 不换用其他截图库（html2canvas 对当前 DOM 结构足够）
- 不做服务端图片生成

## Decisions

### 1. 移动端用「内嵌图片 + 长按保存」替代「新窗口/下载」

**选择:** html2canvas 成功后，设置 `generatedImageUrl` state，Modal 内条件渲染：显示 `<img src={dataUrl}>` 覆盖原海报 DOM，并附提示文字「长按图片保存到相册」

**理由:** 长按保存是移动端（包括微信内置浏览器）唯一可靠的图片保存方式。不依赖 `window.open`、不依赖 `<a download>`、不触发弹窗拦截。

**替代方案:**
- `navigator.share({ files })` — Web Share API Level 2 支持分享文件，但微信不支持
- `window.open` — 被拦截率太高

### 2. 桌面端保留 `<a download>` + 增加 fallback

**选择:** 桌面端先用 `<a download>` 尝试下载。如果检测到可能失败（比如 `toDataURL` 抛异常），则 fallback 到与移动端相同的「显示图片」模式。

### 3. 新增 `generatedImageUrl` state 管理截图结果

**选择:** 新增 `const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)`。当 `generatedImageUrl` 非空时，Modal 从「海报预览 + 保存按钮」切换为「生成图片 + 长按提示 + 重新生成按钮」。

关闭 Modal 时重置为 null。

## Risks / Trade-offs

- **[权衡] 桌面端用户也会短暂看到 "生成中..." 状态** → 可接受，html2canvas 通常 <1s
- **[风险] data URL 图片可能很大（2x scale PNG）** → 海报内容简单，实测 ~200KB，可接受
- **[权衡] 不做 canvas tainted 问题的根因修复** → QR code 用 data URL 作为 img src 是主因，但改为 canvas 直接绘制 QR 过度复杂。html2canvas `allowTaint: true` 已设置，大部分情况工作正常
