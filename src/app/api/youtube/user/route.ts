import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const accessToken = searchParams.get('accessToken');

    if (!accessToken) {
      return NextResponse.json({ error: 'Access token is required' }, { status: 400 });
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client,
    });

    const response = await youtube.channels.list({
      part: ['snippet', 'contentDetails', 'statistics'],
      mine: true,
    });

    const user = response.data.items?.[0] || null;
    
    return NextResponse.json({ user });
  } catch (error) {
    console.error('YouTube user info error:', error);
    
    if (error && typeof error === 'object' && 'response' in error && error.response && typeof error.response === 'object' && 'data' in error.response && error.response.data && typeof error.response.data === 'object' && 'error' in error.response.data) {
      const errorData = error.response.data.error as { code?: number; message?: string };
      const { code, message } = errorData;
      if (code === 401) {
        return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
      }
      if (code === 403) {
        return NextResponse.json({ error: 'Insufficient permissions or quota exceeded' }, { status: 403 });
      }
      return NextResponse.json({ error: message || 'Unknown error' }, { status: code || 500 });
    }

    return NextResponse.json({ error: 'Failed to fetch user info' }, { status: 500 });
  }
}