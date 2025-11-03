@echo off
REM Quick fix script - run as Administrator
echo ========================================
echo   SSD HIGH USAGE FIX - MUST RUN AS ADMIN
echo ========================================
echo.
echo Checking permissions...

net session >nul 2>&1
if %errorLevel% == 0 (
    echo Running as Administrator - OK
    echo.
    powershell.exe -ExecutionPolicy Bypass -File "%~dp0fix-high-disk-usage.ps1"
    pause
) else (
    echo ERROR: NOT running as Administrator!
    echo.
    echo Right-click this file and select "Run as Administrator"
    pause
    exit /b 1
)

