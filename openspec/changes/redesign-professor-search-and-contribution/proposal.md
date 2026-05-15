# 教授库重做方案

## 0. 待 Jay 确认的疑问

**Q1**: `match_professors_semantic` RPC 函数在代码中被调用（`professorService.ts:444`），但在 `supabase/functions.sql` 和所有 migration 文件中都找不到它的定义。professors 表也没有 `embedding` 列。这个向量搜索功能是否已经在线上 Supabase 创建了？还是从来就没有跑通过？

**Q2**: URL 录入（`import-from-url`）产生的教授 `verification_status` 设为 `user_contributed`，而 `auto-search` 录入的设为 `Verified`。是否需要统一？`user_contributed` 的教授在列表页默认不显示（因为筛选 `Verified`），这意味着 URL 录入的教授用户自己也看不到。

**Q3**: Blog 生成费用——首次免费，之后 10 积分/篇（Elite 免费）。用户贡献教授后自动生成 blog 是否也遵循这个计费逻辑？还是贡献录入的教授自动免费生成 blog？

**Q4**: OpenAlex API 搜索当前不带机构过滤（`per_page=15`），导致搜 "Xianghai An" 可能返回全球同名结果。是否愿意接受先搜 OpenAlex 再用 Claude 做澳洲确认的双步策略？

**Q5**: 贡献积分（10 分）数额是否确定？是否需要区分 "AI 搜索录入" 和 "URL 粘贴录入" 的奖励？

**Q6**: 无限滚动在 category 切换和搜索状态下 fetch 2000 行做 JS 过滤（`professorService.ts:124`），这对于教授数量增长后有性能隐患。是否愿意接受在数据库侧做全文搜索索引？

---

## 1. 现状审计

### 1.1 当前数据模型

**professors 表** (`supabase/schema.sql:13`)

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID PK | - |
| name | TEXT NOT NULL | 教授英文名 |
| university | TEXT NOT NULL | 全称如 "University of Sydney" |
| faculty | TEXT | 学院/系 |
| position_title | TEXT (enum) | 7 种固定职位 |
| research_areas | TEXT[] | 研究方向关键词数组 |
| email | TEXT | 可为空 |
| profile_url | TEXT | 大学主页 |
| google_scholar_url | TEXT | Google Scholar |
| h_index / paper_count / citation_count | INTEGER | 学术指标 |
| opportunity_score | INTEGER 0-100 | 推荐度 |
| verification_status | TEXT | Verified / Pending / Rejected |
| contributed_by / contributed_at | TEXT / TIMESTAMPTZ | 用户贡献标记 |
| ai_summary | TEXT | AI 生成简介 |
| data_sources | TEXT[] | 数据来源标记 |

**无 embedding 列**，无 `pg_trgm` 扩展，无全文索引。

**关联表**:
- `papers` (professor_id FK, 有 idx)
- `grants` (lead_professor_id FK)
- `saved_professors` (user_id + professor_id, 有 idx)
- `professor_interactions` (user_id + professor_id)

### 1.2 当前搜索实现

**层级 1: DB 搜索** (`professorService.ts:107-251`)
- 策略：**纯 ILIKE 子串匹配**，无全文搜索、无 pg_trgm、无向量搜索
- 多词搜索：第一个词走 DB `.or(name.ilike, university.ilike, faculty.ilike)`，剩余词在 JS 里 AND 过滤
- 研究领域搜索：fetch 500 行到 JS，做 `areasText.includes(t)` 过滤
- category 分类：fetch 2000 行到 JS，按 CATEGORY_KEYWORDS 做子串匹配
- **性能问题**：搜索和分类时 fetch 2000 行全量数据到内存

**层级 2: Auto-search** (`professorAutoAdd.ts:106-167`)
- 三数据源并行：DB (ILIKE) + OpenAlex API + Claude Web Search (Haiku)
- OpenAlex：搜名字，不限机构，per_page=15，然后按 last_known_institutions 判断匹配度
- Claude：用 `web_search_20250305` tool，搜 ".edu.au" 等关键词

**层级 3: Deep search** (`professorAutoAdd.ts:170-225`)
- DB (ILIKE) + Claude Web Search（跳过 OpenAlex）
- 限制：5 次/小时/用户

**为什么搜 "xianghaiAN" 找不到**：
1. `normalizeProfessorName("xianghaiAN")` → "Xianghaian"（把 AN 当成名字的一部分了），但实际是 "Xianghai An"（An 是姓）
2. DB 搜 `ILIKE '%Xianghaian%'` 当然匹配不到
3. OpenAlex 搜 "xianghaiAN" 也匹配不到正确人
4. Claude Haiku web_search 搜 "Xianghaian" 太弱——模型小、搜索查询不够好
5. **根因**：`normalizeProfessorName` 只做驼峰分词 `([a-z])([A-Z])` 但 "xianghaiAN" 只有末尾大写，不会在 "hai" 和 "AN" 之间插空格

