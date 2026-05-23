# Koala PhD 模糊记忆系统 — 技术文档

> 版本: 1.0 | 日期: 2026-05-23

---

## 一、架构对比：旧方式 vs 新方式

### 旧方式（结构化表单收集）

```
用户聊天 → Ola 主动问「说说你的背景」→ 用户说一段话 →
LLM 提取为固定 JSON → 存入 user_profiles 表 →
每次新对话需要重新收集或手动加载
```

**数据结构：** 固定字段
```json
{
  "name": "Zhang San",
  "university": "Wuhan University",
  "major": "Computer Science",
  "degree_level": "master",
  "gpa": 3.8,
  "research_interests": ["medical imaging", "deep learning"],
  "publications": [{ "title": "...", "venue": "CVPR" }],
  "target_preferences": { "university_group": "Go8" }
}
```

**问题：**
- 像填表，用户体验差
- 一次性收集，信息不会随对话自然积累
- 用户说「我最近发了新论文」，系统不知道怎么更新
- 新对话不会自动加载，等于白存了
- 无法记住非结构化信息（比如「不想去偏远城市」「家里开服装厂」）

### 新方式（三层模糊记忆）

```
用户随意聊天 → Ola 自然对话 → 后台异步提取关键事实 →
存为自然语言片段 → 冲突检测自动更新 →
下次对话自动加载 → Ola 已经认识用户了
```

**数据结构：** 自然语言片段
```
user_memories 表:
| memory_text                          | category    | confidence |
|--------------------------------------|-------------|------------|
| 武汉大学计算机硕士                      | education   | 0.95       |
| GPA 3.8                              | academic    | 0.90       |
| 对医学影像分割方向感兴趣                | research    | 0.85       |
| 发过一篇 CVPR Workshop 2025 论文       | publication | 0.95       |
| 家里开服装厂，假期帮忙                  | personal    | 0.70       |
| 想去 Go8 大学                         | preference  | 0.80       |
| 不想去偏远城市                         | preference  | 0.75       |
| Python 和 PyTorch 熟练                | skill       | 0.85       |
| IELTS 7.0                            | language    | 0.90       |
```

---

## 二、三层架构详解

### Layer 1 — 模糊记忆（用户感知层）

**存储：** user_memories 表
**写入时机：** 每次对话的第1条消息后 + 之后每5轮
**写入方式：** 后台异步，不阻塞对话

**核心函数：**

```
extractMemories(messages, userId, conversationId)
├── 输入: 本次对话的完整消息数组
├── 处理: 用 Claude Haiku 从对话中提取事实
├── 过滤: 只保留 confidence >= 0.6 的记忆
├── 分类: 9 个 category（education/academic/research/
│         publication/preference/personal/experience/skill/language）
└── 输出: [{ memory_text, category, confidence }]

saveMemories(supabase, userId, memories, conversationId)
├── 查询已有 memories
├── 冲突检测: 同 category 且语义矛盾 → 更新旧记录
├── 去重: 完全相同的 memory_text → 跳过
└── 新信息: 写入新记录

loadMemories(supabase, userId)
├── 查询 is_active = true 的所有记忆
├── 按 category 分组
└── 返回分组后的记忆对象

formatMemoriesForPrompt(memories)
├── 将分组记忆格式化为 system prompt 注入文本
└── 格式: 「【教育背景】武汉大学计算机硕士...
           【研究兴趣】医学影像分割...」
```

**Prompt 注入示例：**
```
你对这个用户已有的了解：
【教育背景】武汉大学计算机硕士，GPA 3.8，预计2027年毕业
【研究兴趣】医学影像分割，Attention 机制
【论文发表】CVPR Workshop 2025 (1篇)
【个人偏好】想去 Go8 大学，需要奖学金，偏好墨尔本或悉尼
【技能】Python, PyTorch 熟练

基于以上已知信息自然对话。不要重复询问已知信息。
当用户提供新信息时自然接收并记住。
```

### Layer 2 — 结构化合成（算法需要层）

**存储：** user_profiles 表
**写入时机：** 每次 extractAndSaveMemories 完成后
**写入方式：** LLM 将所有 memories 合成为结构化 JSON

**核心函数：**
```
syncToProfile(supabase, userId)
├── 加载所有 active memories
├── 用 Haiku 合成为结构化 JSON:
│   { university, major, gpa, research_interests[],
│     publications[], target_preferences{} }
└── 写入 user_profiles 表
```

