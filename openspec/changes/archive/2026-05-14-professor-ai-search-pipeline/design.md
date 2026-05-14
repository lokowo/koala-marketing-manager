## Context

用户在 `/koala/professors` 搜索教授时，如果数据库无结果（或结果 <3 条），系统自动触发 AI 深度搜索（`searchProfessorAllSources`），从 DB + OpenAlex + Claude Web Search 三个源并行检索。找到后用户可点击"录入并使用"，调用 `POST /api/professors/auto-search` → `saveCandidateToDb()` 写入数据库。

当前问题：
1. `saveCandidateToDb()` 硬编码 `verification_status: 'Verified'`，无审核环节
2. 不记录是谁贡献的数据（无 `contributed_by` 字段）
3. 录入后用户被导航到详情页，无法直接进入套磁信/面试流程
4. Admin 后台无 user_contributed 数据审核入口

关键文件：
- `app/lib/services/professorAutoAdd.ts` — `saveCandidateToDb()` (L161-197)
- `app/api/professors/auto-search/route.ts` — POST 已有 `getServerUser()` 可获取用户
- `app/koala/professors/ProfessorsClient.tsx` — 前端搜索 + 录入 UI
- `app/lib/services/professorService.ts` — `listProfessors()` 过滤 `verification_status = 'Verified'`
- `app/lib/types.ts` — `Professor` 类型 (L28: `verificationStatus`)
- `app/dashboard/koala/layout.tsx` — Admin 侧边栏导航

## Goals / Non-Goals

**Goals:**
- 用户录入的教授标记为 `user_contributed`，需 Admin 审核后才公开
- 记录贡献者身份和时间
- 录入后用户能立即使用该教授数据（写套磁信/模拟面试）
- Admin 有专门的审核页面管理用户贡献数据

**Non-Goals:**
- 不改变 Admin 手动创建教授的流程（Admin 创建仍为 Verified）
- 不改变 `findOrCreateProfessor()`（AI chat 内部自动创建）的行为——该函数用于 AI 对话中自动匹配，保持 Verified
- 不实现贡献积分/奖励系统
- 不实现批量审核功能（第一版逐条审核）

## Decisions

### Decision 1: `saveCandidateToDb` 增加 `userId` 可选参数

**选择**: 给 `saveCandidateToDb(candidate, userId?)` 增加可选的 `userId` 参数。传入 userId 时设 `verification_status: 'user_contributed'` + `contributed_by: userId`；不传时保持原有 `Verified` 行为。

**理由**: `findOrCreateProfessor()` 也调用 `saveCandidateToDb()`，它用于 AI chat 内部的快速自动匹配，不应改变其行为。通过可选参数区分两种调用场景，改动最小。

**备选方案**: 创建独立的 `saveUserContributedProfessor()` 函数 — 拒绝，因为与 `saveCandidateToDb` 逻辑高度重复。

### Decision 2: 数据库 migration 方式

**选择**: 通过 Supabase SQL Editor 执行 migration：
1. ALTER CHECK 约束，新增 `'user_contributed'` 值
2. ADD COLUMN `contributed_by` UUID（nullable，外键到 auth.users）
3. ADD COLUMN `contributed_at` TIMESTAMPTZ（nullable，默认 now()）

```sql
-- 1. 修改 CHECK 约束
ALTER TABLE professors DROP CONSTRAINT IF EXISTS professors_verification_status_check;
ALTER TABLE professors ADD CONSTRAINT professors_verification_status_check
  CHECK (verification_status IN ('Verified', 'Pending', 'Rejected', 'user_contributed'));

-- 2. 新增字段
ALTER TABLE professors ADD COLUMN IF NOT EXISTS contributed_by UUID REFERENCES auth.users(id);
ALTER TABLE professors ADD COLUMN IF NOT EXISTS contributed_at TIMESTAMPTZ;
```

**理由**: 两个新字段都是 nullable，不影响现有数据。CHECK 约束是 additive 的。无需数据迁移。

### Decision 3: 公开列表过滤逻辑

**选择**: `listProfessors()` 中现有的 `.eq('verification_status', 'Verified')` 过滤已自动排除 `user_contributed`，无需修改。

**理由**: 当前代码在 `!showAll` 时只显示 `Verified`，新状态 `user_contributed` 天然被排除。Admin 端传 `showAll: true` 可看到所有状态。

### Decision 4: 录入后操作面板实现方式

**选择**: 在 `ProfessorsClient.tsx` 中，为每个外部候选人维护一个 `savedProfessors: Map<string, Professor>` state。录入成功后将返回的 professor 存入 map，UI 根据 map 中是否存在该候选人来决定显示搜索结果卡片还是操作面板。

**理由**: 不需要额外的路由或组件，在现有搜索结果列表中原地切换。Map 的 key 用 `candidate.name + candidate.university` 作为唯一标识。

### Decision 5: Admin 审核页面路由

**选择**: `app/dashboard/koala/professors/contributed/page.tsx`，在 Admin 侧边栏"教授库"子菜单中添加"用户贡献"入口。

**理由**: 复用现有的 Admin 教授管理页面结构。路由命名与 `verification_status` 值语义一致。现有侧边栏已有"全部教授"和"数据质量"两个子项，新增"用户贡献"自然。

### Decision 6: 审核 API 复用现有接口

**选择**: 审核操作复用 `PUT /api/professors/[id]` 更新 `verification_status`，删除复用 `DELETE /api/professors/[id]`。不新建专门的审核 API。

**理由**: 现有的 PUT/DELETE 接口已有完整的 CRUD 逻辑和权限检查。审核本质就是更新 `verification_status` 字段。避免重复代码。

## Risks / Trade-offs

**[风险] user_contributed 教授数据质量差** → AI 搜索结果本身有置信度评分，且录入的是结构化数据（非用户手动填写），质量有保障。Admin 审核作为最后一道关口。

**[风险] 用户录入重复教授** → `saveCandidateToDb()` 已有 name+university 去重逻辑。如果已存在同名同校教授（无论状态），直接返回已有记录。

**[风险] CHECK 约束变更需要 downtime** → ALTER CHECK 约束是即时操作，不锁表，不需要 downtime。

**[折衷] findOrCreateProfessor 保持 Verified** → AI chat 自动创建的教授仍然自动 Verified，这意味着通过对话间接创建的教授不经审核。可接受，因为这是系统行为而非用户主动录入，且数量可控。

## Open Questions

_无 — 方案已与用户在 proposal 阶段对齐。_
