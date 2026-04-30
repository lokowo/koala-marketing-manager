# Koala 学术知识库系统 — 完整设计方案
# docs/academic-knowledge-spec.md

---

## 一、我们能用的免费学术 API（全部免费）

| API | 论文量 | 覆盖领域 | 需要 Key | 限速 | 我们用来做什么 |
|---|---|---|---|---|---|
| **Semantic Scholar** | 2 亿+ | 全学科 | 可选（有 key 更快） | 1 req/s（无 key）| 主力论文搜索 + 作者信息 |
| **OpenAlex** | 2.5 亿+ | 全学科 | 免费 key | 宽松（$1/天免费额度） | 补充搜索 + 机构数据 + 引用链 |
| **arXiv** | 240 万+ | 物理/CS/数学/工程 | 不需要 | 3 秒间隔 | 最新预印本（理工科最重要） |
| **Springer Nature OA** | 百万级 | 全学科 | 免费 key | 宽松 | 开放获取全文摘要 |
| **Crossref** | 1.5 亿+ | 全学科 | 不需要 | 50 req/s（带邮箱） | DOI 元数据验证 |
| **Unpaywall** | 4000 万+ | 全学科 | 邮箱即可 | 100k/天 | 查找论文的免费全文链接 |

**核心组合策略**：Semantic Scholar（主力）+ OpenAlex（补充）+ arXiv（最新预印本）

不需要付费的 Scopus 或 Web of Science。

---

## 二、知识库三层架构

```
用户提问："海水电池的锌阳极腐蚀怎么解决？"
                    ↓
         ┌─────────────────────┐
         │   Layer 1: 实时检索   │  ← 每次提问都实时搜索，不存储
         │                     │
         │ Semantic Scholar API │  → 搜索 "zinc anode corrosion seawater battery"
         │ + arXiv API         │  → 返回最新 15 篇论文的标题+摘要+DOI
         │ + OpenAlex API      │  → 补充引用数据 + 开放获取链接
         └─────────────────────┘
                    ↓
         ┌─────────────────────┐
         │   Layer 2: 预存知识库  │  ← 提前向量化好的内容，Supabase pgvector
         │                     │
         │ 来源 A: 教授论文摘要  │  → 采集教授时同步存入（自动）
         │ 来源 B: ARC 项目摘要  │  → ARC 同步时存入（自动）
         │ 来源 C: 博客文章     │  → 发布时存入（自动）
         │ 来源 D: KSA FAQ     │  → 一次性导入
         │ 来源 E: 用户反馈修正  │  → Admin 审核后存入
         └─────────────────────┘
                    ↓
         ┌─────────────────────┐
         │   Layer 3: 教授关联   │  ← 从教授数据库中匹配相关教授
         │                     │
         │ 搜索 research_tags   │  → "谁在澳洲做类似研究？"
         │ 包含项目信息         │  → "他有什么 ARC 项目？"
         └─────────────────────┘
                    ↓
         ┌─────────────────────┐
         │  Claude 综合分析      │  ← 把三层结果拼成上下文
         │  + 反幻觉约束        │
         │  + 引用强制          │
         │  + 置信度标注        │
         └─────────────────────┘
                    ↓
              用户看到的回答
         （带 Reference 链接 + 置信度 + 延伸阅读）
```

---

## 三、实时检索引擎详细设计

### 3.1 搜索流程（每次用户提问时执行）

