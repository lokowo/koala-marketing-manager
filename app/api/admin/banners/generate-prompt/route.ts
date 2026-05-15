import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getServerUser } from '../../../../lib/auth';
import { aiLimiter, safeLimit } from '../../../../lib/ratelimit';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const categoryLabels: Record<string, string> = {
  campus: '大学校园场景',
  research: '学术研究场景',
  graduation: '毕业典礼场景',
  mentor: '导师指导场景',
  sydney: '悉尼城市风景',
  ai_tech: 'AI科技概念',
};

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const allowed = await safeLimit(aiLimiter, user.id);
    if (!allowed) return Response.json({ error: '操作太频繁，请稍后再试' }, { status: 429 });

    const { category } = await req.json();
    const label = categoryLabels[category];
    if (!label) {
      return Response.json({ error: 'Invalid category' }, { status: 400 });
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `为教育科技网站 Koala PhD 生成一段 AI 图片生成用的场景描述。

类别：${label}

要求：
- 包含具体的人物、场景、光线、构图细节
- 与澳洲大学和中国留学生相关
- 真实摄影风格（柯达胶片色调、自然光、浅景深）
- 80-120字中文
- 只返回描述文字，不要加引号或前缀`,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';

    return Response.json({ prompt: text });
  } catch (e) {
    console.error('[generate-prompt]', e);
    return Response.json({ error: '生成失败' }, { status: 500 });
  }
}
