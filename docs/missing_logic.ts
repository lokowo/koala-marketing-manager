/**
 * Koala PhD — 补充业务逻辑代码
 * 以下代码覆盖 PRD 中已设计但尚未有独立实现文件的功能
 * Claude Code 应将这些逻辑集成到对应的文件中
 *
 * 放置位置：docs/missing_logic.ts（参考文件，不直接运行）
 */

// ============================================================
// 1. PROFESSOR MATCHING ENGINE（教授匹配引擎）
// → 放到 app/lib/server/matching-engine.ts
// ============================================================

interface StudentProfile {
  major: string;
  degree: 'undergraduate' | 'coursework_masters' | 'research_masters' | 'phd';
  gpa: number;
  researchExperience: string[];
  skills: string[];
  targetDirection: string;
  courses: string[];
  motivation: string;
}

interface ProfessorData {
  id: string;
  name_en: string;
  name_cn: string;
  institution: string;
  department: string;
  research_tags: string[];
  h_index: number;
  paper_count: number;
  opportunity_score: number;
  opportunity_breakdown: {
    career: number;
    grant: number;
    interdisciplinary: number;
    publication: number;
    explicit: number;
  };
  grants: Array<{
    title: string;
    grant_type: string;
    funding_amount: number;
    summary: string;
  }>;
  recent_papers: Array<{
    title: string;
    year: number;
    journal: string;
  }>;
  position_title: string;
  accepting_students: string;
}

interface MatchResult {
  professorId: string;
  matchScore: number;        // 0-100
  breakdown: {
    academicFit: number;     // 0-25
    skillFit: number;        // 0-25
    opportunitySignal: number; // 0-25
    proposalPotential: number; // 0-15
    communicationFit: number;  // 0-10
  };
  reason: string;            // AI 生成的一句话匹配原因
  proposalDirections: string[]; // 建议的 RP 方向
}

/**
 * 计算 Opportunity Signal 评分（全自动，教授入库时执行）
 */
function calculateOpportunityScore(prof: ProfessorData): number {
  let score = 0;
  const breakdown = { career: 0, grant: 0, interdisciplinary: 0, publication: 0, explicit: 0 };

  // Career Stage Signal (0-20)
  const title = (prof.position_title || '').toLowerCase();
  if (title.includes('lecturer') && !title.includes('senior')) {
    breakdown.career = 20;  // 新入职，最需要学生
  } else if (title.includes('research fellow') || title.includes('ecr')) {
    breakdown.career = 20;
  } else if (title.includes('senior lecturer')) {
    breakdown.career = 15;
  } else if (title.includes('associate professor')) {
    breakdown.career = 10;
  } else if (title.includes('professor')) {
    breakdown.career = 5;
  }

  // Grant Signal (0-30)
  const now = new Date();
  const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth());
  for (const grant of prof.grants || []) {
    const grantType = (grant.grant_type || '').toLowerCase();
    if (grantType.includes('linkage') || grantType.includes('industry')) {
      breakdown.grant = Math.max(breakdown.grant, 30);
    } else if (grantType.includes('discovery')) {
      breakdown.grant = Math.max(breakdown.grant, 20);
    } else if (grantType.includes('crc') || grantType.includes('arc')) {
      breakdown.grant = Math.max(breakdown.grant, 25);
    }
  }
  if (breakdown.grant === 0 && prof.grants?.length > 0) {
    breakdown.grant = 5;
  }

  // Interdisciplinary Gap Signal (0-20)
  // 从 Grant 标题中检测跨学科关键词
  const crossDisciplineKeywords = [
    'sensor', 'design', 'data', 'analytics', 'system', 'integration',
    'computational', 'machine learning', 'AI', 'management', 'optimization',
    'modelling', 'imaging', 'fabrication', 'control'
  ];
  const grantTitles = (prof.grants || []).map(g => g.title.toLowerCase()).join(' ');
  const crossMatches = crossDisciplineKeywords.filter(kw => grantTitles.includes(kw));
  if (crossMatches.length >= 3) breakdown.interdisciplinary = 20;
  else if (crossMatches.length >= 1) breakdown.interdisciplinary = 10;
  else breakdown.interdisciplinary = 5;

  // Publication Momentum Signal (0-15)
  const recentPapers = (prof.recent_papers || []).filter(p => p.year >= now.getFullYear() - 2);
  if (recentPapers.length >= 5) breakdown.publication = 15;
  else if (recentPapers.length >= 3) breakdown.publication = 10;
  else if (recentPapers.length >= 1) breakdown.publication = 5;

  // Explicit PhD Opening Signal (0-15)
  if (prof.accepting_students === 'yes') {
    breakdown.explicit = 15;
  } else if (prof.accepting_students === 'unknown') {
    breakdown.explicit = 0;
  }

  score = breakdown.career + breakdown.grant + breakdown.interdisciplinary +
          breakdown.publication + breakdown.explicit;

  return score;
}

