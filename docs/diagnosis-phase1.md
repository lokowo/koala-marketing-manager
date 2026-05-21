# 诊断报告：Admin 后台 users 查询全部返回 0

> 生成时间：2026-05-21 | 状态：诊断完成，待确认修复方案

---

## 一、数据库状态确认（数据是好的）

| 数据源 | 行数 | 状态 |
|---|---|---|
| `auth.users` | 71 | 正常 |
| `user_profiles` | 71 | 正常，`created_at` 全部非 NULL |
| `ai_conversations` (distinct users) | 5 | 正常 |
| `credit_transactions` (distinct users) | 6 | 正常 |
| `subscriptions` (active) | 0 | 预期内（无活跃订阅） |

## 二、受影响的 API Route 清单

| Route | 用户查询方式 | 前端对应 | 问题字段 |
|---|---|---|---|
| `/api/admin/analytics` | `auth.admin.listUsers()` | 数据分析→总用户 | `engagementMetrics.totalUsers` |
| `/api/admin/growth` | `auth.admin.listUsers()` | 用户增长→总用户/30天新增 | `overview.totalUsers` |
| `/api/admin/stats` | `auth.admin.listUsers()` | 数据中心→总用户 | `users.total` |
| `/api/admin/overview` | `auth.admin.listUsers()` | Admin总览→新注册 | `statCards.newRegistrations` |
| `/api/admin/dashboard-overview` | `db.from('user_profiles')` | 首页→总用户 | `kpi.total_users` |

## 三、根因 #1（主因）：`auth.admin.listUsers()` 错误被静默吞掉

**发现**：阅读 `@supabase/auth-js@2.105.1` 源码，`listUsers()` 在 Auth 错误时返回：

```javascript
// node_modules/@supabase/auth-js GoTrueAdminApi.js
catch (error) {
    if (isAuthError(error)) {
        return { data: { users: [] }, error };  // ← 返回空数组 + error
    }
    throw error;
}
```

**关键**：返回的是 `{ data: { users: [] }, error: AuthError }`，不是 `data: null`。`users` 是空数组。

**所有 4 个调用点都忽略了 error 字段**：

| 文件 | 代码 | 问题 |
|---|---|---|
| `analytics/route.ts:28` | `const { data: allUsers } = await listUsers(...)` | 解构时丢弃了 `error` |
| `analytics/route.ts:29` | `if (allUsers?.users) { ... }` | 空数组是 truthy，进入 if，`length = 0` |
| `analytics/route.ts:27-49` | 整段被 `try { } catch { /* ignore */ }` 包裹 | 如果 throw 也被吞掉 |
| `growth/route.ts:26` | `Promise.all([listUsers(...), ...])` | error 被忽略 |
| `growth/route.ts:35` | `allUsersRes.data?.users ?? []` | 得到 `[]`，length = 0 |
| `stats/route.ts:39` | `supabaseAdmin.auth.admin.listUsers()` | 同上 |
| `overview/route.ts:40` | `supabaseAdmin.auth.admin.listUsers()` | 同上 |

**为什么 `listUsers` 会返回错误？** 可能原因：
- GoTrue rate limit（多个 admin API 同时调用 `listUsers`）
- GoTrue 服务端配置变更
- 需检查 Vercel Runtime Logs 中 `[admin/growth GET]` 或 `[admin/stats]` 的 error 输出

## 四、根因 #2（次要）：`user_profiles` RLS 配置异常

| 表 | RLS 启用 | 策略数量 | `forcerowsecurity` |
|---|---|---|---|
| `user_profiles` | `true` | **0** | `false` |
| `ai_conversations` | `true` | 1 | `false` |
| `credit_transactions` | `true` | 1 | `false` |
| `outreach_emails` | `true` | 1 | `false` |
| `subscriptions` | `true` | 1 | `false` |

`user_profiles` 是**唯一一个 RLS 启用但零策略的表**。

- **对 API Route（service_role）的影响**：理论上无影响，service_role 绕过 RLS
- **对其他 RLS 策略的影响**：`sales_agents`、`sales_commissions` 的 RLS 策略内部引用了 `user_profiles` 做权限检查（`EXISTS (SELECT 1 FROM user_profiles WHERE ...)`）。对非 service_role 的客户端查询，这些策略会因无法读取 `user_profiles` 而失败
- **应修复**：添加基础的 RLS 策略（至少让 authenticated 用户读自己的 profile）

## 五、附加 Bug

| # | 文件:行 | 问题 | 严重度 |
|---|---|---|---|
| A | `growth/route.ts:27` | 查询 `user_profiles.last_active_at` — **该列不存在** | 中（此查询结果 `profilesRes.data` 为 null，影响推荐统计） |
| B | `dashboard-overview/route.ts:38` | `.select('user_id', { count: 'exact' })` 只选了 `user_id`，但 line 75 访问 `c.created_at` — 该字段不在结果中 | 低（fallback 到 `now`，趋势图日期不准但不崩溃） |
| C | `dashboard-overview/route.ts:202-211` | catch 块返回全零硬编码，任何处理逻辑 throw 都会导致**所有 KPI 归零** | 高（掩盖真实错误） |
| D | 所有涉及 `付费用户` 的计算 | `subscriptions` 表有 0 条 active 记录 → 付费用户/MRR/ARPU 为 0 是**预期行为**（真的没有付费用户） | 信息 |

## 六、修复建议

### 优先级 P0 — 让 listUsers 正常工作或替换

1. 在每个 `listUsers` 调用后**检查 error 字段**，发现错误时 `console.error` 输出
2. **或者替换**：4 个 Group A 路由都改用 `db.from('user_profiles').select('id, created_at')` 查用户数（跟 `dashboard-overview` 统一），避免依赖 GoTrue Admin API
3. 如果确认 `listUsers` 持续失败，改用 `user_profiles` 是更稳定的方案

### 优先级 P1 — 修复 user_profiles RLS

```sql
CREATE POLICY "users_read_own_profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own_profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);
```

### 优先级 P2 — 修复附加 Bug

- 删除 `growth/route.ts:27` 中的 `last_active_at` 引用
- `dashboard-overview/route.ts:38` 的 select 加上 `created_at`
- 所有 catch 块改为返回 `{ error: "..." }` 而非硬编码零值

## 七、需验证的假设

以上分析是基于代码静态审查。有一个关键假设需要通过 Vercel 日志验证：

> **`auth.admin.listUsers()` 是否真的在返回错误？**

验证方法：检查 Vercel Runtime Logs 中是否有相关报错，或在任一 route 中临时添加：

```typescript
const res = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
if (res.error) console.error('[listUsers ERROR]', res.error);
```
