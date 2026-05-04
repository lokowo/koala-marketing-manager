import { getServerUser } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const ALLOWED_TYPES: Record<string, number[]> = {
  'application/pdf': [0x25, 0x50, 0x44, 0x46],          // %PDF
  'image/png': [0x89, 0x50, 0x4E, 0x47],                // .PNG
  'image/jpeg': [0xFF, 0xD8, 0xFF],                      // JFIF
  'application/msword': [0xD0, 0xCF, 0x11, 0xE0],       // DOC (OLE)
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [0x50, 0x4B, 0x03, 0x04], // DOCX (ZIP)
};

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.doc', '.docx'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES_PER_USER = 20;

function validateFileHeader(buffer: ArrayBuffer, mimeType: string): boolean {
  const bytes = new Uint8Array(buffer.slice(0, 8));
  for (const [type, magic] of Object.entries(ALLOWED_TYPES)) {
    if (mimeType === type || type.includes(mimeType.split('/')[1])) {
      const matches = magic.every((b, i) => bytes[i] === b);
      if (matches) return true;
    }
  }
  // For JPEG, also check without strict mime match
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return true;
  // For PDF
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return true;
  // For ZIP-based (docx)
  if (bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) return true;
  // For OLE (doc)
  if (bytes[0] === 0xD0 && bytes[1] === 0xCF && bytes[2] === 0x11 && bytes[3] === 0xE0) return true;
  // For PNG
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return true;
  return false;
}

export async function POST(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const fileType = formData.get('fileType') as string | null; // 'resume' | 'transcript' | 'other'

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate extension
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return Response.json({ error: `不支持的文件格式。允许：PDF, PNG, JPG, DOC, DOCX` }, { status: 400 });
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      return Response.json({ error: '文件大小不能超过 5MB' }, { status: 400 });
    }

    // Validate file header (magic bytes)
    const buffer = await file.arrayBuffer();
    if (!validateFileHeader(buffer, file.type)) {
      return Response.json({ error: '文件类型验证失败，请确保上传正确格式的文件' }, { status: 400 });
    }

    // Check file count limit
    const { data: profileData } = await db
      .from('user_profiles')
      .select('files')
      .eq('id', user.id)
      .single();

    const existingFiles = profileData?.files ?? [];
    if (existingFiles.length >= MAX_FILES_PER_USER) {
      return Response.json({ error: `最多只能存储 ${MAX_FILES_PER_USER} 个文件，请先删除旧文件` }, { status: 400 });
    }

    // Upload to Supabase Storage
    const filePath = `${user.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from('user-files')
      .upload(filePath, Buffer.from(buffer), {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('[files upload]', uploadError);
      return Response.json({ error: '文件上传失败，请重试' }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('user-files')
      .getPublicUrl(filePath);

    const fileRecord = {
      name: file.name,
      url: urlData.publicUrl,
      path: filePath,
      type: fileType || 'other',
      size: file.size,
      uploaded_at: new Date().toISOString(),
    };

    // Update user_profiles.files array
    const updatedFiles = [...existingFiles, fileRecord];
    const updateData: Record<string, unknown> = {
      files: updatedFiles,
      updated_at: new Date().toISOString(),
    };

    // Also update resume_url or transcript_url for backward compat
    if (fileType === 'resume') {
      updateData.resume_url = urlData.publicUrl;
      updateData.file_name = file.name;
    } else if (fileType === 'transcript') {
      updateData.transcript_url = urlData.publicUrl;
    }

    await db
      .from('user_profiles')
      .update(updateData)
      .eq('id', user.id);

    return Response.json({ success: true, file: fileRecord, totalFiles: updatedFiles.length });
  } catch (error) {
    console.error('[user/files POST]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data } = await db
      .from('user_profiles')
      .select('files')
      .eq('id', user.id)
      .single();

    return Response.json({ files: data?.files ?? [] });
  } catch (error) {
    console.error('[user/files GET]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { filePath } = await req.json();
    if (!filePath) return Response.json({ error: 'Missing filePath' }, { status: 400 });

    // Verify file belongs to user
    if (!filePath.startsWith(`${user.id}/`)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete from storage
    await supabaseAdmin.storage.from('user-files').remove([filePath]);

    // Remove from profile
    const { data } = await db
      .from('user_profiles')
      .select('files')
      .eq('id', user.id)
      .single();

    const files = (data?.files ?? []).filter((f: { path: string }) => f.path !== filePath);
    await db
      .from('user_profiles')
      .update({ files, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    return Response.json({ success: true, remainingFiles: files.length });
  } catch (error) {
    console.error('[user/files DELETE]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
