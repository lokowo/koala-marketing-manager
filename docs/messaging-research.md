# 站内信系统调研报告 — Issue #20

## 一、"角色搞反" 诊断

**核心问题：Admin 页面 (`/dashboard/koala/notifications`) 显示的是用户端的工单 UI，而不是管理端的工单管理界面。**

具体表现：

| 功能 | 当前实际 | 应该是 |
|------|---------|--------|
| Tab 2 "对话消息" 调的 API | `/api/user/messages` | `/api/admin/messages` |
| 看到的工单列表 | 只看到自己提交的工单 (`.eq('user_id', user.id)`) | 应看到所有用户提交的工单 |
| "新建工单" 按钮 | 以用户身份创建工单 (`sender_role: 'user'`) | Admin 不需要给自己提工单 |
| 对话中自称 | "我"（用户视角） | 应显示"客服"/"管理员" |
| 缺失的功能 | 无"关闭工单"、无"指派"、无"用户信息" | Admin 需要这些管理能力 |

**根因：`MessagesPanel` 组件直接调 `/api/user/messages`（用户 API），而非 `/api/admin/messages`（管理 API）。整个 Tab 2 就是一个用户端组件放错了地方。**

Tab 1 "系统通知" 也有类似问题：调的是 `/api/user/notifications` 而非 `/api/admin/notifications`，所以 admin 只看到发给自己的通知，看不到全量通知列表。

---

## 二、当前架构总览

```
┌─────────────────────────────────────────────────────────┐
│                        DB 层                             │
├──────────────────┬──────────────────┬───────────────────┤
│ notifications    │ admin_message_   │ admin_messages     │
│ (RLS on, 4 rows) │ threads          │ (RLS OFF, 0 rows) │
│                  │ (RLS OFF, 0 rows)│                   │
├──────────────────┴──────────────────┴───────────────────┤
│                                                         │
│                      API 层                              │
├───────────────────────┬─────────────────────────────────┤
│ User APIs             │ Admin APIs                       │
│                       │                                  │
│ GET/POST              │ GET/POST                         │
│ /api/user/            │ /api/admin/                      │
│   notifications       │   notifications                  │
│ (自己的通知)          │ (全量通知 + 发送/广播)           │
│                       │                                  │
│ GET/POST              │ GET/POST                         │
│ /api/user/messages    │ /api/admin/messages               │
│ (创建工单/回复)       │ (查看所有工单/回复/关闭)         │
├───────────────────────┴─────────────────────────────────┤
│                                                         │
│                     页面层                               │
├─────────────────────────────────────────────────────────┤
│ Admin 端 (唯一的页面)                                    │
│ /dashboard/koala/notifications/page.tsx                  │
│   Tab 1: 系统通知 -> 调 /api/user/notifications  <- BUG │
│   Tab 2: 对话消息 -> 调 /api/user/messages       <- BUG │
│                                                         │
│ User 端: 不存在                                          │
│ /koala 下没有 notification 或 messages 页面              │
├─────────────────────────────────────────────────────────┤
│                     辅助                                 │
│ app/lib/notifications.ts — 发通知工具函数                 │
│ app/lib/server/slack.ts  — 新工单 -> Slack webhook       │
└─────────────────────────────────────────────────────────┘
```

**总结：API 层 admin/user 是分开的且逻辑正确，但唯一的页面调错了 API。用户端完全没有页面。**

---

## 三、涉及的文件清单

### DB 表

| 表名 | RLS | 行数 | 用途 |
|------|-----|------|------|
| `notifications` | ON | 4 | 系统通知（角色变更、周报、广播等） |
| `admin_message_threads` | **OFF** | 0 | 工单/对话线程 |
| `admin_messages` | **OFF** | 0 | 线程内的单条消息 |

`notifications` 表结构：
- `id` (uuid PK), `user_id` (uuid), `title` (text), `content` (text), `type` (text, default 'info'), `link` (text nullable), `is_read` (boolean, default false), `created_at` (timestamptz)

`admin_message_threads` 表结构：
- `id` (uuid PK), `user_id` (uuid), `subject` (text), `status` (text, default 'open'), `assigned_to` (uuid nullable), `last_message_at` (timestamptz), `created_at` (timestamptz)

`admin_messages` 表结构：
- `id` (uuid PK), `thread_id` (uuid), `sender_id` (uuid), `sender_role` (text, default 'user'), `content` (text), `created_at` (timestamptz)

### RLS 策略

- `notifications`: 1 条 — `auth.uid() = user_id`（用户只读自己的，admin 端用 service_role 绕过）
- `admin_message_threads`: **无 RLS，完全裸露**
- `admin_messages`: **无 RLS，完全裸露**

