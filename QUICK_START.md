# Quick Start Guide

Get the YouTube Subscriptions Manager running in minutes!

## 🚀 One-Command Setup

```bash
# Clone and setup automatically
git clone <repository-url>
cd youtube-subscriptions
npm run setup
```

The setup script will:
- ✅ Check prerequisites (Node.js 18+)
- ✅ Create `.env.local` from template
- ✅ Install dependencies
- ✅ Validate the setup
- ✅ Show next steps

## 📋 Manual Setup (Alternative)

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
```bash
cp .env.local.example .env.local
```

### 3. Configure Google OAuth
Get credentials from [Google Cloud Console](https://console.cloud.google.com/):

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id_here
NEXT_PUBLIC_GOOGLE_CLIENT_SECRET=your_client_secret_here
```

### 4. Start Development
```bash
npm run dev
```

Open http://localhost:3000

## 🔧 Essential Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Check code quality
npm run type-check   # Validate TypeScript
npm run analyze      # Analyze bundle size
```

## 📚 Documentation

- **[YouTube API Setup](./docs/YOUTUBE_API_SETUP.md)** - Get API credentials
- **[Development Guide](./docs/DEVELOPMENT_SETUP.md)** - Local development
- **[Production Deployment](./docs/PRODUCTION_DEPLOYMENT.md)** - Deploy to production
- **[OAuth Configuration](./docs/GOOGLE_OAUTH_SETUP.md)** - Detailed OAuth setup

## 🐛 Troubleshooting

### OAuth Issues
- Check redirect URI in Google Console
- Verify environment variables
- Ensure HTTPS in production

### Environment Issues
- Run `npm run setup` to validate
- Check `.env.local` exists and is configured
- Restart development server after changes

### API Issues
- Enable debug mode: `YOUTUBE_DEBUG=true`
- Check YouTube API quota in Google Console
- Verify API is enabled in Google Cloud Console

## 🆘 Need Help?

1. Check the [documentation](./docs/)
2. Enable debug mode for detailed logs
3. Review browser console for errors
4. Check the GitHub issues

---

**Ready to go?** Run `npm run setup` and follow the prompts! 🎉