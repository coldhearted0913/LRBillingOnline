@echo off
setlocal enabledelayedexpansion
echo ========================================
echo LR Billing App - Deployment Readiness Check
echo ========================================
echo.

set "ALL_READY=1"

echo Checking prerequisites...
echo.

:: Check Node.js
echo [1/7] Checking Node.js...
where node >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo ✅ Node.js installed: !NODE_VERSION!
) else (
    echo ❌ Node.js NOT installed
    echo    Download from: https://nodejs.org/
    set "ALL_READY=0"
)
echo.

:: Check npm
echo [2/7] Checking npm...
where npm >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo ✅ npm installed: v!NPM_VERSION!
) else (
    echo ❌ npm NOT installed
    set "ALL_READY=0"
)
echo.

:: Check Git
echo [3/7] Checking Git...
where git >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('git --version') do set GIT_VERSION=%%i
    echo ✅ Git installed: !GIT_VERSION!
) else (
    echo ❌ Git NOT installed
    echo    Download from: https://git-scm.com/
    set "ALL_READY=0"
)
echo.

:: Check AWS CLI
echo [4/7] Checking AWS CLI...
where aws >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('aws --version 2^>^&1') do set AWS_VERSION=%%i
    echo ✅ AWS CLI installed: !AWS_VERSION!
) else (
    echo ⚠️  AWS CLI NOT installed (required for AWS deployment)
    echo    Download from: https://aws.amazon.com/cli/
    echo    (Not required for Railway/Render deployment)
)
echo.

:: Check if dependencies are installed
echo [5/7] Checking npm dependencies...
if exist "node_modules" (
    echo ✅ Dependencies installed
) else (
    echo ⚠️  Dependencies NOT installed
    echo    Run: npm install
    set "ALL_READY=0"
)
echo.

:: Check environment variables
echo [6/7] Checking environment variables...
if exist ".env.local" (
    echo ✅ .env.local file exists
    
    findstr /C:"AWS_ACCESS_KEY_ID" .env.local >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo ✅ AWS_ACCESS_KEY_ID configured
    ) else (
        echo ❌ AWS_ACCESS_KEY_ID missing
        set "ALL_READY=0"
    )
    
    findstr /C:"AWS_SECRET_ACCESS_KEY" .env.local >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo ✅ AWS_SECRET_ACCESS_KEY configured
    ) else (
        echo ❌ AWS_SECRET_ACCESS_KEY missing
        set "ALL_READY=0"
    )
    
    findstr /C:"S3_BUCKET_NAME" .env.local >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo ✅ S3_BUCKET_NAME configured
    ) else (
        echo ❌ S3_BUCKET_NAME missing
        set "ALL_READY=0"
    )
) else (
    echo ❌ .env.local file NOT found
    echo    Create .env.local with your AWS credentials
    set "ALL_READY=0"
)
echo.

:: Check if build works
echo [7/7] Testing local build...
echo Running: npm run build
echo (This may take a minute...)
echo.
call npm run build >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✅ Build successful
) else (
    echo ❌ Build FAILED
    echo    Fix build errors before deploying
    echo    Run: npm run build (to see errors)
    set "ALL_READY=0"
)
echo.

:: Summary
echo ========================================
echo READINESS SUMMARY
echo ========================================
echo.

if "%ALL_READY%"=="1" (
    echo ✅ ALL CHECKS PASSED!
    echo.
    echo Your app is ready to deploy!
    echo.
    echo Next steps:
    echo.
    echo For AWS Deployment:
    echo   Run: DEPLOY_AWS_SIMPLE.bat
    echo.
    echo For Railway Deployment:
    echo   1. Install: npm install -g @railway/cli
    echo   2. Run: railway login
    echo   3. Run: railway init
    echo   4. Run: railway up
    echo.
) else (
    echo ❌ SOME CHECKS FAILED
    echo.
    echo Please fix the issues marked with ❌ above
    echo Then run this script again to verify
    echo.
)

pause

