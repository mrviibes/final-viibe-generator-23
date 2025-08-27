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
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    const ideogramKey = Deno.env.get('IDEOGRAM_API_KEY');

    console.log('Health check:', { 
      openaiConfigured: !!openaiKey, 
      ideogramConfigured: !!ideogramKey 
    });

    const healthStatus = {
      status: 'healthy',
      keys: {
        openai: !!openaiKey,
        ideogram: !!ideogramKey,
      },
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(healthStatus), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in health function:', error);
    return new Response(JSON.stringify({ 
      status: 'error', 
      error: error.message,
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});