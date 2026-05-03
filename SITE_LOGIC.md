# SITE_LOGIC.md — Koala PhD 全站功能审计

**生成日期：** 2026-05-04  
**项目路径：** `/Users/jhe/Desktop/koala-marketing-manager`  
**类型：** AI PhD 顾问平台 + 内容管理后台

---

## 采集数据现状

| 指标 | 数量 |
|------|------|
| professors 表总记录 | **1,222** |
| papers 表总记录 | **5,877** |
| 覆盖大学 | ANU, UniMelb, USYD, UNSW, UQ, Monash, UWA, UAdel |
| Monash 错误（网络） | 533 条未写入 |

---

## 一、C端页面清单（app/koala/）

### /koala → 自动跳转
**文件：** `app/koala/page.tsx`  
直接 redirect 到 `/koala/chat`，无交互元素。  
**状态：** ✅ 已实现

---

### /koala/home — 首页
**文件：** `app/koala/home/page.tsx`

| 元素 | 当前行为 | 预期行为 | 状态 |
|------|----------|----------|------|
| Bell 通知图标 | 无点击处理 | 打开通知面板 | ❌ 未实现 |
| 研究方向 Tab（8个） | 跳转 `/koala/professors?category=<val>` | ✅ 同左 | ✅ |
| 教授卡片轮播 | 从 `/api/professors?limit=6` 加载真实数据 | ✅ 同左 | ✅ |
| 教授卡片点击 | 跳转 `/koala/professors/{id}` | ✅ 同左 | ✅ |
| 博客卡片 | 从 `/api/blog?limit=2` 加载（无数据时显示 mock） | 真实数据 | ⚠️ 部分（博客用 mock） |
| "开始匹配" CTA | 跳转 `/koala/chat` | ✅ 同左 | ✅ |
| "免费开始对话" CTA | 跳转 `/koala/chat` | ✅ 同左 | ✅ |

---

### /koala/chat — AI 对话（核心）
**文件：** `app/koala/chat/page.tsx`

| 元素 | 当前行为 | 预期行为 | 状态 |
|------|----------|----------|------|
| 模式 Tab（4个：申请规划/科研助手/自由聊天/写套磁信） | 切换 system prompt 上下文 | ✅ 同左 | ✅ |
| 消息输入 + 发送 | POST `/api/ai/chat` | ✅ 同左 | ✅ |
| 快捷回复按钮 | 填充输入框并发送 | ✅ 同左 | ✅ |
| 反馈按钮（👍🤔👎📝） | POST `/api/ai/feedback` | ✅ 同左 | ✅ |
| 教授匹配卡片 | 显示 AI 返回的匹配教授 | ✅ 同左 | ✅ |
| 引用论文卡片 | 显示 citations | ✅ 同左 | ✅ |
| 设置齿轮图标 | 打开 SettingsPanel（音调/语言/清除/登出） | ✅ 同左 | ✅ |
| 新建对话 "+" | 清空消息历史 | ✅ 同左 | ✅ |
| 文件上传（简历/成绩单） | POST `/api/user/profile/parse` → 解析后显示摘要 | ✅ 同左 | ✅ |

**AI 工具调用：**  
- `searchProfessors(researchArea, university?, limit?)` → 从真实 DB 拉教授数据  
- path/chat/write 模式启用此工具

---

### /koala/professors — 教授列表
**文件：** `app/koala/professors/page.tsx`

| 元素 | 当前行为 | 预期行为 | 状态 |
|------|----------|----------|------|
| 搜索框 | 服务端搜索（`?search=`），50条/页 | ✅ 同左 | ✅ |
| 分类 Tab（全部/CS·AI/生物医学/商科/工程/社科） | 客户端过滤 research_areas | ✅ 同左 | ✅ |
| 教授卡片 | 显示姓名/职称/大学/研究方向 | ✅ 同左 | ✅ |
| 教授卡片点击 | 跳转 `/koala/professors/{id}` | ✅ 同左 | ✅ |
| Bookmark 图标 | 无处理 | 收藏教授 | ❌ 未实现 |
| 筛选按钮（SlidersHorizontal） | 无处理 | 打开筛选面板 | ❌ 未实现 |

---

### /koala/professors/[id] — 教授详情
**文件：** `app/koala/professors/[id]/page.tsx`

