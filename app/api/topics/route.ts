import type { NextRequest } from 'next/server';
import { listTopics, createTopic } from '../../lib/services/topicService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const topics = await listTopics({
      researchField: searchParams.get('researchField') ?? undefined,
    });
    return Response.json({ data: topics, total: topics.length });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const topic = await createTopic(body);
    return Response.json({ data: topic }, { status: 201 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
