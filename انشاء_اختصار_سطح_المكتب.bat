@echo off
chcp 65001 >nul
echo جاري إنشاء اختصار النظام على سطح المكتب...
powershell -ExecutionPolicy Bypass -File "%~dp0create_desktop_shortcut.ps1"
echo.
pause
