import type { NextRequest } from 'next/server';
import { listContentCards, createContentCard } from '../../../lib/services/contentCardService';
import type { GeneratedContent } from '../../../lib/ai/generateContent';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const data = await listContentCards({
      status: searchParams.get('status') ?? undefined,
      sourceType: searchParams.get('sourceType') ?? undefined,
    });
    return Response.json({ data });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, sourceType, generated, sourceEntityId } = body as {
      title: string;
      sourceType: string;
      generated: GeneratedContent;
      sourceEntityId?: string;
    };
    const card = await createContentCard(title, sourceType as never, generated, sourceEntityId);
    return Response.json({ data: card }, { status: 201 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
