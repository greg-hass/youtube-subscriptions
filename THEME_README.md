# Theme Provider Implementation

This document describes the theme provider implementation for the YouTube Subscriptions application.

## Features

- ✅ Dark/Light/System theme management
- ✅ System preference synchronization
- ✅ localStorage persistence
- ✅ Smooth theme transitions
- ✅ next-themes integration
- ✅ TypeScript support
- ✅ Loading states to prevent flash
- ✅ Tailwind CSS dark mode compatibility

## Files Created

### Core Theme System
- `src/contexts/theme-context.tsx` - Main theme provider and context
- `src/hooks/use-is-dark.tsx` - Convenience hook for dark mode detection

### Components
- `src/components/theme-toggle.tsx` - Theme switcher dropdown component
- `src/components/theme-loader.tsx` - Loading wrapper to prevent flash
- `src/components/theme-example.tsx` - Example usage component

### Configuration
- `src/app/layout.tsx` - Updated to include ThemeProvider
- `src/app/page.tsx` - Updated to demonstrate theme usage
- `src/app/globals.css` - Added theme transition utilities

## Usage

### Basic Usage

```tsx
import { useTheme } from '@/contexts/theme-context';

function MyComponent() {
  const { theme, setTheme, toggleTheme, resolvedTheme, isLoading } = useTheme();
  
  if (isLoading) return <div>Loading theme...</div>;
  
  return (
    <div>
      <p>Current theme: {theme}</p>
      <p>Resolved theme: {resolvedTheme}</p>
      <button onClick={toggleTheme}>Toggle Theme</button>
    </div>
  );
}
```

### Dark Mode Detection

```tsx
import { useIsDark } from '@/hooks/use-is-dark';

function DarkModeComponent() {
  const { isDark, isLoading } = useIsDark();
  
  return (
    <div className={isDark ? 'dark-styles' : 'light-styles'}>
      {isDark ? '🌙 Dark mode' : '☀️ Light mode'}
    </div>
  );
}
```

### Theme Toggle Component

```tsx
import { ThemeToggle } from '@/components/theme-toggle';

function Header() {
  return (
    <header>
      <h1>My App</h1>
      <ThemeToggle />
    </header>
  );
}
```

### Preventing Flash of Incorrect Theme

```tsx
import { ThemeLoader } from '@/components/theme-loader';

function App() {
  return (
    <ThemeLoader fallback={<LoadingSpinner />}>
      <YourAppContent />
    </ThemeLoader>
  );
}
```

### Smooth Transitions

```tsx
import { useThemeTransition } from '@/contexts/theme-context';

function TransitionComponent() {
  useThemeTransition(); // Enables smooth transitions
  
  return (
    <div className="theme-transition">
      Content with smooth theme transitions
    </div>
  );
}
```

## Theme Options

- `light` - Forces light mode
- `dark` - Forces dark mode  
- `system` - Follows system preference (default)

## Storage

Theme preference is automatically persisted in localStorage under the key `youtube-subscriptions-theme`.

## Tailwind CSS Integration

The theme system works seamlessly with Tailwind CSS dark mode:

```tsx
<div className="bg-background text-foreground border-border">
  {/* Automatically adapts to theme */}
</div>

<div className="dark:bg-gray-900 dark:text-white">
  {/* Dark mode specific styles */}
</div>
```

## TypeScript Types

```typescript
interface ThemeState {
  theme: 'light' | 'dark' | 'system';
  resolvedTheme: 'light' | 'dark';
  isLoading: boolean;
}

interface ThemeContextType extends ThemeState {
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleTheme: () => void;
}
```

## Best Practices

1. **Always check loading state** before rendering theme-dependent UI
2. **Use `resolvedTheme`** for actual theme detection (handles 'system' mode)
3. **Wrap components** with `ThemeLoader` to prevent flash
4. **Use `useThemeTransition()`** for smooth transitions
5. **Prefer semantic color tokens** (`background`, `foreground`, etc.) over hardcoded colors

## Integration Notes

- The theme provider is already integrated in the root layout
- next-themes handles system preference detection automatically
- CSS custom properties are updated for seamless transitions
- The `suppressHydrationWarning` attribute prevents hydration mismatches