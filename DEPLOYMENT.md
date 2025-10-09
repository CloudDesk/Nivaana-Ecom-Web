# Nivaana E-commerce Firebase Deployment Guide

This guide provides step-by-step instructions for deploying your Nivaana e-commerce application to Firebase Hosting.

## Prerequisites

1. **Node.js** (v16 or higher)
2. **Firebase CLI** - Install globally:
   ```bash
   npm install -g firebase-tools
   ```
3. **Google Account** with Firebase access

## Quick Deployment (Single Command)

### For macOS/Linux:
```bash
./deploy.sh
```

### For Windows:
```cmd
deploy.bat
```

### Using npm scripts:
```bash
npm run deploy
```

## Manual Deployment Steps

### 1. Login to Firebase
```bash
firebase login
```

### 2. Initialize Firebase Project (if not done already)
```bash
firebase init hosting
```
- Select your Firebase project or create a new one
- Set public directory to `dist`
- Configure as single-page app: **Yes**
- Set up automatic builds: **No**

### 3. Build the Application
```bash
npm run build
```

### 4. Deploy to Firebase
```bash
firebase deploy
```

## Available npm Scripts

| Script | Description |
|--------|-------------|
| `npm run deploy` | Build and deploy to Firebase |
| `npm run deploy:hosting` | Build and deploy only hosting |
| `npm run firebase:login` | Login to Firebase |
| `npm run firebase:serve` | Serve locally with Firebase emulator |
| `npm run firebase:deploy` | Deploy to Firebase (without build) |

## Firebase Configuration

The project includes the following Firebase configuration files:

### `firebase.json`
```json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

### `.firebaserc`
```json
{
  "projects": {
    "default": "nivaana-ecom-web"
  }
}
```

## Deployment Features

- ✅ **Single Page Application (SPA)** routing support
- ✅ **Optimized caching** for static assets
- ✅ **Automatic HTTPS** with Firebase Hosting
- ✅ **Global CDN** for fast loading worldwide
- ✅ **Custom domain** support (can be configured later)

## Troubleshooting

### Common Issues:

1. **"Firebase CLI not found"**
   ```bash
   npm install -g firebase-tools
   ```

2. **"Not logged in to Firebase"**
   ```bash
   firebase login
   ```

3. **"Project not found"**
   - Create project in Firebase Console
   - Or run: `firebase projects:create nivaana-ecom-web`

4. **"Build failed"**
   - Check for TypeScript errors: `npm run lint`
   - Ensure all dependencies are installed: `npm install`

5. **"Deployment failed"**
   - Check Firebase project permissions
   - Verify project ID in `.firebaserc`

## Environment Variables

For production deployment, make sure to set up environment variables in Firebase:

1. Go to Firebase Console → Project Settings → General
2. Add environment variables if needed
3. Update your build process to use production API endpoints

## Custom Domain Setup

To use a custom domain:

1. Go to Firebase Console → Hosting
2. Click "Add custom domain"
3. Follow the verification steps
4. Update DNS records as instructed

## Monitoring and Analytics

Firebase provides built-in analytics and monitoring:

- **Performance Monitoring**: Track app performance
- **Crashlytics**: Monitor crashes and errors
- **Analytics**: User behavior and engagement

## CI/CD Integration

For automated deployments, you can integrate with:

- **GitHub Actions**
- **GitLab CI**
- **Jenkins**
- **CircleCI**

Example GitHub Actions workflow:
```yaml
name: Deploy to Firebase
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install
      - run: npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          projectId: nivaana-ecom-web
```

## Support

For issues or questions:
- Check Firebase documentation: https://firebase.google.com/docs/hosting
- Firebase support: https://firebase.google.com/support
- Project issues: Create an issue in the project repository

---

**Happy Deploying! 🚀**
