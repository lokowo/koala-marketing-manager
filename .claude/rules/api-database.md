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

## 强制自测 (每次改动必须执行)

1. 改了 API route → 必须 curl 测试该 endpoint,
   验证返回 200 + 正确数据, 贴出 curl 命令和响应
2. 改了 page.tsx → 必须验证文件路径匹配预期 URL:
   ls app/dashboard/koala/kpi-targets/page.tsx 存在
   = /dashboard/koala/kpi-targets 可访问
3. 改了 DB schema → 必须 SELECT 验证数据正确
4. 改了表单 input → 必须描述测试用例:
   输入空值→? 输入0→? 输入正常值→? 输入边界值→?
5. 所有测试结果必须贴在完成报告里, 不能只说"build通过"

不执行自测的交付视为未完成。