**为什么需要这一层：**
教授匹配算法需要结构化数据来做向量搜索（research_interests → embedding → pgvector cosine similarity）。模糊记忆是自然语言，不能直接做向量匹配。所以 Layer 2 是 Layer 1 的派生物，用户无感。

### Layer 3 — 可视化知识卡（用户可查看层）

**页面：** /koala/my-profile/memories
**功能：**
- 按 category 分组展示所有 memories
- 每条显示：文本 + 置信度标签(高/中/低) + 来源时间
- 可编辑（铅笔图标，Enter保存）
- 可删除（X图标，设 is_active=false）
- 空状态：「和 Ola 多聊聊，她会慢慢了解你的」

---

## 三、与 ProfileCard 的关系

ProfileCard 没有废弃，变成了**快速启动工具**：

```
场景 A（新用户，愿意快速建档）：
用户触发画像收集 → 语音/文字输入 → AI提取 → ProfileCard展示 →
用户确认 → profileCardToMemories() 将每个字段拆为独立 memory 写入

场景 B（新用户，只想随便聊聊）：
用户自由聊天 → 后台每5轮异步提取 memories → 信息自然积累 →
下次来 Ola 已经认识他了

场景 C（老用户，信息更新）：
用户说「我最近又发了一篇论文」→ 下一次提取时自动新增 memory →
syncToProfile 更新结构化画像
```

---

## 四、行业对比

### 我们的方案 vs 主流 AI 记忆框架

| 维度 | Koala PhD | Letta/MemGPT | Mem0 | ChatGPT Memory |
|------|-----------|--------------|------|----------------|
| 记忆类型 | 分类片段 + 合成结构 | 分层(Core/Recall/Archival) | 向量+图谱 | 扁平文本片段 |
| 记忆管理 | 后台提取 + 用户可编辑 | Agent 自主管理 | API管理 | 用户手动 |
| 冲突处理 | 同类语义冲突自动覆盖 | Agent 自决 | 图谱合并 | 无 |
| 结构化输出 | 有（Layer 2 合成） | 无内置 | 有 | 无 |
| 持久化 | PostgreSQL | 自带Server | 云服务 | OpenAI服务器 |
| 成本 | Haiku提取~$0.002/次 | 需要独立部署 | $99/月起 | 包含在Plus中 |
| 可视化 | 分类知识卡页面 | ADE调试工具 | API查看 | 设置页列表 |

### 我们的优势
1. **成本极低**：用 Haiku 做提取，每次 ~$0.002，不需要额外部署服务
2. **双层输出**：模糊记忆供对话用，结构化画像供算法用，一举两得
3. **用户可控**：知识卡页面让用户看到并编辑 Ola 的记忆
4. **冲突检测**：同类记忆语义冲突时自动覆盖，不会出现矛盾
5. **渐进式**：兼容 ProfileCard 快速启动，也支持纯对话积累

### 我们的不足（与 Letta 相比）
1. **非 Agent 自主管理**：我们的记忆提取是后台进程，不是 Agent 自己决定记什么
2. **无召回记忆**：Letta 有 recall memory（对话历史搜索），我们没有
3. **无主动遗忘**：记忆只增不减（除非用户手动删），没有自动过期机制
4. **无跨会话推理**：不能基于过去多次对话做跨会话推理

### 后续可优化方向
1. 增加 recall memory：用 pgvector 存历史对话 embedding，支持语义搜索
2. 增加主动遗忘：超过 6 个月未更新的低置信度记忆自动标记为 inactive
3. Agent 自主记忆：让 Ola 在对话中主动调用 remember/forget 工具
4. 记忆置信度衰减：随时间降低旧记忆的 confidence，新信息自动覆盖

---

## 五、数据库 Schema

```sql
CREATE TABLE user_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  memory_text text NOT NULL,
  category text NOT NULL CHECK (category IN (
    'education','academic','research','publication',
    'preference','personal','experience','skill','language'
  )),
  confidence float DEFAULT 0.8,
  source_conversation_id text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

---

## 六、成本分析

| 操作 | 模型 | 成本/次 |
|------|------|---------|
| 记忆提取 (extractMemories) | Claude Haiku | ~$0.002 |
| 画像合成 (syncToProfile) | Claude Haiku | ~$0.003 |
| 记忆加载 (loadMemories) | DB查询 | ~$0.000 |
| 记忆注入 (formatMemoriesForPrompt) | 纯字符串 | $0.000 |

每个用户每次对话的记忆成本 ≈ $0.005（提取+合成）。
1000 个活跃用户/月 = $5/月。极低。
