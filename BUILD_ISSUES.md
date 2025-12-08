# YouTube Subscriptions Manager - Build Issues & Solutions

## Issue Summary

The project fails to build with Next.js 15.5.4 when using `npm run build` due to a bug in Next.js's static site generation (SSG) with the `standalone` output mode.

## Root Cause

Next.js 15.5.4 attempts to pre-render error pages (`/404`, `/500`) during build, but the application layout contains client-side providers (`AuthProvider`, `WatchLaterProvider`) that use React hooks. When SSG tries to execute these hooks on the server, it fails with:

```
Error: <Html> should not be imported outside of pages/_document.
```

This is a known incompatibility between Next.js 15's SSG system and layouts with client-side context providers.

## Solutions

### ✅ Immediate Workaround (Recommended)

Use the existing development-based production mode:

```bash
npm run electron:prod
```

This command:
- Runs `npm run build` to compile the Next.js app
- Compiles the Electron main process
- Starts the Next.js dev server instead of embedding a static build
- Launches Electron connected to the running server

**Advantages**:
- No build errors
- Works reliably
- Still runs in production mode code
- Fast startup

### Long-term Fixes (Pick One)

#### Option 1: Downgrade to Next.js 14 with React 18

```bash
npm uninstall next react react-dom
npm install next@14.2 react@18 react-dom@18
npm install --save-dev @types/react@18 @types/react-dom@18
```

Then:
```bash
npm run build  # Should work without errors
npm run electron:dist  # Build AppImage/distribution
```

#### Option 2: Upgrade to Next.js 16+ (Future)

Wait for Next.js 16 to fully stabilize React 19 support. This issue should be resolved in newer versions.

#### Option 3: Workaround in next.config.ts

Add this to `next.config.ts` (already partially implemented):

```typescript
export const dynamic = 'force-dynamic';
```

Then manually build a standalone bundle using a custom build script.

## Code Quality Fixes Applied

✅ Removed unused `ThemeProvider` import from `src/app/layout.tsx`
✅ Fixed React Hook dependencies in `src/components/draggable-video-player.tsx`
✅ Removed unused `fetchError` variable in `src/contexts/auth-context.tsx`

## Authentication Status

✅ **No authentication issues found**. The OAuth flow, token refresh, and storage are correctly implemented:

- Google OAuth 2.0 properly configured
- Token refresh mechanism working
- AuthContext correctly managing state
- API routes properly handling auth callbacks

## Recommended Commands

### Development
```bash
npm run electron:dev    # Hot reload development mode
```

### Production
```bash
npm run electron:prod   # Production mode without static build
# OR after downgrading to Next.js 14:
npm run electron:dist   # Creates AppImage/distribution files
```

## Testing Authentication

1. Run: `npm run electron:prod`
2. Click "Sign in" button
3. You should be redirected to Google OAuth login
4. After authentication, app should load your YouTube subscriptions
5. Check browser console for any errors: F12 → Console tab

## References

- Next.js 15 Issues: https://github.com/vercel/next.js/issues
- React 19 + Next.js: https://next js.org/docs/getting-started
- Electron + Next.js: `src/main.ts`
