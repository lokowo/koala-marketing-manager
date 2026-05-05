import Anthropic from '@anthropic-ai/sdk';
import type { Professor, StudentProfile } from '../types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Extended professor type with joined data for matching (from DB query with grants + papers)
export interface ProfessorForMatching extends Professor {
  grants?: Array<{
    title: string;
    grantType: string;
    fundingAmount?: number;
    summary?: string;
  }>;
  recentPapers?: Array<{
    title: string;
    year: number;
    journal?: string;
  }>;
}

export interface MatchResult {
  professorId: string;
  matchScore: number;
  breakdown: {
    academicFit: number;      // 0-25
    skillFit: number;         // 0-25
    opportunitySignal: number; // 0-25
    proposalPotential: number; // 0-15
    communicationFit: number;  // 0-10
  };
  reason: string;
  proposalDirections: string[];
}

/**
 * Calculate Opportunity Signal score (0-100).
 * Run at professor ingestion time; result stored in professor.opportunityScore.
 */
export function calculateOpportunityScore(prof: ProfessorForMatching): number {
  let career = 0;
  let grant = 0;
  let interdisciplinary = 0;
  let publication = 0;
  let explicit = 0;

  // Career Stage Signal (0-20)
  const title = (prof.positionTitle ?? prof.title ?? '').toLowerCase();
  if ((title.includes('lecturer') && !title.includes('senior')) || title.includes('ecr')) {
    career = 20;
  } else if (title.includes('research fellow') || title.includes('postdoctoral')) {
    career = 20;
  } else if (title.includes('senior lecturer')) {
    career = 15;
  } else if (title.includes('associate professor')) {
    career = 10;
  } else if (title.includes('professor')) {
    career = 5;
  }

  // Grant Signal (0-30)
  for (const g of prof.grants ?? []) {
    const gt = (g.grantType ?? '').toLowerCase();
    if (gt.includes('linkage') || gt.includes('industry')) {
      grant = Math.max(grant, 30);
    } else if (gt.includes('crc') || gt.includes('arc')) {
      grant = Math.max(grant, 25);
    } else if (gt.includes('discovery')) {
      grant = Math.max(grant, 20);
    }
  }
  if (grant === 0 && (prof.grants?.length ?? 0) > 0) grant = 5;

  // Interdisciplinary Gap Signal (0-20)
  const crossKeywords = [
    'sensor', 'design', 'data', 'analytics', 'system', 'integration',
    'computational', 'machine learning', 'ai', 'management', 'optimization',
    'modelling', 'imaging', 'fabrication', 'control',
  ];
  const grantText = (prof.grants ?? []).map(g => g.title.toLowerCase()).join(' ');
  const crossHits = crossKeywords.filter(kw => grantText.includes(kw)).length;
  if (crossHits >= 3) interdisciplinary = 20;
  else if (crossHits >= 1) interdisciplinary = 10;
  else interdisciplinary = 5;

  // Publication Momentum Signal (0-15)
  const currentYear = new Date().getFullYear();
  const recentCount = (prof.recentPapers ?? []).filter(p => p.year >= currentYear - 2).length;
  if (recentCount >= 5) publication = 15;
  else if (recentCount >= 3) publication = 10;
  else if (recentCount >= 1) publication = 5;

  // Explicit PhD Opening Signal (0-15)
  if (prof.acceptingStudents === 'yes') explicit = 15;

  return career + grant + interdisciplinary + publication + explicit;
}

/**
 * Match professors to a student profile using Claude semantic analysis.
 * Evaluates up to 20 candidates per call to control API costs.
 */
export async function matchProfessors(
  student: StudentProfile,
  professors: ProfessorForMatching[],
): Promise<MatchResult[]> {
  if (professors.length === 0) return [];

  const batch = professors.slice(0, 20);

  const studentDesc = `
- 专业：${student.major}
- 学历：${student.degreeLevel}
- 均分：${student.gpa ?? '未知'}（${student.gpaScale ? `满分 ${student.gpaScale}` : '百分制'}）
- 科研经历：${student.hasResearchExperience ? (student.researchSummary ?? '有，详情未提供') : '暂无'}
- 技能：${student.technicalSkills.join(', ')}
- 目标方向：${student.targetField ?? student.researchInterests.join(', ')}
- 目标学位：${student.targetDegree}
`.trim();

  const profList = batch.map(p => JSON.stringify({
    id: p.id,
    name: p.name,
    institution: p.university,
    tags: p.researchAreas,
    grants: (p.grants ?? []).map(g => g.title).slice(0, 3),
    h_index: p.hIndex,
    opportunity_score: p.opportunityScore ?? calculateOpportunityScore(p),
    position: p.positionTitle ?? p.title,
  })).join('\n');

  const prompt = `你是一个 PhD 申请匹配专家。根据学生背景和教授列表，为每位教授计算匹配分数。

学生背景：
${studentDesc}

对每位教授评估 5 个维度（总分 100）：
1. academicFit (0-25)：专业方向匹配度，注意跨学科合理性
2. skillFit (0-25)：学生技能能否补教授项目短板
3. opportunitySignal (0-25)：已预计算，直接用提供的 opportunity_score 等比换算到 25 分
4. proposalPotential (0-15)：学生能否针对教授研究写出合理 RP
5. communicationFit (0-10)：是否容易写出有针对性的申请信

返回 JSON 数组，只返回 JSON，不要其他文字：
[{"professorId":"xxx","academicFit":18,"skillFit":22,"proposalPotential":12,"communicationFit":8,"reason":"一句话中文匹配原因","proposalDirections":["方向1","方向2"]}]

教授列表：
${profList}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    system: [{ type: 'text', text: '你是 PhD 申请匹配专家，只返回 JSON，不含 markdown。', cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find(b => b.type === 'text');
  const raw = textBlock?.type === 'text' ? textBlock.text : '[]';

  let aiScores: Array<{
    professorId: string;
    academicFit: number;
    skillFit: number;
    proposalPotential: number;
    communicationFit: number;
    reason: string;
    proposalDirections: string[];
  }> = [];

  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) aiScores = JSON.parse(jsonMatch[0]);
  } catch {
    aiScores = [];
  }

  const results: MatchResult[] = [];
  for (const prof of batch) {
    const ai = aiScores.find(s => s.professorId === prof.id);
    if (!ai) continue;

    const rawOpp = prof.opportunityScore ?? calculateOpportunityScore(prof);
    const opportunitySignal = Math.round((rawOpp / 100) * 25);

    const matchScore = Math.min(
      (ai.academicFit ?? 0) +
      (ai.skillFit ?? 0) +
      opportunitySignal +
      (ai.proposalPotential ?? 0) +
      (ai.communicationFit ?? 0),
      100,
    );

    results.push({
      professorId: prof.id,
      matchScore,
      breakdown: {
        academicFit: ai.academicFit ?? 0,
        skillFit: ai.skillFit ?? 0,
        opportunitySignal,
        proposalPotential: ai.proposalPotential ?? 0,
        communicationFit: ai.communicationFit ?? 0,
      },
      reason: ai.reason ?? '',
      proposalDirections: ai.proposalDirections ?? [],
    });
  }

  results.sort((a, b) => b.matchScore - a.matchScore);
  return results;
}
