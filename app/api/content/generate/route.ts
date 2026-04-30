import type { NextRequest } from 'next/server';
import { generateContent } from '../../../lib/ai/generateContent';

export async function POST(request: NextRequest) {
  try {
    const { sourceType, rawContent } = await request.json();
    if (!sourceType || !rawContent) {
      return Response.json({ error: 'sourceType and rawContent are required' }, { status: 400 });
    }
    const data = await generateContent(sourceType, rawContent);
    return Response.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
