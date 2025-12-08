"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import Image from "next/image"
import { 
  Dialog, 
  DialogContent, 
  DialogClose 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { YouTubeVideo } from "@/types/youtube"
import { cn } from "@/lib/utils"
import { 
  X, 
  ThumbsUp, 
  Eye, 
  Calendar,
  Share2,
  Download,
  Volume2,
  VolumeX,
  Maximize2,
  Play,
  Pause,
  Loader2,
  AlertCircle,
  Clock
} from "lucide-react"
import { useWatchLater } from "@/contexts/watch-later-context"

interface VideoPlayerModalProps {
  video: YouTubeVideo | null
  isOpen: boolean
  onClose: () => void
  relatedVideos?: YouTubeVideo[]
  onVideoSelect?: (videoId: string) => void
}

interface YouTubePlayerState {
  '-1': 'unstarted'
  '0': 'ended'
  '1': 'playing'
  '2': 'paused'
  '3': 'buffering'
  '5': 'video cued'
}

interface YouTubePlayer {
  playVideo: () => void
  pauseVideo: () => void
  stopVideo: () => void
  getPlayerState: () => number
  getCurrentTime: () => number
  getDuration: () => number
  getVolume: () => number
  setVolume: (volume: number) => void
  mute: () => void
  unMute: () => void
  isMuted: () => boolean
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  destroy: () => void
  getIframe: () => HTMLIFrameElement | null
}

interface YouTubeAPI {
  Player: new (elementId: string | HTMLElement, config: {
    height: string
    width: string
    videoId: string
    playerVars?: {
      autoplay?: number
      controls?: number
      modestbranding?: number
      rel?: number
      showinfo?: number
      iv_load_policy?: number
      cc_load_policy?: number
      fs?: number
    }
    events?: {
      onReady: (event: { target: YouTubePlayer }) => void
      onStateChange: (event: { target: YouTubePlayer; data: number }) => void
      onError: (event: { target: YouTubePlayer; data: number }) => void
    }
  }) => YouTubePlayer
  PlayerState: YouTubePlayerState
}

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void
    YT?: YouTubeAPI
  }
}