```typescript
// app/lib/server/academic-search.ts

/**
 * 并行搜索三个学术 API
 * 总耗时 ≈ 最慢的那个 API 响应时间（约 2-5 秒）
 */
async function searchAcademicSources(query: string): Promise<AcademicSearchResult> {
  
  // Step 1: Claude 提取英文学术关键词（用户可能用中文提问）
  const keywords = await extractSearchKeywords(query);
  // 输入："海水电池锌阳极腐蚀"
  // 输出：["zinc anode corrosion seawater battery", "zinc cathode degradation aqueous"]
  
  // Step 2: 并行搜索三个来源
  const [semanticResults, arxivResults, openalexResults] = await Promise.all([
    searchSemanticScholar(keywords, { limit: 10, yearFrom: 2022 }),
    searchArxiv(keywords, { limit: 5, sortBy: 'relevance' }),
    searchOpenAlex(keywords, { limit: 5, yearFrom: 2022 }),
  ]);
  
  // Step 3: 去重合并（按 DOI 去重）
  const merged = deduplicateByDOI([...semanticResults, ...arxivResults, ...openalexResults]);
  
  // Step 4: 排序（引用数 × 新鲜度）
  const ranked = rankPapers(merged);
  
  // Step 5: 为每篇论文查找免费全文链接
  const withLinks = await enrichWithOpenAccessLinks(ranked.slice(0, 15));
  
  return {
    papers: withLinks,
    searchQueries: keywords,
    sources: ['Semantic Scholar', 'arXiv', 'OpenAlex'],
    totalFound: merged.length,
  };
}
```

### 3.2 各 API 调用细节

```typescript
// ---- Semantic Scholar ----
async function searchSemanticScholar(keywords: string[], options) {
  const query = keywords[0]; // 用第一个关键词组合
  const url = `https://api.semanticscholar.org/graph/v1/paper/search`;
  const params = new URLSearchParams({
    query,
    limit: String(options.limit || 10),
    fields: 'paperId,title,abstract,year,citationCount,journal,externalIds,url,authors,openAccessPdf',
    year: `${options.yearFrom || 2022}-`,
    sort: 'citationCount:desc',
  });
  
  const headers = { 'Accept': 'application/json' };
  if (process.env.SEMANTIC_SCHOLAR_API_KEY) {
    headers['x-api-key'] = process.env.SEMANTIC_SCHOLAR_API_KEY;
  }
  
  const resp = await fetch(`${url}?${params}`, { headers, signal: AbortSignal.timeout(8000) });
  // ... 返回标准化格式
}

// ---- arXiv ----
async function searchArxiv(keywords: string[], options) {
  const query = keywords.map(k => `all:${k}`).join('+AND+');
  const url = `http://export.arxiv.org/api/query?search_query=${query}&start=0&max_results=${options.limit || 5}&sortBy=relevance`;
  
  const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
  const xml = await resp.text();
  // 解析 XML → 标准化格式
  // arXiv 返回的是 Atom XML，需要解析
}

// ---- OpenAlex ----
async function searchOpenAlex(keywords: string[], options) {
  const query = keywords[0].replace(/ /g, '+');
  const url = `https://api.openalex.org/works?search=${query}&sort=cited_by_count:desc&per_page=${options.limit || 5}&filter=from_publication_date:${options.yearFrom || 2022}-01-01`;
  
  const headers = { 'Accept': 'application/json' };
  if (process.env.OPENALEX_API_KEY) {
    headers['Authorization'] = `Bearer ${process.env.OPENALEX_API_KEY}`;
  }
  // OpenAlex 建议在请求中带邮箱以获得更高优先级
  // mailto: info@koalastudy.net
  
  const resp = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
  // ... 返回标准化格式
}
```

### 3.3 标准化论文格式（统一三个 API 的输出）

```typescript
interface AcademicPaper {
  id: string;                    // 内部 ID
  title: string;                 // 论文标题
  authors: string[];             // 作者列表
  year: number;                  // 发表年份
  journal: string;               // 期刊名
  abstract: string;              // 摘要（用于 AI 分析）
  citations: number;             // 引用数
  doi: string | null;            // DOI
  doiUrl: string | null;         // https://doi.org/xxx
  openAccessUrl: string | null;  // 免费全文链接（如果有）
  arxivId: string | null;        // arXiv ID（如果有）
  arxivUrl: string | null;       // https://arxiv.org/abs/xxx
  source: 'semantic_scholar' | 'arxiv' | 'openalex';  // 来自哪个 API
  
