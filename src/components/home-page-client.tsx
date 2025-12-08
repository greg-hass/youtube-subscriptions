'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Layout } from '@/components/layout';
import { SubscriptionFeed } from '@/components/subscription-feed';
import { WatchLaterList } from '@/components/watch-later-list';
import { DraggableVideoPlayer } from '@/components/draggable-video-player';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, Users, Video, Eye, Youtube, LogIn } from 'lucide-react';

export function HomePageClient() {
  const { isAuthenticated, isLoading, user, subscriptions, login } = useAuth();
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [activeNav, setActiveNav] = useState('home');

  useEffect(() => {
    const handleNavChange = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      if (typeof customEvent.detail === 'string') {
        setActiveNav(customEvent.detail);
      }
    };

    window.addEventListener('navSelect', handleNavChange as EventListener);
    return () => {
      window.removeEventListener('navSelect', handleNavChange as EventListener);
    };
  }, []);

  const handleVideoPlay = (videoId: string) => {
    setSelectedVideoId(videoId);
  };

  // Handle authentication states
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <h2 className="text-xl font-semibold mb-2">Loading YouTube Subscriptions</h2>
          <p className="text-muted-foreground">Please wait while we set up your experience...</p>
        </div>
      </div>
    );
  }

  // Login screen for unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto mb-4 h-16 w-16 bg-red-600 rounded-full flex items-center justify-center">
              <Youtube className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">YouTube Subscriptions</CardTitle>
            <p className="text-muted-foreground text-base">
              Manage your YouTube subscriptions in one beautiful place
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                <span>View all your subscription feeds in one place</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                <span>Filter and sort videos by date, views, and more</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                <span>Dark mode support for comfortable viewing</span>
              </div>
            </div>
            <Button 
              onClick={login} 
              className="w-full" 
              size="lg"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Sign in with Google
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main app content for authenticated users
  return (
    <>
      <Layout>
        <div className="space-y-6">
          {/* User Profile Card */}
          {user && (
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={user.thumbnails.medium?.url || user.thumbnails.default?.url} alt={user.title} />
                    <AvatarFallback className="text-lg">
                      {user.title.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle className="text-xl">{user.title}</CardTitle>
                    <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                      {user.description || 'YouTube content creator'}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{user.subscriberCount}</span>
                    <span className="text-sm text-muted-foreground">subscribers</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Video className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{user.videoCount}</span>
                    <span className="text-sm text-muted-foreground">videos</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{user.viewCount}</span>
                    <span className="text-sm text-muted-foreground">views</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="h-4 w-4 bg-red-600 rounded-sm" />
                    <span className="text-sm font-medium">{subscriptions.length}</span>
                    <span className="text-sm text-muted-foreground">subscriptions</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeNav === 'watch-later' ? (
            <WatchLaterList onVideoPlay={handleVideoPlay} />
          ) : activeNav === 'home' ? (
            <>
              <SubscriptionFeed onVideoPlay={handleVideoPlay} />

              {subscriptions.length === 0 && (
                <Card>
                  <CardContent className="text-center py-12">
                    <div className="mx-auto h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                      <Youtube className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No subscriptions found</h3>
                    <p className="text-muted-foreground mb-4">
                      You haven&apos;t subscribed to any YouTube channels yet.
                    </p>
                    <Button variant="outline" onClick={() => window.open('https://youtube.com', '_blank')}>
                      Browse YouTube
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>Feature coming soon.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </Layout>

      {/* Draggable Video Player */}
      {selectedVideoId && (
        <DraggableVideoPlayer
          videoId={selectedVideoId}
          isOpen={!!selectedVideoId}
          onClose={() => setSelectedVideoId(null)}
        />
      )}
    </>
  );
}
