import { getServerUser } from '../../../lib/auth';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: '请先登录' }, { status: 401 });

    const { raw_description, major, context } = await req.json() as {
      raw_description: string;
      major?: string;
      context?: string;
    };

    if (!raw_description || raw_description.trim().length < 5) {
      return Response.json({ error: '描述太短' }, { status: 400 });
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      system: `你是一位学术简历润色专家。用户会给你一段经历描述（可能是中文或英文），请将其改写为适合学术 CV 的英文描述。

规则：
1. 输出纯英文，2-4 个 bullet point
2. 使用强动词开头（Led, Developed, Conducted, Analyzed, Published, Designed, Implemented 等）
3. 量化成果（如有数据支撑）
4. 突出学术/研究相关性
5. 保持简洁，每条 bullet point 不超过 20 个词
6. 不编造数据或经历，只润色表达

${major ? `用户专业: ${major}` : ''}
${context ? `额外上下文: ${context}` : ''}

直接输出 bullet points，每条一行，以 "• " 开头。不要加任何标题或解释。`,
      messages: [{ role: 'user', content: raw_description }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const bullets = text
      .split('\n')
      .map(l => l.replace(/^[•\-\*]\s*/, '').trim())
      .filter(l => l.length > 0);

    return Response.json({ enhanced: bullets });
  } catch (error) {
    console.error('[enhance-experience]', error);
    return Response.json({ error: '润色失败' }, { status: 500 });
  }
}
