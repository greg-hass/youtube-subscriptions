import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import type { youtube_v3 } from 'googleapis';

const MAX_RESULTS = 20;

interface ChannelSearchResult {
  id: string;
  title: string;
  description: string;
  thumbnails: youtube_v3.Schema$ThumbnailDetails | undefined;
  subscriberCount: string;
  videoCount: string;
  viewCount: string;
  publishedAt: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const accessToken = searchParams.get('accessToken');
    const query = searchParams.get('query');
    const pageToken = searchParams.get('pageToken') ?? undefined;
    const maxResultsParam = Number(searchParams.get('maxResults') ?? MAX_RESULTS);
    const maxResults = Math.max(1, Math.min(maxResultsParam, MAX_RESULTS));

    if (!accessToken) {
      return NextResponse.json({ error: 'Access token is required' }, { status: 400 });
    }

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client,
    });

    const searchResponse = await youtube.search.list({
      part: ['snippet'],
      q: query,
      type: ['channel'],
      maxResults,
      pageToken,
    });

    const searchItems = searchResponse.data.items ?? [];
    const channelIds = searchItems
      .map(item => item.id?.channelId)
      .filter((id): id is string => Boolean(id));

    if (!channelIds.length) {
      return NextResponse.json({
        channels: [],
        nextPageToken: searchResponse.data.nextPageToken ?? null,
        prevPageToken: searchResponse.data.prevPageToken ?? null,
        totalResults: searchResponse.data.pageInfo?.totalResults ?? 0,
      });
    }

    const channelDetailsResponse = await youtube.channels.list({
      part: ['snippet', 'statistics'],
      id: channelIds,
    });

    const channelItems = channelDetailsResponse.data.items ?? [];
    const channels = channelItems.map((channel): ChannelSearchResult => ({
      id: channel.id ?? '',
      title: channel.snippet?.title ?? '',
      description: channel.snippet?.description ?? '',
      thumbnails: channel.snippet?.thumbnails ?? {},
      subscriberCount: channel.statistics?.subscriberCount ?? '0',
      videoCount: channel.statistics?.videoCount ?? '0',
      viewCount: channel.statistics?.viewCount ?? '0',
      publishedAt: channel.snippet?.publishedAt ?? null,
    }));

    return NextResponse.json({
      channels,
      nextPageToken: searchResponse.data.nextPageToken ?? null,
      prevPageToken: searchResponse.data.prevPageToken ?? null,
      totalResults: searchResponse.data.pageInfo?.totalResults ?? channels.length,
    });
  } catch (error) {
    console.error('Channel search error:', error);

    if (error instanceof Error) {
      type GoogleApiError = Error & {
        response?: {
          data?: {
            error?: {
              code?: number;
              message?: string;
            };
          };
        };
      };
      const googleApiError = error as GoogleApiError;
      const apiError = googleApiError.response?.data?.error;
      if (apiError) {
        console.error('Google API response:', googleApiError.response?.data);

        const { code, message } = apiError;
        return NextResponse.json({ error: message || 'YouTube API error' }, { status: code || 500 });
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: 'Failed to search channels' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to search channels.' },
    { status: 405 }
  );
}
