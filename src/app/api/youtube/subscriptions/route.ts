import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const accessToken = searchParams.get('accessToken');
    const maxResults = parseInt(searchParams.get('maxResults') || '500');
    const pageToken = searchParams.get('pageToken');

    if (!accessToken) {
      return NextResponse.json({ error: 'Access token is required' }, { status: 400 });
    }

    console.log('API: Fetching subscriptions with maxResults:', maxResults);

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client,
    });

    const response = await youtube.subscriptions.list({
      part: ['snippet', 'contentDetails'],
      maxResults: Math.min(maxResults, 50), // YouTube API max is 50 per request
      mine: true,
      pageToken: pageToken || undefined,
    });

    console.log('API: Fetched subscriptions:', response.data.items?.length || 0);

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('YouTube API error:', error);
    
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

    return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
  }
}