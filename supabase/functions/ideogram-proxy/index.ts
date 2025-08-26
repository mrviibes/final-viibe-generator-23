import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ideogramApiKey = Deno.env.get('IDEOGRAM_API_KEY');
    if (!ideogramApiKey) {
      throw new Error('Ideogram API key not configured on server');
    }

    const { endpoint, method = 'POST', body, headers: customHeaders = {} } = await req.json();
    
    // Validate endpoint to prevent misuse
    const allowedEndpoints = [
      'https://api.ideogram.ai/generate',
      'https://api.ideogram.ai/models'
    ];
    
    if (!allowedEndpoints.some(allowed => endpoint.startsWith(allowed))) {
      throw new Error('Endpoint not allowed');
    }

    console.log(`Ideogram Proxy: ${method} ${endpoint}`);

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Api-Key': ideogramApiKey,
        'Content-Type': 'application/json',
        ...customHeaders,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Ideogram API Error:', data);
      throw new Error(data.error?.message || 'Ideogram API request failed');
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in Ideogram proxy:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      type: 'proxy_error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});