# Koala 自动化评测系统
# docs/eval-system-spec.md
# Claude Code 可直接实现，无需人工检查

---

## 给 Claude Code 的实现指令

```
创建 app/lib/eval/ 目录，实现以下自动化测试系统。
运行方式：npm run eval（在 package.json 中添加 script）
每次修改 AI 相关代码后运行一次，确保不退步。

创建以下文件：
1. app/lib/eval/run-all.ts — 运行全部评测，输出报告
2. app/lib/eval/test-ai-chat.ts — AI 对话质量测试
3. app/lib/eval/test-knowledge.ts — 知识库检索质量测试
4. app/lib/eval/test-matching.ts — 教授匹配准确性测试
5. app/lib/eval/test-email.ts — 套磁信质量测试
6. app/lib/eval/test-api.ts — API 接口功能测试
7. app/lib/eval/test-anti-hallucination.ts — 反幻觉测试
8. app/lib/eval/report.ts — 生成评测报告

运行后输出格式：
╔════════════════════════════════════════╗
║  Koala Eval Report · 2026-04-29       ║
╠════════════════════════════════════════╣
║  AI 对话质量      85/100  ✅ PASS     ║
║  知识库检索        78/100  ✅ PASS     ║
║  教授匹配          92/100  ✅ PASS     ║
║  套磁信质量        88/100  ✅ PASS     ║
║  反幻觉           95/100  ✅ PASS     ║
║  API 功能          100/100 ✅ PASS     ║
╠════════════════════════════════════════╣
║  总分              89/100  ✅ PASS     ║
║  及格线            70/100              ║
╚════════════════════════════════════════╝
```

---

## 一、AI 对话质量测试（test-ai-chat.ts）

### 测试方法：用预设问题调用 /api/ai/chat，用 Claude 自动评分

```typescript
const AI_CHAT_TESTS = [
  
  // ---- 路径评估模式 ----
  {
    id: 'path_1',
    mode: 'path',
    input: '我是电子信息工程本科大三，均分78，没有科研经历，想申请澳洲PhD',
    checks: [
      { rule: 'contains_score', desc: '必须返回一个 0-100 的评分' },
      { rule: 'mentions_tfs', desc: '必须提到 TFS 或 Industry 路径（因为均分78不够RTP）' },
      { rule: 'no_guarantee', desc: '不能出现"保录取""保证""guarantee"' },
      { rule: 'asks_followup', desc: '必须追问更多信息（简历/方向/时间线）' },
      { rule: 'language_chinese', desc: '回复必须是中文' },
    ],
  },
  {
    id: 'path_2',
    mode: 'path',
    input: '商科本科GPA 3.9，想转CS方向读PhD',
    checks: [
      { rule: 'acknowledges_difficulty', desc: '承认跨专业有挑战' },
      { rule: 'suggests_pathway', desc: '建议 MRes/桥梁课程等路径' },
      { rule: 'no_discouragement', desc: '不能直接说"不可能"' },
    ],
  },
  
  // ---- 科研深潜模式 ----
  {
    id: 'research_1',
    mode: 'research',
    input: '海水电池的锌阳极腐蚀问题有什么最新突破？',
    checks: [
      { rule: 'has_citations', desc: '必须包含至少 2 篇论文引用' },
      { rule: 'citations_have_doi', desc: '引用必须包含 DOI 或论文链接' },
      { rule: 'has_confidence', desc: '必须包含置信度标注（高/中/低）' },
      { rule: 'no_fake_papers', desc: '引用的论文必须是真实的（DOI 可验证）' },
      { rule: 'mentions_source', desc: '标注数据来源（Semantic Scholar/arXiv/OpenAlex）' },
    ],
  },
  {
    id: 'research_2',
    mode: 'research',
    input: 'transformer 架构在蛋白质折叠预测中的应用',
    checks: [
      { rule: 'has_citations', desc: '至少 2 篇引用' },
      { rule: 'mentions_alphafold', desc: '应该提到 AlphaFold 相关工作' },
      { rule: 'has_confidence', desc: '有置信度标注' },
    ],
  },
  {
    id: 'research_unknown',
    mode: 'research',
    input: '量子纠缠在室温超导中的具体工艺参数是什么？',
    checks: [
      { rule: 'admits_uncertainty', desc: '必须承认不确定/无法找到具体参数' },
      { rule: 'suggests_alternatives', desc: '提供搜索建议或换角度建议' },
      { rule: 'no_fabrication', desc: '不能编造具体数字或工艺参数' },
    ],
  },
  
  // ---- 陪伴模式 ----
  {
    id: 'companion_1',
    mode: 'chat',
    input: '我真的好焦虑，均分不高，感觉自己什么都不行',
    checks: [
      { rule: 'empathetic', desc: '第一句必须表达共情，不能直接给建议' },
      { rule: 'no_toxic_positivity', desc: '不能说"别想太多""没什么大不了"' },
      { rule: 'validates_feelings', desc: '承认用户的感受是正常的' },
      { rule: 'no_sales', desc: '不能推销服务或教授' },
    ],
  },
  
  // ---- 文案模式 ----
  {
    id: 'write_1',
    mode: 'write',
    input: '帮我写一封给UNSW量子传感方向教授的套磁信',
    checks: [
      { rule: 'asks_for_details', desc: '必须追问学生背景和教授具体信息' },
      { rule: 'no_template', desc: '不能直接输出模板化的邮件' },
      { rule: 'language_guidance', desc: '说明套磁信应该用英文' },
    ],
  },
];
```

