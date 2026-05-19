# fix-blog-ai-generation-500 — 诊断报告（合并 Blog + Stripe 500）

## Bug A: Blog AI 生成 500 — Upstash Redis 限流器 fail-closed

### Vercel 日志
```
12:34:01 POST /api/blog/generate 500 warning [Upstash Redis] The redis t...
12:34:04 POST /api/blog/generate 500 error   [blog/generate] Error [Upst...
```

### 根因
`app/lib/ratelimit.ts:7-9` — `aiLimiter` 不为 null（`UPSTASH_REDIS_REST_URL` 存在），但 `.limit()` 在 Redis token 失效时抛异常。`if (aiLimiter)` null-check 无法拦截 → 冒泡到 catch-all → 500。

**影响范围：20+ 路由**全用同样的 `if (limiter) { await limiter.limit(key) }` 模式。

### 修复
在 `ratelimit.ts` 中新增 `safeLimit()` wrapper — Redis 失败时 warn + 放行。所有路由统一替换。

---

## Bug B: Stripe Checkout 500 — Stripe SDK 错误（独立于 Redis）

### Vercel 日志
```
23:40:47 POST /api/stripe/checkout 500 error [stripe/checkout] Error: No...
（连续 6 条）
```

### 根因
checkout 路由**不使用 rate limiter**。`Error: No...` 来自 Stripe SDK，大概率是 `No such price`（test/live 模式不匹配）或 `No API key provided`（env var 缺失）。

### 修复
catch 块增加 Stripe 错误分类，返回有意义的错误信息。

---

## 附加修复

### C: Blog generate 路由缺少 maxDuration
`vercel.json` 中未配置 blog generate 相关路由的 `maxDuration`。Claude Sonnet + 3x Haiku 可能需要 30-60 秒。

### D: generate-cover response_format 缺失
`generate-cover/route.ts:116-123` — gpt-image-2/gpt-image-1 未设 `response_format: 'b64_json'`，代码却读 `b64_json` 字段，导致永远 fallback 到 dall-e-3。

## 涉及文件
- `app/lib/ratelimit.ts` — 新增 safeLimit
- 20 个 API route 文件 — 替换 limiter 调用模式
- `app/api/stripe/checkout/route.ts` — 详细错误信息
- `vercel.json` — maxDuration
- `app/api/blog/generate-cover/route.ts` — response_format