| 元素 | 当前行为 | 预期行为 | 状态 |
|------|----------|----------|------|
| 返回按钮 | router.back() | ✅ 同左 | ✅ |
| Opportunity Signal 条 | 显示真实 opportunity_score (0-100) | ✅ 同左 | ✅ |
| 研究方向 Tags | 真实数据 | ✅ 同左 | ✅ |
| 学术数据（H-Index/论文/引用） | 真实数据 | ✅ 同左 | ✅ |
| 代表论文（via SS） | 从 `/api/professors/{id}/papers` 加载，最多10篇 | ✅ 同左 | ✅ |
| 论文 DOI/SS 链接 | 点击打开外部链接 | ✅ 同左 | ✅ |
| 联系方式（邮件/主页/Scholar） | 有则显示可点击链接 | ✅ 同左 | ✅ |
| "问 Koala 关于这位教授" | 跳转 `/koala/chat?mode=research&professor={id}` | ✅ 同左 | ✅ |
| "生成套磁信 (AUD 1)" | 跳转 `/koala/chat?mode=write&professor={id}` | ✅ 同左 | ✅ |

---

### /koala/blog — 博客列表
**文件：** `app/koala/blog/page.tsx`  
从 `/api/blog` 加载。当前 API 返回 **mock 数据**（4篇硬编码文章），无真实 blog_posts DB 集成。  
**状态：** ⚠️ 部分实现（UI 完整，数据为 mock）

---

### /koala/my-profile — 个人资料中心
**文件：** `app/koala/my-profile/page.tsx`

| 元素 | 当前行为 | 预期行为 | 状态 |
|------|----------|----------|------|
| 文件上传（CV/成绩单） | POST `/api/user/profile/parse` → Claude 解析 | ✅ 同左 | ✅ |
| 编辑/查看切换 | 本地 state 控制 | ✅ 同左 | ✅ |
| 保存按钮 | POST `/api/user/profile` 存入 user_profiles 表 | ✅ 同左 | ⚠️ 依赖未建表 |
| 各字段输入 | major/GPA/研究兴趣等 | ✅ 同左 | ✅ |

---

### /koala/my-progress — 申请进度
**文件：** `app/koala/my-progress/page.tsx`

| 元素 | 当前行为 | 预期行为 | 状态 |
|------|----------|----------|------|
| Research Readiness 分数 | 从 `/api/user/dashboard` 加载真实计算 | ✅ 同左 | ✅ |
| 5维度进度条 | 真实数据 | ✅ 同左 | ✅ |
| 成就徽章（9个） | 已解锁/未解锁状态 | ✅ 同左 | ✅ |
| 积分/订阅卡片 | 显示余额，链接到 `/koala/tools` | ✅ 同左 | ✅ |
| "管理 →" 链接 | 跳转 `/koala/tools` | ✅ 同左 | ✅ |
| 最近对话列表 | 真实对话记录 | ✅ 同左 | ✅ |

---

### /koala/tools — 定价 & 套餐
**文件：** `app/koala/tools/page.tsx`

| 元素 | 当前行为 | 预期行为 | 状态 |
|------|----------|----------|------|
| 免费版功能列表 | 静态展示 FREE_LIMITS 常量 | ✅ 同左 | ✅ |
| 订阅套餐卡片（Starter/Pro/Elite） | "立即订阅" 按钮无 onClick | 接入 Stripe | ❌ 未实现 |
| 积分套餐展开 | 点击"查看套餐"展开 | ✅ 同左 | ✅ |
| 积分"购买"按钮 | 无 onClick | 接入 Stripe | ❌ 未实现 |
| 免费工具"免费开始 →" | 跳转 `/koala/chat` | ✅ 同左 | ✅ |

---

### /koala/tools/niv — NIV 签证预评
**文件：** `app/koala/tools/niv/page.tsx`

| 元素 | 当前行为 | 预期行为 | 状态 |
|------|----------|----------|------|
| 签证类型/学历/英语/财务 问卷 | 表单收集 | ✅ 同左 | ✅ |
| 提交按钮 | POST `/api/niv/assess` → 返回评分 | ✅ 同左 | ✅ |
| 结果显示（分数/Band/建议） | 规则计算，非 AI | ✅ 同左 | ✅ |