/**
 * 教授匹配主函数
 * 输入：学生 Profile + 教授候选列表
 * 输出：排序后的匹配结果
 *
 * 注意：academicFit 和 skillFit 需要 Claude API 做语义分析
 * opportunitySignal 使用预计算的分数
 * proposalPotential 和 communicationFit 也需要 Claude 评估
 */
async function matchProfessors(
  student: StudentProfile,
  professors: ProfessorData[],
  anthropicClient: any
): Promise<MatchResult[]> {

  // Step 1: 预筛选 — 去掉明显不相关的（节省 API 调用）
  const candidates = professors.filter(p => {
    // 至少有一个 tag 跟学生方向有交集（宽松匹配）
    const studentKeywords = [
      student.major, student.targetDirection,
      ...student.skills, ...student.courses
    ].map(k => k.toLowerCase());

    const profKeywords = [
      ...(p.research_tags || []),
      p.department || ''
    ].map(k => k.toLowerCase());

    // 至少有一个关键词重叠
    return studentKeywords.some(sk =>
      profKeywords.some(pk => pk.includes(sk) || sk.includes(pk))
    ) || true; // 如果没有匹配也保留（因为跨学科是核心价值）
  });

  // Step 2: 批量调用 Claude 做语义匹配分析
  // 每次最多评估 20 位教授（控制成本）
  const batch = candidates.slice(0, 20);

  const matchPrompt = `你是一个 PhD 申请匹配专家。请根据以下学生背景和教授信息，为每位教授计算匹配分数。

学生背景：
- 专业：${student.major}
- 学历：${student.degree}
- 均分：${student.gpa}
- 目标方向：${student.targetDirection}
- 技能：${student.skills.join(', ')}
- 科研经历：${student.researchExperience.join('; ')}

对每位教授评估以下5个维度（总分100）：
1. Academic Fit (0-25)：学生专业与教授研究方向的匹配度。注意跨学科的合理性。
2. Skill Fit (0-25)：学生的技能能否补教授项目的短板。重点：教授的 Grant 项目可能需要什么技能，学生是否恰好有？
3. Opportunity Signal (0-25)：已预计算，直接使用提供的分数。
4. Proposal Potential (0-15)：基于学生背景，能否针对教授的研究写出合理的 Research Proposal？
5. Communication Fit (0-10)：是否容易写出有针对性的套磁信？

返回 JSON 格式，每位教授一个对象：
[{
  "professorId": "xxx",
  "academicFit": 18,
  "skillFit": 22,
  "proposalPotential": 12,
  "communicationFit": 8,
  "reason": "一句话中文匹配原因",
  "proposalDirections": ["方向1", "方向2"]
}]

教授列表：
${batch.map(p => JSON.stringify({
  id: p.id,
  name: p.name_en,
  institution: p.institution,
  tags: p.research_tags,
  grants: p.grants?.map(g => g.title).slice(0, 3),
  h_index: p.h_index,
  opportunity_score: p.opportunity_score,
  position: p.position_title,
})).join('\n')}

只返回 JSON，不要任何其他文字。`;

  const response = await anthropicClient.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [{ role: 'user', content: matchPrompt }],
  });

  let aiScores;
  try {
    const text = response.content[0].text.replace(/```json|```/g, '').trim();
    aiScores = JSON.parse(text);
  } catch {
    aiScores = [];
  }

  // Step 3: 合并分数
  const results: MatchResult[] = [];
  for (const prof of batch) {
    const ai = aiScores.find((s: any) => s.professorId === prof.id);
    if (!ai) continue;

    const opportunityNormalized = Math.round((prof.opportunity_score / 100) * 25);

    const matchScore = (ai.academicFit || 0) +
                       (ai.skillFit || 0) +
                       opportunityNormalized +
                       (ai.proposalPotential || 0) +
                       (ai.communicationFit || 0);

    results.push({
      professorId: prof.id,
      matchScore: Math.min(matchScore, 100),
      breakdown: {
        academicFit: ai.academicFit || 0,
        skillFit: ai.skillFit || 0,
        opportunitySignal: opportunityNormalized,
        proposalPotential: ai.proposalPotential || 0,
        communicationFit: ai.communicationFit || 0,
      },
      reason: ai.reason || '',
      proposalDirections: ai.proposalDirections || [],
    });
  }

  // Step 4: 排序
  results.sort((a, b) => b.matchScore - a.matchScore);

  return results;
}


