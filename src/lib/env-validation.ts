import { z } from 'zod';

// Environment variable schema with validation
const envSchema = z.object({
  // Required OAuth 2.0 Configuration
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().min(1, 'Google Client ID is required'),
  NEXT_PUBLIC_GOOGLE_CLIENT_SECRET: z.string().min(1, 'Google Client Secret is required'),
  
  // Application Configuration
  NEXT_PUBLIC_REDIRECT_URI: z.string().url().default('http://localhost:3000/auth/callback'),
  NEXT_PUBLIC_BASE_URL: z.string().url().default('http://localhost:3000'),
  
  // YouTube API Configuration (Optional)
  YOUTUBE_API_KEY: z.string().optional(),
  
  // Development Configuration
  YOUTUBE_DEBUG: z.string().transform((val) => val === 'true').default(false),
  YOUTUBE_API_TIMEOUT: z.string().transform(Number).default(30000),
  YOUTUBE_RATE_LIMIT_ENABLED: z.string().transform((val) => val === 'true').default(true),
  YOUTUBE_MIN_REQUEST_INTERVAL: z.string().transform(Number).default(100),
  
  // Production Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SESSION_SECRET: z.string().min(32, 'Session secret must be at least 32 characters').optional(),
  
  // Analytics and Monitoring (Optional)
  NEXT_PUBLIC_GA_ID: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  
  // Feature Flags
  ENABLE_EXPERIMENTAL_FEATURES: z.string().transform((val) => val === 'true').default(false),
  ENABLE_QUOTA_MANAGEMENT: z.string().transform((val) => val === 'true').default(true),
  ENABLE_API_CACHING: z.string().transform((val) => val === 'true').default(true),
  API_CACHE_DURATION: z.string().transform(Number).default(300),
  
  // Third-party Integrations (Optional)
  REDIS_URL: z.string().url().optional(),
  DATABASE_URL: z.string().url().optional(),
  
  // Security Headers
  NEXT_PUBLIC_CSP_ENABLED: z.string().transform((val) => val === 'true').default(true),
  SECURE_COOKIES: z.string().transform((val) => val === 'true').default(true),
  
  // Testing Configuration
  USE_MOCK_YOUTUBE_API: z.string().transform((val) => val === 'true').default(false),
  TEST_MODE: z.string().transform((val) => val === 'true').default(false),
});

// Type inference from schema
type Env = z.infer<typeof envSchema>;

// Validate and parse environment variables
function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map(
        (err) => `${err.path.join('.')}: ${err.message}`
      );
      
      console.error('❌ Environment Variable Validation Error:');
      console.error(errorMessages.join('\n'));
      
      // In development, show a helpful error message
      if (process.env.NODE_ENV === 'development') {
        console.error('\n💡 To fix this issue:');
        console.error('1. Copy .env.local.example to .env.local');
        console.error('2. Fill in the required environment variables');
        console.error('3. Restart your development server');
      }
      
      // In production, this should cause the app to fail
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Invalid environment configuration');
      }
    }
    
    // Fallback to partial environment for development
    console.warn('⚠️ Using partial environment configuration');
    return {
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
      NEXT_PUBLIC_GOOGLE_CLIENT_SECRET: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET || '',
      NEXT_PUBLIC_REDIRECT_URI: process.env.NEXT_PUBLIC_REDIRECT_URI || 'http://localhost:3000/auth/callback',
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
      YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
      YOUTUBE_DEBUG: process.env.YOUTUBE_DEBUG === 'true',
      YOUTUBE_API_TIMEOUT: parseInt(process.env.YOUTUBE_API_TIMEOUT || '30000', 10),
      YOUTUBE_RATE_LIMIT_ENABLED: process.env.YOUTUBE_RATE_LIMIT_ENABLED !== 'false',
      YOUTUBE_MIN_REQUEST_INTERVAL: parseInt(process.env.YOUTUBE_MIN_REQUEST_INTERVAL || '100', 10),
      NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
      SESSION_SECRET: process.env.SESSION_SECRET,
      NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
      NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
      ENABLE_EXPERIMENTAL_FEATURES: process.env.ENABLE_EXPERIMENTAL_FEATURES === 'true',
      ENABLE_QUOTA_MANAGEMENT: process.env.ENABLE_QUOTA_MANAGEMENT !== 'false',
      ENABLE_API_CACHING: process.env.ENABLE_API_CACHING !== 'false',
      API_CACHE_DURATION: parseInt(process.env.API_CACHE_DURATION || '300', 10),
      REDIS_URL: process.env.REDIS_URL,
      DATABASE_URL: process.env.DATABASE_URL,
      NEXT_PUBLIC_CSP_ENABLED: process.env.NEXT_PUBLIC_CSP_ENABLED !== 'false',
      SECURE_COOKIES: process.env.SECURE_COOKIES === 'true',
      USE_MOCK_YOUTUBE_API: process.env.USE_MOCK_YOUTUBE_API === 'true',
      TEST_MODE: process.env.TEST_MODE === 'true',
    };
  }
}