export function VideoPlayerModal({ 
  video, 
  isOpen, 
  onClose, 
  relatedVideos = [],
  onVideoSelect 
}: VideoPlayerModalProps) {
  const [player, setPlayer] = useState<YouTubePlayer | null>(null)
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isAPIReady, setIsAPIReady] = useState(false)
  const playerRef = useRef<HTMLDivElement>(null)
  const playerInstanceRef = useRef<YouTubePlayer | null>(null)
  const { add, remove, isSaved } = useWatchLater()
  const isInWatchLater = video ? isSaved(video.id) : false

  const handleWatchLaterToggle = useCallback(() => {
    if (!video) return
    if (isInWatchLater) {
      remove(video.id)
    } else {
      add(video)
    }
  }, [add, isInWatchLater, remove, video])

  const formatViewCount = (count: string): string => {
    const num = parseInt(count)
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
  }

  const formatLikeCount = (count: string): string => {
    const num = parseInt(count)
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const getChannelInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
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

  const loadYouTubeAPI = useCallback(() => {
    if (window.YT) {
      setIsAPIReady(true)
      return
    }

    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    const firstScriptTag = document.getElementsByTagName('script')[0]
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)

    window.onYouTubeIframeAPIReady = () => {
      setIsAPIReady(true)
    }
  }, [])

  const initializePlayer = useCallback(() => {
    if (!video || !isAPIReady || !playerRef.current) return

    const ytApi = window.YT
    if (!ytApi) return

    try {
      new ytApi.Player(playerRef.current, {
        height: '100%',
        width: '100%',
        videoId: video.id,
        playerVars: {
          autoplay: 1,
          controls: 1,
          rel: 0,
          showinfo: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          cc_load_policy: 1,
          fs: 1,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
        events: {
          onReady: (event: { target: YouTubePlayer }) => {
            setPlayer(event.target)
            playerInstanceRef.current = event.target
            setIsPlayerReady(true)
            setIsPlaying(true)
            setHasError(false)
          },
          onStateChange: (event: { target: YouTubePlayer; data: number }) => {
            const states: YouTubePlayerState = {
              '-1': 'unstarted',
              '0': 'ended',
              '1': 'playing',
              '2': 'paused',
              '3': 'buffering',
              '5': 'video cued'
            }
            const state = states[event.data as unknown as keyof YouTubePlayerState]
            setIsPlaying(state === 'playing')
          },
          onError: (event: { target: YouTubePlayer; data: number }) => {
            console.error('YouTube player error:', event)
            setHasError(true)
            setIsPlayerReady(false)
          }
        }
      })
    } catch (error) {
      console.error('Error initializing YouTube player:', error)
      setHasError(true)
    }
  }, [video, isAPIReady])

  const handlePlayPause = useCallback(() => {
    if (!player) return
    
    if (isPlaying) {
      player.pauseVideo()
    } else {
      player.playVideo()
    }
  }, [player, isPlaying])

  const handleMuteToggle = useCallback(() => {
    if (!player) return
    
    if (isMuted) {
      player.unMute()
    } else {
      player.mute()
    }
    setIsMuted(!isMuted)
  }, [player, isMuted])

  const handleFullscreen = useCallback(() => {
    if (!player) return
    
    if (isFullscreen) {
      document.exitFullscreen?.()
    } else {
      player.getIframe()?.requestFullscreen?.()
    }
    setIsFullscreen(!isFullscreen)
  }, [player, isFullscreen])

  const handleRelatedVideoClick = (relatedVideo: YouTubeVideo) => {
    if (onVideoSelect) {
      onVideoSelect(relatedVideo.id)
    }
  }

  const handleShare = async () => {
    if (!video) return
    
    const shareUrl = `https://www.youtube.com/watch?v=${video.id}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: video.snippet.title,
          text: video.snippet.description,
          url: shareUrl
        })
      } catch (error) {
        console.log('Error sharing:', error)
      }
    } else {
      await navigator.clipboard.writeText(shareUrl)
    }
  }

  useEffect(() => {
    if (isOpen && video) {
      loadYouTubeAPI()
    }
  }, [isOpen, video, loadYouTubeAPI])

  useEffect(() => {
    if (isAPIReady && isOpen && video) {
      initializePlayer()
    }
  }, [isAPIReady, isOpen, video, initializePlayer])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return
      
      switch (event.key) {
        case 'Escape':
          onClose()
          break
        case ' ':
          event.preventDefault()
          handlePlayPause()
          break
        case 'm':
        case 'M':
          handleMuteToggle()
          break
        case 'f':
        case 'F':
          handleFullscreen()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handlePlayPause, handleMuteToggle, handleFullscreen, onClose])

  useEffect(() => {
    return () => {
      if (playerInstanceRef.current) {
        playerInstanceRef.current.destroy()
        playerInstanceRef.current = null
      }
    }
  }, [])

  if (!video) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-full h-[90vh] max-h-[900px] p-0 overflow-hidden">
        <div className="flex flex-col lg:flex-row h-full">
          {/* Main Video Section */}
          <div className="flex-1 flex flex-col bg-black">
            {/* Video Player Container */}
            <div className="relative aspect-video w-full bg-black">
              {!isPlayerReady && !hasError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
              
              {hasError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white p-4">
                  <AlertCircle className="w-12 h-12 mb-4 text-red-500" />
                  <p className="text-center mb-2">Video unavailable or blocked</p>
                  <p className="text-sm text-gray-400 text-center">
                    This video may be private, deleted, or restricted in your region
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => window.open(`https://www.youtube.com/watch?v=${video.id}`, '_blank')}
                  >
                    Watch on YouTube
                  </Button>
                </div>
              )}
              
              <div 
                ref={playerRef} 
                className={cn(
                  "w-full h-full",
                  !isPlayerReady && !hasError && "hidden"
                )}
              />
            </div>

            {/* Video Info Section */}
            <ScrollArea className="flex-1 p-6 bg-background">
              <div className="space-y-4">
                {/* Title and Actions */}
                <div className="space-y-3">
                  <h1 className="text-xl font-semibold line-clamp-2">
                    {video.snippet.title}
                  </h1>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{formatViewCount(video.statistics.viewCount)} views</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="w-4 h-4" />
                      <span>{formatLikeCount(video.statistics.likeCount)} likes</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(video.snippet.publishedAt)}</span>
                    </div>
                    
                    <Badge variant="secondary" className="text-xs">
                      {formatDuration(video.contentDetails.duration)}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleShare}>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(`https://www.youtube.com/watch?v=${video.id}`, '_blank')}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      YouTube
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Channel Info */}
                <div className="flex items-start space-x-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage 
                      src={video.snippet.thumbnails.default.url}
                      alt={video.snippet.channelTitle}
                    />
                    <AvatarFallback>
                      {getChannelInitials(video.snippet.channelTitle)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <h3 className="font-semibold">{video.snippet.channelTitle}</h3>
                    <p className="text-sm text-muted-foreground">Channel</p>
                  </div>
                </div>

                <Separator />

                {/* Description */}
                <div className="space-y-2">
                  <h3 className="font-semibold">Description</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">
                    {video.snippet.description || 'No description available'}
                  </p>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Related Videos Sidebar */}
          {relatedVideos.length > 0 && (
            <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l bg-background">
              <div className="p-4 border-b">
                <h3 className="font-semibold">Related Videos</h3>
              </div>
              
              <ScrollArea className="h-[calc(100%-73px)]">
                <div className="p-4 space-y-4">
                  {relatedVideos.map((relatedVideo) => (
                    <div
                      key={relatedVideo.id}
                      className="flex space-x-3 cursor-pointer group hover:bg-muted/50 p-2 rounded-lg transition-colors"
                      onClick={() => handleRelatedVideoClick(relatedVideo)}
                    >
                      <div className="relative w-40 h-24 flex-shrink-0 rounded-md overflow-hidden bg-muted">
                        <Image
                          src={relatedVideo.snippet.thumbnails.medium.url}
                          alt={relatedVideo.snippet.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 160px"
                          className="object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <Badge 
                          variant="secondary" 
                          className="absolute bottom-1 right-1 bg-black/80 text-white border-none px-1 py-0.5 text-xs font-medium"
                        >
                          {formatDuration(relatedVideo.contentDetails.duration)}
                        </Badge>
                      </div>
                      
                      <div className="flex-1 min-w-0 space-y-1">
                        <h4 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                          {relatedVideo.snippet.title}
                        </h4>
                        
                        <p className="text-xs text-muted-foreground">
                          {relatedVideo.snippet.channelTitle}
                        </p>
                        
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <span>{formatViewCount(relatedVideo.statistics.viewCount)} views</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Custom Controls Overlay */}
        {isPlayerReady && (
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none">
            <div className="flex items-center space-x-2 pointer-events-auto">
              <Button
                variant="secondary"
                size="sm"
                className="bg-black/50 hover:bg-black/70 text-white border-none"
                onClick={handlePlayPause}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              
              <Button
                variant="secondary"
                size="sm"
                className="bg-black/50 hover:bg-black/70 text-white border-none"
                onClick={handleMuteToggle}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
            </div>
            
            <div className="flex items-center space-x-2 pointer-events-auto">
              <Button
                variant="secondary"
                size="sm"
                className={cn(
                  "bg-black/50 hover:bg-black/70 text-white border-none",
                  isInWatchLater && "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
                onClick={handleWatchLaterToggle}
                title={isInWatchLater ? "Remove from Watch Later" : "Add to Watch Later"}
              >
                <Clock className="w-4 h-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="bg-black/50 hover:bg-black/70 text-white border-none"
                onClick={handleFullscreen}
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        <DialogClose className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white border-none rounded-full p-2">
          <X className="w-4 h-4" />
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}
