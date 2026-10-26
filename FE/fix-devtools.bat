@echo off
echo ========================================
echo Fixing DevTools in Safe Coin Ledger
echo ========================================
echo.

set "APP_PATH=%LOCALAPPDATA%\Programs\Safe Coin Ledger\resources\app\main.js"

if not exist "%APP_PATH%" (
    echo ERROR: Safe Coin Ledger is not installed!
    echo Please install the app first from Safecoinledgersetup.exe
    pause
    exit /b 1
)

echo Found app at: %APP_PATH%
echo.
echo Backing up original file...
copy "%APP_PATH%" "%APP_PATH%.backup" >nul

echo Editing main.js to disable DevTools...
powershell -Command "(Get-Content '%APP_PATH%') -replace 'const ENABLE_DEVTOOLS = true;', 'const ENABLE_DEVTOOLS = false;' | Set-Content '%APP_PATH%'"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS! DevTools disabled.
    echo ========================================
    echo.
    echo Please restart Safe Coin Ledger for changes to take effect.
    echo.
) else (
    echo.
    echo ERROR: Failed to edit file. Please run as Administrator.
    echo.
)

pause
