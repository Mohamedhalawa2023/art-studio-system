@echo off
title Marsam Art Studio
cd /d "%~dp0"

set MARSAM_DESKTOP=1
node scripts\launch-local-app.cjs
if errorlevel 1 (
    echo.
    pause
)
