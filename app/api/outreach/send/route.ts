import type { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/server';

// Supabase client typed as any for tables not yet in database.types.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

// Phase 2: actual email delivery via Resend API.
// Phase 1: mark email as "copied" so user can paste it manually.

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json() as { emailId?: string; action?: 'copy' | 'send' };
    const { emailId, action = 'copy' } = body;

    if (!emailId) return Response.json({ error: 'Missing emailId' }, { status: 400 });

    // Verify ownership
    const { data: email } = await db
      .from('outreach_emails')
      .select('id, status, email_body, subject_line')
      .eq('id', emailId)
      .eq('user_id', userId)
      .single();

    if (!email) return Response.json({ error: 'Email not found' }, { status: 404 });

    if (action === 'copy') {
      await db
        .from('outreach_emails')
        .update({ status: 'copied' })
        .eq('id', emailId);

      return Response.json({ success: true, action: 'copy', message: '邮件已标记为已复制，请手动粘贴发送。' });
    }

    return Response.json({ error: '代发功能即将上线，请先复制邮件手动发送。' }, { status: 501 });
  } catch (error) {
    console.error('[outreach/send]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