// ============================================================
// 2. EMAIL GENERATOR（套磁信生成引擎）
// → 放到 app/lib/server/email-generator.ts
// ============================================================

interface EmailGenerationInput {
  student: StudentProfile;
  professor: ProfessorData;
  matchResult: MatchResult;
  tone: 'professional' | 'warm' | 'direct' | 'academic';
  purpose: 'PhD' | 'MRes' | 'RA' | 'Scholarship';
}

interface GeneratedEmail {
  subjectLine: string;
  emailBody: string;
  followupBody: string;
  riskNote: string;
  wordCount: number;
}

async function generateOutreachEmail(
  input: EmailGenerationInput,
  anthropicClient: any
): Promise<GeneratedEmail> {

  const { student, professor, matchResult, tone, purpose } = input;

  // 构建 prompt — 从 koala_ai_prompts.md 第四章的文案撰写模式
  const prompt = `你是一位专业的学术沟通顾问。请为以下学生生成一封发给教授的套磁邮件。

学生信息：
- 专业：${student.major}
- 学历：${student.degree}
- 均分：${student.gpa}
- 技能：${student.skills.join(', ')}
- 目标：申请 ${purpose}

教授信息：
- 姓名：${professor.name_en}
- 机构：${professor.institution}, ${professor.department}
- 研究方向：${professor.research_tags?.join(', ')}
- 近期论文：${professor.recent_papers?.slice(0, 3).map(p => p.title).join('; ')}
- 在研项目：${professor.grants?.slice(0, 2).map(g => g.title).join('; ')}

匹配分析：
- 匹配度：${matchResult.matchScore}%
- 匹配原因：${matchResult.reason}
- 建议 RP 方向：${matchResult.proposalDirections.join('; ')}

要求：
1. 邮件语气：${tone}
2. 总字数：250-350 英文单词
3. 必须引用教授具体的研究/论文/项目（不是泛泛而谈）
4. 把学生经历转化为研究价值（不是罗列简历）
5. 不要一开口就问奖学金
6. 不要用 "Dear Professor" 这种陈腐开头
7. 结尾礼貌询问是否有 ${purpose} 机会讨论
8. 不要使用"保录取""guaranteed"等词
9. 不要说 "I am writing to you because..."

请同时生成：
1. Subject Line（清晰、有针对性、不超过 10 个词）
2. Email Body（正文）
3. Follow-up Body（2 周后如果没回复的跟进邮件，150 词以内）
4. Risk Note（给学生看的内部提醒，如"该教授可能xxx，建议xxx"，中文）

返回 JSON 格式：
{
  "subjectLine": "...",
  "emailBody": "...",
  "followupBody": "...",
  "riskNote": "..."
}`;

  const response = await anthropicClient.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  let result;
  try {
    const text = response.content[0].text.replace(/```json|```/g, '').trim();
    result = JSON.parse(text);
  } catch {
    throw new Error('Failed to parse email generation response');
  }

  return {
    ...result,
    wordCount: (result.emailBody || '').split(/\s+/).length,
  };
}


// ============================================================
// 3. CREDITS SYSTEM（积分系统）
// → 放到 app/api/outreach/credits/route.ts
// ============================================================

/**
 * GET: 查询用户积分余额
 * POST: 购买积分（对接 Stripe）
 * PUT: 扣除积分（生成套磁信时内部调用）
 */

// 检查并扣除积分
async function deductCredit(userId: string, amount: number = 1): Promise<{
  success: boolean;
  remainingCredits: number;
  error?: string;
}> {
  // 1. 查询当前余额
  const { data: credits } = await supabase
    .from('user_credits')
    .select('credit_balance, subscription_tier, subscription_monthly_credits')
    .eq('user_id', userId)
    .single();

  if (!credits) {
    return { success: false, remainingCredits: 0, error: 'User not found' };
  }

  // 2. 检查是否有免费额度（新用户第一封免费）
  const { count: emailCount } = await supabase
    .from('outreach_emails')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  const isFreeFirstEmail = (emailCount || 0) === 0;

  if (isFreeFirstEmail) {
    return { success: true, remainingCredits: credits.credit_balance };
  }

  // 3. 检查余额
  if (credits.credit_balance < amount) {
    return {
      success: false,
      remainingCredits: credits.credit_balance,
      error: `积分不足。当前余额 ${credits.credit_balance}，需要 ${amount}。`,
    };
  }

  // 4. 扣除
  const { data: updated } = await supabase
    .from('user_credits')
    .update({
      credit_balance: credits.credit_balance - amount,
      total_credits_used: supabase.rpc('increment', { x: amount }),
    })
    .eq('user_id', userId)
    .select('credit_balance')
    .single();

  return {
    success: true,
    remainingCredits: updated?.credit_balance || 0,
  };
}

