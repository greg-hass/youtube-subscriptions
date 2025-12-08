# YouTube API Setup Guide

This guide will walk you through setting up the YouTube Data API v3 and Google OAuth 2.0 credentials for the YouTube Subscriptions Manager.

## Prerequisites

- A Google Account
- Access to the [Google Cloud Console](https://console.cloud.google.com/)

## Step 1: Create a Google Cloud Project

1. **Go to Google Cloud Console**
   - Navigate to [https://console.cloud.google.com/](https://console.cloud.google.com/)
   - Sign in with your Google account

2. **Create a New Project**
   - Click the project dropdown at the top of the page
   - Click "NEW PROJECT"
   - Enter a project name (e.g., "YouTube Subscriptions Manager")
   - Click "CREATE"

3. **Select Your Project**
   - Make sure your new project is selected in the project dropdown

## Step 2: Enable YouTube Data API v3

1. **Navigate to API Library**
   - Go to the navigation menu (☰) → "APIs & Services" → "Library"
   - Search for "YouTube Data API v3"
   - Click on "YouTube Data API v3" from the results

2. **Enable the API**
   - Click the "ENABLE" button
   - Wait for the API to be enabled (this may take a few moments)

3. **Verify API Status**
   - Go to "APIs & Services" → "Dashboard"
   - Confirm "YouTube Data API v3" appears in your enabled APIs list

## Step 3: Configure OAuth 2.0 Consent Screen

1. **Go to OAuth Consent Screen**
   - Navigate to "APIs & Services" → "OAuth consent screen"
   - Choose "External" (unless you're a Google Workspace user)
   - Click "CREATE"

2. **Fill in App Information**
   ```
   App name: YouTube Subscriptions Manager
   User support email: your-email@example.com
   App logo: (optional, but recommended)
   App homepage: http://localhost:3000
   App privacy policy: http://localhost:3000/privacy (create if needed)
   App terms of service: http://localhost:3000/terms (create if needed)
   Authorized domains: localhost
   Developer contact: your-email@example.com
   ```

3. **Configure Scopes**
   - Click "ADD OR REMOVE SCOPES"
   - Search for and add these scopes:
     - `https://www.googleapis.com/auth/youtube.readonly`
     - `https://www.googleapis.com/auth/youtube.force-ssl`
   - Click "UPDATE"

4. **Test Users (Development Only)**
   - Add your Google account as a test user
   - This allows you to test the app before it's verified by Google

5. **Save and Continue**
   - Review your settings
   - Click "BACK TO DASHBOARD"

## Step 4: Create OAuth 2.0 Credentials

1. **Go to Credentials**
   - Navigate to "APIs & Services" → "Credentials"
   - Click "+ CREATE CREDENTIALS"
   - Select "OAuth client ID"

2. **Configure OAuth Client**
   ```
   Application type: Web application
   Name: YouTube Subscriptions Manager Web Client
   ```

3. **Add Authorized Redirect URIs**
   - Click "+ ADD URI"
   - Add development URI: `http://localhost:3000/auth/callback`
   - Add production URI: `https://yourdomain.com/auth/callback` (when deployed)

4. **Create Credentials**
   - Click "CREATE"
   - **IMPORTANT**: Copy and save your Client ID and Client Secret immediately
   - You won't be able to see the Client Secret again

## Step 5: Optional - Create API Key

For server-side requests, you may want an API key:

1. **Create API Key**
   - Go to "APIs & Services" → "Credentials"
   - Click "+ CREATE CREDENTIALS"
   - Select "API key"

2. **Restrict API Key (Recommended)**
   - Click "EDIT API KEY"
   - Under "API restrictions", select "Restrict key"
   - Choose "YouTube Data API v3"
   - Under "Application restrictions", select "HTTP referrers"
   - Add your development referrer: `http://localhost:3000/*`
   - Add your production referrer: `https://yourdomain.com/*`

## Step 6: Configure Environment Variables

1. **Copy the example file**
   ```bash
   cp .env.local.example .env.local
   ```

2. **Fill in your credentials**
   ```env
   # Required OAuth credentials
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_actual_client_id_here
   NEXT_PUBLIC_GOOGLE_CLIENT_SECRET=your_actual_client_secret_here
   
   # Optional API key
   YOUTUBE_API_KEY=your_actual_api_key_here
   ```

## Step 7: Test Your Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```

3. **Test authentication**
   - Open http://localhost:3000
   - Click "Sign in with Google"
   - Complete the OAuth flow
   - Verify you can access your YouTube data

## Troubleshooting

### Common Issues

1. **"redirect_uri_mismatch" Error**
   - Ensure the redirect URI in Google Console exactly matches `NEXT_PUBLIC_REDIRECT_URI`
   - Check for trailing slashes and protocol (http vs https)

2. **"access_denied" Error**
   - Make sure your Google account is added as a test user
   - Verify the OAuth consent screen is properly configured

3. **"invalid_client" Error**
   - Double-check your Client ID and Client Secret
   - Ensure there are no extra spaces or characters

4. **API Quota Issues**
   - YouTube Data API v3 has a default quota of 10,000 units per day
   - Monitor your usage in the Google Cloud Console
   - Request quota increase if needed

### Debug Mode

Enable debug logging to troubleshoot API issues:
```env
YOUTUBE_DEBUG=true
```

## Production Deployment

When deploying to production:

1. **Update Redirect URIs**
   - Add your production domain to authorized redirect URIs
   - Example: `https://yourapp.com/auth/callback`

2. **Environment Variables**
   - Set `NODE_ENV=production`
   - Generate a secure `SESSION_SECRET`
   - Update `NEXT_PUBLIC_BASE_URL` to your production domain

3. **Security**
   - Restrict your API key to your production domain
   - Enable HTTPS-only cookies
   - Consider using a reverse proxy for additional security

## API Quota Management

The YouTube Data API v3 has quota limits:

- **Default quota**: 10,000 units per day
- **Subscription list**: 1 + 2 units per subscription
- **Video search**: 100 units per request
- **Video details**: 1 + 3 units per video

The app includes built-in quota management and rate limiting to help you stay within limits.

## Additional Resources

- [YouTube Data API v3 Documentation](https://developers.google.com/youtube/v3)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console Help](https://cloud.google.com/docs/help)

## Support

If you encounter issues:

1. Check the Google Cloud Console for API errors
2. Review the browser console for JavaScript errors
3. Enable debug mode to see detailed API requests
4. Consult the YouTube API documentation for specific endpoints

---

**Note**: Never commit your `.env.local` file to version control. It contains sensitive credentials that should be kept secure.