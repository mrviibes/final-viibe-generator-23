import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ideogramApiKey = Deno.env.get('IDEOGRAM_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const IDEOGRAM_API_BASE = 'https://api.ideogram.ai/generate';
const IDEOGRAM_API_V3_BASE = 'https://api.ideogram.ai/v3/images';
const IDEOGRAM_API_V3_ALT_BASE = 'https://api.ideogram.ai/v3/images/text-to-image';

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

    // Use requested model, with fallback logic for V_3 if needed
    let modelToUse = request.model;
    let shouldRetryWithTurbo = false;
    let v3Attempts = 0;
    let endpointUsed = '';

    const count = request.count || 1;
    console.log(`Ideogram API call - Model: ${modelToUse}, Count: ${count}, Prompt: EXACT TEXT: "${request.prompt.substring(0, 80)}..."`);

    if (count === 1) {
      // Single image generation with V3 endpoint support
      let response: Response;
      let payload: any;
      let requestBody: string | FormData;
      let headers: Record<string, string>;

      if (modelToUse === 'V_3') {
        // Try V3 endpoint with enhanced fallback logic
        console.log('Using V3 endpoint for V_3 model');
        endpointUsed = 'v3-primary';
        
        const formData = new FormData();
        formData.append('prompt', request.prompt);
        formData.append('resolution', mapAspectRatioToResolution(request.aspect_ratio));
        
        if (request.seed !== undefined) {
          formData.append('seed', request.seed.toString());
        }
        
        if (request.style_type && request.style_type !== 'AUTO') {
          formData.append('style_type', request.style_type);
        }

        headers = {
          'Api-Key': ideogramApiKey,
        };
        requestBody = formData;
        v3Attempts++;

        response = await fetch(IDEOGRAM_API_V3_BASE, {
          method: 'POST',
          headers,
          body: requestBody,
        });

        // If primary V3 fails with 404, try alternate V3 endpoint
        if (!response.ok && response.status === 404 && v3Attempts === 1) {
          console.log('⚠️ Primary V3 endpoint returned 404, trying alternate V3 route');
          endpointUsed = 'v3-alternate';
          v3Attempts++;
          
          response = await fetch(IDEOGRAM_API_V3_ALT_BASE, {
            method: 'POST',
            headers,
            body: requestBody,
          });
        }
      } else {
        // Use legacy endpoint for other models
        console.log('Using legacy endpoint for model:', modelToUse);
        endpointUsed = 'legacy';
        
        payload = {
          prompt: request.prompt,
          aspect_ratio: request.aspect_ratio,
          model: modelToUse,
          magic_prompt_option: request.magic_prompt_option,
        };
        
        if (request.seed !== undefined) {
          payload.seed = request.seed;
        }
        
        if (request.style_type) {
          payload.style_type = request.style_type;
        }

        headers = {
          'Api-Key': ideogramApiKey,
          'Content-Type': 'application/json',
        };
        requestBody = JSON.stringify({ image_request: payload });

        response = await fetch(IDEOGRAM_API_BASE, {
          method: 'POST',
          headers,
          body: requestBody,
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Ideogram API error (${response.status}) from ${endpointUsed}:`, errorText);
        
        // Enhanced fallback conditions for V_3
        if (modelToUse === 'V_3' && (
          response.status === 404 || 
          response.status === 400 || 
          response.status === 500 || 
          response.status === 502 || 
          response.status === 503
        )) {
          console.log(`⚠️ V_3 failed with ${response.status} after ${v3Attempts} attempt(s), attempting fallback to V_2A_TURBO`);
          shouldRetryWithTurbo = true;
        } else {
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
          } else if (response.status === 404 && modelToUse === 'V_3') {
            errorMessage = 'V3 endpoint not found. Ideogram V3 may be temporarily unavailable.';
          }

          return new Response(JSON.stringify({ 
            error: errorMessage,
            status: response.status,
            endpoint_used: endpointUsed,
            v3_attempts: v3Attempts
          }), {
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      if (!shouldRetryWithTurbo) {
        const data = await response.json();
        console.log(`Ideogram API success - Generated ${data.data?.length || 0} image(s) with model ${modelToUse}`);
        
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Retry with Turbo if V_3 failed
      if (shouldRetryWithTurbo) {
        console.log('Retrying with V_2A_TURBO model on legacy endpoint...');
        modelToUse = 'V_2A_TURBO';
        
        const fallbackPayload: any = {
          prompt: request.prompt,
          aspect_ratio: request.aspect_ratio,
          model: modelToUse,
          magic_prompt_option: request.magic_prompt_option,
        };
        
        if (request.seed !== undefined) {
          fallbackPayload.seed = request.seed;
        }
        
        if (request.style_type) {
          fallbackPayload.style_type = request.style_type;
        }

        const fallbackRequestBody = JSON.stringify({ image_request: fallbackPayload });

        const fallbackResponse = await fetch(IDEOGRAM_API_BASE, {
          method: 'POST',
          headers: {
            'Api-Key': ideogramApiKey,
            'Content-Type': 'application/json',
          },
          body: fallbackRequestBody,
        });

        if (!fallbackResponse.ok) {
          const errorText = await fallbackResponse.text();
          console.error(`Fallback to Turbo also failed (${fallbackResponse.status}):`, errorText);
          
          let errorMessage = `HTTP ${fallbackResponse.status}`;
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error?.message || errorMessage;
          } catch {
            errorMessage = errorText || errorMessage;
          }

          return new Response(JSON.stringify({ 
            error: `V3 failed, Turbo fallback also failed: ${errorMessage}`,
            status: fallbackResponse.status 
          }), {
            status: fallbackResponse.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const fallbackData = await fallbackResponse.json();
        console.log(`Fallback success - Generated ${fallbackData.data?.length || 0} image(s) with Turbo`);
        
        // Add a note about the fallback
        return new Response(JSON.stringify({
          ...fallbackData,
          _fallback_note: 'V3 had an issue; used Turbo instead'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      // Multiple image generation
      const promises: Promise<any>[] = [];
      
      for (let i = 0; i < count; i++) {
        // For batch generation, always use legacy endpoint (V3 doesn't support batch well)
        const effectiveModel = modelToUse === 'V_3' ? 'V_2A_TURBO' : modelToUse;
        if (modelToUse === 'V_3' && i === 0) {
          console.log('Using V_2A_TURBO for batch generation instead of V_3');
        }
        
        const payload: any = {
          prompt: request.prompt,
          aspect_ratio: request.aspect_ratio,
          model: effectiveModel,
          magic_prompt_option: request.magic_prompt_option,
        };
        
        if (request.seed !== undefined) {
          payload.seed = request.seed + i; // Vary seed for different results
        }
        
        if (request.style_type) {
          payload.style_type = request.style_type;
        }

        const requestBody = JSON.stringify({ image_request: payload });

        promises.push(
          fetch(IDEOGRAM_API_BASE, {
            method: 'POST',
            headers: {
              'Api-Key': ideogramApiKey,
              'Content-Type': 'application/json',
            },
            body: requestBody,
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

// Helper function to map aspect ratio to V3 resolution format
function mapAspectRatioToResolution(aspectRatio: string): string {
  const resolutionMap: Record<string, string> = {
    'ASPECT_1_1': '1024x1024',
    'ASPECT_10_16': '832x1216',
    'ASPECT_16_10': '1216x832',
    'ASPECT_9_16': '896x1152',
    'ASPECT_16_9': '1152x896',
    'ASPECT_3_2': '1216x832',
    'ASPECT_2_3': '832x1216',
    'ASPECT_4_3': '1152x896',
    'ASPECT_3_4': '896x1152',
    'ASPECT_1_3': '832x1216',
    'ASPECT_3_1': '1216x832'
  };
  
  return resolutionMap[aspectRatio] || '1024x1024';
}