import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ideogramApiKey = Deno.env.get('IDEOGRAM_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const IDEOGRAM_API_BASE = 'https://api.ideogram.ai/generate';

interface IdeogramGenerateRequest {
  prompt: string;
  aspect_ratio: 'ASPECT_10_16' | 'ASPECT_16_10' | 'ASPECT_9_16' | 'ASPECT_16_9' | 'ASPECT_3_2' | 'ASPECT_2_3' | 'ASPECT_4_3' | 'ASPECT_3_4' | 'ASPECT_1_1' | 'ASPECT_1_3' | 'ASPECT_3_1';
  model: 'V_1' | 'V_1_TURBO' | 'V_2' | 'V_2_TURBO' | 'V_2A' | 'V_2A_TURBO' | 'V_3';
  magic_prompt_option: 'AUTO';
  seed?: number;
  style_type?: 'AUTO' | 'GENERAL' | 'REALISTIC' | 'DESIGN' | 'RENDER_3D' | 'ANIME';
  count?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!ideogramApiKey) {
    console.error('IDEOGRAM_API_KEY not configured');
    return new Response(JSON.stringify({ error: 'Ideogram API key not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const request: IdeogramGenerateRequest = await req.json();

    if (!request.prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const count = request.count || 1;
    console.log(`Ideogram API call - Model: ${request.model}, Count: ${count}, Prompt: ${request.prompt.substring(0, 50)}...`);

    if (count === 1) {
      // Single image generation (existing logic)
      const payload: any = {
        prompt: request.prompt,
        aspect_ratio: request.aspect_ratio,
        model: request.model,
        magic_prompt_option: request.magic_prompt_option,
      };
      
      if (request.seed !== undefined) {
        payload.seed = request.seed;
      }
      
      if (request.style_type) {
        payload.style_type = request.style_type;
      }

      const requestBody = JSON.stringify({ image_request: payload });

      const response = await fetch(IDEOGRAM_API_BASE, {
        method: 'POST',
        headers: {
          'Api-Key': ideogramApiKey,
          'Content-Type': 'application/json',
        },
        body: requestBody,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Ideogram API error (${response.status}):`, errorText);
        
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error?.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }

        // Handle specific error cases
        if (response.status === 400 && errorText.includes('content_filtering')) {
          errorMessage = 'Content was filtered by Ideogram. Try rephrasing your prompt.';
        } else if (response.status === 429) {
          errorMessage = 'Rate limit exceeded. Please try again later.';
        } else if (response.status === 401) {
          errorMessage = 'Invalid API key. Please check your Ideogram API key.';
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
      console.log(`Ideogram API success - Generated ${data.data?.length || 0} image(s)`);
      
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      // Multiple image generation with sequential retry logic
      const results: any[] = [];
      let successCount = 0;
      
      // Generate images sequentially with retry for better reliability
      for (let i = 0; i < count; i++) {
        const payload: any = {
          prompt: request.prompt,
          aspect_ratio: request.aspect_ratio,
          model: request.model,
          magic_prompt_option: request.magic_prompt_option,
        };
        
        if (request.seed !== undefined) {
          payload.seed = request.seed + i; // Vary seed for different results
        }
        
        if (request.style_type) {
          payload.style_type = request.style_type;
        }

        const requestBody = JSON.stringify({ image_request: payload });

        // Retry logic for each individual image
        let retryCount = 0;
        const maxRetries = 2;
        let imageSuccess = false;

        while (retryCount <= maxRetries && !imageSuccess) {
          try {
            if (retryCount > 0) {
              // Add delay between retries
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
              console.log(`Retrying image ${i + 1}, attempt ${retryCount + 1}/${maxRetries + 1}`);
            }

            const response = await fetch(IDEOGRAM_API_BASE, {
              method: 'POST',
              headers: {
                'Api-Key': ideogramApiKey,
                'Content-Type': 'application/json',
              },
              body: requestBody,
            });

            if (!response.ok) {
              const errorText = await response.text();
              console.error(`Ideogram API error for image ${i + 1}, attempt ${retryCount + 1} (${response.status}):`, errorText);
              
              // Don't retry on certain errors
              if (response.status === 401 || response.status === 403) {
                break;
              }
              
              retryCount++;
              continue;
            }

            const result = await response.json();
            if (result.data && Array.isArray(result.data)) {
              results.push(...result.data);
              successCount++;
              imageSuccess = true;
              console.log(`Successfully generated image ${i + 1}/${count}`);
            }
          } catch (error) {
            console.error(`Network error for image ${i + 1}, attempt ${retryCount + 1}:`, error);
            retryCount++;
          }
        }

        // Add small delay between requests to avoid rate limiting
        if (i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      if (results.length === 0) {
        return new Response(JSON.stringify({ 
          error: 'All image generation attempts failed',
          status: 500 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`Ideogram API batch success - Generated ${results.length}/${count} images (${successCount} successful requests)`);
      
      return new Response(JSON.stringify({
        created: new Date().toISOString(),
        data: results
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }


  } catch (error) {
    console.error('Error in ideogram-generate function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});