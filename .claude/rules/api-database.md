---
paths:
  - "app/api/**"
  - "lib/supabase/**"
  - "supabase/migrations/**"
---

# API / 数据库文件修改规则

修改任何 API 或数据库相关文件时：

1. 查询 users 数据必须使用 service_role key（或确认 RLS 对 admin 开放）
2. 新增数据库列/表 → 必须同时更新：API route + 前端组件 + RLS 策略
3. 涉及 professors 表 → 强制 country IN ('Australia', 'AU', 'AUS') 约束
4. 涉及佣金计算 → 必须使用 `lib/sales/get-commission-rate.ts`，根据 agent.tier 动态取 rate
5. 分母可能为 0 的计算 → 返回 null 而非 0，前端显示 "—"
6. 所有写操作必须记录 audit log
