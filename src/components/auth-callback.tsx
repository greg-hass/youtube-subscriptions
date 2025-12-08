'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { handleAuthCallback } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallbackProcess = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const errorParam = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        if (errorParam) {
          throw new Error(`OAuth error: ${errorParam}${errorDescription ? ` - ${errorDescription}` : ''}`);
        }

        if (!code) {
          throw new Error('No authorization code received');
        }

        // Set a flag to prevent auth initialization from clearing tokens while callback is processing
        sessionStorage.setItem('auth_callback_processing', 'true');

        try {
          await handleAuthCallback(code);
          setStatus('success');

          // Give auth context time to update state before redirecting
          setTimeout(() => {
            sessionStorage.removeItem('auth_callback_processing');
            router.push('/');
          }, 2000);
        } finally {
          sessionStorage.removeItem('auth_callback_processing');
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Authentication failed');
        sessionStorage.removeItem('auth_callback_processing');

        setTimeout(() => {
          router.push('/');
        }, 3000);
      }
    };

    handleCallbackProcess();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">
            {status === 'loading' && 'Authenticating...'}
            {status === 'success' && 'Authentication Successful!'}
            {status === 'error' && 'Authentication Failed'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          {status === 'loading' && (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
          {status === 'success' && (
            <p className="text-muted-foreground">Redirecting you to the app...</p>
          )}
          {status === 'error' && (
            <div>
              <p className="text-destructive mb-2">{error}</p>
              <p className="text-muted-foreground text-sm">Redirecting you back...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}