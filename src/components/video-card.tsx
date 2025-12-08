"use client"

import React, { memo, useMemo } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { YouTubeVideo } from "@/types/youtube"
import { cn } from "@/lib/utils"
import { useWatchLater } from "@/contexts/watch-later-context"
import { Clock } from "lucide-react"

interface VideoCardProps {
  video: YouTubeVideo
  onPlay?: (videoId: string) => void
  className?: string
  layout?: 'grid' | 'list'
  priority?: boolean
}

const VideoCardComponent = ({ video, onPlay, className, layout = 'grid', priority = false }: VideoCardProps) => {
  const { add, remove, isSaved } = useWatchLater()
  const isInWatchLater = isSaved(video.id)

  const handleWatchLaterToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    event.preventDefault()
    if (isInWatchLater) {
      remove(video.id)
    } else {
      add(video)
    }
  }

  const handleClick = () => {
    if (onPlay) {
      onPlay(video.id)
    }
  }

  // Memoize expensive calculations
  const formattedData = useMemo(() => {
    const formatViewCount = (count: string): string => {
      const num = parseInt(count)
      if (num >= 1000000) {
        return `${(num / 1000000).toFixed(1)}M views`
      } else if (num >= 1000) {
        return `${(num / 1000).toFixed(1)}K views`
      }
      return `${num} views`
    }

    const formatTimeAgo = (dateString: string): string => {
      const date = new Date(dateString)
      const now = new Date()
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

      if (diffInSeconds < 60) {
        return "just now"
      } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60)
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
      } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600)
        return `${hours} hour${hours > 1 ? 's' : ''} ago`
      } else if (diffInSeconds < 2592000) {
        const days = Math.floor(diffInSeconds / 86400)
        return `${days} day${days > 1 ? 's' : ''} ago`
      } else if (diffInSeconds < 31536000) {
        const months = Math.floor(diffInSeconds / 2592000)
        return `${months} month${months > 1 ? 's' : ''} ago`
      } else {
        const years = Math.floor(diffInSeconds / 31536000)
        return `${years} year${years > 1 ? 's' : ''} ago`
      }
    }

    const formatDuration = (duration: string): string => {
      const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/)
      if (!match) return ""

      const hours = parseInt(match[1]) || 0
      const minutes = parseInt(match[2]) || 0
      const seconds = parseInt(match[3]) || 0

      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      }
      return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }

    const getChannelInitials = (name: string): string => {
      return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }

    return {
      viewCount: formatViewCount(video.statistics.viewCount),
      timeAgo: formatTimeAgo(video.snippet.publishedAt),
      duration: formatDuration(video.contentDetails.duration),
      channelInitials: getChannelInitials(video.snippet.channelTitle),
      thumbnailUrl: layout === 'list' 
        ? video.snippet.thumbnails.medium.url 
        : video.snippet.thumbnails.high.url,
    }
  }, [video, layout])

  const thumbnailSizes =
    layout === 'list'
      ? "(max-width: 768px) 100vw, 256px"
      : "(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw";

  if (layout === 'list') {
    return (
      <Card 
        className={cn(
          "group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-md bg-card border-border",
          className
        )}
        onClick={handleClick}
      >
        <CardContent className="p-0">
          <div className="flex">
            {/* Thumbnail */}
            <div className="relative w-64 flex-shrink-0">
              <div className="relative aspect-video overflow-hidden bg-muted">
                <button
                  type="button"
                  onClick={handleWatchLaterToggle}
                  aria-label={isInWatchLater ? "Remove from Watch Later" : "Add to Watch Later"}
                  className={cn(
                    "absolute top-2 left-2 z-10 rounded-full p-1.5 bg-black/60 text-white transition-colors",
                    "backdrop-blur hover:bg-primary hover:text-primary-foreground",
                    isInWatchLater && "bg-primary text-primary-foreground"
                  )}
                >
                  <Clock className="h-4 w-4" />
                </button>
                <Image
                  src={formattedData.thumbnailUrl}
                  alt={video.snippet.title}
                  fill
                  sizes={thumbnailSizes}
                  priority={priority}
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
                
                 <Badge 
                   variant="secondary" 
                   className="absolute bottom-2 right-2 bg-black/80 text-white border-none px-2 py-1 text-xs font-medium"
                 >
                   {formattedData.duration}
                 </Badge>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4">
              <div className="flex items-start space-x-3 h-full">
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarImage 
                    src={video.snippet.thumbnails.default.url}
                    alt={video.snippet.channelTitle}
                  />
                  <AvatarFallback className="text-sm bg-muted-foreground/20">
                     {formattedData.channelInitials}
                   </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0 space-y-2">
                  <h3 className="font-semibold text-base leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors duration-200">
                    {video.snippet.title}
                  </h3>
                  
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {video.snippet.description}
                  </p>

                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground/90 hover:text-primary transition-colors duration-200">
                      {video.snippet.channelTitle}
                    </span>
                    <span>{formattedData.viewCount}</span>
                    <span>{formattedData.timeAgo}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card 
      className={cn(
        "group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02] bg-card border-border",
        className
      )}
      onClick={handleClick}
    >
      <CardContent className="p-0">
        <div className="relative">
          <div className="relative aspect-video overflow-hidden bg-muted">
            <button
              type="button"
              onClick={handleWatchLaterToggle}
              aria-label={isInWatchLater ? "Remove from Watch Later" : "Add to Watch Later"}
              className={cn(
                "absolute top-2 left-2 z-10 rounded-full p-1.5 bg-black/60 text-white transition-colors",
                "backdrop-blur hover:bg-primary hover:text-primary-foreground",
                isInWatchLater && "bg-primary text-primary-foreground"
              )}
            >
              <Clock className="h-4 w-4" />
            </button>
            <Image
              src={formattedData.thumbnailUrl}
              alt={video.snippet.title}
              fill
              sizes={thumbnailSizes}
              priority={priority}
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
            
            <Badge 
              variant="secondary" 
              className="absolute bottom-2 right-2 bg-black/80 text-white border-none px-2 py-1 text-xs font-medium"
            >
              {formattedData.duration}
            </Badge>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div className="space-y-2">
            <h3 className="font-semibold text-sm leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors duration-200">
              {video.snippet.title}
            </h3>
          </div>

          <div className="flex items-start space-x-3">
            <Avatar className="w-8 h-8 flex-shrink-0 mt-0.5">
              <AvatarImage 
                src={video.snippet.thumbnails.default.url}
                alt={video.snippet.channelTitle}
              />
              <AvatarFallback className="text-xs bg-muted-foreground/20">
                {formattedData.channelInitials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-sm font-medium text-foreground/90 hover:text-primary transition-colors duration-200">
                {video.snippet.channelTitle}
              </p>
              
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <span>{formattedData.viewCount}</span>
                <span>•</span>
                <span>{formattedData.timeAgo}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export const VideoCard = memo(VideoCardComponent)
