# Electron Build Fix - Access Denied Error

## Problem
Error: `remove D:\safecoinledger-new\FE\dist-electron\win-unpacked\d3dcompiler_47.dll: Access is denied`

This happens when files are locked by:
1. Running Electron app
2. Windows Defender/Antivirus
3. File explorer with folder open
4. Another process

## Solution

### Step 1: Close All Electron Processes
```powershell
# Stop any running Electron processes
Get-Process | Where-Object {$_.ProcessName -like "*electron*" -or $_.ProcessName -like "*Safe Coin Ledger*"} | Stop-Process -Force
```

Or manually:
- Close any running Electron apps
- Check Task Manager for "Electron" or "Safe Coin Ledger" processes
- End them if found

### Step 2: Close File Explorer
Close any File Explorer windows that have the `dist-electron` folder open.

### Step 3: Clean Build Folder
```powershell
# Wait a moment for processes to close
Start-Sleep -Seconds 2

# Remove the folder
Remove-Item -Path "dist-electron" -Recurse -Force

# If that fails, try:
if (Test-Path "dist-electron\win-unpacked") {
    Get-ChildItem "dist-electron\win-unpacked" | Remove-Item -Recurse -Force
}
```

### Step 4: Temporarily Disable Windows Defender
1. Open Windows Security
2. Virus & threat protection → Manage settings
3. Temporarily disable Real-time protection
4. Run the build
5. Re-enable protection after build

### Step 5: Run Build as Administrator
Right-click PowerShell/Command Prompt and select "Run as Administrator", then:
```bash
cd FE
npm run build
npm run electron:build:win
```

### Step 6: Rebuild
```bash
npm run electron:rebuild
```

## Alternative: Build to Different Location

If files keep getting locked, build to a different location:
```bash
electron-builder --win --config.directories.output=D:/electron-builds
```

## Alternative: Build Unpacked Version

Skip the installer and build unpacked version:
```bash
npm run build
electron-builder --win --dir
```

This creates a folder you can zip and distribute (no installer needed).

## If Still Failing

1. Restart your computer (clears all file locks)
2. Try building in safe mode
3. Check Windows Event Viewer for file access errors
4. Use Process Explorer to find what's locking the files:
   - Download Process Explorer from Microsoft
   - Find the process locking `d3dcompiler_47.dll`
   - End that process
