'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { YouTubeVideo } from '@/types/youtube';

interface WatchLaterItem {
  id: string;
  addedAt: string;
  video: YouTubeVideo;
}

interface WatchLaterContextValue {
  items: WatchLaterItem[];
  add: (video: YouTubeVideo) => void;
  remove: (videoId: string) => void;
  clear: () => void;
  isSaved: (videoId: string) => boolean;
}

const STORAGE_KEY = 'youtube_subscriptions_watch_later';

const WatchLaterContext = createContext<WatchLaterContextValue | undefined>(undefined);

interface WatchLaterProviderProps {
  children: React.ReactNode;
}

export const WatchLaterProvider: React.FC<WatchLaterProviderProps> = ({ children }) => {
  const [items, setItems] = useState<WatchLaterItem[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: WatchLaterItem[] = JSON.parse(stored);
        setItems(parsed);
      }
    } catch (error) {
      console.error('Failed to load Watch Later items from storage:', error);
    }
  }, []);

  const updateItems = useCallback((updater: (prev: WatchLaterItem[]) => WatchLaterItem[]) => {
    setItems(prev => {
      const next = updater(prev);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch (error) {
          console.error('Failed to persist Watch Later items:', error);
        }
      }
      return next;
    });
  }, []);

  const add = useCallback(
    (video: YouTubeVideo) => {
      updateItems(prev => {
        if (prev.some(item => item.id === video.id)) {
          return prev;
        }
        const newItem: WatchLaterItem = {
          id: video.id,
          addedAt: new Date().toISOString(),
          video,
        };
        return [newItem, ...prev];
      });
    },
    [updateItems]
  );

  const remove = useCallback(
    (videoId: string) => {
      updateItems(prev => prev.filter(item => item.id !== videoId));
    },
    [updateItems]
  );

  const clear = useCallback(() => {
    updateItems(() => []);
  }, [updateItems]);

  const isSaved = useCallback(
    (videoId: string) => items.some(item => item.id === videoId),
    [items]
  );

  const value = useMemo<WatchLaterContextValue>(
    () => ({
      items,
      add,
      remove,
      clear,
      isSaved,
    }),
    [items, add, remove, clear, isSaved]
  );

  return <WatchLaterContext.Provider value={value}>{children}</WatchLaterContext.Provider>;
};

export function useWatchLater(): WatchLaterContextValue {
  const context = useContext(WatchLaterContext);
  if (!context) {
    throw new Error('useWatchLater must be used within a WatchLaterProvider');
  }
  return context;
}
