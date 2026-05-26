import { supabaseAdmin } from '../../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const stateRaw = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const baseUrl = 'https://www.koalaphd.com';

  let userId: string | null = null;
  let returnTo = '/koala/my-profile';

  if (stateRaw) {
    try {
      const decoded = JSON.parse(Buffer.from(stateRaw, 'base64url').toString());
      userId = decoded.userId;
      returnTo = decoded.returnTo || returnTo;
    } catch {
      userId = stateRaw;
    }
  }

  if (error || !code || !userId) {
    console.error('[gmail/callback] OAuth error or missing params:', { error, hasCode: !!code, hasState: !!userId });
    return Response.redirect(`${baseUrl}${returnTo}?gmail=error`);
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: 'https://www.koalaphd.com/api/auth/gmail/callback',
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const detail = await tokenRes.text();
      console.error('[gmail/callback] token exchange failed:', detail);
      return Response.redirect(`${baseUrl}${returnTo}?gmail=error`);
    }

    const tokens = await tokenRes.json();
    const accessToken: string = tokens.access_token;
    const refreshToken: string = tokens.refresh_token;
    const expiresIn: number = tokens.expires_in;

    if (!accessToken || !refreshToken) {
      console.error('[gmail/callback] missing tokens in response');
      return Response.redirect(`${baseUrl}${returnTo}?gmail=error`);
    }

    const profileRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileRes.ok) {
      console.error('[gmail/callback] Gmail profile fetch failed:', await profileRes.text());
      return Response.redirect(`${baseUrl}${returnTo}?gmail=error`);
    }

    const profile = await profileRes.json();
    const gmailAddress: string = profile.emailAddress;

    const tokenExpiry = new Date(Date.now() + expiresIn * 1000).toISOString();

    const { error: upsertErr } = await db
      .from('gmail_tokens')
      .upsert({
        user_id: userId,
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expiry: tokenExpiry,
        gmail_address: gmailAddress,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (upsertErr) {
      console.error('[gmail/callback] upsert error:', upsertErr);
      return Response.redirect(`${baseUrl}${returnTo}?gmail=error`);
    }

    return Response.redirect(`${baseUrl}${returnTo}?gmail=connected`);
  } catch (err) {
    console.error('[gmail/callback]', err);
    return Response.redirect(`${baseUrl}${returnTo}?gmail=error`);
  }
}
