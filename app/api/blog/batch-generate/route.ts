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
        } else if (data.rejected) {
          // 正文查重闸门拒绝（重复或 fail-closed），非报错，单独标记 rejected
          const msg = data.matchedId
            ? `正文与已有文章高度相似（cos ${data.similarity}），已拒绝入库`
            : (data.reason || '正文查重拒绝入库');
          results.push({ title: topic.title || topic, status: 'rejected', error: msg });
        } else {
          results.push({ title: topic.title || topic, status: 'error', error: data.error });
        }
      } catch (e) {
        results.push({ title: topic.title || topic, status: 'error', error: String(e) });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const rejectedCount = results.filter(r => r.status === 'rejected').length;
    return Response.json({ success: true, total: topics.length, successCount, rejectedCount, results });
  } catch (error) {
    console.error('[blog/batch-generate]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
