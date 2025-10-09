@echo off
REM Nivaana E-commerce Firebase Deployment Script for Windows
REM This script automates the build and deployment process

echo 🚀 Starting Nivaana E-commerce Deployment Process...

REM Check if Firebase CLI is installed
firebase --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Firebase CLI is not installed. Please install it first:
    echo npm install -g firebase-tools
    pause
    exit /b 1
)

REM Check if user is logged in to Firebase
firebase projects:list >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] You are not logged in to Firebase. Please log in first:
    echo firebase login
    pause
    exit /b 1
)

REM Check if project exists
echo [INFO] Checking Firebase project...
firebase use nivaana-ecom-web >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Project 'nivaana-ecom-web' not found. Creating new project...
    firebase projects:create nivaana-ecom-web --display-name "Nivaana E-commerce Web"
    firebase use nivaana-ecom-web
)

REM Install dependencies
echo [INFO] Installing dependencies...
npm install

REM Run linting
echo [INFO] Running ESLint...
npm run lint

REM Build the project
echo [INFO] Building the project...
npm run build

REM Check if build was successful
if not exist "dist" (
    echo [ERROR] Build failed - dist directory not found
    pause
    exit /b 1
)

echo [SUCCESS] Build completed successfully!

REM Deploy to Firebase
echo [INFO] Deploying to Firebase Hosting...
firebase deploy --only hosting

echo [SUCCESS] 🎉 Deployment completed successfully!
echo [INFO] Your app is now live at: https://nivaana-ecom-web.web.app

REM Optional: Open the deployed site
set /p choice="Would you like to open the deployed site? (y/n): "
if /i "%choice%"=="y" (
    start https://nivaana-ecom-web.web.app
)

echo ✨ Deployment process completed!
pause
