import { getServerUser } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await db
      .from('user_documents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return Response.json({ documents: data ?? [] });
  } catch (error) {
    console.error('[user/documents GET]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop() || 'pdf';
    const storagePath = `documents/${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await db.storage
      .from('user-documents')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = db.storage
      .from('user-documents')
      .getPublicUrl(storagePath);

    const { data, error } = await db
      .from('user_documents')
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
        public_url: urlData?.publicUrl || null,
        parse_status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return Response.json({ document: data });
  } catch (error) {
    console.error('[user/documents POST]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await req.json();
    if (!id) {
      return Response.json({ error: 'id is required' }, { status: 400 });
    }

    const { data: doc } = await db
      .from('user_documents')
      .select('storage_path')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (doc?.storage_path) {
      await db.storage.from('user-documents').remove([doc.storage_path]);
    }

    await db
      .from('education_history')
      .update({ source_document_id: null })
      .eq('source_document_id', id)
      .eq('user_id', user.id);

    await db
      .from('work_history')
      .update({ source_document_id: null })
      .eq('source_document_id', id)
      .eq('user_id', user.id);

    const { error } = await db
      .from('user_documents')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    return Response.json({ success: true });
  } catch (error) {
    console.error('[user/documents DELETE]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
