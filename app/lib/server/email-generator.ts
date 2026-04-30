import Anthropic from '@anthropic-ai/sdk';
import type { StudentProfile } from '../types';
import type { ProfessorForMatching, MatchResult } from './matching-engine';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface EmailGenerationInput {
  student: StudentProfile;
  professor: ProfessorForMatching;
  matchResult: MatchResult;
  tone: 'professional' | 'warm' | 'direct' | 'academic';
  purpose: 'PhD' | 'MRes' | 'RA' | 'Scholarship';
}

export interface GeneratedEmail {
  subjectLine: string;
  emailBody: string;
  followupBody: string;
  riskNote: string;
  wordCount: number;
}

const SYSTEM_PROMPT = `你是一位专业的学术沟通顾问，专门帮助学生写发给澳洲教授的套磁邮件。
你的邮件风格：真实、有针对性、体现学生的研究价值而非简历堆砌。
绝不使用"保录取""guaranteed admission"等违规表达。
只返回 JSON，不含 markdown 代码块。`;

/**
 * Generate a customised cold-outreach email for a professor.
 * Returns subjectLine, emailBody, followupBody, riskNote.
 */
export async function generateOutreachEmail(
  input: EmailGenerationInput,
): Promise<GeneratedEmail> {
  const { student, professor, matchResult, tone, purpose } = input;

  const studentDesc = `
- 专业：${student.major}
- 学历：${student.degreeLevel}
- 均分：${student.gpa ?? '未知'}
- 技能：${student.technicalSkills.join(', ')}
- 目标：申请 ${purpose}
- 科研经历：${student.hasResearchExperience ? (student.researchSummary ?? '有') : '暂无'}
`.trim();

  const profDesc = `
- 姓名：${professor.name}
- 机构：${professor.university}, ${professor.faculty}
- 研究方向：${professor.researchAreas.join(', ')}
- 近期论文：${(professor.recentPapers ?? []).slice(0, 3).map(p => p.title).join('; ') || '暂无'}
- 在研项目：${(professor.grants ?? []).slice(0, 2).map(g => g.title).join('; ') || '暂无'}
`.trim();

  const prompt = `请为以下学生生成一封发给教授的套磁邮件。

学生信息：
${studentDesc}

教授信息：
${profDesc}

匹配分析：
- 匹配度：${matchResult.matchScore}%
- 匹配原因：${matchResult.reason}
- 建议 RP 方向：${matchResult.proposalDirections.join('; ')}

要求：
1. 邮件语气：${tone}
2. 总字数：250-350 英文单词
3. 必须引用教授具体的研究/论文/项目，不泛泛而谈
4. 把学生经历转化为研究价值，不是罗列简历
5. 不要一开口就问奖学金
6. 不要用 "Dear Professor" 开头
7. 结尾礼貌询问是否有 ${purpose} 机会讨论
8. 不使用"保录取""guaranteed"等词
9. 不说 "I am writing to you because..."

同时生成：
1. Subject Line（有针对性，不超过 10 个词）
2. Email Body（正文，英文）
3. Follow-up Body（2 周后跟进邮件，150 词以内，英文）
4. Risk Note（给学生看的内部中文提醒，如该教授的注意事项）

返回 JSON：
{"subjectLine":"...","emailBody":"...","followupBody":"...","riskNote":"..."}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find(b => b.type === 'text');
  const raw = textBlock?.type === 'text' ? textBlock.text : '{}';

  let result: Omit<GeneratedEmail, 'wordCount'>;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    result = jsonMatch ? JSON.parse(jsonMatch[0]) : { subjectLine: '', emailBody: '', followupBody: '', riskNote: '' };
  } catch {
    throw new Error('Failed to parse email generation response');
  }

  return {
    ...result,
    wordCount: (result.emailBody ?? '').split(/\s+/).filter(Boolean).length,
  };
}
