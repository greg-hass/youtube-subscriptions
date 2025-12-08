import { Suspense } from 'react';
import { Metadata } from 'next';
import { HomePageClient } from '@/components/home-page-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'YouTube Subscriptions - Manage Your YouTube Feed',
  description: 'Beautiful YouTube subscription manager. View, filter, and organize your YouTube subscriptions in one place.',
  keywords: ['YouTube', 'subscriptions', 'feed', 'manager', 'videos', 'channels'],
  authors: [{ name: 'YouTube Subscriptions App' }],
  openGraph: {
    title: 'YouTube Subscriptions - Manage Your YouTube Feed',
    description: 'Beautiful YouTube subscription manager. View, filter, and organize your YouTube subscriptions in one place.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'YouTube Subscriptions - Manage Your YouTube Feed',
    description: 'Beautiful YouTube subscription manager. View, filter, and organize your YouTube subscriptions in one place.',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin mx-auto mb-4 text-primary border-4 border-primary border-t-transparent rounded-full" />
          <h2 className="text-xl font-semibold mb-2">Loading YouTube Subscriptions</h2>
          <p className="text-muted-foreground">Please wait while we set up your experience...</p>
        </div>
      </div>
    }>
      <HomePageClient />
    </Suspense>
  );
}
