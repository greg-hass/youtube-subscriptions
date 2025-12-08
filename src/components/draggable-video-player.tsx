'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Minimize, Maximize2, Volume2, VolumeX, Expand } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DraggableVideoPlayerProps {
  videoId: string;
  isOpen: boolean;
  onClose: () => void;
  initialPosition?: { x: number; y: number };
}

export function DraggableVideoPlayer({ 
  videoId, 
  isOpen, 
  onClose, 
  initialPosition = { x: 100, y: 100 }
}: DraggableVideoPlayerProps) {
  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState({ width: 640, height: 360 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isBorderless, setIsBorderless] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);

  const playerRef = useRef<{ destroy: () => void; setSize: (width: number, height: number) => void; mute: () => void; unMute: () => void } | null>(null);
  const playerElementIdRef = useRef(`draggable-youtube-player-${Math.random().toString(36).slice(2)}`);
  const containerRef = useRef<HTMLDivElement>(null);
  const livePositionRef = useRef(position);
  const liveSizeRef = useRef(size);
  const pointerStartRef = useRef({ x: 0, y: 0 });
  const startPosRef = useRef(position);
  const startSizeRef = useRef(size);
  const dragPointerIdRef = useRef<number | null>(null);
  const resizePointerIdRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isMaximizedRef = useRef(isMaximized);
  const isMinimizedRef = useRef(isMinimized);

  // YouTube API integration
  useEffect(() => {
    if (!isOpen || !videoId) {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
        setVideoLoaded(false);
      }
      return;
    }

    type YTWindowType = {
      YT?: {
        Player: new (...args: unknown[]) => unknown;
        PlayerState?: { PLAYING: number };
      };
      onYouTubeIframeAPIReady?: () => void;
    };

    const ytWindow = window as unknown as YTWindowType;

    const createPlayer = () => {
      const ytApi = ytWindow.YT;
      if (!ytApi || typeof ytApi.Player !== 'function') {
        return;
      }

      setVideoLoaded(false);
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newPlayer = new (ytApi.Player as any)(playerElementIdRef.current, {
        height: String(size.height),
        width: String(size.width),
        videoId,
        playerVars: {
          autoplay: 1,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
          fs: 0,
          cc_load_policy: 1,
          hl: 'en',
          enablejsapi: 1,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: { target: { playVideo: () => void } }) => {
            console.log('YouTube player ready');
            event.target.playVideo();
            setVideoLoaded(true);
          },
          onError: (error: unknown) => {
            console.error('YouTube player error:', error);
          },
          onStateChange: (event: { data: number }) => {
            const playingState = ytWindow.YT?.PlayerState?.PLAYING;
            if (typeof playingState !== 'number') return;
            if (event.data === playingState) {
              setVideoLoaded(true);
            }
          },
        },
      });
      playerRef.current = newPlayer;
    };

    if (ytWindow.YT?.Player) {
      createPlayer();
    } else {
      const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.async = true;
        document.head.appendChild(tag);
      }

      const previousCallback = ytWindow.onYouTubeIframeAPIReady;
      ytWindow.onYouTubeIframeAPIReady = () => {
        previousCallback?.();
        createPlayer();
      };
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
        setVideoLoaded(false);
      }
    };
  }, [isOpen, videoId]);

  // Update player size when size changes
  useEffect(() => {
    if (playerRef.current && videoLoaded) {
      playerRef.current.setSize(size.width, size.height);
    }
  }, [size.width, size.height, videoLoaded]);

  const scheduleStyleUpdate = useCallback(() => {
    if (animationFrameRef.current !== null) return;
    animationFrameRef.current = requestAnimationFrame(() => {
      animationFrameRef.current = null;
      const container = containerRef.current;
      if (!container) return;

      const { x, y } = livePositionRef.current;
      const { width, height } = liveSizeRef.current;
      const currentIsMaximized = isMaximizedRef.current;
      const currentIsMinimized = isMinimizedRef.current;

      const computedWidth = currentIsMaximized
        ? window.innerWidth
        : currentIsMinimized
          ? 200
          : width;

      const computedHeight = currentIsMaximized
        ? window.innerHeight
        : currentIsMinimized
          ? 48
          : height;

      container.style.width = `${computedWidth}px`;
      container.style.height = `${computedHeight}px`;
      container.style.transform = currentIsMaximized
        ? 'translate3d(0px, 0px, 0)'
        : `translate3d(${Math.max(0, x)}px, ${Math.max(0, y)}px, 0)`;
    });
  }, []);

  useEffect(() => {
    livePositionRef.current = position;
    scheduleStyleUpdate();
  }, [position, scheduleStyleUpdate]);

  useEffect(() => {
    liveSizeRef.current = size;
    scheduleStyleUpdate();
  }, [size, scheduleStyleUpdate]);

  useEffect(() => {
    isMaximizedRef.current = isMaximized;
    scheduleStyleUpdate();
  }, [isMaximized, scheduleStyleUpdate]);

  useEffect(() => {
    isMinimizedRef.current = isMinimized;
    scheduleStyleUpdate();
  }, [isMinimized, scheduleStyleUpdate]);

  const toggleMaximize = useCallback(() => {
    setIsMaximized(prev => {
      const next = !prev;
      if (!next) {
        const defaultSize = { width: 640, height: 360 };
        setPosition(initialPosition);
        setSize(defaultSize);
        livePositionRef.current = initialPosition;
        liveSizeRef.current = defaultSize;
      } else {
        const maximizedSize = { width: window.innerWidth, height: window.innerHeight - 48 };
        const maximizedPosition = { x: 0, y: 0 };
        setPosition(maximizedPosition);
        setSize(maximizedSize);
        livePositionRef.current = maximizedPosition;
        liveSizeRef.current = maximizedSize;
      }
      scheduleStyleUpdate();
      return next;
    });
  }, [initialPosition, scheduleStyleUpdate]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      if (playerRef.current) {
        if (next) {
          playerRef.current.mute();
        } else {
          playerRef.current.unMute();
        }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'f' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        toggleMaximize();
      }
      if (e.key === 'm') {
        e.preventDefault();
        toggleMute();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, toggleMaximize, toggleMute]);

  useEffect(() => {
    if (!isOpen) return;
    scheduleStyleUpdate();
  }, [isOpen, scheduleStyleUpdate]);

  const stopDragging = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    dragPointerIdRef.current = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [isDragging]);

  const stopResizing = useCallback(() => {
    if (!isResizing) return;
    setIsResizing(false);
    resizePointerIdRef.current = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [isResizing]);

  const handlePointerMove = useCallback((event: PointerEvent) => {
    if (dragPointerIdRef.current === event.pointerId) {
      const deltaX = event.clientX - pointerStartRef.current.x;
      const deltaY = event.clientY - pointerStartRef.current.y;
      const currentIsMinimized = isMinimizedRef.current;
      const currentSize = currentIsMinimized
        ? { width: 200, height: 48 }
        : liveSizeRef.current;
      const maxX = Math.max(0, window.innerWidth - currentSize.width);
      const maxY = Math.max(0, window.innerHeight - currentSize.height);
      const newPosition = {
        x: Math.min(Math.max(0, startPosRef.current.x + deltaX), maxX),
        y: Math.min(Math.max(0, startPosRef.current.y + deltaY), maxY),
      };
      livePositionRef.current = newPosition;
      scheduleStyleUpdate();
    } else if (resizePointerIdRef.current === event.pointerId) {
      const deltaX = event.clientX - pointerStartRef.current.x;
      const deltaY = event.clientY - pointerStartRef.current.y;
      const newWidth = Math.max(300, startSizeRef.current.width + deltaX);
      const newHeight = Math.max(200, startSizeRef.current.height + deltaY);
      liveSizeRef.current = { width: newWidth, height: newHeight };
      scheduleStyleUpdate();
    }
  }, [scheduleStyleUpdate]);

  const handlePointerUp = useCallback((event: PointerEvent) => {
    if (dragPointerIdRef.current === event.pointerId) {
      const finalPosition = livePositionRef.current;
      setPosition(finalPosition);
      stopDragging();
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    }

    if (resizePointerIdRef.current === event.pointerId) {
      const finalSize = liveSizeRef.current;
      setSize(finalSize);
      stopResizing();
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    }
  }, [handlePointerMove, stopDragging, stopResizing]);

  const beginPointerTracking = useCallback((pointerId: number, type: 'drag' | 'resize') => {
    if (type === 'drag') {
      dragPointerIdRef.current = pointerId;
      setIsDragging(true);
      document.body.style.cursor = 'move';
    } else {
      resizePointerIdRef.current = pointerId;
      setIsResizing(true);
      document.body.style.cursor = 'se-resize';
    }
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  }, [handlePointerMove, handlePointerUp]);

  const handleDragPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isMaximized) return;
    if ((event.target as HTMLElement).closest('button')) return;
    event.preventDefault();

    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    startPosRef.current = livePositionRef.current;
    beginPointerTracking(event.pointerId, 'drag');
  };

  const handleResizePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    startSizeRef.current = liveSizeRef.current;
    beginPointerTracking(event.pointerId, 'resize');
  };

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [handlePointerMove, handlePointerUp]);

  const toggleMinimize = useCallback(() => {
    setIsMinimized(prev => !prev);
  }, []);

  const toggleBorderless = useCallback(() => {
    setIsBorderless(prev => !prev);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  if (!isOpen) return null;

  const computedStyle = isMaximized
    ? { width: '100%', height: '100%', transform: 'translate3d(0px, 0px, 0)' }
    : {
        width: isMinimized ? 200 : size.width,
        height: isMinimized ? 48 : size.height,
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
      };

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed bg-black transition-colors duration-150 z-50 overflow-hidden will-change-transform",
        isMaximized 
          ? "top-0 left-0 w-full h-full" 
          : "rounded-lg shadow-2xl border border-gray-700",
        isBorderless && "border-0 shadow-none",
        isMinimized && "h-12"
      )}
      style={computedStyle}
    >
      {/* Title Bar */}
      <div
        className={cn(
          "flex items-center justify-between bg-gray-900 px-3 py-2 cursor-move select-none",
          isBorderless && "bg-black/80 backdrop-blur"
        )}
        onPointerDown={handleDragPointerDown}
      >
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <span className="ml-2 text-white text-sm truncate max-w-[150px]">
            YouTube Player
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Borderless Toggle */}
          <button
            onClick={toggleBorderless}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title={isBorderless ? "Show Border" : "Hide Border"}
          >
            <div className={cn(
              "w-3 h-3 border rounded",
              isBorderless ? "border-gray-600" : "border-white"
            )} />
          </button>
          
          {/* Minimize */}
          <button
            onClick={toggleMinimize}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title="Minimize"
          >
            <Minimize className="w-4 h-4 text-white" />
          </button>
          
          {/* Maximize */}
          <button
            onClick={toggleMaximize}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title={isMaximized ? "Restore" : "Maximize"}
          >
            <Maximize2 className="w-4 h-4 text-white" />
          </button>
          
          {/* Mute */}
          <button
            onClick={toggleMute}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
          </button>
          
          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title="Fullscreen"
          >
            <Expand className="w-4 h-4 text-white" />
          </button>
          
          {/* Close */}
          <button
            onClick={onClose}
            className="p-1 hover:bg-red-600 rounded transition-colors"
            title="Close"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Video Content */}
      <div className={cn("relative bg-black", isMinimized ? "hidden" : "block")}>
        <div id={playerElementIdRef.current} className="w-full h-full" />
        
        {!videoLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
              <p>Loading video...</p>
            </div>
          </div>
        )}
      </div>

      {/* Resize Handle */}
      {!isMaximized && !isMinimized && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize group"
          onPointerDown={handleResizePointerDown}
        >
          <div className="absolute bottom-0 right-0 w-2 h-2 bg-gray-600 rounded-tl group-hover:bg-primary transition-colors" />
        </div>
      )}
    </div>
  );
}
