## 1. AI 润色 API

- [x] 1.1 在 `/api/blog/ai-assist/route.ts` 新增 `polish` action：接收 content + style + wordCount + platform，调用 Claude Sonnet 返回润色内容
- [x] 1.2 编写润色 system prompt：根据 style/wordCount/platform 三个维度生成指令，输入截断 5000 字符

## 2. AI 润色前端 UI

- [x] 2.1 在编辑页新增"AI 润色"按钮（放在翻译按钮旁边）
- [x] 2.2 实现润色设置 Modal：风格选择（4选项）、字数选择（5选项）、平台选择（4选项）
- [x] 2.3 实现原文 vs 润色内容的左右对比视图
- [x] 2.4 实现"确认替换"、"重新润色"、"取消"三个操作按钮

## 3. 字数统计与平台提示

- [x] 3.1 实现 `countWords()` 工具函数：中文按字符计、英文按空格分词
- [x] 3.2 在 textarea 底部添加实时字数显示 + 平台适配提示（4 档阈值）

## 4. 封面图文件上传

- [x] 4.1 新增 `POST /api/blog/upload-cover` API：接收 multipart/form-data，校验类型和大小，上传到 Supabase Storage
- [x] 4.2 在封面图区域添加"上传本地图片"按钮，调用上传 API 并更新 cover_image_url

## 5. 验证

- [x] 5.1 `npm run build` 通过，无编译错误
- [ ] 5.2 测试润色功能：选择不同风格/字数/平台，确认返回内容且对比视图正常
- [ ] 5.3 测试字数统计：中文、英文、混合内容字数正确，平台提示随字数变化
- [ ] 5.4 测试封面图上传：正常上传、超大文件拒绝、非图片文件拒绝
