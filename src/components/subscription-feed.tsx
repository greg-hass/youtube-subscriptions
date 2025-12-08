"use client"

import React, { useState, useCallback, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { VideoCard } from "@/components/video-card"
import { useSubscriptionFeed } from "@/hooks/use-subscription-feed"
import { cn } from "@/lib/utils"
import { YouTubeSortOptions } from "@/types/youtube"
import { 
  Filter, 
  SortAsc, 
  SortDesc, 
  Calendar, 
  Clock, 
  User, 
  RefreshCw, 
  AlertCircle,
  Loader2,
  X,
  Search,
  Grid3X3,
  List,
  Compass,
  ExternalLink,
  PlayCircle
} from "lucide-react"
import { formatSubscriberCount } from "@/lib/youtube-format"

interface SubscriptionFeedProps {
  onVideoPlay?: (videoId: string) => void
  className?: string
}

interface ChannelSearchResult {
  id: string
  title: string
  description: string
  thumbnailUrl: string
  subscriberCount: string
  videoCount: string
  viewCount: string
}

interface ChannelSearchResponsePayload {
  channels?: Array<{
    id: string
    title: string
    description: string
    thumbnails?: {
      medium?: { url?: string }
      default?: { url?: string }
    }
    subscriberCount?: string
    videoCount?: string
    viewCount?: string
  }>
  nextPageToken?: string | null
  prevPageToken?: string | null
  totalResults?: number
}

export function SubscriptionFeed({ onVideoPlay, className }: SubscriptionFeedProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  const {
    videos,
    uniqueChannels,
    totalResults,
    loading,
    error,
    hasMore,
    hasActiveFilters,
    selectedChannelId,
    filters,
    sort,
    searchQuery,
    dateRange,
    loadMore,
    refresh,
    updateFilters,
    updateSort,
    updateSearchQuery,
    updateDateRange,
    clearFilters,
    selectChannel,
    clearChannelSelection,
  } = useSubscriptionFeed({
    autoLoad: true,
    itemsPerPage: 24,
  })
  const [channelSearchQuery, setChannelSearchQuery] = useState('')
  const [channelSearchResults, setChannelSearchResults] = useState<ChannelSearchResult[]>([])
  const [channelSearchLoading, setChannelSearchLoading] = useState(false)
  const [channelSearchError, setChannelSearchError] = useState<string | null>(null)
  const [channelSearchNextPage, setChannelSearchNextPage] = useState<string | null>(null)
  const [channelSearchTotal, setChannelSearchTotal] = useState<number | null>(null)
  const [hasSearchedChannels, setHasSearchedChannels] = useState(false)

  useEffect(() => {
    const handleChannelSelection = (event: CustomEvent) => {
      console.log('SubscriptionFeed: Received channel selection:', event.detail);
      selectChannel(event.detail);
    };

    window.addEventListener('selectChannel', handleChannelSelection as EventListener);
    
    return () => {
      window.removeEventListener('selectChannel', handleChannelSelection as EventListener);
    };
  }, [selectChannel]);

  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
    }
  }, [])
  const lastVideoRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }

    if (loading || !hasMore || !node) {
      return
    }
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore()
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )
    
    observerRef.current.observe(node)
  }, [loading, hasMore, loadMore])

  const handleFilterChange = useCallback((newFilters: Partial<typeof filters>) => {
    updateFilters(newFilters)
  }, [updateFilters])

  const handleSortChange = useCallback((newSort: Partial<typeof sort>) => {
    updateSort(newSort)
  }, [updateSort])

  const handleSearchChange = useCallback((query: string) => {
    updateSearchQuery(query)
  }, [updateSearchQuery])

  const handleDateRangeChange = useCallback((range: { from?: string; to?: string }) => {
    updateDateRange(range)
  }, [updateDateRange])

  const executeChannelSearch = useCallback(async (mode: 'initial' | 'loadMore') => {
    const query = channelSearchQuery.trim()
    if (!query) {
      setChannelSearchError('Enter a channel name or keyword to search')
      return
    }

    try {
      setChannelSearchLoading(true)
      setChannelSearchError(null)

      const storedTokens = localStorage.getItem('youtube_auth_tokens')
      if (!storedTokens) {
        throw new Error('Please sign in to search for channels.')
      }

      const tokens = JSON.parse(storedTokens)
      const params = new URLSearchParams({
        accessToken: tokens.access_token,
        query,
      })

      if (mode === 'loadMore' && channelSearchNextPage) {
        params.set('pageToken', channelSearchNextPage)
      }

      const response = await fetch(`/api/youtube/channel-search?${params.toString()}`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Failed to search channels')
      }

      const data: ChannelSearchResponsePayload = await response.json()
      const mappedResults: ChannelSearchResult[] = (data.channels ?? []).map(channel => ({
        id: channel.id,
        title: channel.title,
        description: channel.description,
        thumbnailUrl:
          channel.thumbnails?.medium?.url ||
          channel.thumbnails?.default?.url ||
          '/default-channel.png',
        subscriberCount: channel.subscriberCount ?? '0',
        videoCount: channel.videoCount ?? '0',
        viewCount: channel.viewCount ?? '0',
      }))

      setChannelSearchResults(prev =>
        mode === 'loadMore' ? [...prev, ...mappedResults] : mappedResults
      )
      setChannelSearchNextPage(data.nextPageToken ?? null)
      setChannelSearchTotal(data.totalResults ?? mappedResults.length)
      setHasSearchedChannels(true)
    } catch (error) {
      console.error('Channel search error:', error)
      setChannelSearchError(error instanceof Error ? error.message : 'Failed to search channels')
    } finally {
      setChannelSearchLoading(false)
    }
  }, [channelSearchNextPage, channelSearchQuery])

  const handleChannelSearchSubmit = useCallback((event?: React.FormEvent) => {
    event?.preventDefault()
    executeChannelSearch('initial')
  }, [executeChannelSearch])

  const handleLoadMoreChannels = useCallback(() => {
    executeChannelSearch('loadMore')
  }, [executeChannelSearch])

  const handleChannelPreview = useCallback((channelId: string) => {
    selectChannel(channelId)
    setShowFilters(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [selectChannel])

  const activeFilterCount =
    (searchQuery ? 1 : 0) +
    (filters.channelId ? 1 : 0) +
    (filters.duration && filters.duration !== 'any' ? 1 : 0) +
    (dateRange.from ? 1 : 0) +
    (dateRange.to ? 1 : 0)

  if (error && videos.length === 0) {
    return (
      <Card className={cn("p-8", className)}>
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <div>
            <h3 className="text-lg font-semibold">Failed to load videos</h3>
            <p className="text-muted-foreground mt-1">{error}</p>
          </div>
          <Button onClick={refresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {selectedChannelId ? 'Channel Videos' : 'Subscription Feed'}
            </h2>
            {totalResults > 0 && (
              <p className="text-muted-foreground text-sm mt-1">
                {totalResults.toLocaleString()} videos {selectedChannelId ? 'from this channel' : 'found'}
              </p>
            )}
          </div>
          
          {selectedChannelId && (
            <Button variant="outline" onClick={clearChannelSelection}>
              <X className="h-4 w-4 mr-2" />
              Back to All Videos
            </Button>
          )}
          
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1 text-xs">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </div>

      {/* Channel Search */}
      <Card className="border-dashed">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Compass className="h-5 w-5 text-primary" />
              Discover New Channels
            </CardTitle>
            {channelSearchTotal !== null && hasSearchedChannels && (
              <span className="text-xs text-muted-foreground">
                {channelSearchTotal.toLocaleString()} results
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleChannelSearchSubmit} className="flex flex-col sm:flex-row gap-3">
            <Input
              value={channelSearchQuery}
              onChange={(e) => setChannelSearchQuery(e.target.value)}
              placeholder="Search all of YouTube for channels you haven't subscribed to yet..."
              className="flex-1"
            />
            <Button type="submit" disabled={channelSearchLoading}>
              {channelSearchLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search Channels
                </>
              )}
            </Button>
          </form>

          {channelSearchError && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{channelSearchError}</span>
            </div>
          )}

          {channelSearchResults.length === 0 && hasSearchedChannels && !channelSearchLoading && !channelSearchError && (
            <div className="rounded-md border border-dashed border-muted-foreground/30 p-6 text-center text-sm text-muted-foreground">
              No channels matched your search. Try a different keyword.
            </div>
          )}

          {channelSearchResults.length > 0 && (
            <div className="space-y-3">
              {channelSearchResults.map(channel => (
                <div
                  key={channel.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border rounded-lg p-4 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative h-16 w-16 rounded-full overflow-hidden bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={channel.thumbnailUrl}
                        alt={channel.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold flex items-center gap-2">
                        {channel.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                        <span>{formatSubscriberCount(channel.subscriberCount)} subscribers</span>
                        <span>{Number(channel.videoCount || 0).toLocaleString()} videos</span>
                        <span>{Number(channel.viewCount || 0).toLocaleString()} views</span>
                      </div>
                      {channel.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2 max-w-xl">
                          {channel.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:ml-auto">
                    <Button
                      variant="default"
                      size="sm"
                      className="gap-2"
                      onClick={() => handleChannelPreview(channel.id)}
                    >
                      <PlayCircle className="h-4 w-4" />
                      Preview Channel
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => window.open(`https://www.youtube.com/channel/${channel.id}`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open on YouTube
                    </Button>
                  </div>
                </div>
              ))}

              {channelSearchNextPage && (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    onClick={handleLoadMoreChannels}
                    disabled={channelSearchLoading}
                    className="gap-2"
                  >
                    {channelSearchLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Load More Results
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Filters & Sorting</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search
              </label>
            <Input
              placeholder="Search videos..."
              value={searchQuery || ''}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date Range
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  placeholder="From"
                  value={dateRange?.from || ''}
                  onChange={(e) => handleDateRangeChange({ 
                    ...dateRange, 
                    from: e.target.value 
                  })}
                />
                <Input
                  type="date"
                  placeholder="To"
                  value={dateRange?.to || ''}
                  onChange={(e) => handleDateRangeChange({ 
                    ...dateRange, 
                    to: e.target.value 
                  })}
                />
              </div>
            </div>

            {/* Channel Filter */}
            {uniqueChannels.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Channel
                </label>
                <select
                  className="w-full p-2 border rounded-md bg-background"
                  value={filters.channelId || ''}
                  onChange={(e) => handleFilterChange({ channelId: e.target.value || undefined })}
                >
                  <option value="">All Channels</option>
                  {uniqueChannels.map(channel => (
                    <option key={channel.id} value={channel.id}>
                      {channel.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Duration Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Duration
              </label>
              <select
                className="w-full p-2 border rounded-md bg-background"
                value={filters.duration || 'any'}
                onChange={(e) => handleFilterChange({ 
                  duration: e.target.value as 'any' | 'short' | 'medium' | 'long' 
                })}
              >
                <option value="any">Any Duration</option>
                <option value="short">Under 4 minutes</option>
                <option value="medium">4-20 minutes</option>
                <option value="long">Over 20 minutes</option>
              </select>
            </div>

            {/* Sort Options */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                {sort.order === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                Sort By
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  className="p-2 border rounded-md bg-background"
                  value={sort.sortBy}
                  onChange={(e) => handleSortChange({ 
                    sortBy: e.target.value as YouTubeSortOptions['sortBy'] 
                  })}
                >
                  <option value="date">Date</option>
                  <option value="viewCount">Views</option>
                  <option value="rating">Rating</option>
                  <option value="relevance">Relevance</option>
                  <option value="title">Title</option>
                </select>
                <select
                  className="p-2 border rounded-md bg-background"
                  value={sort.order}
                  onChange={(e) => handleSortChange({ 
                    order: e.target.value as 'asc' | 'desc' 
                  })}
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters} className="w-full">
                Clear All Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Video Grid/List */}
      {videos.length === 0 && !loading ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
              <Filter className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">No videos found</h3>
              <p className="text-muted-foreground mt-1">
                {hasActiveFilters
                  ? 'Try adjusting your filters or search terms'
                  : 'Your subscription feed appears to be empty'}
              </p>
            </div>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className={cn(
          viewMode === 'grid' 
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" 
            : "space-y-4"
        )}>
          {videos.map((video, index) => (
            <div
              key={video.id}
              ref={index === videos.length - 1 ? lastVideoRef : null}
            >
              <VideoCard
                video={video}
                onPlay={onVideoPlay}
                layout={viewMode}
                priority={index < 4}
              />
            </div>
          ))}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="flex items-center space-x-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading more videos...</span>
          </div>
        </div>
      )}

      {/* Error State (when we have some videos) */}
      {error && videos.length > 0 && (
        <Card className="p-4 border-destructive/20 bg-destructive/5">
          <div className="flex items-center space-x-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </Card>
      )}

      {/* End of Results */}
      {!hasMore && !loading && videos.length > 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>You&apos;ve reached the end of your subscription feed</p>
        </div>
      )}
    </div>
  )
}
