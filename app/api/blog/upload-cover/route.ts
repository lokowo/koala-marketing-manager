import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { requireAdmin } from '../../../lib/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(req: NextRequest) {
  try { await requireAdmin(); } catch { return Response.json({ error: 'Forbidden' }, { status: 403 }); }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) return Response.json({ error: '未选择文件' }, { status: 400 });
    if (file.size > MAX_SIZE) return Response.json({ error: '文件不能超过 5MB' }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) return Response.json({ error: '只支持 JPG、PNG、WebP 格式' }, { status: 400 });

    const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1];
    const fileName = `covers/upload-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadErr } = await db.storage
      .from('blog-images')
      .upload(fileName, buffer, { contentType: file.type, upsert: true });

    if (uploadErr) {
      if (uploadErr.message?.includes('not found')) {
        await db.storage.createBucket('blog-images', { public: true });
        const { error: retryErr } = await db.storage
          .from('blog-images')
          .upload(fileName, buffer, { contentType: file.type, upsert: true });
        if (retryErr) return Response.json({ error: '上传失败' }, { status: 500 });
      } else {
        return Response.json({ error: '上传失败' }, { status: 500 });
      }
    }

    const { data: urlData } = db.storage.from('blog-images').getPublicUrl(fileName);
    return Response.json({ url: urlData.publicUrl });
  } catch (error) {
    console.error('[blog/upload-cover]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
