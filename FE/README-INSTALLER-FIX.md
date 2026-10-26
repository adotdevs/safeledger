# How to Fix DevTools in Safecoinledgersetup.exe

## Quick Method (For You - Before Sharing)

Since rebuilding takes 5 hours, here's the fastest way:

### Option 1: Include Fix Script with Installer (Recommended)

1. **Share both files together:**
   - `Safecoinledgersetup.exe` (the installer)
   - `fix-devtools.bat` (the fix script)

2. **Tell users to:**
   - Install the app from `Safecoinledgersetup.exe`
   - Run `fix-devtools.bat` after installation
   - Restart the app

### Option 2: Edit Installed App Manually

1. Install the app from `Safecoinledgersetup.exe`
2. Navigate to: `%LOCALAPPDATA%\Programs\Safe Coin Ledger\resources\app\`
3. Open `main.js` in Notepad
4. Find line 20: `const ENABLE_DEVTOOLS = true;`
5. Change to: `const ENABLE_DEVTOOLS = false;`
6. Save and restart the app

### Option 3: Extract and Repack Installer (Advanced)

If you have 7-Zip installed:

1. **Extract the installer:**
   ```powershell
   cd FE
   "C:\Program Files\7-Zip\7z.exe" x Safecoinledgersetup.exe -oinstaller-extracted
   ```

2. **Find and edit main.js:**
   - Look in `installer-extracted\` folder
   - Find `main.js` (usually in `resources\app\main.js`)
   - Change `ENABLE_DEVTOOLS = true` to `false`

3. **Repack (requires NSIS or electron-builder):**
   - This is complex and may still take time
   - Not recommended if rebuild takes 5 hours

## Recommended Solution

**Include `fix-devtools.bat` with your installer distribution:**

1. Create a zip file containing:
   - `Safecoinledgersetup.exe`
   - `fix-devtools.bat`
   - `README.txt` (instructions)

2. In `README.txt`, tell users:
   ```
   Installation Instructions:
   1. Run Safecoinledgersetup.exe to install
   2. After installation, run fix-devtools.bat
   3. Start Safe Coin Ledger from Start Menu
   ```

This way users get the fix immediately without you needing to rebuild!
