import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/server';
import { getServerUser } from '../../../../lib/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const updates: Record<string, unknown> = { updated_by: user.id, updated_at: new Date().toISOString() };
    const allowedFields = ['image_url', 'image_alt', 'click_action', 'click_url', 'modal_title', 'modal_content', 'modal_image_url', 'overlay_title', 'overlay_subtitle', 'is_active', 'sort_order', 'start_date', 'end_date'];
    for (const key of allowedFields) {
      if (key in body) updates[key] = body[key];
    }

    const { data, error } = await db
      .from('banners')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[admin banners PUT]', error);
      return Response.json({ error: 'Failed to update banner' }, { status: 500 });
    }

    return Response.json({ banner: data });
  } catch (e) {
    console.error('[admin banners PUT]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    // Get banner to find image path for cleanup
    const { data: banner } = await db
      .from('banners')
      .select('image_url, modal_image_url')
      .eq('id', id)
      .single();

    // Delete from DB
    const { error } = await db.from('banners').delete().eq('id', id);
    if (error) {
      console.error('[admin banners DELETE]', error);
      return Response.json({ error: 'Failed to delete banner' }, { status: 500 });
    }

    // Clean up storage files
    if (banner) {
      const urls = [banner.image_url, banner.modal_image_url].filter(Boolean);
      for (const url of urls) {
        const match = (url as string).match(/\/banners\/(.+)$/);
        if (match) {
          await db.storage.from('banners').remove([match[1]]).catch(() => {});
        }
      }
    }

    return Response.json({ success: true });
  } catch (e) {
    console.error('[admin banners DELETE]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