---

### /koala/pricing — 独立定价页
**文件：** `app/koala/pricing/page.tsx`  
与 `/koala/tools` 内容高度重叠，有 monthly/yearly 切换 toggle（仅 monthly 实现）。  
支付按钮全部无 onClick。  
**状态：** ⚠️ 部分实现（UI 完整，支付未接入）

---

## 二、B端页面清单（app/dashboard/koala/）

### /dashboard/koala — 仪表盘首页
**文件：** `app/dashboard/koala/page.tsx`

| 元素 | 当前行为 | 状态 |
|------|----------|------|
| 最新教授列表（3条） | 真实 DB 数据 | ✅ |
| 最新 Grant 列表（3条） | 真实 DB 数据 | ✅ |
| 卡片（无编辑按钮） | 只读展示 | ⚠️ 无操作入口 |

---

### /dashboard/koala/layout — 导航布局
**文件：** `app/dashboard/koala/layout.tsx`

| 元素 | 当前行为 | 状态 |
|------|----------|------|
| 侧边栏导航 | 按当前路径高亮，支持二级展开 | ✅ |
| 用户角色检测 | GET `/api/admin/me`，非 admin 跳转 `/login` | ✅ |
| Sign Out | `supabase.auth.signOut()` + redirect `/login` | ✅ |
| Users 菜单（仅 super_admin） | 基于角色条件渲染 | ✅ |

---

### /dashboard/koala/professors — 教授管理
**文件：** `app/dashboard/koala/professors/page.tsx`

| 元素 | 当前行为 | 状态 |
|------|----------|------|
| 教授列表 | GET `/api/professors` 真实数据 | ✅ |
| 添加教授表单 | POST `/api/professors` | ✅ |
| 生成内容链接 | 跳转 content-generator | ✅ |
| 编辑/删除 | 未实现 | ❌ |

---

### /dashboard/koala/discovery — 数据发现
**文件：** `app/dashboard/koala/discovery/page.tsx`

| 元素 | 当前行为 | 状态 |
|------|----------|------|
| 搜索框 | 调用 `/api/discovery/real-search`（SS + OpenAlex 并行） | ✅ |
| 结果累积 | 每次搜索追加到历史 | ✅ |
| "审核通过并发布" | 写入 professors 表（部分实现） | ⚠️ |
| 来源 Badge | Mock/SS/OpenAlex 颜色区分 | ✅ |

---

### /dashboard/koala/blog — 博客管理
**文件：** `app/dashboard/koala/blog/page.tsx`  
所有按钮（新建/批量SEO/查看）均为占位符，无实际实现。  
**状态：** ❌ 未实现

---

### /dashboard/koala/publishing — 发布记录
**文件：** `app/dashboard/koala/publishing/page.tsx`

| 元素 | 当前行为 | 状态 |
|------|----------|------|
| 统计卡片（总浏览/DM/咨询/最佳平台） | GET `/api/publishing` 真实数据 | ✅ |
| 添加发布记录表单 | POST `/api/publishing` | ✅ |

---

### /dashboard/koala/grants — ARC 经费管理
**文件：** `app/dashboard/koala/grants/page.tsx`  
GET/POST `/api/grants`，真实 DB 集成。编辑/删除未实现。  
**状态：** ⚠️ 部分实现

---

### /dashboard/koala/content-generator — AI 内容生成
**文件：** `app/dashboard/koala/content-generator/page.tsx`  
从 URL 参数接收 `sourceType` 和 `input`，调用 Claude 生成小红书/微信/LinkedIn 内容。  
敏感词过滤通过 `/api/social/sensitive-check`。  
**状态：** ✅ 已实现

---

### /dashboard/koala/knowledge-base — 知识库
**文件：** `app/dashboard/koala/knowledge-base/page.tsx`  
展示知识库 chunks，触发 embedding 重建。知识库未填充（0 条向量）。  
**状态：** ⚠️ UI 存在，数据为空

---

### /dashboard/koala/pipeline — 数据采集监控
**文件：** `app/dashboard/koala/pipeline/page.tsx`

