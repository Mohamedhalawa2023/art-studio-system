@echo off
title Marsam Art Studio

:: Kill any stale server holding port 3000 to ensure fresh updates
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)

:: Start fresh standalone production server in background
start /min "" cmd /c "cd /d ""%~dp0"" && node .next\standalone\server.js"
ping -n 3 127.0.0.1 >nul

:: Launch browser in standalone app mode
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app="http://localhost:3000" --window-size=1400,900
) else if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app="http://localhost:3000" --window-size=1400,900
) else (
    start http://localhost:3000
)
exit
