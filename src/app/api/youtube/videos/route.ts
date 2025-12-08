import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

const MAX_CHANNELS = 20;
const PLAYLIST_ITEMS_PER_CHANNEL = 5;
const PLAYLIST_CONCURRENCY = 5;

function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function POST(request: NextRequest) {
  try {
    console.log('API: Received request to fetch videos');
    const searchParams = request.nextUrl.searchParams;
    const accessToken = searchParams.get('accessToken');

    console.log('API: Access token present:', !!accessToken);
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Access token is required' }, { status: 400 });
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client,
    });

    // Get subscriptions first to find channels
    const subscriptionsResponse = await youtube.subscriptions.list({
      part: ['snippet'],
      maxResults: 50,
      mine: true,
    });

    console.log('API: Found subscriptions:', subscriptionsResponse.data.items?.length || 0);

    const channels = (subscriptionsResponse.data.items || []).slice(0, MAX_CHANNELS);
    const channelIds = channels
      .map(channel => channel.snippet?.resourceId?.channelId)
      .filter((id): id is string => Boolean(id));

    if (!channelIds.length) {
      return NextResponse.json({
        kind: 'youtube#videoListResponse',
        etag: '',
        pageInfo: { totalResults: 0, resultsPerPage: 0 },
        items: [],
      });
    }

    // Fetch upload playlist IDs for all channels in a single batch
    const channelDetailsResponse = await youtube.channels.list({
      part: ['contentDetails'],
      id: channelIds,
    });

    const uploadPlaylists = new Map<string, string>();
    channelDetailsResponse.data.items?.forEach(item => {
      const channelId = item.id;
      const uploads = item.contentDetails?.relatedPlaylists?.uploads;
      if (channelId && uploads) {
        uploadPlaylists.set(channelId, uploads);
      }
    });

    const playlistIds = channelIds
      .map(channelId => uploadPlaylists.get(channelId))
      .filter((id): id is string => Boolean(id));

    if (!playlistIds.length) {
      return NextResponse.json({
        kind: 'youtube#videoListResponse',
        etag: '',
        pageInfo: { totalResults: 0, resultsPerPage: 0 },
        items: [],
      });
    }

    // Fetch playlist items with limited concurrency to stay within quota
    const videoIdBuckets: string[][] = [];
    for (const playlistBatch of chunkArray(playlistIds, PLAYLIST_CONCURRENCY)) {
      const playlistResults = await Promise.all(
        playlistBatch.map(async playlistId => {
          try {
            const playlistResponse = await youtube.playlistItems.list({
              part: ['contentDetails'],
              playlistId,
              maxResults: PLAYLIST_ITEMS_PER_CHANNEL,
            });

            return (
              playlistResponse.data.items
                ?.map(item => item.contentDetails?.videoId)
                .filter((id): id is string => Boolean(id)) ?? []
            );
          } catch (error) {
            console.error(`Error fetching playlist ${playlistId}:`, error);
            return [];
          }
        })
      );

      playlistResults.forEach(videoIds => {
        if (videoIds.length) {
          videoIdBuckets.push(videoIds);
        }
      });
    }

    const allVideoIds = videoIdBuckets.flat();

    if (!allVideoIds.length) {
      return NextResponse.json({
        kind: 'youtube#videoListResponse',
        etag: '',
        pageInfo: { totalResults: 0, resultsPerPage: 0 },
        items: [],
      });
    }

    // Fetch video details in chunks of 50 (API limit)
    const allVideos: unknown[] = [];
    for (const videoChunk of chunkArray(allVideoIds, 50)) {
      const videoDetailsResponse = await youtube.videos.list({
        part: ['snippet', 'contentDetails', 'statistics'],
        id: videoChunk,
      });

      if (videoDetailsResponse.data.items?.length) {
        allVideos.push(...videoDetailsResponse.data.items);
      }
    }

    console.log('API: Total videos found:', allVideos.length);

    // Sort by publish date (newest first)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    allVideos.sort((a: any, b: any) => {
      const dateA = new Date(a.snippet?.publishedAt || '');
      const dateB = new Date(b.snippet?.publishedAt || '');
      return dateB.getTime() - dateA.getTime();
    });

    // Limit to 100 most recent
    const limitedVideos = allVideos.slice(0, 100);

    return NextResponse.json({
      kind: 'youtube#videoListResponse',
      etag: '',
      pageInfo: { totalResults: limitedVideos.length, resultsPerPage: limitedVideos.length },
      items: limitedVideos,
    });
  } catch (error) {
    console.error('YouTube videos error:', error);
    
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
      
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
      const responseData = googleApiError.response?.data;
      if (responseData?.error) {
        console.error('Google API response:', responseData);
        
        const { code, message } = responseData.error;
        if (code === 401) {
          return NextResponse.json({ error: 'Authentication failed. Please re-authenticate.' }, { status: 401 });
        }
        if (code === 403) {
          return NextResponse.json({ error: 'Insufficient permissions or quota exceeded.' }, { status: 403 });
        }
        return NextResponse.json({ error: message || 'YouTube API error' }, { status: code || 500 });
      }
      
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to fetch videos.' },
    { status: 405 }
  );
}
