# Production Deployment Guide

This guide covers deploying the YouTube Subscriptions Manager to production environments.

## Overview

The application can be deployed to various platforms:
- Vercel (recommended)
- Netlify
- AWS Amplify
- Docker containers
- Custom servers

## Pre-Deployment Checklist

### 1. Environment Configuration

#### Required Production Variables

```env
# Production Environment
NODE_ENV=production

# OAuth 2.0 Configuration
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_production_client_id
NEXT_PUBLIC_GOOGLE_CLIENT_SECRET=your_production_client_secret

# Production URLs
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
NEXT_PUBLIC_REDIRECT_URI=https://yourdomain.com/auth/callback

# Security
SESSION_SECRET=your_secure_32_character_secret_here
SECURE_COOKIES=true
NEXT_PUBLIC_CSP_ENABLED=true
```

#### Optional Production Variables

```env
# Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Error Monitoring
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn-here

# Performance
ENABLE_API_CACHING=true
API_CACHE_DURATION=300
ENABLE_QUOTA_MANAGEMENT=true

# External Services
REDIS_URL=redis://your-redis-instance.com
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

### 2. Google OAuth Production Setup

#### Update OAuth Consent Screen

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" → "OAuth consent screen"
3. Update app information:
   ```
   App homepage: https://yourdomain.com
   App privacy policy: https://yourdomain.com/privacy
   App terms of service: https://yourdomain.com/terms
   Authorized domains: yourdomain.com
   ```

#### Update OAuth Client

1. Go to "APIs & Services" → "Credentials"
2. Edit your OAuth client ID
3. Add production redirect URIs:
   ```
   https://yourdomain.com/auth/callback
   https://www.yourdomain.com/auth/callback
   ```
4. Remove or restrict development URIs

#### Domain Verification

1. Verify your domain in Google Search Console
2. Add the domain to your Google Cloud project
3. Submit your app for Google verification (optional but recommended)

### 3. Security Configuration

#### Generate Secure Session Secret

```bash
# Generate a secure 32-character secret
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

#### Security Headers

The application includes security headers:
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options
- X-Content-Type-Options

## Platform-Specific Deployment

### 1. Vercel (Recommended)

#### Automatic Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel

# Deploy to production
vercel --prod
```

#### Environment Variables in Vercel

1. Go to Vercel Dashboard → Your Project → Settings
2. Add environment variables:
   ```
   NEXT_PUBLIC_GOOGLE_CLIENT_ID
   NEXT_PUBLIC_GOOGLE_CLIENT_SECRET
   NEXT_PUBLIC_BASE_URL
   NEXT_PUBLIC_REDIRECT_URI
   SESSION_SECRET
   ```

#### Vercel Configuration

Create `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["iad1"],
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ]
}
```

### 2. Netlify

#### Build Configuration

Create `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
```

#### Environment Variables

Set in Netlify Dashboard → Site Settings → Build & deploy → Environment

### 3. Docker Deployment

#### Dockerfile

```dockerfile
# Multi-stage build for optimization
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM base AS builder
COPY . .
RUN npm ci
RUN npm run build

FROM base AS runner
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

#### Docker Compose

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - NEXT_PUBLIC_GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
      - SESSION_SECRET=${SESSION_SECRET}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  redis_data:
