# 订阅权限系统审计报告

> 审计日期：2026-05-26

## 第一部分：所有非免费用户数据库状态

| 邮箱 | plan_type | sub_tier | sub_status | user_role | 实际tier |
|------|-----------|----------|------------|-----------|---------|
| renehee@hotmail.com | elite | — | — | super_admin | elite ✅ |
| yangxianzeng2021@gmail.com | elite | — | — | super_admin | elite ✅ |
| 1987079011@qq.com | elite | — | — | admin | elite ✅ |
| yangxianzeng@suiguangsydeny.top | starter | starter | active | — | starter ✅ |
| jun.he@assainvest.com | free | — | — | sales (active) | pro ✅ |
| winnie452075233@gmail.com | free | — | — | sales (active) | pro ✅ |
| fcc46695@163.com | free | — | — | sales (active) | pro ✅ |
| test@koalaphd.com | elite | — | — | — | elite ✅ |
| suiguang777@gmail.com | null | — | — | — | free |
| byebyepuppy21@gmail.com | null | — | — | — | free |

## 第二部分：Tier 判断完整链路

```
前端 chat/page.tsx:1009
  → body = { mode, sessionId, messages, userId: user?.id }

route.ts:263-270 — 解析 trackingUserId
  → 优先 getServerUser() (cookie auth)
  → fallback body.userId

route.ts:286-308 — 限流检查
  → if (trackingUserId) → checkUsage(usageDb, trackingUserId, 'chat')
  → if (!trackingUserId) → 匿名限流器 (10次/天/IP)

usageTracker.ts:155-182 — checkUsage
  → getUserTier(supabase, userId)
    → getPrivilegedRole(supabase, userId)
      → SELECT role FROM user_roles WHERE user_id=?
      → super_admin/admin → return role
      → sales + is_active → return 'sales'
      → 其他/错误 → return null
    → super_admin/admin → return 'elite'
    → sales → return 'pro'
    → 否则 SELECT plan_type FROM user_profiles WHERE id=?
    → plan_type ∈ {starter, pro, elite} → return it
    → 否则 → return 'free'
  → TIER_LIMITS[tier][action]
  → limit === -1 → allowed: true
  → 否则比较已用量
```

## 第三部分：TIER_LIMITS 完整配置 vs 定价页承诺

| Action | Free | Starter ($19.9) | Pro ($49) | Elite ($99) |
|--------|------|-----------------|-----------|-------------|
| chat | 10/天 | ∞ | ∞ | ∞ |
| voice | 5/天 | ∞ | ∞ | ∞ |
| match | 3/天 | 10/天 | 10/天 | ∞ |
| email | 1/月 | 5/月 | 15/月 | ∞ |
| cv | 1/总 | 3/总 | ∞ | ∞ |
| research_proposal | 1/总 | 3/总 | ∞ | ∞ |
| recommendation_letter | 1/总 | 3/总 | ∞ | ∞ |

与定价页对比：无不一致。定价页承诺的功能全部在代码中正确实现。

## 第四部分：Stripe Webhook → Tier 写入链路

**写入路径（webhook）：**
- `handleNewSubscription` → 写 `subscriptions.tier` + `user_profiles.plan_type` + `user_usage_tracking.subscription_tier`
- `handleSubscriptionUpdated` → 写相同三处，非 active 状态降级为 `'free'`
- `handleSubscriptionDeleted` → 写 `plan_type = 'free'`

**读取路径（getUserTier）：**
- 读 `user_roles.role` → 读 `user_profiles.plan_type`

匹配度：Webhook 写到 `user_profiles.plan_type`，`getUserTier` 读 `user_profiles.plan_type` → 一致 ✅

## 第五部分：昨天改动影响分析

对 usageTracker.ts 的修改：
1. 移除了 `checkUsage` 中独立的 `getPrivilegedRole` 短路 — 现在只走 `getUserTier` → 内部调用 `getPrivilegedRole`。无影响，因为 `getUserTier` 对 super_admin 返回 'elite'，elite 所有 limit 都是 -1。
2. `getPrivilegedRole` 错误处理简化为 `if (error || !roleRow) return null` — 无日志。如果查询出错，静默 fall through 到 `plan_type` 检查。对 super_admin（plan_type=elite）无影响，但对只有 role 没有 plan_type 的 sales 用户，如果 role 查询临时失败会降级为 free。

## 第六部分：逐用户模拟验证

| 用户 | getPrivilegedRole | getUserTier | checkUsage('chat') | 符合预期 |
|------|-------------------|-------------|-------------------|---------|
| yangxianzeng2021@gmail.com | super_admin | elite | limit=-1, allowed=true | ✅ |
| renehee@hotmail.com | super_admin | elite | limit=-1, allowed=true | ✅ |
| 1987079011@qq.com | admin | elite | limit=-1, allowed=true | ✅ |
| yangxianzeng@suiguangsydeny.top | null | starter (plan_type) | limit=-1, allowed=true | ✅ |
| jun.he@assainvest.com | sales (active) | pro | limit=-1, allowed=true | ✅ |
| winnie452075233@gmail.com | sales (active) | pro | limit=-1, allowed=true | ✅ |
| fcc46695@163.com | sales (active) | pro | limit=-1, allowed=true | ✅ |
| test@koalaphd.com | null | elite (plan_type) | limit=-1, allowed=true | ✅ |

所有付费/特权用户的 tier 判断逻辑正确，代码路径无问题。

## 根因确认

yangxianzeng2021@gmail.com 被限流的唯一可能是 `trackingUserId` 解析为 null：

1. `getServerUser()` 返回 null（cookie 过期/未传递）
2. 前端之前没发送 `body.userId`
3. `trackingUserId` = null → 走匿名限流器 → 10次/天/IP 后被封

已修复：前端现在发送 `userId: user?.id`，后端 fallback 到 `body.userId`。

## 补充修复

1. `getPrivilegedRole` 记录查询错误，便于排查 sales 用户临时降级
2. 注册时 `plan_type` 默认设为 `'free'`，避免 null 歧义
