'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface ThemeState {
  theme: 'light' | 'dark' | 'system';
  resolvedTheme: 'light' | 'dark';
  isLoading: boolean;
}

export interface ThemeContextType extends ThemeState {
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load theme from localStorage
    const storedTheme = localStorage.getItem('youtube-subscriptions-theme') as 'light' | 'dark' | 'system' | null;
    if (storedTheme) {
      setThemeState(storedTheme);
    }

    // Determine resolved theme
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolved = storedTheme === 'system'
      ? (prefersDark ? 'dark' : 'light')
      : (storedTheme as 'light' | 'dark') || (prefersDark ? 'dark' : 'light');

    setResolvedTheme(resolved);
    applyTheme(resolved);
    setIsLoading(false);
  }, []);

  const applyTheme = (newTheme: 'light' | 'dark') => {
    const html = document.documentElement;
    if (newTheme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  };

  const setTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setThemeState(newTheme);
    localStorage.setItem('youtube-subscriptions-theme', newTheme);

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolved = newTheme === 'system'
      ? (prefersDark ? 'dark' : 'light')
      : newTheme;

    setResolvedTheme(resolved);
    applyTheme(resolved);
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'light' ? 'dark' : 'light');
  };

  const contextValue: ThemeContextType = {
    theme,
    resolvedTheme,
    isLoading,
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export function useThemeTransition() {
  const { resolvedTheme, isLoading } = useTheme();
  
  useEffect(() => {
    if (isLoading) return;
    
    const root = document.documentElement;
    root.style.setProperty('color-scheme', resolvedTheme);
    
    const transitionDuration = '150ms';
    root.style.setProperty('--theme-transition-duration', transitionDuration);
    
    const style = document.createElement('style');
    style.textContent = `
      * {
        transition: background-color ${transitionDuration} ease-in-out,
                    border-color ${transitionDuration} ease-in-out,
                    color ${transitionDuration} ease-in-out !important;
      }
    `;
    style.id = 'theme-transition';
    
    const existingStyle = document.getElementById('theme-transition');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    document.head.appendChild(style);
    
    const timeout = setTimeout(() => {
      style.remove();
    }, parseInt(transitionDuration));
    
    return () => {
      clearTimeout(timeout);
      style.remove();
    };
  }, [resolvedTheme, isLoading]);
  
  return { resolvedTheme, isLoading };
}