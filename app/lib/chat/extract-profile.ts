import Anthropic from '@anthropic-ai/sdk';

export interface ExtractedProfile {
  name?: string;
  university?: string;
  major?: string;
  degree_level?: string;
  gpa?: string;
  gpa_scale?: string;
  research_interests?: string[];
  publications?: string[];
  english_level?: string;
  target_field?: string;
  target_degree?: string;
  career_goal?: string;
  has_research_experience?: boolean;
  research_description?: string;
  preferred_universities?: string[];
  preferred_city?: string[];
  start_semester?: string;
  strengths?: string[];
  work_experience?: string;
}

const EXTRACTION_PROMPT = `你是一个学生背景信息提取助手。用户会用一段自由文本（可能是语音转文字）描述自己的学术背景。

请从中提取结构化信息，返回纯 JSON。规则：
1. 只提取用户明确提到的信息，不要猜测或推断
2. 字段值保持用户原文的语言（中文描述就用中文，英文就用英文）
3. 大学名、专业名、期刊名等专有名词保留英文原文
4. research_interests 和 publications 是数组，每项一个条目
5. 如果某字段用户完全没提到，不要包含该字段
6. GPA 如果提到了满分制（如 /4.0、/100），分别填入 gpa 和 gpa_scale

可提取的字段：
{
  "name": "姓名",
  "university": "当前/最近就读学校",
  "major": "专业",
  "degree_level": "本科/硕士/博士/在读",
  "gpa": "GPA 数值",
  "gpa_scale": "GPA 满分",
  "research_interests": ["研究兴趣1", "研究兴趣2"],
  "publications": ["论文1标题", "论文2标题"],
  "english_level": "英语水平（如雅思7.0、托福100）",
  "target_field": "目标研究方向",
  "target_degree": "目标学位（MRes/PhD等）",
  "career_goal": "职业目标",
  "has_research_experience": true/false,
  "research_description": "科研经历描述",
  "preferred_universities": ["目标大学1"],
  "preferred_city": ["偏好城市"],
  "start_semester": "计划入学时间",
  "strengths": ["个人特长"],
  "work_experience": "工作/实习经历"
}

返回纯 JSON，不要 markdown 代码块，不要解释。`;

export async function extractProfileFromText(
  text: string,
): Promise<ExtractedProfile> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    system: EXTRACTION_PROMPT,
    messages: [
      {
        role: 'user',
        content: `请从以下文本中提取学生背景信息：\n\n"${text}"`,
      },
    ],
  });

  const raw = (response.content[0] as { type: 'text'; text: string }).text.trim();
  const cleaned = raw.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(cleaned) as ExtractedProfile;

  const result: ExtractedProfile = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (value !== null && value !== undefined && value !== '') {
      (result as Record<string, unknown>)[key] = value;
    }
  }

  return result;
}