### 1.3 当前展示分页

**IntersectionObserver 方案** (`ProfessorsClient.tsx:375-384`)

```
sentinelRef → IntersectionObserver(rootMargin: 200px) → loadMore()
loadMore() → apiFetch(page=N) → append to professors → hasMore check
```

**最近修复（b6749b5）的方案**：
- 把 `loadingMore`/`hasMore`/`page` 从 useState 改成 useRef
- `loadMore` 用空依赖 `useCallback(fn, [])`，通过 `filtersRef.current` 读最新 filters
- Observer effect 依赖 `[loadMore]`（现在是稳定引用）

**潜在死循环根因分析**：
- 之前 `loadMore` 依赖 `loadingMore` 和 `hasMore` state → 每次 state 变化 → loadMore 重建 → Observer effect 重跑 → 新 observer 立即 trigger → 又调 loadMore → 循环
- b6749b5 的 ref 方案确实解决了这个问题
- **但**：如果 API 返回空数据但 `hasMore` 仍然为 true，就会持续请求。当前实现依赖 API 返回正确的 `hasMore`，而 `countProfessors` 在搜索/分类场景下 fetch 3000 行做 JS 计数，如果 count 不一致就可能出问题

### 1.4 修复历史

| Commit | 日期 | 修了什么 | 为什么没根治 |
|---|---|---|---|
| `f187876` | 5.14 | 搜索按钮触发失败，移除 auto-debounce | 只修了触发问题 |
| `a01a871` | 5.14 | 3 个搜索 bug：按钮、录制跳转、验证过滤 | 小修小补 |
| `2bc1bcf` | 5.14 | 多词搜索 OR→AND | PostgREST 链式 `.or()` 静默丢条件，方案有缺陷 |
| `3708599` | 5.14 | 8 个 bug：debounce、按钮、UI、admin | 前端修补 |
| `94e4426` | 5.14 | 多词搜索+竞态+成本优化 | 发现 PostgREST 链式 `.or()` 问题，改用单 `.or()` + JS AND 过滤。修了竞态 |
| `0f19f5a` | 5.14 | 多词搜索按名字匹配排序 | 排序逻辑修补 |
| `b6749b5` | 5.14 | 无限滚动死循环 | 用 ref 替代 state。方案正确但治标——没解决 2000 行 JS 过滤的根本架构问题 |

**规律**：同一天（5月14日）连续 7 个 commit 修教授搜索，每次发现前一个 fix 不够。核心问题是搜索架构从一开始就不对——PostgREST 的 ILIKE 不够用，于是不断在 JS 层打补丁。

### 1.5 当前 blog 生成的条件限制

基于 `app/api/professors/[id]/generate-blog/route.ts` 和 `app/api/blog/generate-professor/route.ts` 的分析：

**触发条件**：
1. 用户已登录
2. 该教授尚无 published 状态的 blog
3. 积分检查通过（首次免费 / 10 积分 / Elite 免费）

**生成流程**：
1. 前端 `ProfessorDetailClient.tsx:118` 调 `POST /api/professors/{id}/generate-blog`
2. 检查已有 blog → 检查首次免费 → 扣积分 → 转发到 `/api/blog/generate-professor`
3. Claude Sonnet 先 web_search 验证教授身份（如果信息有误会返回错误）
4. Claude Sonnet 生成中文 800-1200 字文章（含论文、经费、申请建议）
5. Haiku 并行翻译英文 + 生成 SEO 元数据
6. 插入 blog_posts 表（draft 状态）→ generate-blog 路由自动改为 published
7. 异步触发封面图和插图生成

**费用**：首次免费 → 10 积分/篇 → Elite 订阅免费

**Blog 表字段**（从 `generate-professor` 路由推断）：
- `slug`, `title_zh`, `title_en`, `excerpt_zh`, `excerpt_en`, `content_zh`, `content_en`
- `category='professor_spotlight'`, `tags[]`, `professor_id`, `status`, `seo_*`
- `reading_time_zh`, `cover_image_url`

---

## 2. 需求要点

### REQ-1: 数据库教授下拉刷新展示
- 当前 ~4000 教授，需支持完整浏览
- 滚到底自动加载下一页（每页 20）
- category/university/h-index/sort 切换时正确 reset
- **根因**：不是前端 Observer 的问题（b6749b5 已修），而是后端搜索/分类时 fetch 2000 行做 JS 过滤导致分页语义不一致

### REQ-2: 搜索教授 + AI 兜底
- DB 搜索需要容错：驼峰、姓名颠倒、部分匹配、拼音变体
- AI 深搜效果需 >= ChatGPT（当前用 Haiku + 弱 prompt，效果远弱于 Sonnet web search）
- 找到后返回结构化候选

