import { getServerUser } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

interface Attachment {
  filename: string;
  mimeType: string;
  base64Data: string;
}

async function refreshAccessToken(userId: string, refreshToken: string): Promise<string | null> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    console.error('[send-email] token refresh failed:', await res.text());
    return null;
  }

  const data = await res.json();
  const newAccessToken: string = data.access_token;
  const expiresIn: number = data.expires_in;

  await db
    .from('gmail_tokens')
    .update({
      access_token: newAccessToken,
      token_expiry: new Date(Date.now() + expiresIn * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  return newAccessToken;
}

function buildRawEmail(
  from: string,
  to: string,
  subject: string,
  bodyHtml: string,
  attachments: Attachment[] = [],
): string {
  const boundary = `boundary_${Date.now()}`;
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`;

  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
  ];

  // HTML body part
  lines.push(`--${boundary}`);
  lines.push('Content-Type: text/html; charset=UTF-8');
  lines.push('Content-Transfer-Encoding: base64');
  lines.push('');
  lines.push(Buffer.from(bodyHtml).toString('base64'));
  lines.push('');

  // Attachment parts
  for (const att of attachments) {
    const encodedFilename = `=?UTF-8?B?${Buffer.from(att.filename).toString('base64')}?=`;
    lines.push(`--${boundary}`);
    lines.push(`Content-Type: ${att.mimeType}; name="${encodedFilename}"`);
    lines.push('Content-Transfer-Encoding: base64');
    lines.push(`Content-Disposition: attachment; filename="${encodedFilename}"`);
    lines.push('');
    lines.push(att.base64Data);
    lines.push('');
  }

  lines.push(`--${boundary}--`);
  return lines.join('\r\n');
}

function base64urlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function POST(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: '请先登录' }, { status: 401 });

    const { cold_email_id, to_email, subject, body_html, attachments } = await req.json() as {
      cold_email_id?: string;
      to_email: string;
      subject: string;
      body_html: string;
      attachments?: Attachment[];
    };

    if (!to_email || !subject || !body_html) {
      return Response.json({ error: '缺少必填字段 (to_email, subject, body_html)' }, { status: 400 });
    }

    const { data: tokenRow, error: tokenErr } = await db
      .from('gmail_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (tokenErr || !tokenRow) {
      return Response.json({ error: '请先连接 Gmail 账户', code: 'GMAIL_NOT_CONNECTED' }, { status: 400 });
    }

    let accessToken = tokenRow.access_token as string;
    const tokenExpiry = new Date(tokenRow.token_expiry as string);

    if (tokenExpiry <= new Date(Date.now() + 60_000)) {
      const refreshed = await refreshAccessToken(user.id, tokenRow.refresh_token as string);
      if (!refreshed) {
        return Response.json({ error: 'Gmail 授权已过期，请重新连接', code: 'GMAIL_TOKEN_EXPIRED' }, { status: 401 });
      }
      accessToken = refreshed;
    }

    const rawEmail = buildRawEmail(
      tokenRow.gmail_address as string,
      to_email,
      subject,
      body_html,
      attachments ?? [],
    );
    const encodedEmail = base64urlEncode(rawEmail);

    const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodedEmail }),
    });

    if (!sendRes.ok) {
      const detail = await sendRes.text();
      console.error('[send-email] Gmail send failed:', detail);
      return Response.json({ error: '邮件发送失败，请稍后重试' }, { status: 502 });
    }

    const sendResult = await sendRes.json();

    if (cold_email_id) {
      const { data: emailRow } = await db
        .from('cold_emails')
        .select('professor_id')
        .eq('id', cold_email_id)
        .eq('user_id', user.id)
        .single();

      if (emailRow?.professor_id) {
        await db
          .from('applications')
          .update({
            stage: 'sent',
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .eq('professor_id', emailRow.professor_id)
          .in('stage', ['saved', 'drafted']);
      }

      await db
        .from('cold_emails')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          sent_via: 'gmail',
          gmail_message_id: sendResult.id ?? null,
        })
        .eq('id', cold_email_id)
        .eq('user_id', user.id);
    }

    return Response.json({
      success: true,
      messageId: sendResult.id,
      attachmentCount: attachments?.length ?? 0,
    });
  } catch (error) {
    console.error('[send-email]', error);
    return Response.json({ error: '邮件发送失败' }, { status: 500 });
  }
}
