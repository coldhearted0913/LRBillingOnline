@echo off
REM LR Billing Web - Development Server Startup Script
REM This script sets up the environment and starts the Next.js dev server

echo.
echo ============================================
echo  LR Billing Web - Development Server
echo ============================================
echo.

REM Set the database URL
set DATABASE_URL=file:./prisma/dev.db

REM Check if node_modules exists
if not exist node_modules (
    echo.
    echo Installing dependencies...
    call npm install
    echo.
)

REM Check if database exists, if not create it
if not exist prisma/dev.db (
    echo.
    echo Setting up database...
    call npx prisma migrate dev --name init
    echo.
)

REM Start the dev server
echo.
echo Starting development server...
echo.
echo ✅ Server will start at http://localhost:3000
echo.
echo Access from your computer: http://localhost:3000
echo Access from other devices: http://[YOUR_IP]:3000
echo.
echo Press Ctrl+C to stop the server
echo.

call npm run dev

pause
