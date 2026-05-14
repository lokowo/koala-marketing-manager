## Context

项目已集成 `@upstash/ratelimit` + `@upstash/redis`，在 `app/lib/ratelimit.ts` 中定义了两个限流器（surveySubmitLimiter、aiLimiter），但只有 4 个 API route 实际接入。约 12 个花钱或防刷的 API 端点裸奔。

## Goals / Non-Goals

**Goals:**
- 所有调用外部付费 API（Claude、OpenAI、Whisper）的端点都有限流
- 注册、忘记密码、发验证码等防刷端点有限流
- 限流触发时返回一致的 429 + 中文提示
- 无 Upstash 配置时 graceful fallback

**Non-Goals:**
- 不做按用户付费等级的差异化限流
- 不做 IP 封禁或黑名单
- 不修改前端 429 处理逻辑（已有）
- 不做 admin 端点的限流（已有 auth 保护，且 admin 需要批量操作自由度）

## Decisions

### 1. 限流器分类：两类即可

新增 `authLimiter`（3次/分钟/IP），复用现有 `aiLimiter`（10次/分钟）。

不按 API 细分更多限流器——复杂度不值得。admin 端点的 AI 调用也走 aiLimiter，因为 admin 身份已经过 auth 校验，限流只防误操作/脚本刷。

### 2. 限流标识符策略

- 认证端点（register/forgot-password/send-verification）：用 IP，因为此时用户未登录
- AI 端点（已登录）：用 user.id，因为 IP 可能共享（公司/学校网络）
- Admin AI 端点：用 user.id

### 3. 统一的限流检查模式

每个路由加入相同的 ~5 行代码片段，不抽象成 middleware 或 wrapper：
```typescript
if (aiLimiter) {
  const { success } = await aiLimiter.limit(identifier);
  if (!success) return Response.json({ error: '操作太频繁，请稍后再试' }, { status: 429 });
}
```

理由：Next.js App Router 没有 per-route middleware，抽象成 HOF 反而增加理解成本。直接内联最清晰。

## Risks / Trade-offs

- **[风险] admin 批量操作可能触发限流** → 10次/分钟对 admin 足够宽松，如果未来需要批量操作可单独调高
- **[风险] IP 共享导致误限** → 只对未认证端点用 IP，认证端点用 user.id
- **[权衡] 不做 middleware 抽象** → 代码重复 ~5 行 x 12 处，但每处都清晰可见，比隐式 middleware 更好调试
