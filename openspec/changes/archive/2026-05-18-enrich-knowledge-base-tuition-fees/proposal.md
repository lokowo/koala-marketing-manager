# Proposal: 知识库补充澳洲大学学费数据

## 问题
用户问 "USYD ECOS2002 学费多少" 时，Ola AI 回答 "我没有最新数据"。这类公开信息应该能直接回答。

## 现有架构调研

### AI 对话如何获取上下文
1. **FAQ 匹配**（关键词命中，优先于 LLM）→ 从 `ola_faq` 表查询，10 条已启用
2. **RAG 向量搜索**（FAQ 未命中时）→ 从 `knowledge_chunks` 表查询，用 pgvector 余弦相似度
3. **教授工具调用** → Claude 调用 `searchProfessors` 工具查 `professors` 表
4. **学术论文搜索** → Semantic Scholar API

### knowledge_chunks 表现状
- 总计 3,668 条（1 条缺 embedding）
- `professor_paper`: 3,527 条
- `guide`: 141 条（含生活成本、英语要求、选校指南等丰富内容）
- 有效的 source_type: `professor_paper`, `arc_grant`, `blog_post`, `faq`, `user_feedback`, `guide`, `professor_profile`, `manual`

### guides 表
不存在独立的 guides 表。所有指南内容存在 `knowledge_chunks` 中，source_type = `guide`。

### 关键发现
现有 141 条 guide 中已有 "澳洲各城市PhD学生生活成本对比（2026）" 和 "Go8各校英语要求详细对比"。**学费数据用同样的模式加入 `knowledge_chunks` 就能被 RAG 自动检索到，零代码改动。**

---

## 三个方案对比

### 方案 A：knowledge_chunks 指南（推荐）
把学费信息作为 `source_type='guide'` 写入 `knowledge_chunks`，每所大学一条。

```
source_type: 'guide'
source_title: 'University of Sydney 国际研究生学费指南（2026）'
content: '悉尼大学国际研究生学费（2026年）\n\n【PhD 学费】\n...'
```

- **优点**：零代码改动，利用现有 RAG pipeline，embedding 自动生成，AI 可自然引用
- **缺点**：向量搜索不保证 100% 命中（但已有指南都能正常被检索到）
- **工时**：2-3 小时（数据整理 + 通过 batch API 导入）
- **维护**：每年更新一次数据，通过 Admin 知识库页面操作

### 方案 B：结构化 university_fees 表
新建专用表，AI 检测到学费问题时查表注入 context。

```sql
CREATE TABLE university_fees (
  university TEXT, degree_level TEXT, faculty TEXT,
  annual_fee_aud NUMERIC, fee_year INT,
  domestic_or_international TEXT, source_url TEXT
);
```

- **优点**：精确查询，可做价格对比功能，数据结构清晰
- **缺点**：需改 chat route 加意图检测 + 查表逻辑，需建 Admin 管理页面
- **工时**：6-8 小时
- **维护**：需单独维护表 + Admin UI

### 方案 C：网页抓取 + RAG
爬取大学 fee 页面 HTML/PDF，embedding 后存入向量库。

- **优点**：最全面，涵盖所有细节
- **缺点**：抓取脚本 + 解析 + 定期更新 cron，最慢实现
- **工时**：10-15 小时
- **维护**：高——网页结构变化需更新爬虫

---

## 推荐：方案 A（knowledge_chunks 指南）

### 理由
1. **零代码改动** — RAG 管线已就绪，直接写数据即可
2. **模式已验证** — 141 条 guide 已在生产运行，"生活成本""英语要求"等指南都能被正确检索
3. **最快上线** — 2-3 小时整理数据 + 通过 `POST /api/admin/knowledge/batch` 导入
4. **可扩展** — 后续加本科学费、其他大学、奖学金金额都用同样方式

### MVP 范围
Go8 八校 × 国际研究生（PhD + Masters by Research），每校一条：

| 大学 | 预估条目 |
|------|---------|
| University of Sydney | 1 条 |
| UNSW | 1 条 |
| University of Melbourne | 1 条 |
| University of Queensland | 1 条 |
| ANU | 1 条 |
| Monash University | 1 条 |
| University of Western Australia | 1 条 |
| University of Adelaide | 1 条 |

共 8 条 guide，每条 300-500 字，包含：
- PhD 年学费范围（按学院分）
- Masters by Research 年学费范围
- RTP/国际奖学金学费减免说明
- Fee Estimator 链接
- 数据年份标注 + 来源 URL

### 后续可选
如果方案 A 上线后用户满意度高，可以考虑：
- 扩展到其他大学（ATN、IRU 联盟）
- 加一条 FAQ 入口（关键词 "学费""tuition"）做即时响应
- 如需更精确的按学院/按课程查询，再升级到方案 B

---

## 执行步骤（如果批准方案 A）

1. 手动从 Go8 大学官网收集 2025/2026 年国际研究生学费数据
2. 整理为 8 条 guide 格式的 markdown 文本
3. 通过 `POST /api/admin/knowledge/batch` 批量导入（embedding 自动生成）
4. 在 Ola AI 中测试 "USYD PhD 学费多少" 等查询
5. 确认 RAG 能正确检索到学费指南

**预估工时：2-3 小时**（不含审批等待时间）
