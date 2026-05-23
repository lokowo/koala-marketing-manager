import { type NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function POST(request: NextRequest) {
  try {
    const { email } = (await request.json()) as { email?: string };

    if (!email || !email.includes('@')) {
      return Response.json({ error: 'Please provide a valid email' }, { status: 400 });
    }

    const normalised = email.toLowerCase().trim();

    const { data: professor } = await db
      .from('professors')
      .select('id, name, email, university, is_verified')
      .eq('email', normalised)
      .maybeSingle();

    if (!professor) {
      return Response.json(
        { error: 'No professor found with this email. If you believe this is an error, contact info@koalaphd.com' },
        { status: 404 },
      );
    }

    if (professor.is_verified) {
      return Response.json(
        { error: 'This professor profile has already been verified' },
        { status: 409 },
      );
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));

    await db.from('professors').update({
      verification_code: code,
      verification_code_expires: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    }).eq('id', professor.id);

    // Send verification email via Resend
    try {
      const { sendProfessorVerificationEmail } = await import('../../../lib/services/emailService');
      await sendProfessorVerificationEmail({
        to: normalised,
        code,
        professorName: professor.name,
      });
    } catch (emailErr) {
      console.error('[professor/claim] Email send failed:', emailErr);
      // Still return success — code is stored, professor can retry
    }

    return Response.json({
      success: true,
      message: 'Verification code sent',
      professorId: professor.id,
      professorName: professor.name,
      university: professor.university,
    });
  } catch (e) {
    console.error('[professor/claim]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