### REQ-3: 用户贡献 + Blog + 积分
- 已有：auto-search POST 录入（+10 积分）、import-from-url（+10 积分）
- 缺失：URL 录入的 verification_status='user_contributed' 导致教授列表不显示
- Blog 生成已实现但需要与贡献流程衔接

---

## 3. 备选方案

### 3.1 方案 A：原地小修（最小动）

**搜索修复**:
- 修 `normalizeProfessorName`：用更好的分词逻辑处理 "xianghaiAN" → "Xianghai An"
- 在 professors 表加 pg_trgm 扩展 + GIN 索引 `CREATE INDEX professors_name_trgm ON professors USING GIN (name gin_trgm_ops)`
- 改 DB 搜索从 ILIKE 升级为 `similarity(name, query) > 0.3` 或 `name % query`（模糊匹配）

**分页修复**:
- 把 category 过滤挪到数据库侧：用 `research_areas && ARRAY[keywords]` 或者新增 `category TEXT` 字段预计算
- 消除 2000 行 JS 过滤，让 DB LIMIT/OFFSET 分页语义正确

**AI 深搜修复**:
- 把 Claude 从 Haiku 升级为 Sonnet（web search 效果显著提升）
- 改进 prompt，增加 name variation 搜索策略

**贡献修复**:
- import-from-url 设 verification_status='Verified' 而非 'user_contributed'
- 或者列表页不过滤 user_contributed

**改动量**: ~200 行代码 + 1-2 条 SQL  
**风险**: 低  
**限制**: pg_trgm 只做名字模糊匹配，不做语义搜索；搜索质量有上限

### 3.2 方案 B：OpenAlex 增强 AI 深搜 + 搜索索引重构

**搜索层重构**:
- 加 `pg_trgm` 扩展 + GIN 索引（名字模糊匹配）
- 加 `tsvector` 全文搜索索引（研究方向搜索）
- 数据库侧处理 category 过滤（新增 `category TEXT` 预计算字段或用 GIN 索引）
- 消除 JS 层 2000 行过滤

**OpenAlex 深搜增强**:
- 当前 OpenAlex 搜索不限机构，太多噪音。改为：
  1. 先搜 OpenAlex 带 `institution.country_code:AU` 过滤
  2. 如果 0 结果，放宽为全球搜索
  3. 对结果用 Claude 做 re-ranking（确认澳洲关联）
- 对 name 做多变体搜索："Xianghai An", "An Xianghai", "X. An"

**Claude 深搜升级**:
- 升级到 Sonnet（web search 效果好很多）
- 增加搜索次数 max_uses: 8
- prompt 里加 name variation 策略

**贡献流程完善**:
- 统一 verification_status 逻辑
- 贡献后可选择触发 blog 生成（首次免费）

**改动量**: ~500 行代码 + 3-4 条 SQL  
**风险**: 中（需要跑 SQL migration）  
**优势**: 搜索体验质的飞跃，DB 分页彻底正确

### 3.3 方案 C：完全重构（搜索 + 展示 + 录入一起重写）

**前端重写**:
- ProfessorsClient.tsx 从 1282 行拆成 ~5 个组件
- 使用 SWR / React Query 管理数据获取 + 缓存
- 虚拟列表替代 IntersectionObserver（react-window / tanstack-virtual）

**后端重写**:
- professorService.ts 完全重构搜索逻辑
- 新增 professor embedding 列 + match_professors_semantic RPC
- 用向量搜索 + BM25 混合做 professor 检索

**数据源重写**:
- 完全替换 Semantic Scholar 为 OpenAlex
- 加入 ORCID 交叉验证
- 定时同步 OpenAlex 增量数据

**改动量**: ~2000 行代码 + 5+ SQL migrations  
**风险**: 高（改太多，回归风险大）  
**时间**: ~30 小时

---

## 4. 对比表

| 维度 | 现状 | 方案 A | 方案 B | 方案 C |
|---|---|---|---|---|
| REQ-1 无限滚动正确性 | 分类/搜索时有问题 | 基本解决（DB侧分类） | 完全解决 | 完全解决 |
| REQ-2 DB 搜索容错 | ILIKE 只能精确子串 | pg_trgm 模糊 | pg_trgm + tsvector 全文 | 向量 + 全文混合 |
| REQ-2 AI 深搜质量 | 弱于 ChatGPT | Sonnet 升级后接近 | OpenAlex + Sonnet，超过 ChatGPT | 同 B |
| REQ-3 用户贡献完整度 | 90% 完成（URL录入不可见） | 100%（修 status） | 100% + blog 衔接 | 100% |
| 分页性能 | 2000行JS过滤 | DB侧分类消除大部分 | DB侧全部 | DB侧全部 |
| 实现工时（h） | - | 4-6 | 10-14 | 25-35 |
| 代码改动量 | - | ~200 行 + 2 SQL | ~500 行 + 4 SQL | ~2000 行 + 5 SQL |
| 风险 | - | 低 | 中 | 高 |
| 是否需要新依赖 | - | 否 | 否 | react-query 或 swr |
| 推荐度 | - | ★★ | ★★★★ | ★★★ |