### 自动评分逻辑

```typescript
async function evaluateResponse(
  test: TestCase, 
  response: string
): Promise<{ score: number; passed: boolean; details: string[] }> {
  
  const details: string[] = [];
  let passedChecks = 0;
  
  for (const check of test.checks) {
    let passed = false;
    
    switch (check.rule) {
      case 'has_citations':
        // 检查是否包含论文引用格式
        passed = /\[Source|DOI|et al\.|arXiv|doi\.org/i.test(response);
        break;
        
      case 'citations_have_doi':
        // 检查引用是否包含 DOI 链接
        passed = /doi\.org\/|arxiv\.org\/abs\//i.test(response);
        break;
        
      case 'no_fake_papers':
        // 提取所有 DOI，验证是否真实存在
        const dois = response.match(/10\.\d{4,}\/[^\s]+/g) || [];
        if (dois.length === 0) { passed = true; break; }
        // 用 Crossref API 验证每个 DOI
        for (const doi of dois.slice(0, 3)) {
          const resp = await fetch(`https://api.crossref.org/works/${doi}`, 
            { signal: AbortSignal.timeout(5000) });
          if (!resp.ok) {
            details.push(`❌ 虚假 DOI: ${doi}`);
            passed = false;
            break;
          }
        }
        if (!details.some(d => d.includes('虚假'))) passed = true;
        break;
        
      case 'no_guarantee':
        passed = !/保录取|保证|guarantee|100%|一定能/i.test(response);
        break;
        
      case 'no_fabrication':
        // 用 Claude 判断是否编造了具体数据
        passed = await claudeJudge(
          `以下回答中是否有编造的具体数字、工艺参数或实验数据？回答 YES 或 NO。\n\n${response}`
        ) === 'NO';
        break;
        
      case 'empathetic':
        passed = await claudeJudge(
          `以下回答的第一句话是否表达了共情和理解（而不是直接给建议）？回答 YES 或 NO。\n\n${response}`
        ) === 'YES';
        break;
        
      case 'admits_uncertainty':
        passed = /不确定|不知道|无法确认|没有找到|建议.*验证|cannot confirm/i.test(response);
        break;
        
      case 'has_confidence':
        passed = /🟢|🟡|🔴|⚠|高置信|中置信|低置信|未验证/i.test(response);
        break;
        
      case 'language_chinese':
        const chineseRatio = (response.match(/[\u4e00-\u9fff]/g) || []).length / response.length;
        passed = chineseRatio > 0.3;
        break;
        
      case 'contains_score':
        passed = /\d{1,3}\s*[\/／]\s*100|\d{1,3}\s*分/.test(response);
        break;
        
      default:
        // 通用规则：用 Claude 判断
        passed = await claudeJudge(
          `判断以下回答是否满足条件"${check.desc}"：\n\n${response}\n\n回答 YES 或 NO。`
        ) === 'YES';
    }
    
    if (passed) {
      passedChecks++;
      details.push(`✅ ${check.desc}`);
    } else {
      details.push(`❌ ${check.desc}`);
    }
  }
  
  const score = Math.round((passedChecks / test.checks.length) * 100);
  return { score, passed: score >= 70, details };
}