| 元素 | 当前行为 | 状态 |
|------|----------|------|
| API 状态（SS/ARC/OpenAlex） | **硬编码 "online"** | 🐛 假数据 |
| 一键触发采集 | POST `/api/cron/sync-professors` | ✅ |
| 采集日志 | 本地 state 追加 | ✅ |

---

### /dashboard/koala/feedback — AI 反馈统计
**文件：** `app/dashboard/koala/feedback/page.tsx`  
所有指标显示 0%，无真实 stats API（`/api/feedback/stats` 未建）。  
**状态：** ❌ 未实现

---

### /dashboard/koala/users — 用户角色管理
**文件：** `app/dashboard/koala/users/page.tsx`  
仅 super_admin 可访问。GET/PATCH `/api/admin/users`。不能修改 super_admin 或自己的角色。  
**状态：** ✅ 已实现

---

### /dashboard/koala/leads — 线索管理
**文件：** `app/dashboard/koala/leads/page.tsx`  
从 `/api/user/dashboard` 拉数据，实际返回空数组。线索系统未建立。  
**状态：** ❌ 未实现

---

### /login — 登录页
**文件：** `app/login/page.tsx`  
Supabase email+password 登录。支持 `?from=` 重定向参数。用 Suspense 包裹 `LoginForm`（Next.js SSR 要求）。  
**状态：** ✅ 已实现

---

## 三、API 清单

### 核心教授接口

| 路径 | 方法 | 数据源 | 状态 |
|------|------|--------|------|
| `/api/professors` | GET | Supabase professors 表，支持 limit/page/search/filter | ✅ |
| `/api/professors` | POST | 插入新教授 | ✅ |
| `/api/professors/[id]` | GET/PUT/DELETE | 单条 CRUD | ✅ |
| `/api/professors/[id]/papers` | GET | papers 表，按 citation_count 降序，最多10篇 | ✅ |

**GET /api/professors 参数：**
```
limit (default 20, max 200)
page (default 1)
search (name/university ilike)
university / verificationStatus / researchArea
category (cs/bio/eng/soc 等映射到 research_areas)
acceptingStudents / grantStatus / hIndexMin
sortBy (default: opportunity_score desc)
```

---

### AI 接口

| 路径 | 方法 | 实现 | 状态 |
|------|------|------|------|
| `/api/ai/chat` | POST | Claude Sonnet 4.6，工具调用 searchProfessors，RAG 集成，保存 ai_conversations | ✅ |
| `/api/ai/feedback` | POST | 插入 feedback 表 | ✅ |
| `/api/ai/export` | POST | 导出对话（未详细审计） | ⚠️ |

**POST /api/ai/chat 返回结构：**
```json
{
  "reply": "string (Markdown)",
  "scoreCard": { "totalScore": 0-100, "dimensions": [...] },
  "matchedProfessors": [{ "professorId", "name", "institution", "matchScore", "reason", ... }],
  "citations": [{ "title", "year", "journal", "doi", "url" }],
  "emailPackage": { "subjectLine", "emailBody", "followupBody", "riskNote" },
  "quickReplies": ["string"],
  "suggestConsultation": false
}
```

---

### 套磁信接口

| 路径 | 方法 | 实现 | 状态 |
|------|------|------|------|
| `/api/outreach/generate` | POST | Claude 生成，credit 检查，保存 outreach_emails | ✅ |
| `/api/outreach/send` | POST | 仅支持 "copy" action；"send"（Resend）返回 501 | ⚠️ |
| `/api/outreach/credits` | GET | 返回余额 + 套餐列表 | ✅ |
| `/api/outreach/credits` | POST | Stripe 未接入，返回 501 | ❌ |
| `/api/outreach/status` | POST | 更新邮件状态；"sent" 时写 followup_reminders（表不存在！） | 🐛 |
| `/api/outreach/batch-generate` | POST | SSE 流式批量生成，credit 预检 | ✅ |

---

### 用户系统接口

| 路径 | 方法 | 实现 | 状态 |
|------|------|------|------|
| `/api/user/profile` | GET/POST | 读写 user_profiles 表（**表未在 schema.sql 中定义**） | ⚠️ |
| `/api/user/profile/parse` | POST | FormData → Claude 解析 CV/成绩单 → StudentProfile JSON | ✅ |
| `/api/user/dashboard` | GET | 综合计算 readiness score，读取 credits/achievements/tasks | ✅ |
| `/api/admin/me` | GET | 返回当前用户角色 | ✅ |
| `/api/admin/users` | GET/PATCH | 用户列表 + 角色修改（仅 super_admin） | ✅ |

