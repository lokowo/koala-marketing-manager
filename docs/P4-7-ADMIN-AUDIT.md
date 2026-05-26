# P4-7 管理表 RLS + Admin UI 审计报告
> 审计日期: 2026-05-25

---

## 第一部分：RLS 策略审计

### 认证架构概览
- **middleware.ts**: 所有 `/dashboard` 路由要求登录（未登录→重定向 `/login`）
- **koala/layout.tsx**: 客户端 role 检查（sales 角色→重定向 `/dashboard/sales`）
- **sales/layout.tsx**: 客户端 role 检查（非 sales/admin/super_admin→阻止访问）
- **API 层**: 各 route 独立用 `getServerUser()` 或 service_role 鉴权

### A. RLS 未启用的表（15张）

| 表名 | 用途 | 风险等级 | 建议 |
|------|------|---------|------|
| `admin_message_threads` | 管理员消息线程 | 🔴 高 | 启用 RLS + admin 读写策略 |
| `admin_messages` | 管理员消息内容 | 🔴 高 | 启用 RLS + admin 读写策略 |
| `brand_settings` | 品牌配置（颜色/logo） | 🟡 中 | 启用 RLS + public read / admin write |
| `handoff_requests` | 转人工请求记录 | 🟡 中 | 启用 RLS + user insert / admin read |
| `ola_conversation_events` | Ola 对话事件追踪 | 🟡 中 | 启用 RLS + service_role write |
| `ola_email_logs` | Ola 邮件发送日志 | 🟡 中 | 启用 RLS + admin read |
| `ola_email_templates` | Ola 邮件模板 | 🟢 低 | 启用 RLS + admin read/write |
| `ola_faq` | FAQ 知识库 | 🟢 低 | 启用 RLS + public read / admin write |
| `ola_milestones` | Ola 里程碑配置 | 🟢 低 | 启用 RLS + admin read/write |
| `ola_sessions` | Ola 会话记录 | 🟡 中 | 启用 RLS + user own / admin read |
| `ola_trigger_logs` | Ola 触发器日志 | 🟢 低 | 启用 RLS + admin read |
| `ola_triggers` | Ola 触发器配置 | 🟢 低 | 启用 RLS + admin read/write |
| `system_settings` | 系统全局设置 | 🟡 中 | 启用 RLS + admin read/write |
| `universities` | 大学白名单 | 🟢 低 | 启用 RLS + public read / admin write |
| `university_deadlines` | 大学申请截止日期 | 🟢 低 | 启用 RLS + public read / admin write |

**说明**: RLS 未启用意味着 anon key 可直连读写这些表（绕过 API）。实际风险取决于是否有人知道 Supabase URL + anon key（前端公开的）。

### B. RLS 已启用但无策略的表（18张）

这些表 RLS 已开启，但没有任何 policy，效果是 **完全阻塞**（只有 service_role 能访问）。如果有前端直连需求则需补策略。

| 表名 | 用途 | 是否需要前端直连 |
|------|------|----------------|
| `admin_user_notes` | 管理员对用户的备注 | 否（API 走 service_role） |
| `admin_work_logs` | 管理员工作日志 | 否（API 走 service_role） |
| `automation_logs` | 自动化执行日志 | 否 |
| `automation_rules` | 自动化规则配置 | 否 |
| `blog_images` | 博客封面图 | 可能（上传/读取） |
| `blog_in_article_images` | 博客文内图 | 可能（上传/读取） |
| `email_verifications` | 邮箱验证记录 | 否 |
| `feedback` | 通用反馈 | 否（API 走 service_role） |
| `followup_reminders` | 跟进提醒 | 否 |
| `knowledge_chunks` | RAG 知识块 | 否（rpc 函数访问） |
| `pipeline_runs` | 数据管线运行记录 | 否 |
| `publishing_items` | 发布队列 | 否 |
| `sales_customers` | 销售客户关系 | 否（API 走 service_role） |
| `sales_qrcodes` | 推广二维码 | 否（API 走 service_role） |
| `sales_weekly_reports` | 销售周报 | 否 |
| `saved_professors` | 用户收藏教授 | **是** — 需要 user own 策略 |
| `sensitive_words` | 敏感词库 | 否 |
| `user_roles` | 用户角色映射 | 否（API 走 service_role） |

**需要补策略的**: `saved_professors`（用户需要直接读写自己的收藏）、`blog_images` / `blog_in_article_images`（如果有前端直接上传/展示需求）。

### C. 有策略但可能不完整的表

| 表名 | 现有策略 | 潜在问题 |
|------|---------|---------|
| `blog_posts` | `blog_posts_public_read` | 只有 public read，admin 写入靠 service_role — OK |
| `professors` | `professors_public_read` | 只有 public read，admin 管理靠 service_role — OK |
| `content_cards` | `content_cards_public_read` | 同上 — OK |

---

## 第二部分：Admin UI 页面审计

### 认证保护层级
1. ✅ **middleware.ts** — 未登录用户全部拦截（服务端）
2. ⚠️ **layout.tsx** — 角色检查（客户端 fetch `/api/admin/me`）
3. ❌ **page.tsx** — 绝大多数页面无自身权限检查，依赖上层

