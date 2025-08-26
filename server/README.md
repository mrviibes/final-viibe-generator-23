# Secure API Proxy Server

This server acts as a secure proxy for OpenAI and Ideogram API calls, keeping API keys server-side and hidden from the frontend.

## Setup

1. **Install dependencies:**
   ```bash
   cd server
   npm install
   ```

2. **Configure API keys:**
   ```bash
   cp .env.example .env
   # Edit .env and add your actual API keys
   ```

3. **Start the server:**
   ```bash
   npm run dev
   ```

## API Endpoints

- `GET /health` - Health check and key validation
- `POST /api/openai/chat` - OpenAI chat completions proxy
- `POST /api/ideogram/generate` - Ideogram image generation proxy

## Security Features

- ✅ API keys stored only in server environment variables
- ✅ Keys never exposed to frontend or network requests
- ✅ CORS enabled for frontend communication
- ✅ Error handling without key leakage

## Deployment

For production, deploy this server to:
- Railway, Render, or similar Node.js hosting
- Set environment variables in hosting platform
- Update frontend `SERVER_URL` to your deployed server URL