---

### 工具 & 内容接口

| 路径 | 方法 | 实现 | 状态 |
|------|------|------|------|
| `/api/niv/assess` | POST | 规则评分，无 AI | ✅ |
| `/api/blog` | GET | **返回 mock 数据**（4篇硬编码）| 🐛 |
| `/api/grants` | GET/POST | Supabase grants 表 | ✅ |
| `/api/topics` | GET/POST | Supabase topics 表 | ✅ |
| `/api/publishing` | GET/POST | Supabase publishing_items 表 | ✅ |
| `/api/social/sensitive-check` | POST | 敏感词过滤 + 小红书专项处理 | ✅ |
| `/api/report/generate` | POST | Claude 生成匹配报告，保存到 ai_conversations | ✅ |
| `/api/discovery/real-search` | POST | SS + OpenAlex 并行搜索澳洲作者 | ✅ |
| `/api/cron/sync-professors` | GET | 增量同步 SS 数据，每次最多 20 条 | ✅ |

---

## 四、数据库表

### 有数据的表

| 表名 | 记录数 | 备注 |
|------|--------|------|
| professors | **1,222** | 8 所澳洲大学，h-index ≥ 3 |
| papers | **5,877** | 来自 Semantic Scholar，关联 professor_id |
| user_roles | 少量 | 管理员角色记录 |

### 已定义但为空的表

| 表名 | 用途 |
|------|------|
| grants | ARC 经费数据（手动录入） |
| topics | 研究主题 |
| content_cards | AI 生成内容草稿 |
| publishing_items | 社媒发布记录 |
| pipeline_runs | 采集任务日志 |
| knowledge_chunks | RAG 向量库（**未填充**） |
| ai_conversations | 用户对话记录 |
| feedback | AI 反馈记录 |
| user_credits | 用户积分（注册时默认1积分） |
| outreach_emails | 生成的套磁信 |
| user_achievements | 成就解锁记录 |
| daily_tasks | 每日任务 |
| sensitive_words | 敏感词库（需手动维护） |
| blog_posts | 博客文章（无内容） |
| blog_images | 博客图片 |

### 代码引用但 schema 未定义的表 🐛

| 表名 | 被引用位置 | 影响 |
|------|----------|------|
| **user_profiles** | `/api/user/profile` | 个人资料保存会报错 |
| **followup_reminders** | `/api/outreach/status` | "sent" 状态更新会报错 |

---

### professors 字段数据填充率

| 字段 | 填充状态 |
|------|----------|
| name, university | ✅ 全部 |
| position_title | ✅ 全部（AI 推断） |
| research_areas | ✅ 全部（来自 OpenAlex topics） |
| h_index, paper_count, citation_count | ✅ 全部 |
| opportunity_score | ✅ 全部（算法计算） |
| semantic_scholar_id | ✅ 有 SS 匹配的（约 60%） |
| references（中文摘要） | ✅ 全部（Claude 生成） |
| potential_rp_topics（中文标签） | ✅ 全部（Claude 生成） |
| email | ❌ 全部为空 |
| profile_url | ✅ 部分（SS 主页链接） |
| google_scholar_url | ❌ 全部为空 |
| grant_status | ❌ 全部为 "Pending" |
| accepting_students | ❌ 全部为 "unknown" |
| faculty | ❌ 全部为空 |
| verification_status | ❌ 全部为 "Pending" |

---

## 五、用户系统

### 5.1 认证（Supabase Auth）
- ✅ **登录/登出**：email+password，`/login` 页面完整实现
- ❌ **注册**：无注册页，用户只能由管理员通过 Supabase 控制台创建
- ✅ **中间件保护**：`middleware.ts` 保护所有 `/dashboard/*` 路由
- ✅ **角色系统**：`user_roles` 表，支持 super_admin/admin/viewer
- ✅ **匿名访问**：C 端 (`/koala/*`) 无需登录即可使用大部分功能