// 积分套餐
const CREDIT_PACKAGES = [
  { id: 'single', credits: 1, priceAUD: 1.00, label: '单封', description: '1 封定制套磁信' },
  { id: 'pack_10', credits: 10, priceAUD: 9.90, label: '10封包', description: '省 $0.10/封' },
  { id: 'pack_30', credits: 30, priceAUD: 19.90, label: '30封包', description: '省 $0.34/封', popular: true },
  { id: 'pack_100', credits: 100, priceAUD: 49.00, label: '100封包', description: '省 $0.51/封' },
];

const SUBSCRIPTION_TIERS = [
  { id: 'basic', priceAUD: 19.90, monthlyCredits: 10, features: ['不限 AI 对话', '每月 10 封', '每周教授推荐', 'RP 方向优化'] },
  { id: 'pro', priceAUD: 49.00, monthlyCredits: 30, features: ['不限 AI 对话', '每月 30 封', '每周教授推荐', 'RP 方向优化', 'Follow-up 提醒', '人工审核 1 次/月'], popular: true },
  { id: 'premium', priceAUD: 99.00, monthlyCredits: 100, features: ['不限 AI 对话', '每月 100 封', '每周教授推荐', 'RP 方向优化', 'Follow-up 提醒', '人工审核 3 次/月', '优先客服'] },
];


// ============================================================
// 4. ADAPTIVE TONE ENGINE（自适应语气引擎）
// → 放到 app/lib/server/adaptive-tone.ts
// ============================================================

interface UserStyleProfile {
  sentenceLength: 'short' | 'medium' | 'long';
  formality: 'casual' | 'mixed' | 'formal';
  usesEmoji: boolean;
  expertise: 'beginner' | 'intermediate' | 'expert';
  emotionalState: 'anxious' | 'neutral' | 'motivated';
  language: 'zh' | 'en' | 'mixed';
}

/**
 * 从用户的前 3 轮消息中分析说话风格
 */
function analyzeUserStyle(messages: Array<{ role: string; content: string }>): UserStyleProfile {
  const userMessages = messages
    .filter(m => m.role === 'user')
    .map(m => m.content)
    .slice(0, 3);

  if (userMessages.length === 0) {
    return {
      sentenceLength: 'medium', formality: 'casual', usesEmoji: false,
      expertise: 'beginner', emotionalState: 'neutral', language: 'zh',
    };
  }

  const allText = userMessages.join(' ');
  const avgLength = allText.length / userMessages.length;

  // 句子长度
  const sentenceLength: UserStyleProfile['sentenceLength'] =
    avgLength < 30 ? 'short' : avgLength > 100 ? 'long' : 'medium';

  // 表情符号
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}～~😅😂🤔😊]/gu;
  const usesEmoji = emojiRegex.test(allText);

  // 语言
  const chineseChars = (allText.match(/[\u4e00-\u9fff]/g) || []).length;
  const englishWords = (allText.match(/[a-zA-Z]+/g) || []).length;
  const language: UserStyleProfile['language'] =
    chineseChars > englishWords * 2 ? 'zh' :
    englishWords > chineseChars * 2 ? 'en' : 'mixed';

  // 正式程度
  const casualMarkers = ['哈', '呀', '啊', '嘛', '呢', '吧', '哦', '嗯', '...', '～', 'lol', 'haha'];
  const casualCount = casualMarkers.filter(m => allText.includes(m)).length;
  const formality: UserStyleProfile['formality'] =
    casualCount >= 3 ? 'casual' : casualCount >= 1 ? 'mixed' : 'formal';

  // 专业程度
  const expertTerms = ['h-index', 'Q1', 'SCI', 'impact factor', 'methodology',
    'p-value', 'regression', 'neural network', 'transformer', 'GPA', 'WAM',
    'ARC', 'grant', 'proposal', 'PhD', 'postdoc'];
  const expertCount = expertTerms.filter(t => allText.toLowerCase().includes(t.toLowerCase())).length;
  const expertise: UserStyleProfile['expertise'] =
    expertCount >= 3 ? 'expert' : expertCount >= 1 ? 'intermediate' : 'beginner';

  // 情绪状态
  const anxiousMarkers = ['焦虑', '担心', '害怕', '纠结', '迷茫', '不确定', '压力', '崩溃',
    '不行', '太难', '没希望', 'anxious', 'worried', 'stress'];
  const motivatedMarkers = ['想要', '准备', '开始', '计划', '决定', '冲', '加油',
    'ready', 'excited', 'plan'];
  const anxiousCount = anxiousMarkers.filter(m => allText.includes(m)).length;
  const motivatedCount = motivatedMarkers.filter(m => allText.includes(m)).length;
  const emotionalState: UserStyleProfile['emotionalState'] =
    anxiousCount >= 2 ? 'anxious' : motivatedCount >= 2 ? 'motivated' : 'neutral';

  return { sentenceLength, formality, usesEmoji, expertise, emotionalState, language };
}

