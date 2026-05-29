# Koala PhD — CV 数据模型规范 (CV-DATA-MODEL)
> 版本: V1.0 | 日期: 2026-05-29 | 状态: 权威依据，所有 CV 相关代码必须遵守
> 目的: 根治 CV 系统的字段打架、本科丢失、4 次下载退化问题

## 0. 背景
2026-05-28~29 排查发现 CV 系统核心问题是数据层混乱：
- student-context.ts 读 education_history 用错字段名（school/degree/start_date），实际是 institution/degree_type/start_year → 本科学历在源头丢失
- 聊天 CV 存 {personal,education,research} 结构，PDF 渲染器期望 {sections,skills} → 两套打架
- 三处存学历但没定义谁是权威源

## 1. 核心原则：不新建表
复用现有 5 张表，定义清楚分工：
- education_history / work_history = 学历/工作明细，唯一权威源（多条）
- user_profiles = 用户主档案 + 当前主要学校（冗余快照，不作 CV 数据源）
- user_documents = 上传的原始文件
- generated_documents = 生成的 CV 成品快照（不可变历史，多版本）

铁律：
1. 读学历/工作永远查 education_history / work_history，绝不从 user_profiles 或 CV 快照读
2. user_profiles 的 university/major 只用于快速展示
3. generated_documents.content 是生成那一刻的快照，不回写明细表

## 2. 权威表字段（与数据库 100% 对齐）

### education_history
institution(学校名,不是school) / institution_short(简称) / degree_type(本硕博,不是degree) / degree_name / major / major_code / start_year(int,不是start_date) / end_year(int) / status(current|completed) / gpa(numeric) / gpa_scale / country / city / sort_order / description / source(新增:upload|chat|manual)

### work_history
company / position / description / start_year(int) / end_year(int) / is_current(bool) / status / industry / sort_order / source(新增:upload|chat|manual)

### generated_documents
type(cv|email|rp|package) / professor_id(目标教授,流程B填) / application_id / title / content(jsonb,遵守§3) / status(draft|final) / credits_used / version(改写递增) / schema_version(新增,默认1)

### user_documents
file_name / file_url / file_type / file_size / institution / ai_parsed(bool) / ai_summary(JSON字符串)

## 3. 统一 CV content schema (schema_version=1)
所有生成 CV 的代码（聊天 route.ts、generate-cv、generate-cv-pdf）必须读写这一个结构。聊天端旧的 {personal,education,research} 扁平结构废弃。

```json
{
  "header": { "name": "英文名", "email": "", "phone": null, "address": null, "linkedin": null, "website": null },
  "sections": [
    { "title": "EDUCATION", "items": [
      { "title": "South China University of Technology", "subtitle": "B.Eng. in Electrical Engineering", "date": "2019 - 2023", "details": ["GPA: 2.78/4.00"], "needs_enhancement": false }
    ]},
    { "title": "RESEARCH EXPERIENCE", "items": [] },
    { "title": "WORK / INTERNSHIP", "items": [] },
    { "title": "PUBLICATIONS", "items": [] },
    { "title": "AWARDS & HONOURS", "items": [] }
  ],
  "skills": { "languages": [], "technical": [], "soft": [] }
}
```

强制规则：
1. 顶层只有 header / sections / skills 三个 key
2. 学历、工作、研究全进 sections，每类一个 section，多条=多个 item（本科和硕士都必须在 EDUCATION 里）
3. 全英文（学校名翻译成官方英文名，如 华南理工大学→South China University of Technology）。99% CV 全英文→PDF 用 Helvetica，无中文字体问题
4. 内容过简(<15词)标 needs_enhancement:true
5. 缺失信息用 "[To be added]"，绝不编造

## 4. 两个 CV 工作流

### 流程 A — 诊断式改写（用户已有 CV）
1. 上传 PDF → 存 user_documents → 原生 document 通道送 Claude，Ola 看懂 → 解析写入 education_history/work_history(source='upload') → 解析成功才扣次数，失败退还
2. Ola 读权威表，主动诊断问题（本科描述太简/缺量化成果/方向不突出）→ 提问
3. 用户回答 → 更新明细表
4. 生成 CV → 按§3 schema → 存 generated_documents(type='cv',professor_id=null,version+1,schema_version=1)

### 流程 B — 目标导向构建（无 CV，申请特定教授）
1. 选定目标教授（呼应导师匹配分系统）
2. 引导式提问：申请谁/什么方向/有何经历 → 边问边写 education_history/work_history(source='chat')
3. 结合教授研究方向生成针对性 CV → 存 generated_documents(type='cv',professor_id=目标教授,schema_version=1)

共用同一套表，区别仅在数据来源(upload vs chat)和 professor_id 填不填。

## 5. 数据库变更（已由管理员手动执行完成，此处仅作记录）
```sql
ALTER TABLE generated_documents ADD COLUMN IF NOT EXISTS schema_version integer DEFAULT 1;
ALTER TABLE education_history ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';
ALTER TABLE work_history ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';
```

## 6. 代码修复清单
1. [P0] lib/server/student-context.ts: 字段名 school→institution, degree→degree_type, start_date→start_year, end_date→end_year, order 同改
2. [P0] api/ai/chat/route.ts: 聊天CV content 改输出§3统一schema（废弃扁平结构）
3. [P1] api/user/generate-cv/route.ts: 确认与§3一致
4. [P1] api/user/generate-cv-pdf/route.ts: 确认与§3一致
5. [P1] 去重: "新南威尔士大学"与"UNSW"识别为同一校
6. [P1] 上传通道: 聊天上传PDF走原生document，解析成功才扣费
