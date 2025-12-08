'use client';

import { useTheme } from '@/contexts/theme-context';

export function useIsDark() {
  const { resolvedTheme, isLoading } = useTheme();
  
  return {
    isDark: resolvedTheme === 'dark',
    isLoading,
  };
}