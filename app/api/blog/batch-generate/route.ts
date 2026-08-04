import { NextRequest } from 'next/server';
import { requireAdmin } from '../../../lib/auth';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try { await requireAdmin(); } catch { return Response.json({ error: 'Forbidden' }, { status: 403 }); }
  try {
    const { topics, publishMode, imageCount } = await req.json();

    if (!Array.isArray(topics)) {
      return Response.json({ error: 'topics array required' }, { status: 400 });
    }

    // 空数组正常跳过（选题层无近况新闻/候选全被查重拦截时会返回空），不报错
    if (topics.length === 0) {
      return Response.json({ success: true, total: 0, successCount: 0, results: [], skipped: 'no topics' });
    }

    if (topics.length > 10) {
      return Response.json({ error: 'Maximum 10 articles per batch' }, { status: 400 });
    }

    const results: { title: string; status: string; id?: string; error?: string }[] = [];

    for (const topic of topics) {
      try {
        const res = await fetch(new URL('/api/blog/generate', req.url).toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: req.headers.get('cookie') || '',
          },
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
