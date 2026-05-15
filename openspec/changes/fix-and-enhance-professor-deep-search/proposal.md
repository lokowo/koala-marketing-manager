## Why

教授搜索系统存在两个问题：
1. **AI 深搜失败**：用户输入 "xianghaiAN" 时未做名字归一化，导致搜索失败
2. **搜索兜底缺失**：AI 深搜失败后用户没有其他途径录入教授

**重要架构澄清**：OpenAlex 的角色是建设文献数据库，供 AI 对话功能使用。教授搜索需要确认"教授现在在大学任职、可以写套磁信"——这种实时信息 OpenAlex 没有，必须从大学官网 + Google 获取。本次变更从教授搜索路径中移除 OpenAlex。

## 教授搜索正确架构

### Tier 1: 搜自己的 DB
- pg_trgm 模糊名字匹配（处理 "xianghaiAN" → "Xianghai An"）
- research_embedding 向量语义匹配（已有 `match_professors_semantic` RPC）
- 两者并行，合并去重打分

### Tier 2: AI + Google 深搜（DB 没找到时触发）
- 用便宜模型（Haiku）+ Google 搜索（web_search tool）
- 搜索策略：名字 + ".edu.au" / "professor" / "PhD supervisor"
- 多查询并发（名字变体、姓名颠倒）
- 抓取候选人的大学官网 profile 页面
- 用 Claude 从 HTML 抽取结构化信息（name, position, university, research_areas, email, accepting_students 等）

### Tier 3: 展示候选 → 用户确认 → 录入
- 把 Tier 2 找到的候选人格式化成教授卡片展示给用户
- 用户确认"是的，就是这个人" → 录入 professors 表
- verification_status='Verified'，contributed_by=当前用户 ID
- 给用户 +10 积分奖励
- 前端明确提示"贡献 +10 积分"

### 额外入口: 用户粘贴 URL
- 用户搜不到时，直接粘贴大学官网 / Google Scholar 链接
- 后端 fetch URL → Claude 抽取 → 格式化 → 用户确认 → 录入
- 同样 +10 积分

### 录入后可选: 生成教授介绍 blog
- 走现有 `/api/professors/[id]/generate-blog`
- 贡献者首次免费

## What Changes — 分 4 个 PR

### PR0: Schema 反向同步
- 启用 pg_trgm 扩展
- 在 professors.name 上建 GIN trigram 索引
- 确认 research_embedding 列和 match_professors_semantic RPC 正常工作

### PR1: DB 搜索升级（Tier 1）
- professorService.ts 搜索逻辑：pg_trgm 模糊匹配 + embedding 语义匹配并行
- normalizeProfessorName() 在所有搜索入口应用
- 合并去重打分

### PR2: AI + Google 深搜重构（Tier 2）
- **移除 OpenAlex 搜索**（从 searchProfessorAllSources 中删除）
- Claude + web_search 搜索策略增强：多查询、名字变体
- 候选人大学官网 profile 页面抓取 + Claude 抽取
- 改进 prompt：名字变体、.edu.au 优先

### PR3: 贡献流程 + URL 导入 + Blog 衔接（Tier 3 + 额外入口）
- 用户粘贴 URL → 后端 fetch + Claude 抽取 → 录入
- 录入后 +10 积分奖励
- 前端 UI：URL 粘贴入口
- Blog 生成衔接

## Capabilities

### New Capabilities
- `db-search-upgrade`: pg_trgm + embedding 并行搜索
- `deep-search-fix`: AI + Google 深搜重构，移除 OpenAlex
- `url-import`: 粘贴链接录入教授

### Modified Capabilities
_(none)_

## Impact

- `app/lib/services/professorAutoAdd.ts` — 移除 OpenAlex，重构 Claude 搜索
- `app/lib/services/professorService.ts` — 搜索升级
- `app/api/professors/import-from-url/route.ts` — 新建
- `app/koala/professors/ProfessorsClient.tsx` — 搜索 UI + URL 粘贴
- `app/lib/ratelimit.ts` — 新增限流器
- Supabase: 启用 pg_trgm，新增索引

## Acceptance Tests

1. 搜 "xianghaiAN" → DB 或 AI 深搜返回 Xianghai An
2. 搜 "wei wang sydney" → 返回悉尼大学的 Wei Wang
3. 粘贴 `profiles.sydney.edu.au/xianghai.an` → 正确录入
4. 粘贴 Google Scholar 链接 → 录入含 h-index
5. 粘贴 `weibo.com` → 拒绝
6. 重复粘贴同一 URL → 提示已存在
