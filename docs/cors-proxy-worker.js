/**
 * Cloudflare Worker to proxy Ideogram API requests and bypass CORS
 * 
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Go to https://workers.cloudflare.com
 * 2. Create a new worker
 * 3. Replace the default code with this file
 * 4. Deploy the worker
 * 5. Copy the worker URL (e.g., https://your-worker.your-subdomain.workers.dev)
 * 6. In your app, go to Settings → Ideogram Proxy URL and paste the worker URL
 * 
 * OPTIONAL SECURITY (Recommended):
 * - In Cloudflare Workers dashboard, go to Settings → Environment Variables
 * - Add IDEOGRAM_API_KEY with your actual Ideogram API key
 * - This way your API key is stored securely on Cloudflare, not in your frontend
 */

export default {
  async fetch(request, env, ctx) {
    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Parse the request
    const body = await request.text();
    
    // Get API key from environment variable or request header
    const apiKey = env.IDEOGRAM_API_KEY || request.headers.get('X-API-Key');
    
    if (!apiKey) {
      return new Response(JSON.stringify({ 
        error: { message: 'API key required. Set IDEOGRAM_API_KEY environment variable or send X-API-Key header.' }
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      // Forward request to Ideogram API
      const response = await fetch('https://api.ideogram.ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': apiKey,
        },
        body: body,
      });

      // Get response data
      const responseData = await response.text();
      
      // Return response with CORS headers
      return new Response(responseData, {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
        },
      });
      
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: { message: 'Proxy error: ' + error.message }
      }), { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }
  },
};