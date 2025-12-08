'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from '@/contexts/theme-context';
import { AuthProvider } from '@/contexts/auth-context';
import { WatchLaterProvider } from '@/contexts/watch-later-context';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
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
