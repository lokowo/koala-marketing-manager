import type { NextRequest } from 'next/server';
import { extractProfileFromText } from '../../../lib/chat/extract-profile';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body as { text?: string };

    if (!text || typeof text !== 'string' || text.trim().length < 10) {
      return Response.json(
        { error: '请提供至少 10 个字符的背景描述' },
        { status: 400 },
      );
    }

    const profile = await extractProfileFromText(text.trim());

    if (Object.keys(profile).length === 0) {
      return Response.json({
        profile: {},
        message: '未能从文本中提取到学术背景信息，请补充更多细节。',
      });
    }

    return Response.json({ profile });
  } catch (error) {
    console.error('[extract-profile]', error);
    return Response.json(
      { error: '提取失败，请稍后再试' },
      { status: 500 },
    );
  }
}
