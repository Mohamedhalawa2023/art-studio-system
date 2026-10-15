@echo off
chcp 65001 >nul
title نظام استوديو وأكاديمية الرسام للفنون

echo ======================================================================
echo          مرسم وأكاديمية الفنان - نظام إدارة الفرعين وسطح المكتب
echo ======================================================================
echo.
echo [1/2] جاري تشغيل خادم النظام وقاعدة البيانات...

cd /d "%~dp0"

:: Check if server is already running on port 3000
netstat -ano | findstr :3000 >nul
if %errorlevel% equ 0 (
    echo [✓] خادم النظام يعمل بالفعل.
) else (
    start /b node server.js >nul 2>&1
    timeout /t 2 /nobreak >nul
    echo [✓] تم تشغيل خادم النظام بنجاح.
)

echo [2/2] جاري فتح نافذة تطبيق سطح المكتب...

:: Check Edge App Mode
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app="http://localhost:3000" --window-size=1366,850
) else if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app="http://localhost:3000" --window-size=1366,850
) else if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app="http://localhost:3000" --window-size=1366,850
) else (
    start http://localhost:3000
)

echo.
echo [✓] تم فتح نظام الأكاديمية بنجاح!
exit
