## 1. 限流器定义

- [x] 1.1 在 `app/lib/ratelimit.ts` 新增 `authLimiter`（slidingWindow 3次/1分钟），同样带 graceful null fallback

## 2. Auth 端点接入限流

- [x] 2.1 `app/api/auth/register/route.ts` — import authLimiter，POST 入口处按 IP 限流，触发时返回 429 + "操作太频繁，请稍后再试"
- [x] 2.2 `app/api/auth/forgot-password/route.ts` — 同上
- [x] 2.3 `app/api/auth/send-verification/route.ts` — 同上

## 3. AI/OpenAI 端点接入限流

- [x] 3.1 `app/api/admin/banners/generate-image/route.ts` — import aiLimiter，按 user.id 限流
- [x] 3.2 `app/api/admin/banners/generate-prompt/route.ts` — 同上
- [x] 3.3 `app/api/voice/transcribe/route.ts` — 同上
- [x] 3.4 `app/api/blog/generate/route.ts` — 同上
- [x] 3.5 `app/api/blog/generate-cover/route.ts` — 同上
- [x] 3.6 `app/api/blog/generate-single-image/route.ts` — 同上
- [x] 3.7 `app/api/blog/generate-images/route.ts` — 同上
- [x] 3.8 `app/api/professors/web-search/route.ts` — 同上（GET 方法）
- [x] 3.9 `app/api/professors/auto-search/route.ts` — 同上（GET + POST 方法）

## 4. 验证

- [x] 4.1 `npm run build` 通过，无类型错误
