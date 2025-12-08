'use client';

import React from 'react';
import { ThemeProvider } from '@/contexts/theme-context';
import { AuthProvider } from '@/contexts/auth-context';
import { WatchLaterProvider } from '@/contexts/watch-later-context';

export default function RootProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <WatchLaterProvider>
          {children}
        </WatchLaterProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