// Export validated environment
export const env = validateEnv();

// Export type for use in other files
export type { Env };

// Helper functions for environment checks
export const isDevelopment = () => env.NODE_ENV === 'development';
export const isProduction = () => env.NODE_ENV === 'production';
export const isTest = () => env.NODE_ENV === 'test';

export const isDebugMode = () => env.YOUTUBE_DEBUG;
export const isMockApi = () => env.USE_MOCK_YOUTUBE_API;
export const isQuotaManagementEnabled = () => env.ENABLE_QUOTA_MANAGEMENT;
export const isApiCachingEnabled = () => env.ENABLE_API_CACHING;

// Configuration object for YouTube service
export const youtubeConfig = {
  clientId: env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  clientSecret: env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET,
  redirectUri: env.NEXT_PUBLIC_REDIRECT_URI,
  apiKey: env.YOUTUBE_API_KEY,
  timeout: env.YOUTUBE_API_TIMEOUT,
  rateLimit: {
    enabled: env.YOUTUBE_RATE_LIMIT_ENABLED,
    minInterval: env.YOUTUBE_MIN_REQUEST_INTERVAL,
  },
  debug: env.YOUTUBE_DEBUG,
  quotaManagement: env.ENABLE_QUOTA_MANAGEMENT,
  caching: {
    enabled: env.ENABLE_API_CACHING,
    duration: env.API_CACHE_DURATION,
  },
};

// Production safety checks
export function validateProductionConfig(): void {
  if (isProduction()) {
    const requiredProductionVars = [
      'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
      'NEXT_PUBLIC_GOOGLE_CLIENT_SECRET',
      'SESSION_SECRET',
    ];
    
    const missingVars = requiredProductionVars.filter(
      (varName) => !process.env[varName]
    );
    
    if (missingVars.length > 0) {
      throw new Error(
        `Missing required production environment variables: ${missingVars.join(', ')}`
      );
    }
    
    // Check for development values in production
    if (env.NEXT_PUBLIC_BASE_URL.includes('localhost')) {
      console.warn('⚠️ Using localhost URL in production environment');
    }
    
    if (env.SESSION_SECRET && env.SESSION_SECRET.length < 32) {
      throw new Error('SESSION_SECRET must be at least 32 characters in production');
    }
  }
}

// Development helper to show current configuration
export function showEnvironmentInfo(): void {
  if (isDevelopment()) {
    console.log('🔧 Environment Configuration:');
    console.log(`  Node Environment: ${env.NODE_ENV}`);
    console.log(`  Base URL: ${env.NEXT_PUBLIC_BASE_URL}`);
    console.log(`  Redirect URI: ${env.NEXT_PUBLIC_REDIRECT_URI}`);
    console.log(`  YouTube Debug: ${env.YOUTUBE_DEBUG}`);
    console.log(`  Rate Limiting: ${env.YOUTUBE_RATE_LIMIT_ENABLED}`);
    console.log(`  API Caching: ${env.ENABLE_API_CACHING}`);
    console.log(`  Mock API: ${env.USE_MOCK_YOUTUBE_API}`);
    console.log(`  Google Client ID: ${env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing'}`);
    console.log(`  Google Client Secret: ${env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing'}`);
    console.log(`  YouTube API Key: ${env.YOUTUBE_API_KEY ? '✅ Set' : '⚪ Optional'}`);
  }
}

// Validate production config on import
validateProductionConfig();