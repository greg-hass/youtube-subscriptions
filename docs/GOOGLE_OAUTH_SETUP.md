# Google OAuth 2.0 Setup Guide

This guide provides detailed instructions for setting up Google OAuth 2.0 authentication for the YouTube Subscriptions Manager.

## Overview

Google OAuth 2.0 allows users to grant your application access to their YouTube data without sharing their credentials. This implementation uses the Authorization Code Flow with PKCE support for enhanced security.

## OAuth 2.0 Flow

```
┌─────────────┐    1. Auth Request    ┌──────────────────┐
│   Your App  │ ────────────────────► │  Google OAuth    │
│             │                      │   Server         │
└─────────────┘                      └──────────────────┘
      ▲                                        │
      │                                        │ 2. Authorization Code
      │                                        │
      │                                        ▼
┌─────────────┐    5. Access Token   ┌──────────────────┐
│   Your App  │ ◄─────────────────── │  Google OAuth    │
│             │                      │   Server         │
└─────────────┘                      └──────────────────┘
      │                                        ▲
      │ 3. Exchange Code for Tokens            │
      │                                        │ 4. Tokens
      ▼                                        │
┌─────────────┐                      ┌──────────────────┐
│   Your App  │                      │  Google OAuth    │
│   Backend   │                      │   Server         │
└─────────────┘                      └──────────────────┘
```

## Step 1: Configure OAuth Consent Screen

### 1.1 Access the OAuth Consent Screen

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to "APIs & Services" → "OAuth consent screen"

### 1.2 Choose User Type

- **External**: For any Google user (recommended for public apps)
- **Internal**: For Google Workspace users only

### 1.3 App Information

Fill in the following details:

```yaml
App name: YouTube Subscriptions Manager
User support email: your-email@example.com
App logo: [Upload your app logo - 512x512px recommended]
App homepage: http://localhost:3000
App privacy policy: http://localhost:3000/privacy
App terms of service: http://localhost:3000/terms
Authorized domains: 
  - localhost
  - yourdomain.com (for production)
Developer contact information:
  - your-email@example.com
```

### 1.4 Scopes Configuration

Add the following OAuth scopes:

| Scope | Purpose | Required |
|-------|---------|----------|
| `https://www.googleapis.com/auth/youtube.readonly` | Read-only access to YouTube data | ✅ Yes |
| `https://www.googleapis.com/auth/youtube.force-ssl` | Force SSL connections | ✅ Yes |
| `https://www.googleapis.com/auth/userinfo.email` | Get user's email address | Optional |
| `https://www.googleapis.com/auth/userinfo.profile` | Get user's basic profile info | Optional |

### 1.5 Test Users (Development)

During development, add test users:
1. Click "+ ADD USERS"
2. Add the Google accounts that will test the app
3. This is required until your app is verified by Google

## Step 2: Create OAuth 2.0 Client ID

### 2.1 Navigate to Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "+ CREATE CREDENTIALS"
3. Select "OAuth client ID"

### 2.2 Application Configuration

```yaml
Application type: Web application
Name: YouTube Subscriptions Manager Web Client
```

### 2.3 Authorized Redirect URIs

Add these URIs for different environments:

**Development:**
```
http://localhost:3000/auth/callback
http://localhost:3001/auth/callback
```

**Production:**
```
https://yourdomain.com/auth/callback
https://www.yourdomain.com/auth/callback
```

**Staging/Testing:**
```
https://staging.yourdomain.com/auth/callback
```

### 2.4 Create and Save Credentials

1. Click "CREATE"
2. **Important**: Copy and save:
   - Client ID
   - Client Secret
3. Store these securely in your environment variables

## Step 3: Environment Configuration

### 3.1 Required Environment Variables

```env
# OAuth 2.0 Credentials
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id_here
NEXT_PUBLIC_GOOGLE_CLIENT_SECRET=your_client_secret_here

# Application URLs
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/auth/callback
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 3.2 Optional Environment Variables

```env
# Session Management
SESSION_SECRET=your_secure_session_secret_here

# Security Settings
SECURE_COOKIES=true
NEXT_PUBLIC_CSP_ENABLED=true

