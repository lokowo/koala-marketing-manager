## 1. SharePoster 组件重写保存逻辑

- [x] 1.1 新增 `generatedImageUrl` state（`string | null`，默认 null）
- [x] 1.2 重写 `handleSave`：html2canvas 成功后，桌面端走 `<a download>` 下载；移动端走 `setGeneratedImageUrl(dataUrl)`
- [x] 1.3 桌面端下载失败 fallback：catch 后也走 `setGeneratedImageUrl`
- [x] 1.4 html2canvas 失败时显示 toast「截图失败，请手动截屏或复制链接」，不设置 generatedImageUrl

## 2. Modal UI 状态切换

- [x] 2.1 当 `generatedImageUrl` 非空时，替换海报 DOM 为 `<img src={generatedImageUrl}>` + 「长按图片保存到相册」提示
- [x] 2.2 在图片显示模式下增加「重新生成」按钮，点击重置 `generatedImageUrl` 为 null
- [x] 2.3 Modal `onClose` 时重置 `generatedImageUrl` 为 null

## 3. 验证

- [x] 3.1 `npm run build` 编译通过