  // 前端展示用
  referenceText: string;         // "Zhang et al., 2025, J. Power Sources"
  referenceLink: string;         // 优先级: openAccessUrl > doiUrl > arxivUrl
}
```

---

## 四、前端展示设计（用户看到什么）

### 4.1 科研深潜模式的 AI 回答结构

```
用户问："海水电池锌阳极腐蚀怎么解决？"

Koala 学长回答：

┌──────────────────────────────────────┐
│ 🔬 科研深潜 · Research Deep Dive     │
├──────────────────────────────────────┤
│                                      │
│ 海水电池锌阳极腐蚀解决方案           │
│ 🟢 高置信（基于 8 篇论文）           │
│                                      │
│ 目前主要有三个突破方向：              │
│                                      │
│ 1. 合金化策略                        │
│ Zn-Cu 和 Zn-Ni 合金可以提高析氢      │
│ 过电位，降低腐蚀速率约 40%。          │
│                                      │
│ ┌────────────────────────────────┐  │  ← 论文引用卡片（可点击）
│ │ 📄 Anti-Corrosion Strategies    │  │
│ │    for Zinc Anodes...           │  │
│ │ Li et al. · 2025               │  │
│ │ J. Power Sources · 34 cites    │  │
│ │ [🔗 查看论文] [📋 复制引用]     │  │  ← 链接到免费全文或 DOI
│ └────────────────────────────────┘  │
│                                      │
│ 2. MOF 衍生碳涂层                    │
│ ZIF-8 衍生碳可形成人工 SEI 膜...      │
│ 🟡 中置信（基于 2 篇论文）           │
│                                      │
│ ┌────────────────────────────────┐  │
│ │ 📄 MOF-Derived Carbon for       │  │
│ │    Energy Storage...            │  │
│ │ Zhang et al. · 2024            │  │
│ │ Adv. Funct. Mater. · 112 cites │  │
│ │ [🔗 查看论文] [📋 复制引用]     │  │
│ └────────────────────────────────┘  │
│                                      │
│ 3. 电解液添加剂                      │
│ ⚠ 此方向来自一般领域知识，            │
│   未找到特定可引用论文，请自行验证    │
│                                      │
│ ── 延伸阅读 ──                       │
│                                      │
│ 📚 共检索到 15 篇相关论文             │
│ 来源：Semantic Scholar + arXiv +      │
│       OpenAlex                       │
│                                      │
│ 📄 Recent Progress in Aqueous...     │
│    ACS Energy Lett. 2025 · 89 cites  │
│    [🔗 查看] [📥 PDF]                │
│                                      │
│ 📄 Zinc-Air Battery for Marine...    │
│    Nature Energy 2024 · 156 cites    │
│    [🔗 查看] [📥 PDF]                │
│                                      │
│ 📄 Surface Engineering of Zinc...    │
│    Energy Storage Mater. 2024        │
│    [🔗 查看]                         │
│                                      │
│ [查看全部 15 篇 ▼]                   │
│                                      │
│ ── 澳洲相关教授 ──                   │
│                                      │
│ 💡 这个方向在澳洲有教授在做：         │
│ ┌────────────────────────────────┐  │
│ │ Prof. Ming Zhang · Monash       │  │
│ │ 新能源材料/电池 · h-index 72    │  │
│ │ ARC Linkage 项目在研            │  │
│ │ [查看教授详情 →]                │  │
│ └────────────────────────────────┘  │
│                                      │
│ ── 反馈 ──                           │
│ 这个回答有帮助吗？                    │
│ [👍 准确] [🤔 部分] [👎 不准] [📝 纠正]│
│                                      │
│ ── 知识来源 ──                       │
│ 📡 实时检索：Semantic Scholar (8篇)   │
│    + arXiv (3篇) + OpenAlex (4篇)    │
│ 📚 知识库：2 个匹配段落              │
│ 👨‍🔬 教授库：1 位相关教授              │
│                                      │
│ 检索完成于 2026-04-29 10:30 AEST     │
│ 数据实时获取，Koala 不对论文内容      │
│ 的准确性负责，请自行验证。            │
└──────────────────────────────────────┘
```

### 4.2 论文引用卡片组件

```typescript
// app/components/ai/PaperCitationCard.tsx