/**
 * 把用户风格转为 System Prompt 追加指令
 */
function styleToPromptSuffix(style: UserStyleProfile): string {
  const instructions: string[] = [];

  if (style.sentenceLength === 'short') {
    instructions.push('用户习惯发短句，你也要简短干练地回复，不要长篇大论。');
  } else if (style.sentenceLength === 'long') {
    instructions.push('用户喜欢详细的表述，你可以展开分析，给出更多细节。');
  }

  if (style.formality === 'casual') {
    instructions.push('用户语气很随意，你也可以适当使用口语化表达，像朋友聊天。');
  } else if (style.formality === 'formal') {
    instructions.push('用户语气比较正式，你也保持专业但友好的语气。');
  }

  if (style.usesEmoji) {
    instructions.push('用户使用表情符号，你也可以适当加入（每 2-3 段一个，不过度）。');
  } else {
    instructions.push('用户不使用表情符号，你也不要使用。');
  }

  if (style.expertise === 'expert') {
    instructions.push('用户有专业背景，可以使用学术术语，不需要过度解释基础概念。');
  } else if (style.expertise === 'beginner') {
    instructions.push('用户可能是学术新手，用通俗易懂的语言解释，避免过多专业术语。');
  }

  if (style.emotionalState === 'anxious') {
    instructions.push('用户似乎有些焦虑或不安。先表达理解和共情，再给出建议。不要否定他的感受。');
  } else if (style.emotionalState === 'motivated') {
    instructions.push('用户状态积极主动，可以直接给出行动建议，节奏快一些。');
  }

  if (style.language === 'zh') {
    instructions.push('用中文回复。');
  } else if (style.language === 'en') {
    instructions.push('Reply in English.');
  } else {
    instructions.push('用户中英混合，你也可以中英混用，专业术语用英文。');
  }

  return instructions.length > 0
    ? `\n\n## 用户说话风格匹配（自动检测）\n${instructions.join('\n')}\n记住：用户喜欢看到像自己的人。`
    : '';
}


// ============================================================
// 5. SHARE COMPONENT LOGIC（分享组件逻辑）
// → 前端组件 app/components/ui/ShareBar.tsx 的业务逻辑
// ============================================================

interface ShareConfig {
  type: 'professor' | 'blog' | 'report' | 'niv_result';
  id: string;
  title: string;
  summary: string;
  url: string;
}

/**
 * 生成各平台分享内容
 * 调用 /api/social/generate 接口
 */
async function generateShareContent(config: ShareConfig): Promise<{
  xiaohongshu: string;
  wechatMoments: string;
  weibo: string;
  copyLink: string;
  imageCardUrl?: string;
}> {
  const response = await fetch('/api/social/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sourceType: config.type,
      sourceId: config.id,
      title: config.title,
      summary: config.summary,
    }),
  });

  const data = await response.json();

  return {
    xiaohongshu: data.xiaohongshu,
    wechatMoments: data.wechatMoments,
    weibo: data.weibo,
    copyLink: `${config.url}?utm_source=share&utm_medium=${config.type}&utm_campaign=organic`,
    imageCardUrl: data.imageCardUrl,
  };
}

/**
 * 生成分享图片卡片（使用 html2canvas）
 * 输入：DOM 元素 ID
 * 输出：图片 Blob
 */
