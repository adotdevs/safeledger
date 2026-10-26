# Electron Setup Guide

This application has been configured to run as a Windows desktop app using Electron.

## Development

### Prerequisites
- Node.js installed
- All npm dependencies installed (`npm install`)

### Running in Development Mode

1. Start the React development server and Electron:
   ```bash
   npm run electron:serve
   ```
   
   This will:
   - Start the React dev server on `http://localhost:3000`
   - Wait for the server to be ready
   - Launch Electron window pointing to the dev server

2. Or run them separately:
   ```bash
   # Terminal 1: Start React dev server
   npm start
   
   # Terminal 2: Start Electron (after server is ready)
   npm run electron:start
   ```

## Building for Production

### Build Windows Executable

1. Build the React app and create Electron executable:
   ```bash
   npm run electron:build:win
   ```

2. The built application will be in `dist-electron/` folder:
   - Windows installer: `dist-electron/Safe Coin Ledger Setup x.x.x.exe`
   - Unpacked app: `dist-electron/win-unpacked/`

### Build for Other Platforms

```bash
# macOS
npm run build && electron-builder --mac

# Linux
npm run build && electron-builder --linux
```

## Router Configuration

- **Web (Browser)**: Uses `BrowserRouter` for clean URLs
- **Electron**: Automatically uses `HashRouter` for file:// protocol compatibility

The router automatically detects if it's running in Electron and switches accordingly.

## File Structure

```
FE/
├── public/
│   ├── main.js          # Electron main process
│   ├── preload.js       # Preload script (context isolation)
│   └── icon.png         # App icon
├── build/               # React build output (created after npm run build)
└── dist-electron/       # Electron build output (created after electron:build)
```

## Notes

- The app uses HashRouter in Electron to work with the `file://` protocol
- Context isolation is enabled for security
- Node integration is disabled in renderer process
- Preload script exposes safe Electron APIs to renderer

## Troubleshooting

### Electron window doesn't open
- Make sure React dev server is running on port 3000
- Check console for errors

### Routes not working in Electron
- Verify HashRouter is being used (check URL should have `#` in Electron)
- Check browser console for routing errors

### Build fails
- Make sure `npm run build` completes successfully first
- Check that `public/icon.png` exists
- Verify all dependencies are installed
