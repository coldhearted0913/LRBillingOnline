@echo off
echo ========================================
echo LR Billing App - Simple AWS Deployment
echo Using GitHub + AWS Amplify Console
echo ========================================
echo.

echo This is the EASIEST way to deploy to AWS!
echo No CLI tools needed - just use the AWS Console web interface.
echo.

echo Step 1: Push your code to GitHub
echo ========================================
echo.

:: Check if git is initialized
if not exist ".git" (
    echo Initializing Git repository...
    git init
    git add .
    git commit -m "Initial commit - LR Billing Web App"
    echo.
)

:: Check if remote exists
git remote -v | findstr "origin" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo You need to add a GitHub remote.
    echo.
    echo 1. Create a new repository on GitHub: https://github.com/new
    echo 2. Copy your repository URL
    echo.
    set /p REPO_URL="Enter your GitHub repository URL (e.g., https://github.com/username/lr-billing-app.git): "
    
    if "%REPO_URL%"=="" (
        echo ERROR: Repository URL is required!
        pause
        exit /b 1
    )
    
    git remote add origin %REPO_URL%
    echo Remote added!
    echo.
)

echo Pushing to GitHub...
git branch -M main
git add .
git commit -m "Ready for AWS deployment" --allow-empty
git push -u origin main

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Failed to push to GitHub.
    echo Please make sure:
    echo 1. You have Git installed
    echo 2. You're logged into GitHub
    echo 3. The repository exists
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Code successfully pushed to GitHub!
echo.

echo Step 2: Deploy with AWS Amplify Console
echo ========================================
echo.
echo Now follow these steps in your web browser:
echo.
echo 1. Go to AWS Amplify Console:
echo    https://console.aws.amazon.com/amplify/
echo.
echo 2. Click "New app" -^> "Host web app"
echo.
echo 3. Choose "GitHub" and authorize AWS Amplify
echo.
echo 4. Select your repository: lr-billing-app (or your repo name)
echo.
echo 5. Select branch: main
echo.
echo 6. Amplify will auto-detect Next.js settings. Verify:
echo    - Build command: npm run build
echo    - Build output directory: .next
echo.
echo 7. Click "Next" -^> "Save and deploy"
echo.
echo 8. Wait 5-10 minutes for deployment to complete
echo.
echo 9. IMPORTANT: Add Environment Variables:
echo    - Go to "Environment variables" in left menu
echo    - Click "Manage variables"
echo    - Add these (click "Add variable" for each):
echo.
echo      AWS_ACCESS_KEY_ID = [your AWS access key]
echo      AWS_SECRET_ACCESS_KEY = [your AWS secret key]
echo      AWS_REGION = [your region, e.g., ap-south-1]
echo      S3_BUCKET_NAME = [your bucket name]
echo.
echo    - Click "Save"
echo.
echo 10. Trigger new deployment:
echo     - Go to "Deployments" tab
echo     - Click "Redeploy this version"
echo.
echo 11. Your app will be live at:
echo     https://main.xxxxx.amplifyapp.com
echo.
echo ========================================
echo Opening AWS Amplify Console in browser...
echo ========================================
start https://console.aws.amazon.com/amplify/
echo.
echo ✅ Follow the steps shown above to complete deployment!
echo.
pause