**结论**: 认证（是否登录）由 middleware 保障；授权（角色权限）由 layout 客户端检查，存在短暂的未授权页面闪现问题，但功能上可用。API 端点各自有 auth 检查，数据安全有保障。

### Admin 后台页面清单（57 页面）

#### 核心总览
| 页面 | 路径 | 说明 | 问题 |
|------|------|------|------|
| 主仪表盘 | `/dashboard/koala` | KPI 总览、销售排行、趋势 | API 错误静默处理 |
| Admin 总览 | `admin-overview/` | 超管运营面板、团队统计 | API 错误静默处理 |
| 数据分析 | `analytics/` | 用户增长、AI 使用统计 | `.catch(() => {})` 静默吞错 |
| 增长分析 | `growth/` | 用户增长趋势 | 静默 API 错误 |
| 收入分析 | `revenue/` | 收入和订阅统计 | Promise.all 无错误处理 |

#### 博客管理
| 页面 | 路径 | 说明 | 问题 |
|------|------|------|------|
| 博客列表 | `blog/` | CMS 管理、搜索、筛选、状态 | 发布/删除无二次确认 |
| 草稿 | `blog/drafts/` | 重定向到 `blog?tab=draft` | 无（重定向页） |
| 已发布 | `blog/published/` | 重定向到 `blog?tab=published` | 无 |
| 定时发布 | `blog/scheduled/` | 重定向到 `blog?tab=scheduled` | 无 |
| 编辑器 | `blog/edit/` | 博客编辑 | — |

#### AI 内容
| 页面 | 路径 | 说明 | 问题 |
|------|------|------|------|
| AI 文章生成 | `ai-content/` | 单篇 AI 生成表单 | 硬编码 12s/22s 步进计时器 |
| 批量生成 | `ai-content/batch/` | 批量 AI 生成 | — |
| 知识库 | `ai-content/knowledge/` | 知识库管理 | — |

#### 教授管理
| 页面 | 路径 | 说明 | 问题 |
|------|------|------|------|
| 教授列表 | `professors/` | 搜索/筛选/分页 | 硬编码大学列表 |
| 教授详情 | `professors/[id]/` | 单个教授编辑 | — |
| 贡献管理 | `professors/contributed/` | 用户贡献的教授 | — |
| 数据质量 | `professors/quality/` | 数据质量审查 | — |
| ⚠️ 已验证 | `professors/verified/` | **空占位页** | 仅显示标题，无功能 |
| ⚠️ 数据采集 | `professors/sync/` | **空占位页** | 仅显示标题，无功能 |

#### 销售管理
| 页面 | 路径 | 说明 | 问题 |
|------|------|------|------|
| 销售总览 | `sales-overview/` | 销售 KPI 排行 | 静默 API 错误 |
| 销售人员 | `sales-agents/` | 团队管理 | tier 变更无二次确认 |
| 佣金审核 | `commission-review/` | 佣金审批和发放 | — |
| 佣金配置 | `commission-rates/` | 重定向到 `tier-management` | 无（重定向页） |
| 层级管理 | `tier-management/` | 销售等级配置 | — |
| 销售漏斗 | `sales-funnel/` | 管线可视化 | — |
| 审计日志 | `sales-audit/` | 销售审计追踪 | — |

#### KPI 和目标
| 页面 | 路径 | 说明 | 问题 |
|------|------|------|------|
| KPI 面板 | `kpi/` | KPI 追踪 | 静默 API 错误 |
| KPI 设置 | `kpi-settings/` | KPI 配置 | — |
| KPI 目标 | `kpi-targets/` | KPI 目标值 | — |

#### 问卷系统
| 页面 | 路径 | 说明 | 问题 |
|------|------|------|------|
| 问卷列表 | `surveys/` | 问卷管理 | 客户端 role 检查不充分 |
| 创建问卷 | `surveys/create/` | 新建问卷 | — |
| 编辑问卷 | `surveys/edit/` | 编辑问卷 | — |
| 问卷统计 | `surveys/analytics/` | 问卷分析 | — |
| 回复列表 | `surveys/responses/` | 问卷回复 | — |
| 分享设置 | `surveys/[id]/share/` | 问卷分享链接 | — |

#### 用户管理
| 页面 | 路径 | 说明 | 问题 |
|------|------|------|------|
| 用户列表 | `users/` | 用户管理和角色分配 | ✅ 唯一有服务端 role 检查的页面 |
| 用户详情 | `users/[id]/` | 用户详情 | — |
| 角色管理 | `roles/` | 角色申请审批 | 拒绝操作无二次确认 |
| Leads | `leads/` | **假数据** — 硬编码 '0' 值 | 永远显示空数据 |

