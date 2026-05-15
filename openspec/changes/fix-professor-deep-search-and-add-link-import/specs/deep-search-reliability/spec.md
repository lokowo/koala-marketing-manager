## deep-search-reliability

### Requirements
1. AI 深度搜索在 Vercel 生产环境上不超时（maxDuration 设置 60s）
2. Claude API 调用失败时，用户看到真实错误信息而非"未找到"
3. URL 导入在 Vercel 生产环境上不超时
4. 搜索 "Xianghai An" 能通过 AI 深搜返回正确教授信息

### Acceptance Criteria
- [ ] `auto-search` route 设置 `maxDuration = 60`
- [ ] `import-from-url` route 设置 `maxDuration = 60`
- [ ] Claude 调用失败时 API 返回 error 字段（非空 candidates）
- [ ] 前端显示 API 返回的 error 信息
- [ ] 在 Vercel production 上端到端验证通过
