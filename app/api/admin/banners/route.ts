import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { getServerUser } from '../../../lib/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await db
      .from('banners')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[admin banners GET]', error);
      return Response.json({ error: 'Failed to fetch banners' }, { status: 500 });
    }

    return Response.json({ banners: data || [] });
  } catch (e) {
    console.error('[admin banners GET]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { image_url, image_alt, click_action, click_url, modal_title, modal_content, modal_image_url, sort_order, start_date, end_date, overlay_title, overlay_subtitle, overlay_config } = body;

    if (!image_url) {
      return Response.json({ error: 'image_url is required' }, { status: 400 });
    }

    const { data, error } = await db
      .from('banners')
      .insert({
        image_url,
        image_alt: image_alt || null,
        click_action: click_action || 'none',
        click_url: click_url || null,
        modal_title: modal_title || null,
        modal_content: modal_content || null,
        modal_image_url: modal_image_url || null,
        overlay_title: overlay_title || null,
        overlay_subtitle: overlay_subtitle || null,
        overlay_config: overlay_config || null,
        sort_order: sort_order ?? 0,
        start_date: start_date || null,
        end_date: end_date || null,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('[admin banners POST]', error);
      return Response.json({ error: 'Failed to create banner' }, { status: 500 });
    }

    return Response.json({ banner: data });
  } catch (e) {
    console.error('[admin banners POST]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
