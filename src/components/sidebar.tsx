'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useWatchLater } from '@/contexts/watch-later-context';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Search, Home, Clock, ThumbsUp, History, PlaySquare, Menu, X } from 'lucide-react';
import { YouTubeSubscription } from '@/types/youtube';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  badge?: number;
}

interface ChannelItemProps {
  channel: YouTubeSubscription;
  isActive?: boolean;
  onClick?: () => void;
}

const ChannelItem: React.FC<ChannelItemProps> = ({ channel, isActive, onClick }) => {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200",
        "hover:bg-accent/50 hover:translate-x-1",
        isActive && "bg-accent text-accent-foreground font-medium"
      )}
      onClick={onClick}
    >
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage 
          src={channel.snippet?.thumbnails?.medium?.url || channel.snippet?.thumbnails?.default?.url} 
          alt={channel.snippet?.title}
        />
        <AvatarFallback className="text-xs">
          {channel.snippet?.title?.charAt(0)?.toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{channel.snippet?.title}</p>
        <p className="text-xs text-muted-foreground">
          {channel.contentDetails?.totalItemCount || 0} videos
        </p>
      </div>
      {channel.contentDetails?.newItemCount > 0 && (
        <div className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
          {channel.contentDetails.newItemCount}
        </div>
      )}
    </div>
  );
};

interface NavigationItemProps {
  item: NavItem;
  isActive?: boolean;
  onClick?: () => void;
}

const NavigationItem: React.FC<NavigationItemProps> = ({ item, isActive, onClick }) => {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200",
        "hover:bg-accent/50 hover:translate-x-1",
        isActive && "bg-accent text-accent-foreground font-medium"
      )}
      onClick={onClick}
    >
      <div className="h-5 w-5 flex-shrink-0 text-muted-foreground">
        {item.icon}
      </div>
      <span className="text-sm flex-1">{item.label}</span>
      {typeof item.badge === 'number' && item.badge > 0 && (
        <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
          {item.badge}
        </span>
      )}
    </div>
  );
};

interface SidebarProps {
  className?: string;
  activeChannel?: string;
  activeNav?: string;
  onChannelSelect?: (channelId: string) => void;
  onNavSelect?: (navId: string) => void;
  onWidthChange?: (width: number) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  className,
  activeChannel,
  activeNav = 'home',
  onChannelSelect,
  onNavSelect,
  onWidthChange,
}) => {
  const { isAuthenticated, subscriptions } = useAuth();
  const { items: watchLaterItems } = useWatchLater();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [width, setWidth] = useState(320); // Default width in pixels
  const sidebarRef = useRef<HTMLDivElement>(null);

  const navigationItems: NavItem[] = useMemo(() => [
    { id: 'home', label: 'Home', icon: <Home size={18} /> },
    { id: 'watch-later', label: 'Watch Later', icon: <Clock size={18} />, badge: watchLaterItems.length },
    { id: 'liked', label: 'Liked Videos', icon: <ThumbsUp size={18} /> },
    { id: 'history', label: 'History', icon: <History size={18} /> },
    { id: 'your-videos', label: 'Your Videos', icon: <PlaySquare size={18} /> },
  ], [watchLaterItems.length]);

  const filteredChannels = useMemo(() => {
    if (!searchQuery) return subscriptions;
    
    return subscriptions.filter(channel =>
      channel.snippet?.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [subscriptions, searchQuery]);

  const handleChannelClick = (channelId: string) => {
    console.log('Sidebar: Clicked channel:', channelId);
    onChannelSelect?.(channelId);
  };

  const handleNavClick = (navId: string) => {
    onNavSelect?.(navId);
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = e.clientX;
      if (newWidth >= 250 && newWidth <= 500) {
        setWidth(newWidth);
        onWidthChange?.(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isResizing) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, onWidthChange]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isCollapsed && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={toggleCollapse}
        />
      )}
      
      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={cn(
          "fixed left-0 top-0 h-full bg-background border-r border-border z-50 transition-all duration-300 ease-in-out",
          "min-w-[250px] max-w-[500px]",
          isCollapsed ? "-translate-x-full lg:translate-x-0" : "translate-x-0",
          className
        )}
        style={{ width: isCollapsed ? 0 : width }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold">YouTube</h2>
            <button
              onClick={toggleCollapse}
              className="lg:hidden p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Mobile menu toggle */}
          <div className="lg:hidden p-4 border-b border-border">
            <button
              onClick={toggleCollapse}
              className="w-full flex items-center justify-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <Menu size={20} />
              <span>Menu</span>
            </button>
          </div>

          <ScrollArea className="flex-1 max-h-[calc(100vh-200px)]">
            <div className="p-4 space-y-6">
              {/* Navigation */}
              <div className="space-y-1">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
                  Navigation
                </h3>
                {navigationItems.map((item) => (
                  <NavigationItem
                    key={item.id}
                    item={item}
                    isActive={activeNav === item.id}
                    onClick={() => handleNavClick(item.id)}
                  />
                ))}
              </div>

              {/* Subscriptions */}
              {isAuthenticated && (
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
                    Subscriptions
                  </h3>
                  
                  {/* Search */}
                  <div className="px-3 pb-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search channels..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-9 text-sm"
                      />
                    </div>
                  </div>

                  {/* Channel list */}
                  <div className="space-y-1">
                    {filteredChannels.length > 0 ? (
                      filteredChannels.map((channel) => (
                        <ChannelItem
                          key={channel.id}
                          channel={channel}
                          isActive={activeChannel === channel.id}
                          onClick={() => handleChannelClick(channel.snippet?.resourceId?.channelId || channel.id)}
                        />
                      ))
                    ) : (
                      <div className="px-3 py-4 text-center text-muted-foreground text-sm">
                        {searchQuery ? 'No channels found' : 'No subscriptions yet'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Not authenticated state */}
              {!isAuthenticated && (
                <div className="px-3 py-4 text-center text-muted-foreground text-sm">
                  Sign in to see your subscriptions
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="p-4 border-t border-border bg-background/95 backdrop-blur sticky bottom-0">
            <div className="text-xs text-muted-foreground text-center">
              {subscriptions.length} channels subscribed
            </div>
          </div>
        </div>
        
        {/* Resize Handle */}
        {!isCollapsed && (
          <div
            className="absolute top-0 right-0 w-1 h-full bg-transparent hover:bg-primary/20 cursor-col-resize transition-colors"
            onMouseDown={handleResizeStart}
          />
        )}
      </div>

      {/* Mobile menu button */}
      <button
        onClick={toggleCollapse}
        className={cn(
          "fixed left-4 top-4 z-30 p-2 rounded-lg bg-background border border-border shadow-sm",
          "lg:hidden transition-all duration-300",
          isCollapsed ? "translate-x-0" : "translate-x-80"
        )}
      >
        <Menu size={20} />
      </button>
    </>
  );
};

export default Sidebar;