```

### 4. AWS Amplify

#### Amplify Configuration

Create `amplify.yml`:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

## Performance Optimization

### 1. Build Optimization

#### Next.js Configuration

```javascript
// next.config.ts
const nextConfig = {
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  
  // Image optimization
  images: {
    domains: ['yourdomain.com'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Experimental features
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react'],
  },
  
  // Headers for security and caching
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};
```

### 2. Caching Strategy

#### API Response Caching

```env
# Enable caching in production
ENABLE_API_CACHING=true
API_CACHE_DURATION=300

# Redis for distributed caching
REDIS_URL=redis://your-redis-instance.com
```

#### Static Asset Caching

```javascript
// Cache static assets for 1 year
{
  source: '/_next/static/(.*)',
  headers: [
    {
      key: 'Cache-Control',
      value: 'public, max-age=31536000, immutable',
    },
  ],
}
```

### 3. Monitoring and Analytics

#### Google Analytics

```env
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

#### Error Monitoring with Sentry

```env
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn-here
```

#### Performance Monitoring

```javascript
// Custom performance monitoring
export function reportWebVitals(metric) {
  // Send to analytics service
  if (window.gtag) {
    window.gtag('event', metric.name, {
      value: Math.round(metric.value),
      event_category: 'Web Vitals',
    });
  }
}
```

## Security Best Practices

### 1. Environment Security

- Never commit `.env.local` to version control
- Use different credentials for development and production
- Rotate secrets regularly
- Use secret management services (AWS Secrets Manager, etc.)

### 2. API Security

```env
# Enable security features
NEXT_PUBLIC_CSP_ENABLED=true
SECURE_COOKIES=true

# Rate limiting
YOUTUBE_RATE_LIMIT_ENABLED=true
YOUTUBE_MIN_REQUEST_INTERVAL=100
```

### 3. HTTPS and SSL

- Always use HTTPS in production
- Implement HSTS headers
- Use valid SSL certificates
- Redirect HTTP to HTTPS

## Database and Storage

### 1. Session Storage

#### Redis Configuration

```env
REDIS_URL=redis://username:password@host:port
REDIS_PASSWORD=your_redis_password
```

#### Session Implementation

```typescript
// lib/session.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.REDIS_URL,
  token: process.env.REDIS_TOKEN,
});

export async function saveSession(sessionId: string, data: any) {
  await redis.setex(`session:${sessionId}`, 86400, JSON.stringify(data));
}
```

### 2. Data Persistence

#### PostgreSQL Setup

```env
DATABASE_URL=postgresql://username:password@host:5432/database
```

#### Database Schema

```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  google_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id),
  data JSONB,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Deployment Pipeline

### 1. CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build application
        run: npm run build
        env:
          NEXT_PUBLIC_GOOGLE_CLIENT_ID: ${{ secrets.GOOGLE_CLIENT_ID }}
          NEXT_PUBLIC_GOOGLE_CLIENT_SECRET: ${{ secrets.GOOGLE_CLIENT_SECRET }}
          SESSION_SECRET: ${{ secrets.SESSION_SECRET }}
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

### 2. Environment-Specific Builds

#### Production Build Script

```bash
#!/bin/bash
# scripts/build-production.sh

set -e

echo "🏗️  Building for production..."

# Check required environment variables
if [ -z "$NEXT_PUBLIC_GOOGLE_CLIENT_ID" ]; then
  echo "❌ NEXT_PUBLIC_GOOGLE_CLIENT_ID is required"
  exit 1
fi

# Build the application
npm run build

# Run production tests
npm run test:production

echo "✅ Build completed successfully"
```

## Monitoring and Maintenance

### 1. Health Checks

Create health check endpoint:

```typescript
// src/app/api/health/route.ts
export async function GET() {
  return Response.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    environment: process.env.NODE_ENV,
  });
}
```

### 2. Logging

#### Production Logging

```typescript
// lib/logger.ts
export const logger = {
  info: (message: string, meta?: any) => {
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify({ level: 'info', message, meta }));
    } else {
      console.log(message, meta);
    }
  },
  error: (message: string, error?: Error) => {
    if (process.env.NODE_ENV === 'production') {
      console.error(JSON.stringify({ 
        level: 'error', 
        message, 
        error: error?.message,
        stack: error?.stack 
      }));
    } else {
      console.error(message, error);
    }
  },
};
```

### 3. Performance Monitoring

```typescript
// lib/monitoring.ts
export function trackPageView(path: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_ID, {
      page_path: path,
    });
  }
}

export function trackError(error: Error, context?: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'exception', {
      description: error.message,
      fatal: false,
    });
  }
}
```

## Rollback Strategy

### 1. Version Control

```bash
# Tag releases
git tag -a v1.0.0 -m "Production release v1.0.0"
git push origin v1.0.0

# Rollback to previous version
git checkout v1.0.0
git push -f origin main
```

### 2. Database Migrations

```typescript
// lib/migrations.ts
export async function runMigrations() {
  // Run database migrations
  // Create backup before migration
  // Rollback on failure
}
```

## Post-Deployment Checklist

- [ ] Environment variables are set correctly
- [ ] OAuth flow works in production
- [ ] SSL certificate is valid
- [ ] Security headers are present
- [ ] Analytics and error tracking are working
- [ ] Performance monitoring is active
- [ ] Database connections are stable
- [ ] Cache is configured and working
- [ ] Health checks are passing
- [ ] Load testing completed (if applicable)

## Troubleshooting

### Common Production Issues

#### OAuth Redirect Mismatch

1. Verify redirect URI in Google Console
2. Check environment variables
3. Ensure HTTPS is used

#### Session Issues

1. Verify SESSION_SECRET is set
2. Check Redis/database connectivity
3. Clear session cookies

#### Performance Issues

1. Enable caching
2. Check API quota usage
3. Monitor database queries

#### SSL Certificate Issues

1. Verify certificate validity
2. Check certificate chain
3. Ensure proper redirect from HTTP

## Support and Maintenance

- Regularly update dependencies
- Monitor security advisories
- Check Google API quota usage
- Review error logs regularly
- Update OAuth credentials if compromised
- Test disaster recovery procedures

---

**Note**: Always test deployment in a staging environment before deploying to production.