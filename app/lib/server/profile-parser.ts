import Anthropic from '@anthropic-ai/sdk';
import type { StudentProfile } from '../types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `你是一个简历解析专家。从简历文本中提取结构化信息，返回 JSON，不含 markdown 代码块。如果字段找不到信息，用空字符串或空数组，绝不编造。`;

/**
 * Parse a CV PDF buffer into a structured StudentProfile.
 * Uses pdf-parse for text extraction + Claude for structuring.
 * This is a server-only function — never import in frontend code.
 */
export async function parseStudentCV(fileBuffer: Buffer): Promise<StudentProfile> {
  // Dynamic import — pdf-parse is a CommonJS module
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;
  const pdfData = await pdfParse(fileBuffer);
  const text = pdfData.text.slice(0, 5000); // Claude context limit safety

  const prompt = `请从以下简历文本中提取结构化信息。返回 JSON：
{
  "major": "专业名称",
  "degreeLevel": "Bachelor|Master|PhD|Other",
  "gpa": 数字或null（4分制转换为百分制），
  "gpaScale": 数字或null（原始满分，如4或100），
  "university": "就读学校",
  "graduationYear": 数字或null,
  "hasResearchExperience": true或false,
  "researchSummary": "科研经历简述或null",
  "publications": 数字或null,
  "technicalSkills": ["技能1","技能2"],
  "programmingLanguages": ["语言1"],
  "researchInterests": ["兴趣方向1"],
  "targetDegree": "MRes|PhD|Either",
  "targetField": "目标领域或null"
}

只返回 JSON，不要其他文字。

简历文本：
${text}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find(b => b.type === 'text');
  const raw = textBlock?.type === 'text' ? textBlock.text : '{}';

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      major: parsed.major ?? '',
      degreeLevel: parsed.degreeLevel ?? 'Bachelor',
      gpa: parsed.gpa ?? undefined,
      gpaScale: parsed.gpaScale ?? undefined,
      university: parsed.university ?? undefined,
      graduationYear: parsed.graduationYear ?? undefined,
      hasResearchExperience: parsed.hasResearchExperience ?? false,
      researchSummary: parsed.researchSummary ?? undefined,
      publications: parsed.publications ?? undefined,
      technicalSkills: parsed.technicalSkills ?? [],
      programmingLanguages: parsed.programmingLanguages ?? [],
      researchInterests: parsed.researchInterests ?? [],
      targetDegree: parsed.targetDegree ?? 'PhD',
      targetField: parsed.targetField ?? undefined,
      extractedAt: new Date().toISOString(),
    };
  } catch {
    return {
      major: '',
      degreeLevel: 'Bachelor',
      hasResearchExperience: false,
      technicalSkills: [],
      researchInterests: [],
      targetDegree: 'PhD',
    };
  }
}
