interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  expiry: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl,
    };
    this.cache.set(key, entry);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T>;
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const cache = new MemoryCache();

// Auto-cleanup every 10 minutes
setInterval(() => cache.cleanup(), 10 * 60 * 1000);

// Cache keys
export const CACHE_KEYS = {
  USER_DATA: 'user_data',
  SUBSCRIPTIONS: 'subscriptions',
  VIDEOS: 'videos_',
  CHANNEL_VIDEOS: 'channel_videos_',
} as const;

// Cache TTL values (in milliseconds)
export const CACHE_TTL = {
  USER_DATA: 30 * 60 * 1000, // 30 minutes
  SUBSCRIPTIONS: 60 * 60 * 1000, // 1 hour
  VIDEOS: 10 * 60 * 1000, // 10 minutes
  CHANNEL_VIDEOS: 15 * 60 * 1000, // 15 minutes
} as const;

// Helper functions for specific cache operations
export const cacheUtils = {
  // User data caching
  getUserData: () => cache.get(CACHE_KEYS.USER_DATA),
  setUserData: (data: unknown) => cache.set(CACHE_KEYS.USER_DATA, data, CACHE_TTL.USER_DATA),
  
  // Subscriptions caching
  getSubscriptions: () => cache.get(CACHE_KEYS.SUBSCRIPTIONS),
  setSubscriptions: (data: unknown) => cache.set(CACHE_KEYS.SUBSCRIPTIONS, data, CACHE_TTL.SUBSCRIPTIONS),
  
  // Videos caching with channel-specific keys
  getVideos: (channelId?: string) => {
    const key = channelId ? `${CACHE_KEYS.VIDEOS}${channelId}` : CACHE_KEYS.VIDEOS;
    return cache.get(key);
  },
  setVideos: (data: unknown, channelId?: string) => {
    const key = channelId ? `${CACHE_KEYS.VIDEOS}${channelId}` : CACHE_KEYS.VIDEOS;
    cache.set(key, data, CACHE_TTL.VIDEOS);
  },
  
  // Channel-specific videos
  getChannelVideos: (channelId: string) => cache.get(`${CACHE_KEYS.CHANNEL_VIDEOS}${channelId}`),
  setChannelVideos: (channelId: string, data: unknown) => {
    cache.set(`${CACHE_KEYS.CHANNEL_VIDEOS}${channelId}`, data, CACHE_TTL.CHANNEL_VIDEOS);
  },
  
  // Clear all video-related cache
  clearVideoCache: () => {
    const stats = cache.getStats();
    stats.keys.forEach(key => {
      if (key.startsWith(CACHE_KEYS.VIDEOS) || key.startsWith(CACHE_KEYS.CHANNEL_VIDEOS)) {
        cache.delete(key);
      }
    });
  },
  
  // Clear all cache
  clearAll: () => cache.clear(),
};