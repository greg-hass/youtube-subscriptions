# Development Setup Guide

This guide will help you set up the YouTube Subscriptions Manager for local development.

## Prerequisites

- Node.js 18+ (recommended: Node.js 20+)
- npm or yarn package manager
- Git
- A Google Account for OAuth setup

## Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd youtube-subscriptions

# Install dependencies
npm install

# or with yarn
yarn install
```

### 2. Environment Setup

```bash
# Copy the environment template
cp .env.local.example .env.local

# Edit the environment file
nano .env.local  # or use your preferred editor
```

### 3. Configure Google OAuth

Follow the [YouTube API Setup Guide](./YOUTUBE_API_SETUP.md) to get your credentials, then add them to `.env.local`:

```env
# Required - Get these from Google Cloud Console
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
NEXT_PUBLIC_GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Development URLs (usually don't need to change)
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/auth/callback
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Detailed Setup

### Environment Variables

#### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth Client ID | `123456789-abc.apps.googleusercontent.com` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | `GOCSPX-abc123def456` |

#### Optional Development Variables

```env
# Enable debug logging
YOUTUBE_DEBUG=true

# Use mock API for testing without real YouTube data
USE_MOCK_YOUTUBE_API=true

# Disable rate limiting for faster development
YOUTUBE_RATE_LIMIT_ENABLED=false

# Test mode with sample data
TEST_MODE=true
```

### Development Scripts

```bash
# Start development server with Turbopack (fast refresh)
npm run dev

# Start development server without Turbopack
npm run dev:legacy

# Run type checking
npm run type-check

# Run linting
npm run lint

# Run linting with auto-fix
npm run lint:fix

# Build for production (to test build process)
npm run build

# Start production server locally
npm run start
```

### Development Tools

#### VS Code Extensions (Recommended)

- **ES7+ React/Redux/React-Native snippets** - React code snippets
- **TypeScript Importer** - Automatic import suggestions
- **Prettier - Code formatter** - Code formatting
- **ESLint** - Code linting
- **Auto Rename Tag** - Paired tag renaming
- **Bracket Pair Colorizer** - Visual bracket matching

#### Browser Extensions

- **React Developer Tools** - React component inspection
- **Redux DevTools** - State management debugging (if using Redux)

## Development Workflow

### 1. Feature Development

```bash
# Create a new feature branch
git checkout -b feature/new-feature

# Make your changes
# ...

# Run linting and type checking
npm run lint
npm run type-check

# Test your changes
npm run dev

# Commit your changes
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/new-feature
```

### 2. Testing OAuth Flow

1. **Start the development server**
   ```bash
   npm run dev
   ```

2. **Test authentication**
   - Navigate to http://localhost:3000
   - Click "Sign in with Google"
   - Complete the OAuth consent flow
   - Verify you're redirected back successfully

3. **Debug OAuth issues**
   - Enable debug mode: `YOUTUBE_DEBUG=true`
   - Check browser console for errors
   - Verify redirect URI matches Google Console settings

### 3. API Development

#### Using Mock API

For development without real YouTube data:

```env
USE_MOCK_YOUTUBE_API=true
```

This provides sample data for:
- User profile information
- Subscription lists
- Video details
- Search results

#### Real API Testing

1. **Set up YouTube API credentials** (see [YouTube API Setup](./YOUTUBE_API_SETUP.md))
2. **Add API key to environment**:
   ```env
   YOUTUBE_API_KEY=your_youtube_api_key_here
   ```
3. **Monitor quota usage**:
   ```env
   YOUTUBE_DEBUG=true
   ENABLE_QUOTA_MANAGEMENT=true
   ```

### 4. Debugging

#### Enable Debug Mode

```env
YOUTUBE_DEBUG=true
OAUTH_DEBUG=true
```

This enables detailed logging for:
- OAuth authentication flow
- YouTube API requests
- Token refresh operations
- Rate limiting information

#### Common Debugging Scenarios

**OAuth Issues:**
```bash
# Check environment variables
npm run env:check

# Test OAuth flow manually
curl "http://localhost:3000/api/auth/debug"
```

**API Issues:**
```bash
# Check API quota
curl "http://localhost:3000/api/youtube/quota"

# Test API endpoints
curl "http://localhost:3000/api/youtube/subscriptions"
```

## Development Configuration

### TypeScript Configuration

The project uses strict TypeScript settings. Key configurations in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### ESLint Configuration

ESLint is configured with:
- Next.js recommended rules
- TypeScript support
- React hooks rules
- Accessibility checks

### Prettier Configuration

Code formatting with Prettier:
- 2-space indentation
- Single quotes
- Trailing commas
- Semi-colons

## Environment-Specific Features

### Development Only Features

- **Hot Module Replacement** - Fast refresh without page reload
- **Detailed Error Messages** - Stack traces and error boundaries
- **Debug Toolbar** - API request monitoring
- **Mock Data** - Sample data for testing

### Development Environment Variables

```env
# Development specific
NODE_ENV=development
YOUTUBE_DEBUG=true
USE_MOCK_YOUTUBE_API=false

# Feature flags
ENABLE_EXPERIMENTAL_FEATURES=true
ENABLE_QUOTA_MANAGEMENT=true
ENABLE_API_CACHING=false  # Disable for fresh data
```

## Troubleshooting

### Common Development Issues

#### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
npm run dev -- -p 3001
```

#### Environment Variables Not Loading

```bash
# Verify .env.local exists
ls -la .env.local

# Check variable syntax
cat .env.local

# Restart development server
npm run dev
```

#### OAuth Redirect Mismatch

1. Check Google Console redirect URI
2. Verify `NEXT_PUBLIC_REDIRECT_URI` in `.env.local`
3. Ensure exact match (including protocol and port)

#### TypeScript Errors

```bash
# Clear TypeScript cache
rm -rf .next

# Rebuild
npm run dev
```

#### Dependency Issues

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Development Tips

1. **Use environment-specific configurations**
   - Keep development and production configs separate
   - Use feature flags for experimental features

2. **Monitor API usage**
   - Enable quota management in development
   - Use mock API when possible to conserve quota

3. **Test OAuth flow regularly**
   - OAuth tokens can expire
   - Test refresh token functionality

4. **Use TypeScript strictly**
   - Enable all strict type checking
   - Use type assertions sparingly

5. **Keep dependencies updated**
   - Regularly check for security updates
   - Test major version upgrades carefully

## Performance Optimization

### Development Performance

```env
# Disable expensive features in development
ENABLE_API_CACHING=false
YOUTUBE_RATE_LIMIT_ENABLED=false
```

### Build Performance

```bash
# Use Turbopack for faster builds
npm run dev

# Analyze bundle size
npm run analyze
```

## Next Steps

After setting up development:

1. Read the [YouTube API Setup Guide](./YOUTUBE_API_SETUP.md)
2. Review the [Google OAuth Setup Guide](./GOOGLE_OAUTH_SETUP.md)
3. Check the [Production Deployment Guide](./PRODUCTION_DEPLOYMENT.md)
4. Explore the project structure in the main README

## Getting Help

- Check the browser console for JavaScript errors
- Review the terminal output for server errors
- Enable debug mode for detailed logging
- Consult the YouTube API documentation
- Check the GitHub issues for known problems