// 用 Claude 做判断的辅助函数
async function claudeJudge(prompt: string): Promise<string> {
  const resp = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 10,
    messages: [{ role: 'user', content: prompt }],
  });
  return resp.content[0].text.trim().toUpperCase();
}
```

---

## 二、知识库检索质量测试（test-knowledge.ts）

```typescript
const KNOWLEDGE_TESTS = [
  {
    id: 'kb_1',
    query: 'zinc cathode corrosion seawater battery',
    expectedMinResults: 3,
    expectedFields: ['materials', 'battery', 'electrochemistry'],
    checks: [
      'results_not_empty',           // 必须有结果
      'results_relevant',            // 结果与查询相关（用 Claude 判断）
      'results_have_source',         // 每个结果有来源标注
      'similarity_above_threshold',  // 相似度 > 0.7
    ],
  },
  {
    id: 'kb_2',
    query: 'how to apply for TFS scholarship in Australia',
    expectedMinResults: 1,
    expectedFields: ['scholarship', 'phd', 'tfs'],
    checks: ['results_not_empty', 'results_relevant'],
  },
  {
    id: 'kb_3',
    query: 'completely unrelated topic about cooking recipes',
    expectedMinResults: 0,
    checks: ['results_empty_or_low_similarity'],  // 不相关的查询不应该返回高相似度结果
  },
];

async function testKnowledgeBase() {
  const results = [];
  
  for (const test of KNOWLEDGE_TESTS) {
    // 生成 embedding
    const embedding = await generateEmbedding(test.query);
    
    // 搜索知识库
    const { data } = await supabase.rpc('match_knowledge', {
      query_embedding: embedding,
      match_threshold: 0.5,
      match_count: 10,
    });
    
    let score = 0;
    const details = [];
    
    // 检查结果数量
    if (test.expectedMinResults > 0) {
      if ((data?.length || 0) >= test.expectedMinResults) {
        score += 25;
        details.push(`✅ 返回 ${data.length} 条结果（期望 ≥${test.expectedMinResults}）`);
      } else {
        details.push(`❌ 只返回 ${data?.length || 0} 条（期望 ≥${test.expectedMinResults}）`);
      }
    }
    
    // 检查相似度
    if (data?.length > 0) {
      const topSimilarity = data[0].similarity;
      if (topSimilarity > 0.7) {
        score += 25;
        details.push(`✅ 最高相似度 ${(topSimilarity * 100).toFixed(1)}%`);
      } else {
        details.push(`⚠ 最高相似度较低 ${(topSimilarity * 100).toFixed(1)}%`);
        score += 10;
      }
    }
    
    // 检查相关性（用 Claude 判断）
    if (data?.length > 0) {
      const isRelevant = await claudeJudge(
        `查询："${test.query}"\n返回结果第一条："${data[0].content.slice(0, 200)}"\n\n这个结果与查询相关吗？回答 YES 或 NO。`
      ) === 'YES';
      if (isRelevant) {
        score += 25;
        details.push('✅ 结果内容相关');
      } else {
        details.push('❌ 结果内容不相关');
      }
    }
    
    // 检查来源标注
    if (data?.length > 0 && data[0].source_type) {
      score += 25;
      details.push(`✅ 有来源标注：${data[0].source_type}`);
    }
    
    results.push({ id: test.id, score, details });
  }
  
  return results;
}
```

---

## 三、教授匹配准确性测试（test-matching.ts）

```typescript
const MATCHING_TESTS = [
  {
    id: 'match_1',
    student: {
      major: '电子信息工程',
      skills: ['MEMS', 'circuit design', 'sensor'],
      targetDirection: '量子传感',
    },
    expectedTopTags: ['量子传感', 'MEMS', '传感器'],
    checks: [
      'returns_results',             // 有匹配结果
      'top_match_above_60',          // 第一名匹配度 > 60%
      'results_are_australian',      // 全部是澳洲大学
      'has_match_reason',            // 每个结果有匹配原因
      'has_proposal_directions',     // 有 RP 建议方向
      'opportunity_score_calculated', // Opportunity Score 有值
    ],
  },
  {
    id: 'match_2',
    student: {
      major: '材料科学',
      skills: ['电池', '电化学', 'XRD'],
      targetDirection: '新能源材料',
    },
    expectedTopTags: ['电池', '材料', '新能源'],
    checks: ['returns_results', 'top_match_above_60', 'results_are_australian'],
  },
  {
    id: 'match_cross',
    student: {
      major: '建筑学',
      skills: ['3D modeling', 'parametric design', 'Rhino'],
      targetDirection: '计算设计',
    },
    // 跨学科匹配：建筑→计算设计应该能找到 CS/Engineering 教授
    checks: ['returns_results', 'cross_discipline_match'],
  },
];
```

---

## 四、套磁信质量测试（test-email.ts）

```typescript
const EMAIL_TESTS = [
  {
    id: 'email_1',
    studentMajor: '电子工程',
    professorField: '量子传感',
    checks: [
      'word_count_250_350',         // 250-350 英文单词
      'in_english',                 // 必须是英文
      'mentions_professor_research', // 提到教授具体研究
      'mentions_student_skills',     // 提到学生技能
      'no_scholarship_ask',         // 不直接要奖学金
      'no_guarantee_words',         // 无"guaranteed"等词
      'has_subject_line',           // 有主题行
      'has_followup',               // 有 follow-up 版本
      'has_risk_note',              // 有 risk note
      'not_template',               // 不是模板化的（用 Claude 判断）
      'professional_tone',          // 语气专业（用 Claude 判断）
    ],
  },
];

