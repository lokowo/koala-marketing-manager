import { NextRequest } from 'next/server';
import { getServerUser } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: '请先登录' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return Response.json({ error: '没有文件' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const path = `avatars/${user.id}_${Date.now()}.jpg`;

    const { error: uploadError } = await db.storage
      .from('avatars')
      .upload(path, buffer, {
        upsert: true,
        contentType: file.type || 'image/jpeg',
      });

    if (uploadError) {
      console.error('[avatar upload]', uploadError);
      return Response.json({ error: '上传失败: ' + uploadError.message }, { status: 500 });
    }

    const { data: { publicUrl } } = db.storage
      .from('avatars')
      .getPublicUrl(path);

    return Response.json({ url: publicUrl });
  } catch (e) {
    console.error('[avatar]', e);
    return Response.json({ error: '上传失败' }, { status: 500 });
  }
}
