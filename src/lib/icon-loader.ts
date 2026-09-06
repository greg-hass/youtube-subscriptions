import { CORS_PROXIES, buildProxiedUrl } from './cors-proxies';

const channelThumbnailCache = new Map<string, string>();
const failedChannelThumbnailCache = new Set<string>();
const inflightThumbnailRequests = new Map<string, Promise<string | null>>();

/**
 * Extract the best thumbnail URL from a YouTube channel HTML page
 */
function extractThumbnailFromHtml(html: string): string | null {
  const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
  if (ogImageMatch?.[1]) {
    let thumbnail = ogImageMatch[1].replace(/&/g, '&');

    // Convert protocol-less URLs to https
    if (thumbnail.startsWith('//')) {
      thumbnail = 'https:' + thumbnail;
    }

    // Optimize thumbnail size for maximum quality
    if (thumbnail.includes('=s')) {
      // Convert very high resolutions to maximum quality 800px
      if (thumbnail.includes('=s900-')) {
        thumbnail = thumbnail.replace(/=s\d+-c/, '=s800-c');
      } else if (thumbnail.includes('=s800-')) {
        // Keep 800px as is maximum
      } else if (thumbnail.includes('=s600-')) {
        thumbnail = thumbnail.replace(/=s\d+-c/, '=s800-c');
      } else if (thumbnail.includes('=s400-')) {
        thumbnail = thumbnail.replace(/=s\d+-c/, '=s800-c');
      } else if (thumbnail.includes('=s176-')) {
        thumbnail = thumbnail.replace(/=s\d+-c/, '=s800-c');
      }
    } else if (thumbnail.includes('googleusercontent.com')) {
      // Add maximum quality size parameter if missing
      thumbnail += '=s800-c-k-c0x00ffffff-no-rj';
    }

    return thumbnail;
  }

  const imageSrcMatch = html.match(/<link[^>]+rel="image_src"[^>]+href="([^"]+)"/i);
  if (imageSrcMatch?.[1]) {
    const thumbnail = imageSrcMatch[1].replace(/&/g, '&');
    return thumbnail;
  }

  return null;
}

/**
 * Fetch the authoritative channel thumbnail by scraping the channel page
 * through our CORS proxies. Result is memoized to avoid repeated requests.
 */
export async function resolveChannelThumbnail(channelId: string): Promise<string | null> {
  if (channelThumbnailCache.has(channelId)) {
    return channelThumbnailCache.get(channelId)!;
  }

  if (failedChannelThumbnailCache.has(channelId)) {
    return null;
  }

  if (inflightThumbnailRequests.has(channelId)) {
    return inflightThumbnailRequests.get(channelId)!;
  }

  const request = (async () => {
    const channelUrl = `https://www.youtube.com/channel/${channelId}`;

    // Try each proxy in sequence until one works
    for (let i = 0; i < CORS_PROXIES.length; i++) {
      const proxy = CORS_PROXIES[i];

      try {
        const proxiedUrl = buildProxiedUrl(proxy, channelUrl);
        const response = await fetch(proxiedUrl, {
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();

        if (html.length < 1000) {
          // Try next proxy if HTML is too short
          continue;
        }

        const thumbnail = extractThumbnailFromHtml(html);

        if (thumbnail) {
          channelThumbnailCache.set(channelId, thumbnail);
          return thumbnail;
        } else {
          // Try next proxy
          continue;
        }
      } catch {
        // If this is not the last proxy, try the next one
        if (i < CORS_PROXIES.length - 1) {
          continue;
        }
      }
    }

    failedChannelThumbnailCache.add(channelId);
    return null;
  })();

  inflightThumbnailRequests.set(channelId, request);

  const result = await request;
  inflightThumbnailRequests.delete(channelId);

  return result;
}

/**
 * Generate a placeholder thumbnail as a data URI
 */
export function generatePlaceholderThumbnail(label: string): string {
  const initials = label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0]?.toUpperCase())
    .join('') || 'YT';
  const hue = Array.from(label).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
  const accent = `hsl(${hue}, 72%, 46%)`;
  const accentDark = `hsl(${(hue + 38) % 360}, 68%, 28%)`;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180' viewBox='0 0 320 180'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${accent}'/><stop offset='1' stop-color='${accentDark}'/></linearGradient></defs><rect width='320' height='180' fill='url(#g)'/><circle cx='260' cy='30' r='80' fill='rgba(255,255,255,0.16)'/><circle cx='48' cy='150' r='68' fill='rgba(0,0,0,0.14)'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Inter, Arial, sans-serif' font-size='58' font-weight='800' letter-spacing='1' fill='white'>${initials}</text></svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function getDisplayThumbnail(thumbnail: string | undefined, label: string): string {
  if (!thumbnail) {
    return generatePlaceholderThumbnail(label);
  }

  if (thumbnail.startsWith('data:') || thumbnail.startsWith('/api/channel-thumbnail')) {
    return thumbnail;
  }

  try {
    const url = new URL(thumbnail);
    const proxiedHosts = new Set([
      'yt3.googleusercontent.com',
      'yt3.ggpht.com',
      'i.ytimg.com',
    ]);

    if (proxiedHosts.has(url.hostname)) {
      return `/api/channel-thumbnail?url=${encodeURIComponent(thumbnail)}`;
    }
  } catch {
    return generatePlaceholderThumbnail(label);
  }

  return thumbnail;
}

/**
 * Handle image loading with multiple fallbacks
 */
export function handleImageLoadError(
  event: React.SyntheticEvent<HTMLImageElement>,
  channelId: string,
  channelTitle: string
): void {
  const target = event.target as HTMLImageElement;

  const fallbackPlaceholder = generatePlaceholderThumbnail(channelTitle || channelId);

  // Immediately use placeholder; network attempts are handled elsewhere to avoid console spam
  target.src = fallbackPlaceholder;
}