interface PaperCitationCardProps {
  paper: AcademicPaper;
  compact?: boolean;  // 行内小卡片 vs 完整卡片
}

// 完整卡片展示：
// ┌────────────────────────────────────┐
// │ 📄 论文标题（可点击跳转）            │
// │ 作者1, 作者2 et al.                 │
// │ 期刊名 · 年份 · 引用数 cites        │
// │                                    │
// │ [🔗 查看论文]  [📥 PDF]  [📋 复制引用]│
// └────────────────────────────────────┘
//
// "查看论文"按钮的链接优先级：
// 1. openAccessUrl（免费全文，最好）
// 2. arxivUrl（预印本，也是免费的）
// 3. doiUrl（可能要付费，但至少能看摘要）
//
// "PDF" 按钮只在 openAccessUrl 或 arxivUrl 存在时显示
//
// "复制引用" → 复制 APA 格式引用到剪贴板：
// Zhang, L., et al. (2025). Title. Journal, Vol(Issue), Pages. https://doi.org/xxx
```

### 4.3 置信度标注规则

```typescript
// 自动判断置信度等级

function calculateConfidence(
  claim: string, 
  supportingPapers: AcademicPaper[],
  knowledgeChunks: any[]
): ConfidenceLevel {
  
  const totalSources = supportingPapers.length + knowledgeChunks.length;
  
  if (totalSources >= 3) {
    return {
      level: 'high',
      icon: '🟢',
      label: '高置信',
      description: `基于 ${totalSources} 篇论文/知识源的共识性结论`,
    };
  }
  
  if (totalSources >= 1) {
    return {
      level: 'mid', 
      icon: '🟡',
      label: '中置信',
      description: `基于 ${totalSources} 篇论文/知识源`,
    };
  }
  
  if (/* AI 从一般知识推理 */) {
    return {
      level: 'low',
      icon: '🔴', 
      label: '低置信',
      description: '基于推理，无直接论文支持',
    };
  }
  
  return {
    level: 'unknown',
    icon: '⚠',
    label: '未验证',
    description: '来自一般知识，未找到可引用来源，请自行验证',
  };
}
```

---

## 五、"我不知道"机制（最重要的反幻觉设计）

```
当检索结果为空或不相关时，Koala 必须诚实说：

┌──────────────────────────────────────┐
│ 🔬 科研深潜                           │
│                                      │
│ 关于你问的"XXX 具体工艺参数"，        │
│ 目前我的知识库中没有足够可靠的信息。   │
│                                      │
│ ⚠ 我不想给你不准确的回答。            │
│                                      │
│ 建议你通过以下方式查找：               │
│                                      │
│ 🔍 Google Scholar 搜索：              │
│ [zinc anode corrosion seawater        │
│  battery fabrication parameters]      │
│ → 点击直接搜索                        │  ← 可点击链接
│                                      │
│ 🔍 Semantic Scholar 搜索：            │
│ [同上关键词]                          │
│ → 点击直接搜索                        │
│                                      │
│ 📄 或者你可以上传你正在读的论文，      │
│ 我来帮你分析里面的方法和参数。         │
│ [📎 上传论文 PDF]                     │
│                                      │
│ 💡 也可以试试换个角度问我：            │
│ · "锌阳极保护的主流方法有哪些？"      │
│ · "MOF 涂层的制备方法概述"            │
│ · "电化学腐蚀的评估指标"              │
│                                      │
└──────────────────────────────────────┘
```

---

## 六、知识库自动增长飞轮

```
用户提问 → AI 回答 → 用户反馈
                         ↓
               👎 "不准确" 或 📝 "补充纠正"
                         ↓
            进入 Admin 审核队列
                         ↓
            Admin 分析：是哪个领域薄弱？
                         ↓
        ┌────────────────────────────┐
        │ 自动补充：                  │
        │ 搜索该领域 Top 10 综述论文   │
        │ 提取摘要 → 向量化 → 入知识库 │
        └────────────────────────────┘
                         ↓
        下次用户问同类问题 → 回答质量提升
                         ↓
               更多 👍 → 更多用户使用