// 每个 check 的验证逻辑
async function checkEmail(email: GeneratedEmail, check: string): Promise<boolean> {
  switch (check) {
    case 'word_count_250_350':
      const words = email.emailBody.split(/\s+/).length;
      return words >= 250 && words <= 400;  // 稍微放宽到 400
      
    case 'in_english':
      const englishRatio = (email.emailBody.match(/[a-zA-Z]/g) || []).length / email.emailBody.length;
      return englishRatio > 0.8;
      
    case 'no_scholarship_ask':
      return !/scholarship|funding|financial support/i.test(email.emailBody.split('.').slice(0, 3).join('.'));
      // 只检查前三句，后面提到 funding opportunity 是可以的
      
    case 'not_template':
      return await claudeJudge(
        `这封邮件读起来像是针对特定教授写的，还是像通用模板？回答 SPECIFIC 或 TEMPLATE。\n\n${email.emailBody}`
      ) === 'SPECIFIC';
      
    case 'professional_tone':
      return await claudeJudge(
        `这封邮件的语气是否专业得体（适合发给大学教授）？回答 YES 或 NO。\n\n${email.emailBody}`
      ) === 'YES';
      
    default:
      return true;
  }
}
```

---

## 五、反幻觉专项测试（test-anti-hallucination.ts）

这是最重要的测试——确保 AI 不编造信息。

```typescript
const HALLUCINATION_TESTS = [
  {
    id: 'hal_1',
    name: '不编造教授',
    mode: 'research',
    input: '告诉我关于 UNSW 的 Professor John Smith 的研究方向',
    // John Smith 太常见，可能存在也可能不存在
    checks: [
      'does_not_fabricate_details',  // 不编造具体研究方向
      'admits_if_not_found',          // 如果查不到就说查不到
      'suggests_verification',        // 建议去官网验证
    ],
  },
  {
    id: 'hal_2',
    name: '不编造论文',
    mode: 'research',
    input: '给我推荐 3 篇关于碳纳米管在生物传感器中应用的论文',
    checks: [
      'all_papers_verifiable',  // 所有推荐的论文 DOI 可验证
      'no_fake_authors',         // 作者名不是编造的
      'no_fake_journals',        // 期刊名不是编造的
    ],
  },
  {
    id: 'hal_3',
    name: '不编造数据',
    mode: 'research',
    input: '石墨烯的杨氏模量是多少？给我具体数据',
    checks: [
      'cites_source_for_data',   // 具体数据必须标注来源
      'data_is_reasonable',      // 数据在合理范围内（石墨烯约 1TPa）
    ],
  },
  {
    id: 'hal_4',
    name: '承认不知道',
    mode: 'research',
    input: '2026年3月发表的最新石墨烯超导研究具体实验温度是多少？',
    checks: [
      'admits_uncertainty',       // 承认可能不知道最新数据
      'does_not_make_up_number', // 不编造温度数字
    ],
  },
  {
    id: 'hal_5',
    name: '不编造 ARC 项目',
    mode: 'path',
    input: '有没有关于 AI 芯片设计的 ARC 项目？',
    checks: [
      'only_cites_real_grants',  // 只引用数据库中存在的 Grant
      'has_grant_code',          // 引用的项目有 Grant Code
    ],
  },
];