async function generateShareCard(elementId: string): Promise<Blob> {
  const html2canvas = (await import('html2canvas')).default;
  const element = document.getElementById(elementId);
  if (!element) throw new Error('Element not found');

  const canvas = await html2canvas(element, {
    scale: 2,        // 高清
    backgroundColor: '#fdf9ef',
    width: 375,      // 手机宽度
    windowWidth: 375,
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to generate image'));
    }, 'image/png');
  });
}

/**
 * 分享工具栏配置
 * 每个内容类型对应不同的分享选项
 */
const SHARE_OPTIONS = {
  professor: [
    { key: 'wechat', label: '朋友圈', icon: '💬' },
    { key: 'weibo', label: '微博', icon: '📱' },
    { key: 'link', label: '复制链接', icon: '🔗' },
    { key: 'pdf', label: '下载PDF', icon: '📄' },
    { key: 'card', label: '生成卡片', icon: '🖼️' },
  ],
  blog: [
    { key: 'wechat', label: '朋友圈', icon: '💬' },
    { key: 'weibo', label: '微博', icon: '📱' },
    { key: 'link', label: '复制链接', icon: '🔗' },
    { key: 'card', label: '生成卡片', icon: '🖼️' },
  ],
  report: [
    { key: 'pdf', label: '下载PDF', icon: '📄' },
    { key: 'email', label: '发送邮箱', icon: '📧' },
    { key: 'link', label: '分享链接', icon: '🔗' },
  ],
  niv_result: [
    { key: 'card', label: '生成卡片', icon: '🖼️' },
    { key: 'link', label: '复制链接', icon: '🔗' },
  ],
};


// ============================================================
// 6. STUDENT PROFILE PARSER（学生简历结构化解析）
// → 放到 app/lib/server/profile-parser.ts
// ============================================================

/**
 * 解析上传的 CV PDF → 结构化 StudentProfile
 * 使用 pdf-parse 提取文本 + Claude 结构化
 */
async function parseStudentCV(
  fileBuffer: Buffer,
  anthropicClient: any
): Promise<StudentProfile> {
  // 1. PDF → 文本
  const pdfParse = require('pdf-parse');
  const pdfData = await pdfParse(fileBuffer);
  const text = pdfData.text;

  // 2. Claude 结构化
  const response = await anthropicClient.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `请从以下简历文本中提取结构化信息。返回 JSON 格式：
{
  "major": "专业名称",
  "degree": "undergraduate|coursework_masters|research_masters|phd",
  "gpa": 数字（如果是4分制转换为百分制），
  "researchExperience": ["经历1", "经历2"],
  "skills": ["技能1", "技能2"],
  "targetDirection": "推测的目标研究方向",
  "courses": ["相关课程1", "课程2"],
  "motivation": "从简历推测的读博动机"
}

如果某个字段找不到信息，用空字符串或空数组。不要编造。
只返回 JSON，不要其他文字。

简历文本：
${text.slice(0, 5000)}`
    }],
  });

  try {
    const parsed = response.content[0].text.replace(/```json|```/g, '').trim();
    return JSON.parse(parsed);
  } catch {
    return {
      major: '', degree: 'undergraduate', gpa: 0,
      researchExperience: [], skills: [], targetDirection: '',
      courses: [], motivation: '',
    };
  }
}


// ============================================================
// EXPORTS SUMMARY
// ============================================================
/*
需要 Claude Code 创建的文件：

1. app/lib/server/matching-engine.ts
   - calculateOpportunityScore()
   - matchProfessors()

2. app/lib/server/email-generator.ts
   - generateOutreachEmail()

3. app/api/outreach/credits/route.ts
   - GET: 查询余额
   - POST: 购买积分
   - deductCredit()（内部函数）
   - CREDIT_PACKAGES 常量
   - SUBSCRIPTION_TIERS 常量

4. app/lib/server/adaptive-tone.ts
   - analyzeUserStyle()
   - styleToPromptSuffix()

5. app/components/ui/ShareBar.tsx（前端组件）
   - 分享按钮组
   - 点击 → 弹出平台选择 → 显示预生成文案 → 复制/分享
   - SHARE_OPTIONS 配置

6. app/lib/server/profile-parser.ts
   - parseStudentCV()

7. app/api/outreach/generate/route.ts
   - POST: 生成套磁信（调用 email-generator + 扣除积分）

8. app/api/outreach/send/route.ts
   - POST: 代发套磁信（Phase 2，先做复制功能）
*/
