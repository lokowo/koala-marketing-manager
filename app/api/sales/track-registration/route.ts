import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function POST(req: Request) {
  try {
    const { salesCode, email } = await req.json();
    if (!salesCode || !email) {
      return Response.json({ error: 'Missing params' }, { status: 400 });
    }

    const { data: qrcode } = await db
      .from('sales_qrcodes')
      .select('id, sales_user_id')
      .eq('code', salesCode)
      .single();

    if (!qrcode) {
      return Response.json({ error: 'Invalid sales code' }, { status: 404 });
    }

    const { data: userProfile } = await db
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (userProfile) {
      await db.from('sales_customers').upsert({
        sales_user_id: qrcode.sales_user_id,
        customer_user_id: userProfile.id,
        qrcode_id: qrcode.id,
        stage: 'lead',
        source: 'qrcode',
      }, { onConflict: 'sales_user_id,customer_user_id' });
    }

    await db
      .from('sales_qrcodes')
      .update({ scan_count: db.raw('scan_count + 1') })
      .eq('id', qrcode.id);

    return Response.json({ success: true });
  } catch (e) {
    console.error('[sales/track-registration]', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
