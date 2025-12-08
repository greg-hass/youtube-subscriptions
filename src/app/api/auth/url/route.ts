import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`;

    console.log('OAuth Debug - Redirect URI:', redirectUri);
    console.log('OAuth Debug - BASE_URL:', process.env.NEXT_PUBLIC_BASE_URL);

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'OAuth credentials not configured' }, { status: 500 });
    }

    const scopes = [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube.force-ssl',
    ];

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'select_account');

    return NextResponse.json({ authUrl: authUrl.toString() });
  } catch (error) {
    console.error('Auth URL generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}