# Debug Mode
OAUTH_DEBUG=false
```

## Step 4: Implementation Details

### 4.1 Authentication Flow

The application implements the following OAuth flow:

1. **Initiate Auth**: User clicks "Sign in with Google"
2. **Redirect**: User is redirected to Google's consent screen
3. **Authorization**: User grants permissions
4. **Callback**: Google redirects back with authorization code
5. **Token Exchange**: Server exchanges code for access and refresh tokens
6. **Session Creation**: User session is established

### 4.2 Token Management

```typescript
interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  token_type?: string;
  scope?: string;
}
```

- **Access Token**: Short-lived (1 hour), used for API requests
- **Refresh Token**: Long-lived, used to get new access tokens
- **Automatic Refresh**: Tokens are refreshed automatically when expired

### 4.3 Security Features

- **PKCE Support**: Proof Key for Code Exchange for enhanced security
- **State Parameter**: CSRF protection
- **Secure Cookies**: HttpOnly and Secure flags in production
- **Token Validation**: Regular token validation and refresh

## Step 5: Testing the OAuth Flow

### 5.1 Development Testing

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000`

3. Click "Sign in with Google"

4. Complete the Google consent flow

5. Verify you're redirected back and authenticated

### 5.2 Testing Checklist

- [ ] Redirect URI matches exactly
- [ ] All required scopes are requested
- [ ] Test user is added to OAuth consent screen
- [ ] Access token is received and stored
- [ ] Refresh token is available (requires `prompt=consent`)
- [ ] API requests work with the access token

## Step 6: Production Deployment

### 6.1 Update OAuth Configuration

1. **Add Production Domain**:
   - Go to OAuth consent screen
   - Add your production domain to authorized domains
   - Update your app homepage and privacy policy URLs

2. **Update Redirect URIs**:
   - Add production redirect URIs to your OAuth client
   - Remove or disable development URIs if needed

3. **Environment Variables**:
   ```env
   NODE_ENV=production
   NEXT_PUBLIC_BASE_URL=https://yourdomain.com
   NEXT_PUBLIC_REDIRECT_URI=https://yourdomain.com/auth/callback
   SECURE_COOKIES=true
   ```

### 6.2 Security Considerations

- **HTTPS Required**: Always use HTTPS in production
- **Domain Verification**: Verify your domain in Google Search Console
- **App Verification**: Submit your app for Google verification when ready
- **Rate Limiting**: Implement proper rate limiting for auth endpoints

## Step 7: Troubleshooting

### 7.1 Common OAuth Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `redirect_uri_mismatch` | Redirect URI doesn't match | Check exact URI in Google Console |
| `access_denied` | User denied access or not test user | Add user as test user or check scopes |
| `invalid_client` | Wrong client ID/secret | Verify credentials in environment |
| `invalid_scope` | Invalid or missing scopes | Check scope format and permissions |

### 7.2 Debug Mode

Enable OAuth debugging:
```env
OAUTH_DEBUG=true
```

This will log detailed OAuth flow information to the console.

### 7.3 Token Issues

**Access Token Expired**:
- Tokens automatically refresh in the app
- Check network requests for refresh failures

**No Refresh Token**:
- User must consent with `prompt=consent`
- Only granted on first authorization
- May be revoked by user

## Step 8: Best Practices

### 8.1 Security

- Never expose client secrets in frontend code
- Use environment variables for all credentials
- Implement proper session management
- Enable security headers (CSP, HSTS)
- Regular token validation and refresh

### 8.2 User Experience

- Clear consent screen descriptions
- Graceful error handling
- Progress indicators during auth flow
- Easy logout and re-authentication options

### 8.3 Monitoring

- Track authentication success/failure rates
- Monitor token refresh failures
- Log OAuth errors for debugging
- Set up alerts for unusual auth patterns

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google Sign-In for Websites](https://developers.google.com/identity/sign-in/web/sign-in)
- [YouTube Data API Authentication](https://developers.google.com/youtube/v3/guides/authentication)

---

**Security Note**: Always keep your OAuth credentials secure and never commit them to version control. Use environment variables and secure secret management in production.