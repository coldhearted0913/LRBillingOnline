@echo off
setlocal enabledelayedexpansion

echo ========================================
echo AWS Amplify Deployment Script
echo ========================================
echo.

REM Set the repository URL directly
set REPO_URL=https://github.com/coldhearted0913/LRBillingOnline.git

echo Using repository: %REPO_URL%
echo.

REM Check if we're already in a git repo
if exist ".git" (
    echo [1/5] Git repository already initialized
) else (
    echo [1/5] Initializing Git repository...
    git init
    if errorlevel 1 (
        echo ERROR: Failed to initialize git repository
        pause
        exit /b 1
    )
)

echo.
echo [2/5] Adding all files to git...
git add .
if errorlevel 1 (
    echo ERROR: Failed to add files
    pause
    exit /b 1
)

echo.
echo [3/5] Creating commit...
git commit -m "Initial commit for AWS Amplify deployment"
if errorlevel 1 (
    echo Note: If this fails, it might be because files are already committed
)

echo.
echo [4/5] Adding remote repository...
git remote remove origin 2>nul
git remote add origin %REPO_URL%
if errorlevel 1 (
    echo ERROR: Failed to add remote
    pause
    exit /b 1
)

echo.
echo [5/5] Pushing to GitHub...
echo.
echo You may be prompted for your GitHub credentials...
echo.
git push -u origin main
if errorlevel 1 (
    echo.
    echo Trying with 'master' branch instead...
    git branch -M main
    git push -u origin main
    if errorlevel 1 (
        echo ERROR: Failed to push to GitHub
        echo.
        echo Please check:
        echo 1. You have access to the repository
        echo 2. Your GitHub credentials are correct
        echo 3. The repository exists at: %REPO_URL%
        echo.
        pause
        exit /b 1
    )
)

echo.
echo ========================================
echo SUCCESS! Code pushed to GitHub
echo ========================================
echo.
echo NEXT STEPS:
echo.
echo 1. Go to: https://console.aws.amazon.com/amplify/
echo.
echo 2. Click "New app" ^> "Host web app"
echo.
echo 3. Choose "GitHub" and authorize AWS Amplify
echo.
echo 4. Select repository: coldhearted0913/LRBillingOnline
echo.
echo 5. Configure build settings:
echo    - Build command: npm run build
echo    - Output directory: .next
echo.
echo 6. Add environment variables:
echo    AWS_ACCESS_KEY_ID
echo    AWS_SECRET_ACCESS_KEY
echo    S3_BUCKET_NAME
echo    AWS_REGION (e.g., us-east-1)
echo.
echo 7. Click "Save and deploy"
echo.
echo ========================================
echo.
pause

