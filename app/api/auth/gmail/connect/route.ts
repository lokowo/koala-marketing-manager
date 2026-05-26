import { getServerUser } from '../../../../lib/auth';

export async function GET(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) {
      return Response.redirect(new URL('/koala/home', process.env.NEXT_PUBLIC_SUPABASE_URL!).origin + '/koala/home');
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return Response.json({ error: 'Google OAuth not configured' }, { status: 500 });
    }

    const url = new URL(req.url);
    const returnTo = url.searchParams.get('return_to') || '/koala/my-profile';

    const statePayload = JSON.stringify({ userId: user.id, returnTo });
    const stateEncoded = Buffer.from(statePayload).toString('base64url');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: 'https://www.koalaphd.com/api/auth/gmail/callback',
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/gmail.send',
      access_type: 'offline',
      prompt: 'consent',
      state: stateEncoded,
    });

    return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  } catch (error) {
    console.error('[gmail/connect]', error);
    return Response.json({ error: 'Failed to initiate Gmail connection' }, { status: 500 });
  }
}
