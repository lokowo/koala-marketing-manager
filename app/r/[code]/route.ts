import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const { data: qr } = await db
    .from('sales_qrcodes')
    .select('id, scan_count')
    .eq('code', code)
    .single();

  if (qr) {
    await db
      .from('sales_qrcodes')
      .update({ scan_count: (qr.scan_count || 0) + 1 })
      .eq('id', qr.id);
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://koalaphd.com';
  return Response.redirect(`${baseUrl}/koala/auth?sales=${encodeURIComponent(code)}`, 302);
}
