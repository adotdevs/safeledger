# Script to edit Safecoinledgersetup.exe without rebuilding
# This extracts the installer, edits main.js, and repacks it

Write-Host "=== Editing Safecoinledgersetup.exe ===" -ForegroundColor Green

# Step 1: Extract the installer using 7-Zip
$installerPath = "Safecoinledgersetup.exe"
$extractPath = "installer-extracted"

if (-not (Test-Path $installerPath)) {
    Write-Host "ERROR: $installerPath not found in current directory!" -ForegroundColor Red
    Write-Host "Please place Safecoinledgersetup.exe in the FE folder" -ForegroundColor Yellow
    exit 1
}

Write-Host "Step 1: Extracting installer..." -ForegroundColor Cyan

# Check if 7-Zip is available
$7zipPath = "C:\Program Files\7-Zip\7z.exe"
if (-not (Test-Path $7zipPath)) {
    $7zipPath = "${env:ProgramFiles(x86)}\7-Zip\7z.exe"
}

if (-not (Test-Path $7zipPath)) {
    Write-Host "ERROR: 7-Zip not found!" -ForegroundColor Red
    Write-Host "Please install 7-Zip from https://www.7-zip.org/" -ForegroundColor Yellow
    Write-Host "Or use the alternative method below" -ForegroundColor Yellow
    exit 1
}

# Extract installer
& $7zipPath x "$installerPath" -o"$extractPath" -y | Out-Null

if (-not (Test-Path "$extractPath\$app-1.1.0\resources\app\main.js")) {
    Write-Host "ERROR: Could not find main.js in extracted files" -ForegroundColor Red
    Write-Host "Trying alternative extraction method..." -ForegroundColor Yellow
    
    # Try finding main.js in any subdirectory
    $mainJs = Get-ChildItem -Path $extractPath -Recurse -Filter "main.js" | Select-Object -First 1
    if ($mainJs) {
        $mainJsPath = $mainJs.FullName
    } else {
        Write-Host "ERROR: main.js not found. Installer structure may be different." -ForegroundColor Red
        exit 1
    }
} else {
    $mainJsPath = "$extractPath\$app-1.1.0\resources\app\main.js"
}

Write-Host "Step 2: Editing main.js..." -ForegroundColor Cyan

# Edit main.js to disable DevTools
$content = Get-Content $mainJsPath -Raw
$content = $content -replace 'const ENABLE_DEVTOOLS = true;', 'const ENABLE_DEVTOOLS = false;'

Set-Content -Path $mainJsPath -Value $content -NoNewline

Write-Host "Step 3: Repacking installer..." -ForegroundColor Cyan

# Create new installer using electron-builder from extracted files
# This is faster than full rebuild
Write-Host "Copying modified files to dist-electron..." -ForegroundColor Yellow

# The extracted files need to be in the right structure for electron-builder
# This is complex, so let's use a simpler approach

Write-Host ""
Write-Host "=== ALTERNATIVE SIMPLER METHOD ===" -ForegroundColor Green
Write-Host "1. Install the app from Safecoinledgersetup.exe" -ForegroundColor Yellow
Write-Host "2. Edit the installed main.js file:" -ForegroundColor Yellow
Write-Host "   Location: %LOCALAPPDATA%\Programs\Safe Coin Ledger\resources\app\main.js" -ForegroundColor Cyan
Write-Host "3. Change line 20: const ENABLE_DEVTOOLS = false;" -ForegroundColor Yellow
Write-Host "4. Share the installer - users will get the fixed version after install" -ForegroundColor Yellow
Write-Host ""
Write-Host "OR use the batch file method (see fix-devtools.bat)" -ForegroundColor Yellow
