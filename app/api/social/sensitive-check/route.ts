import { filterSensitiveContent, filterXiaohongshu, hasSensitiveContent } from '../../../lib/server/sensitive-filter';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, platform } = body as { text?: string; platform?: string };

    if (!text || typeof text !== 'string') {
      return Response.json({ error: 'Missing text' }, { status: 400 });
    }

    const { filtered, violations } = filterSensitiveContent(text);
    const hasWords = hasSensitiveContent(text);

    let processed = filtered;
    if (platform === 'xiaohongshu') {
      processed = filterXiaohongshu(filtered);
    }

    return Response.json({
      original: text,
      processed,
      hasSensitiveWords: hasWords,
      violations,
      platform: platform ?? 'general',
    });
  } catch (error) {
    console.error('[SENSITIVE_CHECK]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
