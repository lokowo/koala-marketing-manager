## 1. 验证现有 API

- [x] 1.1 确认 `/api/invite-poster` 在 dev 环境返回有效 PNG（curl 测试）
- [x] 1.2 确认 `SharePoster.tsx` 在 main 分支已使用 fetch 方案（无 html2canvas 引用）

## 2. 修复前端保存逻辑

- [x] 2.1 Review `SharePoster.tsx` handleSave：确保 mobile fallback 链完整（download → window.open → 长按提示）
- [x] 2.2 验证 imgLoaded 状态正确控制"保存海报"按钮的 disabled 状态

## 3. 清理废弃路由

- [x] 3.1 删除 `app/api/og/invite/` 目录
- [x] 3.2 确认无其他文件引用 `/api/og/invite`

## 4. 构建验证

- [x] 4.1 `npm run build` 通过无错误
- [x] 4.2 本地 dev 测试：打开海报弹窗 → 图片加载 → 点击保存 → 下载成功