### API 路由

| 路由 | 方法 | 鉴权 | 功能 |
|------|------|------|------|
| `/api/user/notifications` | GET | getServerUser | 获取自己的通知 + 未读数 |
| `/api/user/notifications` | POST | getServerUser | markRead / markAllRead |
| `/api/user/messages` | GET | getServerUser | 获取自己的工单列表 / 单个工单详情 |
| `/api/user/messages` | POST | getServerUser | create（创建工单）/ reply（回复） |
| `/api/admin/notifications` | GET | requireAdmin | 全量通知列表（分页、筛选、搜索） |
| `/api/admin/notifications` | POST | requireAdmin | send（发给某用户）/ broadcast（全员广播） |
| `/api/admin/messages` | GET | getServerUserWithRole | 全量工单列表 / 单个工单+用户信息 |
| `/api/admin/messages` | POST | getServerUserWithRole | reply / create / close |

### 页面

| 路径 | 角色 | 状态 |
|------|------|------|
| `app/dashboard/koala/notifications/page.tsx` | Admin (super_admin only in sidebar) | 存在但调错 API |
| `app/koala/messages/` 或类似路径 | User | **不存在** |

### Lib

| 文件 | 功能 |
|------|------|
| `app/lib/notifications.ts` | notifyUser / notifySuperAdmins / notifyAdmins / notifyRelatedSales / notifyUserAction |
| `app/lib/server/slack.ts` | notifyNewSupportTicket（新工单 -> Slack） |

---

## 四、安全问题

| 问题 | 严重性 | 说明 |
|------|--------|------|
| `admin_message_threads` RLS 关闭 | **严重** | 任何拿到 anon key 的人都能读写所有工单 |
| `admin_messages` RLS 关闭 | **严重** | 同上，所有消息裸露 |
| `notifications` RLS 只有 `auth.uid() = user_id` | 中等 | 用户只看自己的没问题，admin 用 service_role 绕过也行 |

---

## 五、重建方案

### 目标状态

**Admin 端** (`/dashboard/koala/notifications`)：
- Tab 1 系统通知：查看**全量**通知（所有用户的），按类型筛选、搜索、发送通知/广播
- Tab 2 工单管理：查看**所有用户**提交的工单列表，显示用户名/邮箱、状态、分类、最后消息时间；点进去看对话、以管理员身份回复、关闭工单、指派

**User 端** (`/koala/messages` 新页面)：
- 查看自己的通知 + 未读数
- 提交工单（选分类 -> 写描述）
- 查看自己的工单列表 + 对话 + 回复

### 需要改的文件

| 文件 | 改动 | 工作量 |
|------|------|--------|
| `app/dashboard/koala/notifications/page.tsx` | **重写**。Tab 1 改调 `/api/admin/notifications`，加发送/广播 UI。Tab 2 整个替换为管理端工单列表+详情，调 `/api/admin/messages`，加关闭/指派功能 | **大 — 3-4h** |
| 新建 `app/koala/messages/page.tsx` | User 端工单页面。把现有 `MessagesPanel` 搬过来（它本来就是用户视角），加个通知列表 | **中 — 1-2h** |
| `app/api/admin/messages/route.ts` | 小改：加 category 筛选、status 筛选查询参数 | **小 — 30min** |
| `app/api/admin/notifications/route.ts` | 基本够用，可能加 markRead 给 admin 自己用 | **小 — 15min** |
| DB: `admin_message_threads` | 加 `category` 列（当前存在 subject 里，不好筛选）；开启 RLS + 加策略 | **小 — 30min** |
| DB: `admin_messages` | 开启 RLS + 加策略 | **小 — 15min** |
| `app/koala/home/HomeClient.tsx` 或底部导航 | 加消息入口 + 未读红点 | **小 — 30min** |

### 估算总工作量

| 阶段 | 时间 |
|------|------|
| DB 修复（RLS + category 列） | 0.5h |
| Admin 端页面重写 | 3-4h |
| User 端新页面 | 1-2h |
| 入口 + 未读红点 | 0.5h |
| 测试 | 1h |
| **合计** | **6-8h** |

### 建议执行顺序

1. **先修安全漏洞** — 给 `admin_message_threads` 和 `admin_messages` 开启 RLS + 写策略
2. **重写 Admin 端** — `/dashboard/koala/notifications/page.tsx`，Tab 1 调 admin API，Tab 2 做工单管理 UI
3. **新建 User 端** — `/koala/messages/page.tsx`，复用现有 `MessagesPanel` 逻辑
4. **加入口** — 用户端导航加消息图标 + 未读红点

---

*调研日期: 2026-05-21*
