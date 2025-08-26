# 🔧 Hardcoded Setup Guide

This app is configured for hardcoded API keys and proxy setup - no runtime configuration needed!

## ⚡ Quick Setup (3 Steps)

### 1. Configure API Keys

Edit `src/config/secrets.ts` and replace the placeholder values:

```javascript
// Replace with your actual API keys
const OPENAI_KEY_ENCODED = "sk-proj-your-actual-openai-key-here";
const IDEOGRAM_KEY_ENCODED = "your-actual-ideogram-key-here";

// Replace with your Cloudflare Worker URL (see step 2)
const IDEOGRAM_PROXY_URL = "https://your-worker.your-subdomain.workers.dev";
```

### 2. Deploy Cloudflare Worker (CORS Proxy)

1. Go to [Cloudflare Workers](https://workers.cloudflare.com)
2. Create a new worker
3. Copy the code from `docs/cors-proxy-worker.js` 
4. Deploy and copy your worker URL
5. Update `IDEOGRAM_PROXY_URL` in `src/config/secrets.ts`

### 3. Deploy Your App

That's it! Your app now works with hardcoded configuration.

## 🔐 Get Your API Keys

- **OpenAI**: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Ideogram**: [ideogram.ai/api](https://ideogram.ai/api)

## 🛡️ Security Options

### Option A: Frontend Keys (Simple)
Keep API keys in `src/config/secrets.ts` - visible to users but works immediately.

### Option B: Cloudflare Environment (Secure)
1. In Cloudflare Workers dashboard → Settings → Environment Variables
2. Add `IDEOGRAM_API_KEY` with your key
3. Leave `IDEOGRAM_KEY_ENCODED` empty in the frontend

## 📚 Detailed Guides

- **Cloudflare Setup**: See `docs/cloudflare-worker-setup.md`
- **Legacy Proxy Guide**: See `docs/deploy-proxy-guide.md`

## ✅ What Changed

- ❌ Removed runtime settings UI
- ❌ Removed localStorage API key management
- ❌ Removed connectivity panels
- ✅ Hardcoded configuration in source
- ✅ Simplified deployment process
- ✅ No user configuration needed

## 🐛 Troubleshooting

- **Missing keys**: Edit `src/config/secrets.ts`
- **CORS errors**: Deploy Cloudflare Worker
- **Invalid keys**: Check OpenAI/Ideogram dashboards

---

**Note**: Keys in source code are visible to anyone. For production, use Cloudflare environment variables.