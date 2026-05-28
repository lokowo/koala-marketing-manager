import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const stats = {
    conversationsDeleted: 0,
    messagesDeleted: 0,
    messagesTruncated: 0,
    timestamp: new Date().toISOString(),
    errors: [] as string[],
  };

  try {
    // ── 1. Delete expired conversations ──
    const freeCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const paidCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    // Get paid user IDs
    const { data: paidUsers } = await db
      .from('user_profiles')
      .select('id')
      .not('plan_type', 'is', null)
      .neq('plan_type', 'free');

    const paidUserIds: string[] = (paidUsers ?? []).map((u: { id: string }) => u.id);

    // Delete free user conversations older than 7 days
    const freeFilter = db
      .from('ai_conversations')
      .select('id', { count: 'exact', head: false })
      .lt('updated_at', freeCutoff);

    if (paidUserIds.length > 0) {
      freeFilter.not('user_id', 'in', `(${paidUserIds.join(',')})`);
    }

    const { data: freeExpired } = await freeFilter;
    const freeIds: string[] = (freeExpired ?? []).map((r: { id: string }) => r.id);

    // Delete paid user conversations older than 90 days
    let paidIds: string[] = [];
    if (paidUserIds.length > 0) {
      const { data: paidExpired } = await db
        .from('ai_conversations')
        .select('id')
        .lt('updated_at', paidCutoff)
        .in('user_id', paidUserIds);

      paidIds = (paidExpired ?? []).map((r: { id: string }) => r.id);
    }

    const expiredIds = [...freeIds, ...paidIds];

    if (expiredIds.length > 0) {
      // Delete associated chat_messages first (FK)
      for (let i = 0; i < expiredIds.length; i += 200) {
        const batch = expiredIds.slice(i, i + 200);
        const { count } = await db
          .from('chat_messages')
          .delete({ count: 'exact' })
          .in('conversation_id', batch);
        stats.messagesDeleted += count ?? 0;
      }

      // Delete the conversations
      for (let i = 0; i < expiredIds.length; i += 200) {
        const batch = expiredIds.slice(i, i + 200);
        const { count } = await db
          .from('ai_conversations')
          .delete({ count: 'exact' })
          .in('id', batch);
        stats.conversationsDeleted += count ?? 0;
      }
    }

    // ── 2. Truncate conversations with >100 messages ──
    const { data: bloatedConvos } = await db.rpc('get_bloated_conversations', { msg_limit: 100 });

    if (bloatedConvos && bloatedConvos.length > 0) {
      for (const row of bloatedConvos as { conversation_id: string; msg_count: number }[]) {
        // Keep newest 100 messages, delete the rest
        const { data: keepIds } = await db
          .from('chat_messages')
          .select('id')
          .eq('conversation_id', row.conversation_id)
          .order('created_at', { ascending: false })
          .limit(100);

        if (keepIds && keepIds.length > 0) {
          const idsToKeep = (keepIds as { id: string }[]).map((m) => m.id);
          const { count } = await db
            .from('chat_messages')
            .delete({ count: 'exact' })
            .eq('conversation_id', row.conversation_id)
            .not('id', 'in', `(${idsToKeep.join(',')})`);
          stats.messagesTruncated += count ?? 0;
        }
      }
    }

    // ── 3. Table sizes ──
    const { data: sizes } = await db.rpc('get_table_sizes');

    console.log('[cleanup-conversations]', JSON.stringify({ ...stats, tableSizes: sizes }));

    return Response.json({ ...stats, tableSizes: sizes });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    stats.errors.push(msg);
    console.error('[cleanup-conversations] error:', error);
    return Response.json(stats, { status: 500 });
  }
}
