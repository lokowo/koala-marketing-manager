import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/server';
import { getServerUser } from '../../../../lib/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return Response.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    if (!allowed.includes(ext)) {
      return Response.json({ error: 'Invalid file type. Allowed: jpg, png, webp, gif' }, { status: 400 });
    }

    const fileName = `banner_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await db.storage
      .from('banners')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('[banner upload]', uploadError);
      return Response.json({ error: 'Upload failed' }, { status: 500 });
    }

    const { data: urlData } = db.storage.from('banners').getPublicUrl(fileName);

    return Response.json({ url: urlData.publicUrl });
  } catch (e) {
    console.error('[banner upload]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
