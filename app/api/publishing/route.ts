import type { NextRequest } from 'next/server';
import { listPublishing, createPublishingRecord, getPublishingStats } from '../../lib/services/publishingService';
import { requireAdmin } from '../../lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const [records, stats] = await Promise.all([
      listPublishing({
        platform: searchParams.get('platform') ?? undefined,
        contentCardId: searchParams.get('contentCardId') ?? undefined,
      }),
      getPublishingStats(),
    ]);
    return Response.json({ data: records, total: records.length, stats });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    try { await requireAdmin(); } catch { return Response.json({ error: 'Forbidden' }, { status: 403 }); }
    const body = await request.json();
    const record = await createPublishingRecord(body);
    return Response.json({ data: record }, { status: 201 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
