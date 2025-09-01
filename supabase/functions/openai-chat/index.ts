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
      model = 'gpt-4.1-2025-04-14',
      response_format
    } = options;

    console.log(`OpenAI API call - Model: ${model}, Messages: ${messages.length}`);

    // Determine model type for parameter handling
    const isGPT5Model = model?.startsWith('gpt-5');
    const isO3Model = model?.startsWith('o3');
    const isGPT41OrO4 = model?.startsWith('gpt-4.1') || model?.startsWith('o4');
    const isOlderGPT4 = model?.includes('gpt-4o') && !model?.includes('gpt-4.1');
    
    const tokenLimit = max_completion_tokens || max_tokens;
    
    // Use appropriate token parameter based on model
    let tokenParameter = 'max_tokens';
    if (isGPT5Model || isGPT41OrO4 || isO3Model) {
      tokenParameter = 'max_completion_tokens';
    }

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

    // Only older GPT-4o models support temperature (gpt-4o, gpt-4o-mini)
    // GPT-5, GPT-4.1, O3, and O4 models don't support temperature
    if (isOlderGPT4) {
      requestBody.temperature = temperature;
    }
    
    console.log(`OpenAI request parameters - Model: ${model}, Token param: ${tokenParameter}, Temperature: ${isOlderGPT4 ? temperature : 'not supported'}`);

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

    // Check if response was truncated and retry with higher token limit
    const finishReason = data.choices?.[0]?.finish_reason;
    const content = data.choices?.[0]?.message?.content;
    
    if (finishReason === 'length' && tokenLimit < 600) {
      console.log(`Response truncated (finish_reason: length), retrying with higher token limit...`);
      
      // Retry with higher token limit
      const retryTokenLimit = Math.min(600, tokenLimit + 200);
      const retryRequestBody: any = {
        model,
        messages,
        [tokenParameter]: retryTokenLimit
      };

      // Add response format if specified
      if (response_format) {
        retryRequestBody.response_format = response_format;
      }

      // Only older GPT-4o models support temperature
      if (isOlderGPT4) {
        retryRequestBody.temperature = temperature;
      }
      
      console.log(`Retrying with ${retryTokenLimit} tokens...`);

      const retryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(retryRequestBody),
      });

      if (retryResponse.ok) {
        const retryData = await retryResponse.json();
        console.log(`Retry successful - Model: ${model}, Usage: ${JSON.stringify(retryData.usage || {})}`);
        return new Response(JSON.stringify(retryData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        console.error(`Retry failed with status ${retryResponse.status}, using original response`);
      }
    }

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