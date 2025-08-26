/**
 * DEPLOYMENT OPTION 1: Cloudflare Workers (Recommended)
 * 
 * 1. Go to https://workers.cloudflare.com
 * 2. Create account and click "Create a Worker"
 * 3. Replace the default code with this:
 */

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const body = await request.text();
    const apiKey = request.headers.get('X-API-Key');
    
    if (!apiKey) {
      return new Response(JSON.stringify({ 
        error: { message: 'API key required in X-API-Key header' }
      }), { 
        status: 401,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    try {
      const response = await fetch('https://api.ideogram.ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': apiKey,
        },
        body: body,
      });

      const responseData = await response.text();
      
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

/**
 * DEPLOYMENT OPTION 2: Netlify Functions (Alternative)
 * 
 * Create netlify/functions/ideogram-proxy.js:
 */

/*
exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const apiKey = event.headers['x-api-key'];
  if (!apiKey) {
    return {
      statusCode: 401,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: { message: 'API key required' } }),
    };
  }

  try {
    const response = await fetch('https://api.ideogram.ai/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': apiKey,
      },
      body: event.body,
    });

    const data = await response.text();
    
    return {
      statusCode: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: data,
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: { message: 'Proxy error: ' + error.message } }),
    };
  }
};
*/

/**
 * AFTER DEPLOYMENT:
 * 
 * 1. Copy your worker/function URL 
 * 2. In your app, go to Settings → Ideogram Proxy URL
 * 3. Paste the URL (e.g., https://your-worker.your-subdomain.workers.dev)
 * 4. Save and test - CORS errors will be resolved!
 */