# Server Deployment Guide

## Quick Deployment Options

### Option 1: Railway (Recommended)
1. Push your `server/` folder to a GitHub repository
2. Visit [railway.app](https://railway.app) and connect your GitHub
3. Deploy from the `server/` folder
4. Add environment variables in Railway dashboard:
   - `OPENAI_API_KEY=your-actual-key`
   - `IDEOGRAM_API_KEY=your-actual-key`
   - `ALLOWED_ORIGINS=https://your-lovable-preview-url.com`
5. Get your Railway URL (e.g., `https://your-app.railway.app`)

### Option 2: Render
1. Push `server/` to GitHub
2. Visit [render.com](https://render.com) → New Web Service
3. Connect your repository, set:
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Add environment variables in Render dashboard
5. Get your Render URL

### Option 3: Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. In `server/` folder: `vercel`
3. Add environment variables: `vercel env add`
4. Deploy: `vercel --prod`

## Configure Frontend

The frontend is pre-configured to use:
- `http://localhost:3001` for local development 
- `https://your-api-server.com` for production

**IMPORTANT**: Update the hardcoded production URL in these files:
- `src/lib/ideogramClient.ts` (line 5)
- `src/lib/openaiClient.ts` (line 5) 
- `src/lib/serverHealth.ts` (line 3)

Replace `https://your-api-server.com` with your actual deployed server URL.

## Security Checklist

- ✅ API keys are only in server environment variables
- ✅ CORS is configured with specific origins
- ✅ Server validates all requests
- ✅ No keys exposed in frontend code or network requests

## Testing

Test your deployment:
```bash
curl https://your-server-url.com/health
```

Should return server status and confirm keys are configured.