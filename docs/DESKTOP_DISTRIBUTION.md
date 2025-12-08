# YouTube Subscriptions Manager - Desktop Distribution Guide

This guide will help you build and distribute the YouTube Subscriptions Manager as a standalone desktop application for Windows, macOS, and Linux.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Git installed
- For building icons: ImageMagick (optional, for PNG conversion)

### Development Mode
```bash
# Install dependencies
npm install

# Run in development mode (with hot reload)
npm run electron:dev
```

### Building for Distribution
```bash
# Build the application for all platforms
npm run electron:dist

# Or build for specific platforms
npm run electron:pack -- --mac
npm run electron:pack -- --win
npm run electron:pack -- --linux
```

## 📦 Build Outputs

After building, you'll find distributable packages in the `release/` directory:

### Windows
- `YouTube Subscriptions Manager Setup 1.0.0.exe` - Installer with setup wizard
- `YouTube Subscriptions Manager 1.0.0.exe` - Portable executable

### macOS
- `YouTube Subscriptions Manager-1.0.0.dmg` - Disk image installer
- `YouTube Subscriptions Manager-1.0.0-arm64.dmg` - For Apple Silicon Macs

### Linux
- `youtube-subscriptions-manager-1.0.0.AppImage` - Universal AppImage
- `youtube-subscriptions-manager_1.0.0_amd64.deb` - Debian/Ubuntu package

## 🔧 Configuration

### Environment Variables
Create a `.env.local` file with your YouTube API credentials:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
NEXT_PUBLIC_GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/auth/callback
```

### Customization Options

#### App Metadata (package.json)
```json
{
  "name": "youtube-subscriptions",
  "version": "1.0.0",
  "description": "YouTube Subscriptions Manager",
  "build": {
    "appId": "com.youtubesubscriptions.app",
    "productName": "YouTube Subscriptions Manager"
  }
}
```

#### Build Configuration
- **Output Directory**: `release/`
- **Main Process**: `dist/main.js`
- **Renderer**: Built Next.js app in `out/`

## 🎨 Customizing the App

### Changing the Icon
1. Replace `public/icon.svg` with your icon (SVG format recommended)
2. For best results, provide multiple sizes:
   - `public/icons/icon.ico` (Windows)
   - `public/icons/icon.icns` (macOS)
   - `public/icons/icon.png` (Linux, 512x512px)

### Modifying the Window
Edit `src/main.ts` to change:
- Window size and minimum dimensions
- Window title and appearance
- Menu items and shortcuts
- Security settings

### Adding Native Features
The app includes a preload script (`public/preload.js`) that exposes safe APIs to the renderer process:

```javascript
// Available in renderer process
window.electronAPI.getVersion()
window.electronAPI.showNotification(title, body)
window.electronAPI.openExternal(url)
```

## 🛠️ Advanced Build Options

### Platform-Specific Builds

#### Windows Only
```bash
npm run electron:pack -- --win --x64
npm run electron:pack -- --win --ia32
```

#### macOS Only
```bash
npm run electron:pack -- --mac --x64
npm run electron:pack -- --mac --arm64
```

#### Linux Only
```bash
npm run electron:pack -- --linux --x64
npm run electron:pack -- --linux --arm64
```

### Code Signing (Production)
For distribution, you'll want to code sign your applications:

#### Windows
```bash
npm run electron:pack -- --win --certificate-file="cert.p12" --certificate-password="password"
```

#### macOS
```bash
npm run electron:pack -- --mac --identity="Developer ID Application: Your Name"
```

### Auto-Updater Setup
To enable automatic updates:

1. Install electron-updater:
```bash
npm install electron-updater
```

2. Update `src/main.ts` to include update checking

3. Configure update server in package.json build config

## 📋 Distribution Checklist

Before distributing your app:

### ✅ Testing
- [ ] Test on all target platforms
- [ ] Verify OAuth flow works correctly
- [ ] Test window resizing and controls
- [ ] Check external link handling
- [ ] Verify security settings

### ✅ Legal
- [ ] Review YouTube API Terms of Service
- [ ] Include proper attributions
- [ ] Add privacy policy if collecting user data
- [ ] Include open source licenses

### ✅ Performance
- [ ] Test app startup time
- [ ] Check memory usage
- [ ] Verify responsive design
- [ ] Test with large subscription lists

### ✅ Security
- [ ] Verify no hardcoded secrets
- [ ] Check content security policy
- [ ] Test certificate validation
- [ ] Review preload script exposure

## 🚀 Publishing

### GitHub Releases
1. Create a new release on GitHub
2. Upload the built packages
3. Update release notes
4. Tag the release with version number

### Direct Distribution
- Windows: Share the `.exe` installer
- macOS: Share the `.dmg` file
- Linux: Share the `.AppImage` or `.deb` package

### App Stores (Optional)
- Microsoft Store (Windows)
- Mac App Store (macOS)
- Snap Store (Linux)

## 🐛 Troubleshooting

### Common Issues

#### "Module not found" errors
```bash
npm install
npm run postinstall
```

#### Build fails on TypeScript errors
```bash
npm run type-check
# Fix any TypeScript errors before building
```

#### Icon not displaying
- Ensure icon files exist in `public/`
- Check file formats (.ico for Windows, .icns for macOS)
- Verify paths in package.json

#### OAuth redirect issues
- Check redirect URI in Google Cloud Console
- Verify `NEXT_PUBLIC_REDIRECT_URI` environment variable
- Ensure port matches development server

#### App won't start
- Check console for error messages
- Verify main process compilation: `npx tsc -p tsconfig.main.json`
- Check that `dist/main.js` exists

### Getting Help
- Check the [Electron documentation](https://www.electronjs.org/docs)
- Review [electron-builder docs](https://www.electron.build/)
- Open an issue on the project repository

## 📈 Next Steps

Consider adding:
- [ ] Auto-update functionality
- [ ] System tray integration
- [ ] Keyboard shortcuts
- [ ] Offline mode
- [ ] Data export/import
- [ ] Theme customization
- [ ] Notification settings

---

**Happy Building! 🎉**