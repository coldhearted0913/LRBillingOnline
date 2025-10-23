@echo off
echo ========================================
echo LR Billing App - AWS Amplify Deployment
echo ========================================
echo.

:: Check if AWS CLI is installed
where aws >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: AWS CLI not found!
    echo.
    echo Please install AWS CLI first:
    echo 1. Download from: https://aws.amazon.com/cli/
    echo 2. Install and restart this script
    echo.
    pause
    exit /b 1
)

:: Check if git is initialized
if not exist ".git" (
    echo Initializing Git repository...
    git init
    git add .
    git commit -m "Initial commit for AWS deployment"
    echo Git repository initialized!
    echo.
)

echo Step 1: Checking AWS Configuration...
echo ========================================
aws sts get-caller-identity >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo AWS credentials not configured!
    echo.
    echo Configuring AWS credentials now...
    echo Please enter your AWS credentials:
    echo.
    aws configure
    echo.
)

echo Step 2: Installing Amplify CLI...
echo ========================================
where amplify >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Installing Amplify CLI globally...
    npm install -g @aws-amplify/cli
    echo.
) else (
    echo Amplify CLI already installed!
    echo.
)

echo Step 3: Checking if project is already initialized...
echo ========================================
if exist "amplify" (
    echo Amplify project already initialized.
    echo.
) else (
    echo Initializing Amplify project...
    echo.
    echo NOTE: You'll be asked several questions. Use these answers:
    echo - Enter a name: lr-billing-app
    echo - Environment: prod
    echo - Default editor: Visual Studio Code
    echo - App type: javascript
    echo - Framework: react
    echo - Source directory: (press Enter for default)
    echo - Distribution directory: .next
    echo - Build command: npm run build
    echo - Start command: npm start
    echo.
    pause
    amplify init
    echo.
)

echo Step 4: Adding Hosting...
echo ========================================
echo Adding Amplify Hosting with CI/CD from GitHub...
echo.
echo IMPORTANT: You need to push your code to GitHub first!
echo.
set /p GITHUB_READY="Have you pushed your code to GitHub? (y/n): "
if /i "%GITHUB_READY%" NEQ "y" (
    echo.
    echo Please follow these steps:
    echo 1. Create a new repository on GitHub
    echo 2. Run these commands:
    echo.
    echo    git remote add origin https://github.com/YOUR_USERNAME/lr-billing-app.git
    echo    git branch -M main
    echo    git push -u origin main
    echo.
    echo 3. Run this script again
    echo.
    pause
    exit /b 0
)

echo.
echo Adding hosting...
amplify add hosting

echo.
echo Step 5: Publishing to AWS...
echo ========================================
amplify publish

echo.
echo ========================================
echo SUCCESS! Your app is now deployed!
echo ========================================
echo.
echo Next steps:
echo 1. Go to AWS Amplify Console: https://console.aws.amazon.com/amplify/
echo 2. Find your app: lr-billing-app
echo 3. Go to Environment Variables and add:
echo    - AWS_ACCESS_KEY_ID
echo    - AWS_SECRET_ACCESS_KEY
echo    - AWS_REGION
echo    - S3_BUCKET_NAME
echo 4. Trigger a new build for changes to take effect
echo.
echo Your app URL will be shown above or in the Amplify console
echo.
pause

