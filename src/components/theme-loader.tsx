'use client';

import React from 'react';
import { useTheme } from '@/contexts/theme-context';

interface ThemeLoaderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ThemeLoader({ children, fallback }: ThemeLoaderProps) {
  const { isLoading } = useTheme();

  if (isLoading) {
    return fallback || (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}