import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!openAIApiKey) {
    console.error('OPENAI_API_KEY not configured');
    return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { messages, options = {} } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Invalid messages format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const {
      temperature = 0.8,
      max_tokens = 2500,
      max_completion_tokens,
      model = 'gpt-5-mini-2025-08-07',
      response_format
    } = options;

    console.log(`OpenAI API call - Model: ${model}, Messages: ${messages.length}`);

    // Determine if this is a GPT-5 model for parameter handling
    const isGPT5Model = model?.startsWith('gpt-5');
    const tokenLimit = max_completion_tokens || max_tokens;
    const tokenParameter = isGPT5Model ? 'max_completion_tokens' : 'max_tokens';

    // Build request body
    const requestBody: any = {
      model,
      messages,
      [tokenParameter]: tokenLimit
    };

    // Add response format if specified
    if (response_format) {
      requestBody.response_format = response_format;
    }

    // Only add temperature for non-GPT5 models
    if (!isGPT5Model) {
      requestBody.temperature = temperature;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error (${response.status}):`, errorText);
      
      let errorMessage = 'OpenAI API request failed';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      return new Response(JSON.stringify({ 
        error: errorMessage,
        status: response.status 
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    
    console.log(`OpenAI API success - Model: ${model}, Usage: ${JSON.stringify(data.usage || {})}`);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in openai-chat function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});