import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request: NextRequest) {
  try {
    console.log('API: Received request to fetch channel videos');
    const searchParams = request.nextUrl.searchParams;
    const accessToken = searchParams.get('accessToken');
    const channelId = searchParams.get('channelId');
    const maxResults = parseInt(searchParams.get('maxResults') || '25');
    
    console.log('API: Access token present:', !!accessToken);
    console.log('API: Channel ID:', channelId);
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Access token is required' }, { status: 400 });
    }

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client,
    });

    // Get channel details to find uploads playlist
    const channelsResponse = await youtube.channels.list({
      part: ['contentDetails'],
      id: [channelId],
    });

    console.log('API: Found channels:', channelsResponse.data.items?.length || 0);

    if (!channelsResponse.data.items || channelsResponse.data.items.length === 0) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    const uploadPlaylistId = channelsResponse.data.items[0].contentDetails?.relatedPlaylists?.uploads;
    
    if (!uploadPlaylistId) {
      return NextResponse.json({ error: 'Uploads playlist not found' }, { status: 404 });
    }

    console.log('API: Fetching videos from playlist:', uploadPlaylistId);

    // Get videos from the uploads playlist
    const playlistResponse = await youtube.playlistItems.list({
      part: ['snippet', 'contentDetails'],
      playlistId: uploadPlaylistId,
      maxResults,
    });

    const videoIds = playlistResponse.data.items?.map(item => 
      item.contentDetails?.videoId
    ).filter((id): id is string => id !== undefined) || [];

    console.log('API: Found video IDs:', videoIds.length);

    if (videoIds.length === 0) {
      return NextResponse.json({
        kind: 'youtube#videoListResponse',
        etag: '',
        pageInfo: { totalResults: 0, resultsPerPage: 0 },
        items: [],
      });
    }

    // Get detailed video information
    const videoDetailsResponse = await youtube.videos.list({
      part: ['snippet', 'contentDetails', 'statistics'],
      id: videoIds,
    });

    const videos = videoDetailsResponse.data.items || [];
    
    // Sort by publish date (newest first)
    videos.sort((a, b) => {
      const dateA = new Date(a.snippet?.publishedAt || '');
      const dateB = new Date(b.snippet?.publishedAt || '');
      return dateB.getTime() - dateA.getTime();
    });

    return NextResponse.json({
      kind: 'youtube#videoListResponse',
      etag: videoDetailsResponse.data.etag || '',
      pageInfo: videoDetailsResponse.data.pageInfo || { totalResults: videos.length, resultsPerPage: videos.length },
      items: videos,
    });
  } catch (error) {
    console.error('Channel videos error:', error);
    
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

    return NextResponse.json({ error: 'Failed to fetch channel videos' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to fetch channel videos.' },
    { status: 405 }
  );
}
