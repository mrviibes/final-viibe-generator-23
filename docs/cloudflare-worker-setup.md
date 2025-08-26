# Cloudflare Worker Setup for Ideogram CORS Proxy

This guide helps you deploy a Cloudflare Worker to bypass CORS restrictions for Ideogram API calls.

## Step 1: Create Cloudflare Worker

1. Go to [Cloudflare Workers](https://workers.cloudflare.com)
2. Sign up or log in to your account
3. Click "Create a Service"
4. Choose a name for your worker (e.g., "ideogram-proxy")
5. Click "Create service"

## Step 2: Deploy the Worker Code

1. Click "Quick edit" in your worker dashboard
2. Replace the default code with the code from `docs/cors-proxy-worker.js`
3. Click "Save and deploy"

## Step 3: Get Your Worker URL

After deployment, you'll see your worker URL:
```
https://your-worker-name.your-subdomain.workers.dev
```

Copy this URL - you'll need it for the next step.

## Step 4: Update Your App Configuration

1. Open `src/config/secrets.ts`
2. Replace the placeholder keys and proxy URL:

```javascript
// Replace with your actual API keys
const OPENAI_KEY_ENCODED = "sk-proj-your-actual-openai-key";
const IDEOGRAM_KEY_ENCODED = "your-actual-ideogram-key";

// Replace with your worker URL
const IDEOGRAM_PROXY_URL = "https://your-worker-name.your-subdomain.workers.dev";
```

## Step 5: Optional Security (Recommended)

For better security, store your Ideogram API key in Cloudflare instead of your frontend:

1. In your Cloudflare Workers dashboard, go to your worker
2. Click "Settings" → "Environment Variables"
3. Add a new variable:
   - Variable name: `IDEOGRAM_API_KEY`
   - Value: Your actual Ideogram API key
4. Click "Save"

If you do this, you can leave the `IDEOGRAM_KEY_ENCODED` empty in your frontend.

## Testing

Once deployed:
1. Your app will automatically use the hardcoded proxy URL
2. No more CORS errors when generating images
3. No need for runtime configuration

## Troubleshooting

- **Worker not responding**: Check the worker logs in Cloudflare dashboard
- **Still getting CORS errors**: Verify the proxy URL is correct in `src/config/secrets.ts`
- **API key errors**: Make sure your Ideogram API key is valid

## Security Note

⚠️ **Warning**: API keys in `src/config/secrets.ts` are visible to anyone who views your source code. For production apps, consider using the Cloudflare environment variable approach above.