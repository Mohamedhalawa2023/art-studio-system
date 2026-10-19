@echo off
chcp 65001 > nul
title تشغيل نظام المرسم للعملاء

:: Check if server is running on port 3000
netstat -ano | findstr :3000 > nul
if %errorlevel% neq 0 (
    echo جاري تشغيل خادم المرسم في الخلفية...
    start /min "" cmd /c "cd /d %~dp0 && npm run start"
    timeout /t 3 /nobreak > nul
)

:: Launch standalone App mode
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app="http://localhost:3000" --window-size=1400,900
) else if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app="http://localhost:3000" --window-size=1400,900
) else (
    start http://localhost:3000
)
exit