```

---

## 七、与其他模式的联动

科研深潜不是独立的——它跟其他三个模式有数据联动：

```
科研深潜 → 路径评估：
"你刚才问的量子传感问题，UNSW 的 Prof. Chen 正好在做这个方向。
 要不要我帮你评估一下跟他读博的匹配度？"
[切换到路径评估 →]

科研深潜 → 文案撰写：
"基于你刚才讨论的 zinc cathode 方向，
 我可以帮你写一个初步的 Research Proposal 大纲。"
[切换到文案模式 →]

科研深潜 → 陪伴：
"看起来你在这个方向上已经做了很多调研了！
 有没有什么让你纠结的？比如方向选择或者导师偏好？"
[切换到陪伴模式 →]
```

---

## 八、给 Claude Code 的实现指令

```
请按照 docs/academic-knowledge-spec.md 实现学术知识库系统：

1. 创建 app/lib/server/academic-search.ts
   - searchAcademicSources()：并行搜索 Semantic Scholar + arXiv + OpenAlex
   - extractSearchKeywords()：用 Claude 从中文提问提取英文学术关键词
   - searchSemanticScholar()：调用 SS API
   - searchArxiv()：调用 arXiv API（返回 XML，需解析）
   - searchOpenAlex()：调用 OpenAlex API
   - deduplicateByDOI()：按 DOI 去重合并
   - rankPapers()：按引用数×新鲜度排序
   - enrichWithOpenAccessLinks()：查找免费全文链接

2. 创建 app/components/ai/PaperCitationCard.tsx
   - 完整卡片模式和行内紧凑模式
   - "查看论文"链接（优先免费全文 > arXiv > DOI）
   - "下载 PDF"按钮（只在有免费全文时显示）
   - "复制引用"按钮（APA 格式）
   
3. 创建 app/components/ai/ConfidenceBadge.tsx
   - 四级置信度：🟢高/🟡中/🔴低/⚠未验证
   - 悬浮提示解释含义

4. 创建 app/components/ai/ExtendedReadingPanel.tsx
   - 折叠面板，展开显示全部检索到的论文列表
   - 每篇含标题+作者+期刊+年份+引用数+链接

5. 创建 app/components/ai/DontKnowResponse.tsx
   - "我不知道"的标准化组件
   - Google Scholar 搜索链接（预填关键词）
   - Semantic Scholar 搜索链接
   - 上传论文入口
   - 换个角度提问的建议

6. 更新 app/api/ai/chat/route.ts 的 research 模式：
   - 调用 academic-search.ts 做实时检索
   - 调用 rag-engine.ts 做知识库检索
   - 调用 matching-engine.ts 做教授关联
   - 三个 Promise.all 并行
   - Claude 综合回答时的 System Prompt 包含反幻觉指令
   - 后处理：自动标注置信度、检查无来源的数据点

7. 在 .env.local 中新增：
   OPENALEX_API_KEY=（去 openalex.org/settings/api 免费获取）
   
   arXiv API 不需要 key

所有论文链接必须是真实可点击的（DOI/arXiv/OpenAccess URL）。
绝不编造论文标题、作者、DOI。查不到就用"我不知道"组件。
直接实现，不用等我确认。
```
