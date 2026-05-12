import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/server';
import { getServerUser } from '../../../../lib/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function PUT(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { items } = await req.json() as { items: { id: string; sort_order: number }[] };

    if (!items || !Array.isArray(items)) {
      return Response.json({ error: 'items array required' }, { status: 400 });
    }

    // Update each banner's sort_order
    await Promise.all(
      items.map(item =>
        db.from('banners').update({ sort_order: item.sort_order }).eq('id', item.id)
      )
    );

    return Response.json({ success: true });
  } catch (e) {
    console.error('[banner reorder]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