#### 运营工具
| 页面 | 路径 | 说明 | 问题 |
|------|------|------|------|
| ⚠️ 反馈面板 | `feedback/` | **假数据** — 硬编码 0% | 从不获取真实数据 |
| 反馈飞轮 | `feedback-flywheel/` | 反馈循环分析 | — |
| FAQ 管理 | `faq/` | FAQ 内容管理 | — |
| 知识库 | `knowledge-base/` | 知识库管理 | — |
| Ola 分析 | `ola-analytics/` | Ola 对话分析 | — |
| Ola 触发器 | `ola-triggers/` | Ola 自动触发管理 | — |
| Handoff | `handoff/` | 转人工请求管理 | — |
| 通知系统 | `notifications/` | 站内通知和工单 | — |
| Banner | `banners/` | 横幅管理 | — |
| 营销工具 | `marketing-tools/` | 营销工具箱 | — |
| Topics | `topics/` | 研究主题管理 | `.catch(() => {})` 静默吞错 |
| Pipeline | `pipeline/` | 数据管线监控 | — |
| 发布队列 | `publishing/` | 多平台发布追踪 | POST 无错误处理 |
| 基金管理 | `grants/` | 基金数据 | — |
| 设置 | `settings/` | 品牌设置 | super_admin 检查仅客户端 |
| 操作记录 | `my-logs/` | 个人操作日志 | — |
| 工作日志 | `work-logs/` | 团队工作日志 | — |
| 日志详情 | `work-logs/[userId]/` | 个人日志详情 | — |

### Sales 后台页面清单（16 页面）

| 页面 | 路径 | 说明 | 问题 |
|------|------|------|------|
| 仪表盘 | `/dashboard/sales` | 销售 KPI、佣金、趋势 | 403 静默处理，无提示 |
| 推广中心 | `promo-center/` | 海报编辑器、物料 | — |
| 推广工具 | `promo-tools/` | 重定向到 `promo-center` | 无（重定向页） |
| 问卷管理 | `surveys/` | 销售问卷 | — |
| 问卷创建 | `surveys/create/` | 新建问卷 | — |
| 问卷编辑 | `surveys/[id]/edit/` | 编辑 | — |
| 问卷回复 | `surveys/[id]/responses/` | 查看回复 | — |
| 问卷客户 | `surveys/[id]/clients/` | 客户列表 | — |
| 问卷分享 | `surveys/[id]/share/` | 分享链接 | — |
| 我的客户 | `referral-users/` | 推荐用户列表 | — |
| 客户详情 | `customer/[id]/` | 客户详情和管线 | timeline API 无错误处理 |
| 渠道分析 | `channel-analytics/` | 渠道数据 | — |
| 我的 KPI | `my-kpi/` | 个人 KPI | — |
| 佣金明细 | `my-commissions/` | 个人佣金历史 | 403 toast 提示但无分页 |
| 操作记录 | `my-logs/` | 个人操作日志 | `.catch(() => {})` 静默吞错 |
| 个人设置 | `settings/` | 个人信息 | — |

---

## 第三部分：问题汇总

### 🔴 需要修复（安全相关）

1. **15 张表 RLS 未启用** — anon key 可直连读写，需逐一启用 RLS + 添加策略
2. **`saved_professors` 无策略** — RLS 已开但无 policy，用户无法直连操作收藏功能（如果前端有直连需求）

### 🟡 应该修复（用户体验）

3. **`feedback/page.tsx` 假数据** — 硬编码 0% 统计，从不获取真实数据
4. **`leads/page.tsx` 假数据** — 硬编码 '0' 值，fetch 结果未使用
5. **2 个空占位页** — `professors/verified/` 和 `professors/sync/` 仅显示标题
6. **~20 页面静默吞错** — `.catch(() => {})` 模式，用户看不到任何错误提示
7. **破坏性操作无二次确认** — 博客删除、tier 变更、角色拒绝等

### 🟢 建议改进（代码质量）

8. **统一错误处理模式** — 创建 `useAdminFetch` hook 统一 loading/error/toast
9. **教授列表硬编码大学** — 应从 `universities` 表动态加载
10. **AI 生成硬编码计时器** — 12s/22s 步进应改为轮询 API 状态

---

## 第四部分：RLS 修复优先级排序

### 批次 1（高优先 — 涉及用户数据或消息）
```sql
-- admin_message_threads + admin_messages
ALTER TABLE admin_message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;
-- 策略: admin/super_admin 可读写

-- handoff_requests
ALTER TABLE handoff_requests ENABLE ROW LEVEL SECURITY;
-- 策略: authenticated insert own / admin read all

-- ola_sessions
ALTER TABLE ola_sessions ENABLE ROW LEVEL SECURITY;
-- 策略: user read own / service_role write
```

### 批次 2（中优先 — 系统配置和日志）
```sql
-- system_settings, brand_settings
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_settings ENABLE ROW LEVEL SECURITY;
-- 策略: public read / super_admin write

-- ola_conversation_events, ola_email_logs
ALTER TABLE ola_conversation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ola_email_logs ENABLE ROW LEVEL SECURITY;
-- 策略: admin read / service_role write
```

### 批次 3（低优先 — 配置表和参考数据）
```sql
-- ola_faq, ola_email_templates, ola_milestones, ola_triggers, ola_trigger_logs
-- universities, university_deadlines
-- 策略: public read / admin write
```

### saved_professors 补策略
```sql
CREATE POLICY "Users manage own saved professors" ON saved_professors
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```
