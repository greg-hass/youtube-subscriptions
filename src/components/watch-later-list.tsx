"use client"

import React from "react"
import { useWatchLater } from "@/contexts/watch-later-context"
import { VideoCard } from "@/components/video-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface WatchLaterListProps {
  onVideoPlay?: (videoId: string) => void
  className?: string
}

function formatAddedAt(dateString: string): string {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return "Recently added"
  return date.toLocaleString()
}

export function WatchLaterList({ onVideoPlay, className }: WatchLaterListProps) {
  const { items, clear, remove } = useWatchLater()

  if (items.length === 0) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-primary" />
            Watch Later
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center gap-4 text-center py-12 text-muted-foreground">
          <AlertCircle className="h-10 w-10" />
          <div>
            <h3 className="text-lg font-semibold text-foreground">No videos saved</h3>
            <p className="text-sm">
              Save videos to Watch Later from your feed to revisit them anytime.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Watch Later</h2>
          <p className="text-sm text-muted-foreground">
            {items.length.toLocaleString()} saved {items.length === 1 ? "video" : "videos"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={clear}>
          Clear All
        </Button>
      </div>

      <div className="space-y-4">
        {items.map(item => (
          <div key={item.id} className="space-y-2">
            <VideoCard
              video={item.video}
              onPlay={onVideoPlay}
              layout="list"
            />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground">
              <span>Added {formatAddedAt(item.addedAt)}</span>
              <Button
                variant="ghost"
                size="sm"
                className="self-start sm:self-auto px-2 h-7"
                onClick={() => remove(item.id)}
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
