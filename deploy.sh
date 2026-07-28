#!/bin/bash

# Nivaana E-commerce Firebase Deployment Script
# This script automates the build and deployment process

set -e  # Exit on any error

DEPLOY_ENV="${1:-prod}"

if [[ "$DEPLOY_ENV" != "prod" && "$DEPLOY_ENV" != "sit" ]]; then
    echo "Usage: ./deploy.sh [prod|sit]"
    exit 1
fi

echo "🚀 Starting Nivaana E-commerce ${DEPLOY_ENV^^} Deployment Process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    print_error "Firebase CLI is not installed. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    print_warning "You are not logged in to Firebase. Please log in first:"
    echo "firebase login"
    exit 1
fi

# Check if project exists
print_status "Checking Firebase project..."
if ! firebase use nivaana-ecom-web &> /dev/null; then
    print_warning "Project 'nivaana-ecom-web' not found. Creating new project..."
    firebase projects:create nivaana-ecom-web --display-name "Nivaana E-commerce Web"
    firebase use nivaana-ecom-web
fi

# Install dependencies
print_status "Installing dependencies..."
npm install

# Run linting
print_status "Running ESLint..."
npm run lint

# Build the project
print_status "Building the project..."
npm run "build:$DEPLOY_ENV"

# Check if build was successful
if [ ! -d "dist" ]; then
    print_error "Build failed - dist directory not found"
    exit 1
fi

print_success "Build completed successfully!"

# Deploy to Firebase
print_status "Deploying to Firebase Hosting target: $DEPLOY_ENV..."
firebase deploy --only "hosting:$DEPLOY_ENV" --project nivaana-ecom-web

print_success "🎉 Deployment completed successfully!"
if [[ "$DEPLOY_ENV" == "sit" ]]; then
    APP_URL="https://nivaana-ecom-web-sit.web.app"
else
    APP_URL="https://nivaana-ecom-web.web.app"
fi
print_status "Your app is now live at: $APP_URL"

# Optional: Open the deployed site
read -p "Would you like to open the deployed site? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    open "$APP_URL"
fi

echo "✨ Deployment process completed!"