---

## 5. 推荐方案：方案 B（OpenAlex 增强 + 搜索索引重构）

**理由**:

1. **ROI 最高**：14 小时工作量解决所有 3 个核心需求，且不引入新依赖
2. **解决根因**：搜索问题的根因是没有数据库级索引（pg_trgm / tsvector），方案 B 在根因层面修复
3. **AI 深搜**：OpenAlex 是免费、结构化、无限速的学术数据库，比 Claude web search 结构化数据更可靠，Claude 用来做最后兜底和 re-ranking
4. **方案 A 不够**：虽然快但没解决 tsvector 全文搜索，用户搜研究方向时仍然是 2000 行 JS 过滤
5. **方案 C 过重**：向量搜索 + 前端重写太激进，ProfessorsClient 虽然 1282 行但功能完整，拆分的收益不够大

---

## 6. 不选的方案为什么不选

**方案 A（原地小修）**：
- pg_trgm 只解决名字模糊搜索，研究方向搜索仍然是 2000 行 JS 过滤
- 没有 tsvector 全文索引，搜索质量上限低
- 分类过滤没有彻底解决

**方案 C（完全重构）**：
- 引入 react-query/swr 等新依赖违反项目规则（CLAUDE.md: "不要安装未列出的依赖"）
- professor embedding 需要对 4000+ 教授批量跑 embedding，耗时且需要额外 OpenAI 费用
- 前端拆分收益不大，风险大——当前 ProfessorsClient 功能完整，改动太多容易引入回归

---

## 7. 实施路线图

如果 Jay 采纳方案 B，分 4 个 PR，每个可独立验证：

### PR 1: 数据库索引 + 搜索后端重构 (~4h)
**范围**:
- SQL: 启用 pg_trgm，创建 GIN 索引
- SQL: 新增 `category TEXT` 预计算字段 + 触发器/批量更新脚本
- `professorService.ts`: 重写 `listProfessors` 和 `countProfessors`
  - category 过滤走 DB `WHERE category = ?`
  - 搜索走 `name % query OR university % query`（pg_trgm）+ `to_tsvector(array_to_string(research_areas, ' ')) @@ to_tsquery(query)`
  - 消除 2000 行 / 3000 行 JS 过滤
  - 分页 LIMIT/OFFSET 语义回归正确

**验证**: 教授库页面滚到底能持续加载新教授；category 切换不再卡顿

### PR 2: 名字模糊匹配 + AI 深搜升级 (~4h)
**范围**:
- `professorAutoAdd.ts`: 改进 `normalizeProfessorName`
  - 处理全小写驼峰（"xianghaiAN" → "Xianghai An"）
  - 尝试姓名颠倒 ("An Xianghai")
  - 去除常见中文停词
- OpenAlex 搜索：增加 `institution.country_code:AU` 过滤选项
- Claude 深搜升级：Haiku → Sonnet，增加 max_uses: 8，改进 prompt 加入 name variation
- `listProfessors`: 搜索时用 pg_trgm 模糊匹配

**验证**: 搜 "xianghaiAN" 能通过 AI 深搜找到 Xianghai An (University of Sydney)

### PR 3: 贡献流程 + 可见性修复 (~3h)
**范围**:
- `import-from-url/route.ts`: 改 `verification_status` 为 `Verified`（或在 listProfessors 里同时包含 user_contributed）
- 贡献后自动显示在教授库列表
- Blog 生成与贡献衔接：贡献后 ProfessorDetailClient 显示"生成教授介绍文章"按钮（已有）
- 确认 Admin 通知流程工作正常

**验证**: URL 粘贴录入教授 → 教授列表可见 → 详情页可生成 blog

### PR 4: 前端稳定性 + 边缘场景 (~3h)
**范围**:
- ProfessorsClient: category 切换时 total 更新逻辑验证
- 搜索+分类组合场景测试
- loadMore 边缘场景：hasMore 不一致时的安全处理
- 性能测试：确认 DB 侧搜索比 JS 过滤快

**依赖关系**: PR2 依赖 PR1（需要 pg_trgm 索引），PR3 独立，PR4 依赖 PR1+PR2。
建议顺序：PR1 → PR2 → PR3（可与 PR2 并行） → PR4。
