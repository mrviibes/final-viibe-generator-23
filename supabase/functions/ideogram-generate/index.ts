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
  magic_prompt_option: 'AUTO' | 'OFF';
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

    // Always use the requested model (V_3)
    const modelToUse = request.model;

    const count = request.count || 1;
    console.log(`Ideogram API call - Model: ${modelToUse}, Count: ${count}, Prompt: ${request.prompt.substring(0, 50)}...`);

    if (count === 1) {
      // Single image generation with FormData for V3 API
      const formData = new FormData();
      formData.append('prompt', request.prompt);
      formData.append('aspect_ratio', request.aspect_ratio);
      formData.append('model', modelToUse);
      formData.append('magic_prompt', request.magic_prompt_option);
      
      if (request.seed !== undefined) {
        formData.append('seed', request.seed.toString());
      }
      
      if (request.style_type) {
        formData.append('style_type', request.style_type);
      }

      const response = await fetch(IDEOGRAM_API_BASE, {
        method: 'POST',
        headers: {
          'Api-Key': ideogramApiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Ideogram API error (${response.status}):`, errorText);
        
        {
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
      }

      const data = await response.json();
      console.log(`Ideogram API success - Generated ${data.data?.length || 0} image(s) with model ${modelToUse}`);
      
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      // Multiple image generation with FormData for V3 API
      const promises: Promise<any>[] = [];
      
      for (let i = 0; i < count; i++) {
        const formData = new FormData();
        formData.append('prompt', request.prompt);
        formData.append('aspect_ratio', request.aspect_ratio);
        formData.append('model', modelToUse);
        formData.append('magic_prompt', request.magic_prompt_option);
        
        if (request.seed !== undefined) {
          formData.append('seed', (request.seed + i).toString()); // Vary seed for different results
        }
        
        if (request.style_type) {
          formData.append('style_type', request.style_type);
        }

        promises.push(
          fetch(IDEOGRAM_API_BASE, {
            method: 'POST',
            headers: {
              'Api-Key': ideogramApiKey,
            },
            body: formData,
          }).then(async (response) => {
            if (!response.ok) {
              const errorText = await response.text();
              console.error(`Ideogram API error for image ${i + 1} (${response.status}):`, errorText);
              return null; // Return null for failed images
            }
            return response.json();
          }).catch((error) => {
            console.error(`Network error for image ${i + 1}:`, error);
            return null;
          })
        );
      }

      const results = await Promise.all(promises);
      const successfulResults = results.filter(result => result !== null);
      
      if (successfulResults.length === 0) {
        return new Response(JSON.stringify({ 
          error: 'All image generation attempts failed',
          status: 500 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Combine all successful results
      const combinedData: any[] = [];
      successfulResults.forEach(result => {
        if (result.data && Array.isArray(result.data)) {
          combinedData.push(...result.data);
        }
      });

      console.log(`Ideogram API batch success - Generated ${combinedData.length}/${count} images`);
      
      return new Response(JSON.stringify({
        created: successfulResults[0]?.created || new Date().toISOString(),
        data: combinedData
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