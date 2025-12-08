'use client';

import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Loader2, LogOut, RefreshCw } from 'lucide-react';

export function LoginButton() {
  const { 
    isAuthenticated, 
    isLoading, 
    user, 
    login, 
    logout, 
    refreshUser, 
    refreshSubscriptions,
    error 
  } = useAuth();

  if (isLoading) {
    return (
      <Button disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading...
      </Button>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <Button onClick={login} variant="destructive">
          Try Again
        </Button>
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Button onClick={login}>
        Sign in with Google
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.thumbnails.medium?.url} alt={user?.title} />
            <AvatarFallback>
              {user?.title?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.title}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.subscriberCount} subscribers
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={refreshUser}>
          <RefreshCw className="mr-2 h-4 w-4" />
          <span>Refresh Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={refreshSubscriptions}>
          <RefreshCw className="mr-2 h-4 w-4" />
          <span>Refresh Subscriptions</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}