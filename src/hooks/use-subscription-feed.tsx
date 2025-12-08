"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { YouTubeVideo, YouTubeFilterOptions, YouTubeSortOptions } from "@/types/youtube"
import { cacheUtils } from "@/lib/cache"

interface UseSubscriptionFeedOptions {
  autoLoad?: boolean
  itemsPerPage?: number
}

export function useSubscriptionFeed(options: UseSubscriptionFeedOptions = {}) {
  const { autoLoad = true, itemsPerPage = 24 } = options
  const { isAuthenticated } = useAuth()
  
  const [rawVideos, setRawVideos] = useState<YouTubeVideo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [filters, setFilters] = useState<YouTubeFilterOptions>({})
  const [sort, setSort] = useState<YouTubeSortOptions>({ sortBy: 'date', order: 'desc' })
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({})
  const [visibleCount, setVisibleCount] = useState(itemsPerPage)
  
  const loadingRef = useRef(false)

  const fetchVideos = useCallback(async (reset: boolean = false) => {
    if (!isAuthenticated || loadingRef.current) return
    
    loadingRef.current = true
    setLoading(true)
    setError(null)

    try {
      // Try cache first for non-reset requests
      if (!reset) {
        const cachedVideos = selectedChannelId 
          ? cacheUtils.getChannelVideos(selectedChannelId)
          : cacheUtils.getVideos();
        
        if (Array.isArray(cachedVideos)) {
          setRawVideos(cachedVideos as YouTubeVideo[]);
          setVisibleCount(itemsPerPage);
          return;
        }
      }

      const storedTokens = localStorage.getItem('youtube_auth_tokens');
      if (!storedTokens) {
        throw new Error('No authentication tokens found');
      }
      
      const tokens = JSON.parse(storedTokens);

      let response;
      if (selectedChannelId) {
        console.log('Fetching videos from channel:', selectedChannelId);
        response = await fetch(`/api/youtube/channel-videos?accessToken=${tokens.access_token}&channelId=${selectedChannelId}&maxResults=25`, {
          method: 'POST'
        });
      } else {
        response = await fetch(`/api/youtube/videos?accessToken=${tokens.access_token}`, {
          method: 'POST'
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch videos: ${errorText}`);
      }

      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        // Sort by publish date (newest first)
        const sortedVideos = data.items.sort((a: YouTubeVideo, b: YouTubeVideo) => {
          const dateA = new Date(a.snippet?.publishedAt || '');
          const dateB = new Date(b.snippet?.publishedAt || '');
          return dateB.getTime() - dateA.getTime();
        });
        
        // Cache the results
        if (selectedChannelId) {
          cacheUtils.setChannelVideos(selectedChannelId, sortedVideos);
        } else {
          cacheUtils.setVideos(sortedVideos);
        }
        
        setRawVideos(sortedVideos)
        setVisibleCount(itemsPerPage)
      } else {
        if (reset) {
          setRawVideos([])
          setVisibleCount(itemsPerPage)
        }
      }
      
    } catch (err) {
      console.error('Fetch videos error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch videos')
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [isAuthenticated, itemsPerPage, selectedChannelId])

  const refresh = useCallback(() => {
    cacheUtils.clearVideoCache()
    fetchVideos(true)
  }, [fetchVideos])

  const updateFilters = useCallback((newFilters: Partial<YouTubeFilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setVisibleCount(itemsPerPage)
  }, [itemsPerPage])

  const updateSort = useCallback((newSort: Partial<YouTubeSortOptions>) => {
    setSort(prev => ({ ...prev, ...newSort }))
    setVisibleCount(itemsPerPage)
  }, [itemsPerPage])

  const updateSearchQuery = useCallback((query: string) => {
    setSearchQuery(query)
    setVisibleCount(itemsPerPage)
  }, [itemsPerPage])

  const updateDateRange = useCallback((range: { from?: string; to?: string }) => {
    setDateRange(range)
    setVisibleCount(itemsPerPage)
  }, [itemsPerPage])

  const clearFilters = useCallback(() => {
    setFilters({})
    setSearchQuery('')
    setDateRange({})
    setVisibleCount(itemsPerPage)
  }, [itemsPerPage])

  const formatDuration = (duration: string): 'short' | 'medium' | 'long' => {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/)
    if (!match) return 'medium'
    
    const hours = parseInt(match[1]) || 0
    const minutes = parseInt(match[2]) || 0
    const totalMinutes = hours * 60 + minutes
    
    if (totalMinutes < 4) return 'short'
    if (totalMinutes > 20) return 'long'
    return 'medium'
  }

  const filteredVideos = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const fromDate = dateRange.from ? new Date(dateRange.from) : null
    const toDate = dateRange.to ? new Date(dateRange.to) : null

    return rawVideos.filter(video => {
      if (filters.duration && filters.duration !== 'any') {
        if (formatDuration(video.contentDetails.duration) !== filters.duration) {
          return false
        }
      }

      if (filters.channelId && video.snippet.channelId !== filters.channelId) {
        return false
      }

      if (query) {
        const haystack = `${video.snippet.title} ${video.snippet.description} ${video.snippet.channelTitle}`.toLowerCase()
        if (!haystack.includes(query)) {
          return false
        }
      }

      if (fromDate || toDate) {
        const publishedAt = new Date(video.snippet.publishedAt)
        if (fromDate && publishedAt < fromDate) {
          return false
        }
        if (toDate) {
          const inclusiveToDate = new Date(toDate)
          inclusiveToDate.setHours(23, 59, 59, 999)
          if (publishedAt > inclusiveToDate) {
            return false
          }
        }
      }

      return true
    })
  }, [rawVideos, filters, searchQuery, dateRange])

  const sortedVideos = useMemo(() => {
    const list = [...filteredVideos]

    const orderMultiplier = sort.order === 'asc' ? 1 : -1

    switch (sort.sortBy) {
      case 'title':
        list.sort((a, b) =>
          a.snippet.title.localeCompare(b.snippet.title, undefined, { sensitivity: 'base' }) * orderMultiplier
        )
        break
      case 'viewCount':
        list.sort((a, b) => {
          const viewsA = parseInt(a.statistics.viewCount || '0', 10)
          const viewsB = parseInt(b.statistics.viewCount || '0', 10)
          return (viewsA - viewsB) * orderMultiplier
        })
        break
      case 'date':
      default:
        list.sort((a, b) => {
          const dateA = new Date(a.snippet.publishedAt || '')
          const dateB = new Date(b.snippet.publishedAt || '')
          return (dateA.getTime() - dateB.getTime()) * orderMultiplier
        })
        break
    }

    return list
  }, [filteredVideos, sort])

  const visibleVideos = useMemo(() => {
    return sortedVideos.slice(0, visibleCount)
  }, [sortedVideos, visibleCount])

  const hasMore = visibleCount < sortedVideos.length
  const totalResults = sortedVideos.length

  const uniqueChannels = useMemo(() => {
    const channels = new Map<string, string>()
    rawVideos.forEach(video => {
      channels.set(video.snippet.channelId, video.snippet.channelTitle)
    })
    return Array.from(channels.entries()).map(([id, title]) => ({ id, title }))
  }, [rawVideos])

  const hasActiveFilters = useMemo(() => {
    const hasDurationFilter = typeof filters.duration !== 'undefined' && filters.duration !== 'any'
    return !!(searchQuery || filters.channelId || hasDurationFilter || dateRange.from || dateRange.to)
  }, [searchQuery, filters, dateRange])

  useEffect(() => {
    if (autoLoad && isAuthenticated) {
      fetchVideos(true)
    }
  }, [autoLoad, isAuthenticated, fetchVideos])

  const selectChannel = useCallback((channelId: string | null) => {
    setSelectedChannelId(channelId);
    setVisibleCount(itemsPerPage)
    
    // Trigger a refresh - the fetchVideos function will use the selectedChannelId
    setTimeout(() => {
      if (channelId) {
        console.log('Setting selected channel ID:', channelId);
      }
      fetchVideos(true);
    }, 0);
  }, [fetchVideos, itemsPerPage]);

  const clearChannelSelection = useCallback(() => {
    console.log('Clearing channel selection - going back to all videos');
    setSelectedChannelId(null);
    setVisibleCount(itemsPerPage)
    
    // Small delay to ensure state is updated before fetching
    setTimeout(() => {
      fetchVideos(true);
    }, 100);
  }, [fetchVideos, itemsPerPage]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setVisibleCount(prev => prev + itemsPerPage)
    }
  }, [hasMore, itemsPerPage, loading])

  return {
    // Data
    videos: visibleVideos,
    allVideos: sortedVideos,
    uniqueChannels,
    totalResults,
    
    // State
    loading,
    error,
    hasMore,
    hasActiveFilters,
    selectedChannelId,
    
    // Filters and search
    filters,
    sort,
    searchQuery,
    dateRange,
    
    // Actions
    loadMore,
    refresh,
    updateFilters,
    updateSort,
    updateSearchQuery,
    updateDateRange,
    clearFilters,
    selectChannel,
    clearChannelSelection,
    
    // Utilities
    formatDuration,
  }
}
