'use client';

import React from 'react';
import { useTheme, useThemeTransition } from '@/contexts/theme-context';
import { useIsDark } from '@/hooks/use-is-dark';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function ThemeExample() {
  const { theme, setTheme, toggleTheme, isLoading } = useTheme();
  const { isDark } = useIsDark();
  useThemeTransition();

  return (
    <Card className="w-full max-w-md theme-transition">
      <CardHeader>
        <CardTitle>Theme Context Example</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span>Current Theme:</span>
          <Badge variant="secondary">{theme}</Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span>Resolved Theme:</span>
          <Badge variant={isDark ? 'default' : 'outline'}>
            {isDark ? 'Dark' : 'Light'}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span>Loading:</span>
          <Badge variant={isLoading ? 'destructive' : 'secondary'}>
            {isLoading ? 'Yes' : 'No'}
          </Badge>
        </div>
        
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setTheme('light')}
            disabled={isLoading}
          >
            Light
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setTheme('dark')}
            disabled={isLoading}
          >
            Dark
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setTheme('system')}
            disabled={isLoading}
          >
            System
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            onClick={toggleTheme}
            disabled={isLoading}
          >
            Toggle
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}