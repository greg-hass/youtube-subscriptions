'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import type { YouTubeSubscription } from '@/types/youtube';
import { cacheUtils } from '@/lib/cache';

export interface UserProfile {
  id: string;
  title: string;
  description: string;
  thumbnails: {
    default: { url: string; width: number; height: number };
    medium?: { url: string; width: number; height: number };
    high: { url: string; width: number; height: number };
  };
  subscriberCount: string;
  videoCount: string;
  viewCount: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  subscriptions: YouTubeSubscription[];
  error: string | null;
}

export interface AuthContextType extends AuthState {
  login: () => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshSubscriptions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    subscriptions: [],
    error: null,
  });

  const refreshAccessToken = useCallback(async (refreshToken: string): Promise<AuthTokens | null> => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) return null;
      
      const tokens = await response.json();
      localStorage.setItem('youtube_auth_tokens', JSON.stringify(tokens));
      return tokens;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  }, []);

  const makeAuthenticatedRequest = useCallback(async (url: string, tokens: AuthTokens): Promise<Response> => {
    let currentTokens = tokens;
    let response = await fetch(url);

    if (response.status === 401 && currentTokens.refresh_token) {
      const newTokens = await refreshAccessToken(currentTokens.refresh_token);
      if (newTokens) {
        currentTokens = newTokens;
        const urlWithNewToken = url.replace(/accessToken=[^&]*/, `accessToken=${newTokens.access_token}`);
        response = await fetch(urlWithNewToken);
      }
    }

    return response;
  }, [refreshAccessToken]);

  const loadUserData = useCallback(async (tokens: AuthTokens, forceRefresh: boolean = false) => {
    try {
      if (!forceRefresh) {
        const cachedUser = cacheUtils.getUserData();
        const cachedSubscriptions = cacheUtils.getSubscriptions();
        
        if (cachedUser && cachedSubscriptions) {
          setAuthState(prev => ({
            ...prev,
            user: cachedUser as UserProfile,
            subscriptions: cachedSubscriptions as YouTubeSubscription[],
            isLoading: false,
          }));
          return;
        }
      }

      const [userResponse, subscriptionsResponse] = await Promise.all([
        makeAuthenticatedRequest(`/api/youtube/user?accessToken=${tokens.access_token}`, tokens),
        makeAuthenticatedRequest(`/api/youtube/subscriptions?accessToken=${tokens.access_token}&maxResults=50`, tokens),
      ]);

      if (!userResponse.ok || !subscriptionsResponse.ok) {
        throw new Error('Failed to fetch user data');
      }

      const userData = await userResponse.json();
      const subscriptionsData = await subscriptionsResponse.json();
      
      const allSubscriptions = subscriptionsData.items || [];
      let nextPageToken = subscriptionsData.nextPageToken;
      
      while (nextPageToken && allSubscriptions.length < 500) {
        const moreResponse = await makeAuthenticatedRequest(
          `/api/youtube/subscriptions?accessToken=${tokens.access_token}&maxResults=50&pageToken=${nextPageToken}`,
          tokens
        );
        
        if (moreResponse.ok) {
          const moreData = await moreResponse.json();
          allSubscriptions.push(...(moreData.items || []));
          nextPageToken = moreData.nextPageToken;
          
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          break;
        }
      }
      
      console.log(`Fetched ${allSubscriptions.length} total subscriptions`);

      if (userData.user) {
        const userProfile: UserProfile = {
          id: userData.user.id,
          title: userData.user.snippet.title,
          description: userData.user.snippet.description,
          thumbnails: userData.user.snippet.thumbnails,
          subscriberCount: userData.user.statistics.subscriberCount,
          videoCount: userData.user.statistics.videoCount,
          viewCount: userData.user.statistics.viewCount,
        };

        cacheUtils.setUserData(userProfile);
        cacheUtils.setSubscriptions(allSubscriptions);

        setAuthState(prev => ({
          ...prev,
          user: userProfile,
          subscriptions: allSubscriptions,
          error: null,
          isLoading: false,
        }));
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
      setAuthState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load user data',
        isLoading: false,
      }));
    }
  }, [makeAuthenticatedRequest]);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedTokens = localStorage.getItem('youtube_auth_tokens');

        // Don't validate tokens while callback is processing - callback will set them properly
        const isCallbackProcessing = typeof window !== 'undefined' &&
          sessionStorage.getItem('auth_callback_processing') === 'true';

        if (storedTokens) {
          const tokens: AuthTokens = JSON.parse(storedTokens);

          // If callback is processing, don't validate - just wait for it to complete
          if (isCallbackProcessing) {
            setAuthState(prev => ({ ...prev, isLoading: true }));
            return;
          }

          // Check if token is still valid by fetching user info with timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

          try {
            const response = await fetch(`/api/youtube/user?accessToken=${tokens.access_token}`, {
              signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (response.ok) {
              setAuthState(prev => ({ ...prev, isAuthenticated: true, isLoading: false }));
              await loadUserData(tokens);
            } else {
              localStorage.removeItem('youtube_auth_tokens');
              setAuthState(prev => ({ ...prev, isLoading: false }));
            }
          } catch {
            clearTimeout(timeoutId);
            // If fetch fails, just show login screen
            localStorage.removeItem('youtube_auth_tokens');
            setAuthState(prev => ({ ...prev, isLoading: false }));
          }
        } else {
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        localStorage.removeItem('youtube_auth_tokens');
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to initialize authentication',
        }));
      }
    };

    initializeAuth();
  }, [loadUserData]);

  // Background refresh every 30 minutes
  useEffect(() => {
    if (!authState.isAuthenticated) return;

    const interval = setInterval(async () => {
      const storedTokens = localStorage.getItem('youtube_auth_tokens');
      if (storedTokens) {
        const tokens: AuthTokens = JSON.parse(storedTokens);
        // Silent background refresh without loading states
        await loadUserData(tokens, true);
      }
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval);
  }, [authState.isAuthenticated, loadUserData]);

  const login = async () => {
    try {
      const response = await fetch('/api/auth/url');
      if (!response.ok) {
        throw new Error('Failed to generate auth URL');
      }
      
      const { authUrl } = await response.json();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Login error:', error);
      setAuthState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to initiate login',
      }));
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('youtube_auth_tokens');
      
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        subscriptions: [],
        error: null,
      });
    } catch (error) {
      console.error('Logout error:', error);
      setAuthState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to logout',
      }));
    }
  };

  const refreshUser = async () => {
    const storedTokens = localStorage.getItem('youtube_auth_tokens');
    if (!storedTokens || !authState.isAuthenticated) return;

    const tokens: AuthTokens = JSON.parse(storedTokens);
    setAuthState(prev => ({ ...prev, isLoading: true }));
    await loadUserData(tokens, true); // Force refresh
    setAuthState(prev => ({ ...prev, isLoading: false }));
  };

  const refreshSubscriptions = async () => {
    const storedTokens = localStorage.getItem('youtube_auth_tokens');
    if (!storedTokens || !authState.isAuthenticated) return;

    try {
      const tokens: AuthTokens = JSON.parse(storedTokens);
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const response = await makeAuthenticatedRequest(
        `/api/youtube/subscriptions?accessToken=${tokens.access_token}&maxResults=50`,
        tokens
      );
      if (!response.ok) {
        throw new Error('Failed to fetch subscriptions');
      }
      
      const subscriptionsData = await response.json();
      const subscriptions = subscriptionsData.items || [];
      
      // Cache the new subscriptions
      cacheUtils.setSubscriptions(subscriptions);
      
      setAuthState(prev => ({
        ...prev,
        subscriptions,
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      console.error('Failed to refresh subscriptions:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to refresh subscriptions',
      }));
    }
  };

  const value: AuthContextType = {
    ...authState,
    login,
    logout,
    refreshUser,
    refreshSubscriptions,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export async function handleAuthCallback(code: string): Promise<void> {
  try {
    const response = await fetch('/api/auth/callback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange authorization code');
    }

    const { tokens } = await response.json();
    localStorage.setItem('youtube_auth_tokens', JSON.stringify(tokens));
  } catch (error) {
    console.error('Auth callback error:', error);
    throw error;
  }
}
