import { google } from 'googleapis';
import type { youtube_v3 } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import { youtubeConfig } from './env-validation';
import type {
  YouTubeVideo,
  YouTubeVideoResponse,
  YouTubeChannelResponse,
  YouTubeSubscriptionResponse,
  YouTubeSearchParams,
  YouTubeVideoParams,
  YouTubeChannelParams,
  YouTubeSubscriptionParams,
  YouTubeApiError,
} from '@/types/youtube';

export class YouTubeApiClient {
  private oauth2Client: OAuth2Client;
  private youtube: youtube_v3.Youtube; // YouTube API client

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      youtubeConfig.clientId,
      youtubeConfig.clientSecret,
      youtubeConfig.redirectUri
    );

    this.youtube = google.youtube({
      version: 'v3',
      auth: this.oauth2Client,
    });
  }

  setAccessToken(token: string): void {
    this.oauth2Client.setCredentials({ access_token: token });
  }

  async getVideos(params: YouTubeVideoParams = {}): Promise<YouTubeVideoResponse> {
    try {
      const response = await this.youtube.videos.list({
        part: params.part || ['snippet', 'contentDetails', 'statistics'],
        id: params.id,
        chart: params.chart,
        maxResults: Math.min(params.maxResults || 50, 50),
        pageToken: params.pageToken,
        regionCode: params.regionCode,
        videoCategoryId: params.videoCategoryId,
      });

      return response.data as YouTubeVideoResponse;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getChannels(params: YouTubeChannelParams = {}): Promise<YouTubeChannelResponse> {
    try {
      const response = await this.youtube.channels.list({
        part: params.part || ['snippet', 'contentDetails', 'statistics'],
        id: params.id,
        forUsername: params.forUsername,
        managedByMe: params.managedByMe,
        mine: params.mine,
        maxResults: Math.min(params.maxResults || 50, 50),
        pageToken: params.pageToken,
      });

      return response.data as YouTubeChannelResponse;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getSubscriptions(params: YouTubeSubscriptionParams = {}): Promise<YouTubeSubscriptionResponse> {
    try {
      const response = await this.youtube.subscriptions.list({
        part: params.part || ['snippet', 'contentDetails'],
        maxResults: Math.min(params.maxResults || 50, 50),
        pageToken: params.pageToken,
        order: params.order || 'relevance',
        forChannelId: params.forChannelId,
        mine: params.mine,
      });

      return response.data as YouTubeSubscriptionResponse;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async searchVideos(params: YouTubeSearchParams): Promise<YouTubeVideoResponse> {
    try {
      const searchResponse = await this.youtube.search.list({
        part: ['snippet'],
        q: params.query,
        type: ['video'],
        maxResults: Math.min(params.maxResults || 50, 50),
        pageToken: params.pageToken,
        order: params.sort?.sortBy || 'relevance',
        publishedAfter: params.publishedAfter,
        publishedBefore: params.publishedBefore,
        videoDuration: params.filter?.duration,
        videoDefinition: params.filter?.definition,
        videoCaption: params.filter?.caption,
        videoCategoryId: params.filter?.categoryId,
      });

      if (!searchResponse.data.items?.length) {
        return {
          kind: 'youtube#videoListResponse',
          etag: '',
          pageInfo: { totalResults: 0, resultsPerPage: 0 },
          items: [],
        };
      }

      const videoIds = (searchResponse.data.items ?? [])
        .map(item => item.id?.videoId ?? undefined)
        .filter((id): id is string => typeof id === 'string' && id.length > 0);

      if (videoIds.length === 0) {
        return {
          kind: 'youtube#videoListResponse',
          etag: '',
          pageInfo: { totalResults: 0, resultsPerPage: 0 },
          items: [],
        };
      }

      const videosResponse = await this.youtube.videos.list({
        part: ['snippet', 'contentDetails', 'statistics'],
        id: videoIds,
      });

      return videosResponse.data as YouTubeVideoResponse;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getChannelVideos(channelId: string, maxResults: number = 20): Promise<YouTubeVideoResponse> {
    try {
      const channelResponse = await this.youtube.channels.list({
        part: ['contentDetails'],
        id: [channelId],
      });

      if (!channelResponse.data.items?.length) {
        throw new Error('Channel not found');
      }

      const uploadPlaylistId = channelResponse.data.items[0].contentDetails?.relatedPlaylists?.uploads;
      if (!uploadPlaylistId) {
        throw new Error('Upload playlist not found');
      }

      const playlistResponse = await this.youtube.playlistItems.list({
        part: ['snippet', 'contentDetails'],
        playlistId: uploadPlaylistId,
        maxResults: Math.min(maxResults, 50),
      });

      if (!playlistResponse.data.items?.length) {
        return {
          kind: 'youtube#videoListResponse',
          etag: '',
          pageInfo: { totalResults: 0, resultsPerPage: 0 },
          items: [],
        };
      }

      const videoIds = (playlistResponse.data.items ?? [])
        .map(item => item.contentDetails?.videoId ?? undefined)
        .filter((id): id is string => typeof id === 'string' && id.length > 0);

      if (videoIds.length === 0) {
        return {
          kind: 'youtube#videoListResponse',
          etag: '',
          pageInfo: { totalResults: 0, resultsPerPage: 0 },
          items: [],
        };
      }

      const videosResponse = await this.youtube.videos.list({
        part: ['snippet', 'contentDetails', 'statistics'],
        id: videoIds,
      });

      return videosResponse.data as YouTubeVideoResponse;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getSubscriptionFeed(maxResults: number = 100): Promise<YouTubeVideoResponse> {
    try {
      const subscriptionsResponse = await this.getSubscriptions({
        part: ['snippet'],
        maxResults: 50,
        mine: true,
      });

      if (!subscriptionsResponse.items?.length) {
        return {
          kind: 'youtube#videoListResponse',
          etag: '',
          pageInfo: { totalResults: 0, resultsPerPage: 0 },
          items: [],
        };
      }

      const allVideos: YouTubeVideo[] = [];
      const channelsToProcess = Math.min(subscriptionsResponse.items.length, 20);

      for (let i = 0; i < channelsToProcess; i++) {
        const subscription = subscriptionsResponse.items[i];
        const channelId = subscription.snippet?.resourceId?.channelId;

        if (!channelId) continue;

        try {
          const channelVideos = await this.getChannelVideos(channelId, 5);
          if (channelVideos.items) {
            allVideos.push(...channelVideos.items);
          }
        } catch (error) {
          console.error(`Error fetching videos for channel ${channelId}:`, error);
        }

        if (i < channelsToProcess - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      allVideos.sort((a, b) => {
        const dateA = new Date(a.snippet.publishedAt);
        const dateB = new Date(b.snippet.publishedAt);
        return dateB.getTime() - dateA.getTime();
      });

      const limitedVideos = allVideos.slice(0, maxResults);

      return {
        kind: 'youtube#videoListResponse',
        etag: '',
        pageInfo: { totalResults: limitedVideos.length, resultsPerPage: limitedVideos.length },
        items: limitedVideos,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: unknown): Error {
    if (error && typeof error === 'object' && 'response' in error) {
      const googleError = error as { response?: { data?: YouTubeApiError } };
      const apiError = googleError.response?.data?.error;
      if (apiError) {
        return new Error(`${apiError.message} (Code: ${apiError.code})`);
      }
    }

    if (error instanceof Error) {
      return error;
    }

    return new Error('Unknown YouTube API error');
  }
}

export const youtubeClient = new YouTubeApiClient();

export function createYouTubeClient(accessToken: string): YouTubeApiClient {
  const client = new YouTubeApiClient();
  client.setAccessToken(accessToken);
  return client;
}

export function formatDuration(duration: string): string {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return '0:00';

  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatViewCount(viewCount: string): string {
  const count = parseInt(viewCount);
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M views`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K views`;
  }
  return `${count} views`;
}

export function formatSubscriberCount(subscriberCount: string): string {
  const count = parseInt(subscriberCount);
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

export function getThumbnailUrl(thumbnails: Record<string, { url?: string }>, size: 'default' | 'medium' | 'high' | 'maxres' = 'medium'): string {
  return thumbnails[size]?.url || thumbnails.medium?.url || thumbnails.default?.url || '';
}

export function isVideoLive(video: YouTubeVideo): boolean {
  return video.snippet.liveBroadcastContent === 'live';
}

export function isVideoUpcoming(video: YouTubeVideo): boolean {
  return video.snippet.liveBroadcastContent === 'upcoming';
}

export function getVideoAge(publishedAt: string): string {
  const now = new Date();
  const published = new Date(publishedAt);
  const diffMs = now.getTime() - published.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes <= 1 ? 'just now' : `${diffMinutes} minutes ago`;
    }
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }

  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

export function validateVideoId(videoId: string): boolean {
  return /^[a-zA-Z0-9_-]{11}$/.test(videoId);
}

export function validateChannelId(channelId: string): boolean {
  return /^UC[a-zA-Z0-9_-]{22}$/.test(channelId);
}

export function extractVideoIdFromUrl(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

export function extractChannelIdFromUrl(url: string): string | null {
  const patterns = [
    /youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})/,
    /youtube\.com\/c\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/@([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}
