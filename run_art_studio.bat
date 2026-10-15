@echo off
chcp 65001 >nul
title Atelier Art Studio Management System

echo ======================================================================
echo    Atelier Art Studio Management System - 2 Branches Desktop App
echo ======================================================================
echo.
echo [1/2] Starting local system server and database...

cd /d "%~dp0"

netstat -ano | findstr :3000 >nul
if %errorlevel% equ 0 (
    echo [OK] Server is already running.
) else (
    start /b node server.js >nul 2>&1
    timeout /t 2 /nobreak >nul
    echo [OK] Server started successfully on port 3000.
)

echo [2/2] Opening desktop application window...

if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app="http://localhost:3000" --window-size=1366,850
) else if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app="http://localhost:3000" --window-size=1366,850
) else if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app="http://localhost:3000" --window-size=1366,850
) else (
    start http://localhost:3000
)

exit