### 5.2 用户 Profile
- ⚠️ **user_profiles 表**：API 路由已写好，但**表未在 schema.sql 中创建**，需在 Supabase SQL Editor 手动执行：
```sql
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  parsed_data JSONB,
  file_name TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.3 收藏教授
- ❌ **无后端实现**：教授列表有 Bookmark 图标但无 onClick，无收藏表

### 5.4 文件上传（简历/成绩单）
- ✅ `/api/user/profile/parse`：接收文件 → Claude 解析 → 返回结构化 StudentProfile
- ⚠️ 解析结果保存到 `user_profiles` 表（表未建）

### 5.5 积分 & 会员系统
- ✅ **user_credits 表**已定义，新用户默认 1 积分
- ✅ 积分扣除逻辑（每封套磁信 1 积分，首封免费）
- ❌ **充值**：`/api/outreach/credits POST` 返回 501（Stripe 未接入）
- ❌ **订阅**：定价页按钮无 onClick，无 Stripe Checkout 集成

---

## 六、未实现 / 有 Bug 的功能汇总

### ❌ 未实现（代码框架存在但功能缺失）

| 功能 | 位置 | 说明 |
|------|------|------|
| 支付/充值 | `/api/outreach/credits`, `/koala/tools`, `/koala/pricing` | Stripe 未接入 |
| 邮件实际发送 | `/api/outreach/send` | Resend 未接入，返回 501 |
| 用户注册 | 无对应页面 | 需手动在 Supabase 创建 |
| 收藏教授 | 无后端 | 仅有前端图标 |
| 博客 CMS | `/dashboard/koala/blog` | 全部占位符 |
| AI 反馈统计 | `/dashboard/koala/feedback` | 无 stats API |
| 线索管理 | `/dashboard/koala/leads` | 无数据源 |
| 知识库填充 | knowledge_chunks 表 | 表空，RAG 无内容 |
| 教授批量编辑/删除 | 仪表盘 | 仅有添加 |

### 🐛 有 Bug

| Bug | 位置 | 说明 |
|------|------|------|
| user_profiles 表不存在 | `/api/user/profile` | 保存个人资料会 500 |
| followup_reminders 表不存在 | `/api/outreach/status` | 标记 "sent" 会报错 |
| 博客 API 返回 mock | `/api/blog` | 不读 DB，显示硬编码文章 |
| Pipeline API 状态假数据 | `/dashboard/koala/pipeline` | 硬编码 "online" |
| Monash 533 条采集失败 | scripts/collect-professors.ts | 网络错误，需重跑 |

### ⚠️ 部分实现

| 功能 | 状态说明 |
|------|----------|
| 教授详情 email 字段 | 全部为空，无爬取逻辑 |
| accepting_students 字段 | 全部 "unknown"，需人工或 AI 补充 |
| grant_status 关联 | 教授 grant_status 全部 "Pending"，grants 表无数据 |
| 内容生成器 | UI 完整，但 content_cards 表未与博客/发布流程打通 |

---

## 七、外部服务集成状态

| 服务 | 用途 | 状态 |
|------|------|------|
| Supabase | DB + Auth | ✅ 已集成 |
| Anthropic Claude Sonnet 4.6 | AI 对话/邮件生成/报告 | ✅ 已集成 |
| Claude Haiku 4.5 | 教授数据批量富化（采集脚本） | ✅ 已使用 |
| Semantic Scholar API | 论文/引用数据 | ✅ 已集成（无 key，1 req/s） |
| OpenAlex API | 教授采集数据源 | ✅ 已集成（采集脚本） |
| Stripe | 支付 | ❌ 未接入 |
| Resend | 邮件发送 | ❌ 未接入 |
| pgvector | RAG 语义搜索 | ⚠️ 表已建，未填充向量 |

---

## 八、立即需要修复的项目（优先级排序）

1. **建 user_profiles 表**（1个 SQL 语句，5分钟）
2. **建 followup_reminders 表**（防止 outreach/status 崩溃）
3. **博客 API 接真实 DB**（blog_posts 表已定义，需替换 mock）
4. **重跑 Monash 采集**（533 条失败，`npx tsx scripts/collect-professors.ts --all` 会跳过已有数据）
5. **knowledge_chunks 填充**（Step 2：build-knowledge.ts，RAG 才能有内容）
6. **Stripe 接入**（商业化核心）