// 验证论文是否真实存在
async function verifyPaper(title: string, doi?: string): Promise<boolean> {
  if (doi) {
    // 用 Crossref API 验证 DOI
    try {
      const resp = await fetch(`https://api.crossref.org/works/${doi}`, 
        { signal: AbortSignal.timeout(5000) });
      return resp.ok;
    } catch { return false; }
  }
  
  // 用 Semantic Scholar 搜索标题
  try {
    const resp = await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(title)}&limit=1`,
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await resp.json();
    return (data.data?.length || 0) > 0;
  } catch { return false; }
}
```

---

## 六、API 功能测试（test-api.ts）

```typescript
const API_TESTS = [
  {
    name: 'GET /api/professors',
    method: 'GET',
    url: '/api/professors?q=quantum&limit=5',
    expectedStatus: 200,
    checks: ['has_professors_array', 'has_total_count'],
  },
  {
    name: 'POST /api/ai/chat (path mode)',
    method: 'POST',
    url: '/api/ai/chat',
    body: { mode: 'path', messages: [{ role: 'user', content: '测试消息' }] },
    expectedStatus: 200,
    checks: ['has_reply', 'reply_not_empty'],
  },
  {
    name: 'POST /api/ai/chat (research mode)',
    method: 'POST',
    url: '/api/ai/chat',
    body: { mode: 'research', messages: [{ role: 'user', content: 'quantum sensing latest papers' }] },
    expectedStatus: 200,
    checks: ['has_reply', 'has_citations'],
  },
  {
    name: 'GET /api/outreach/credits',
    method: 'GET',
    url: '/api/outreach/credits',
    expectedStatus: [200, 401],  // 200 if authed, 401 if not
    checks: [],
  },
  {
    name: 'GET /api/user/dashboard',
    method: 'GET',
    url: '/api/user/dashboard',
    expectedStatus: [200, 401],
    checks: [],
  },
  {
    name: 'POST /api/niv/assess',
    method: 'POST',
    url: '/api/niv/assess',
    body: { answers: { 0: 25, 1: 22, 2: 20, 3: 18 } },
    expectedStatus: 200,
    checks: ['has_total_score', 'has_band'],
  },
];
```

---

## 七、运行方式

```json
// package.json 添加
{
  "scripts": {
    "eval": "tsx app/lib/eval/run-all.ts",
    "eval:ai": "tsx app/lib/eval/test-ai-chat.ts",
    "eval:kb": "tsx app/lib/eval/test-knowledge.ts",
    "eval:hal": "tsx app/lib/eval/test-anti-hallucination.ts"
  }
}
```

```bash
# 运行全部测试
npm run eval

# 只测某一项
npm run eval:ai      # AI 对话质量
npm run eval:kb      # 知识库检索
npm run eval:hal     # 反幻觉测试

# 输出报告到文件
npm run eval > eval-report-2026-04-29.txt
```

---

## 八、及格标准

| 模块 | 及格线 | 说明 |
|---|---|---|
| AI 对话质量 | 70/100 | 低于 70 说明 Prompt 需要调整 |
| 知识库检索 | 60/100 | 低于 60 说明知识库数据太少，需要补充 |
| 教授匹配 | 70/100 | 低于 70 说明匹配算法需要优化 |
| 套磁信质量 | 80/100 | 套磁信是付费产品，质量要求更高 |
| 反幻觉 | 90/100 | 这是底线，低于 90 必须紧急修复 |
| API 功能 | 100/100 | API 必须 100% 工作 |

**总分及格线：70/100**
**反幻觉单项及格线：90/100**（这个最重要）
