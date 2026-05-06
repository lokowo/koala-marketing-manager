import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { topics, publishMode, imageCount } = await req.json();

    if (!Array.isArray(topics) || topics.length === 0) {
      return Response.json({ error: 'topics array required' }, { status: 400 });
    }

    if (topics.length > 10) {
      return Response.json({ error: 'Maximum 10 articles per batch' }, { status: 400 });
    }

    const results: { title: string; status: string; id?: string; error?: string }[] = [];

    for (const topic of topics) {
      try {
        const res = await fetch(new URL('/api/blog/generate', req.url).toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: topic.title || topic,
            category: topic.category || 'phd_guide',
            style: topic.style || 'casual',
            publishMode: publishMode || 'draft',
            imageCount: imageCount ?? 2,
          }),
        });

        const data = await res.json();
        if (data.success) {
          results.push({ title: topic.title || topic, status: 'success', id: data.post?.id });
        } else {
          results.push({ title: topic.title || topic, status: 'error', error: data.error });
        }
      } catch (e) {
        results.push({ title: topic.title || topic, status: 'error', error: String(e) });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    return Response.json({ success: true, total: topics.length, successCount, results });
  } catch (error) {
    console.error('[blog/batch-generate]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
