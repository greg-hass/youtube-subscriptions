# YouTube Subscriptions Manager - Desktop App 📱

A beautiful, fast desktop application for managing your YouTube subscriptions. Built with Electron, Next.js, and React.

## ✨ Features

- 🚀 **Lightning Fast** - Intelligent caching and background updates
- 🔐 **Secure Authentication** - OAuth2 with persistent sessions
- 📱 **Cross-Platform** - Windows, macOS, and Linux support
- 🎨 **Modern UI** - Clean, responsive interface with dark/light themes
- ⚡ **Auto-Updates** - Automatic updates when new versions are available
- 📺 **Video Management** - Browse, search, and filter your subscription feed
- 🔄 **Real-time Sync** - Automatically syncs with your YouTube subscriptions

## 🚀 Quick Start

### Download & Install

#### Windows
1. Download `YouTube Subscriptions Manager Setup 1.0.0.exe`
2. Run the installer
3. Follow the setup wizard

#### macOS
1. Download `YouTube Subscriptions Manager-1.0.0.dmg`
2. Open the disk image
3. Drag the app to your Applications folder

#### Linux
1. Download `youtube-subscriptions-manager-1.0.0.AppImage`
2. Make it executable: `chmod +x youtube-subscriptions-manager-1.0.0.AppImage`
3. Run the AppImage

### First Time Setup

1. **Launch the app** from your desktop or applications folder
2. **Click "Sign in with Google"** to connect your YouTube account
3. **Grant permissions** to access your subscriptions
4. **Enjoy your personalized feed!**

## 🎯 Key Features

### 🏠 Home Feed
- View latest videos from all your subscriptions
- Sort by publish date, view count, or relevance
- Filter by duration, definition, or upload date
- Infinite scroll with smooth loading

### 📺 Video Player
- Watch videos directly in the app
- Picture-in-picture mode
- Adjustable playback speed
- Full-screen support

### 🔍 Search & Discovery
- Search your subscription feed
- Filter by specific channels
- Save searches for quick access
- Advanced filtering options

### ⚙️ Customization
- Dark/Light theme toggle
- Layout preferences (grid/list)
- Notification settings
- Cache management

## 🛠️ Building from Source

Want to build the app yourself? Here's how:

### Prerequisites
- Node.js 18+ 
- Git
- YouTube API credentials

### Setup
```bash
# Clone the repository
git clone https://github.com/your-username/youtube-subscriptions.git
cd youtube-subscriptions

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your YouTube API credentials
```

### Development
```bash
# Run in development mode
npm run electron:dev

# Build for production
npm run electron:dist
```

### Build for Specific Platforms
```bash
# Windows only
npm run electron:pack -- --win

# macOS only  
npm run electron:pack -- --mac

# Linux only
npm run electron:pack -- --linux
```

## 🔧 Configuration

### Environment Variables
Create `.env.local` with:
```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
NEXT_PUBLIC_GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### YouTube API Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable YouTube Data API v3
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/auth/callback`

## 📋 System Requirements

### Windows
- Windows 10 or later
- 4GB RAM minimum
- 200MB disk space

### macOS
- macOS 10.14 (Mojave) or later
- 4GB RAM minimum  
- 200MB disk space

### Linux
- Ubuntu 18.04+ / equivalent
- 4GB RAM minimum
- 200MB disk space

## 🔒 Privacy & Security

- **No data collection** - All data stays on your device
- **Secure authentication** - Uses Google's OAuth2
- **Local storage** - Subscriptions cached locally
- **Open source** - Fully transparent codebase

## 🐛 Troubleshooting

### Common Issues

**App won't start**
- Check if your system meets requirements
- Try restarting your computer
- Reinstall the application

**Authentication issues**
- Verify your Google API credentials
- Check redirect URI configuration
- Clear app cache and retry

**Performance issues**
- Clear cache from settings
- Check internet connection
- Restart the app

**Video playback problems**
- Update your graphics drivers
- Check internet speed
- Try different video quality

### Getting Help
- 📖 [Documentation](docs/DESKTOP_DISTRIBUTION.md)
- 🐛 [Report Issues](https://github.com/your-username/youtube-subscriptions/issues)
- 💬 [Discussions](https://github.com/your-username/youtube-subscriptions/discussions)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Electron](https://www.electronjs.org/) - Cross-platform desktop framework
- [Next.js](https://nextjs.org/) - React framework
- [YouTube API](https://developers.google.com/youtube) - Data source
- [Tailwind CSS](https://tailwindcss.com/) - Styling framework

## 📊 Roadmap

- [ ] Offline mode support
- [ ] Playlist management
- [ ] Video download capability  
- [ ] Mobile companion app
- [ ] Advanced analytics
- [ ] Plugin system

---

**Made with ❤️ by the YouTube Subscriptions Manager team**

Enjoy your perfectly organized YouTube experience! 🎉