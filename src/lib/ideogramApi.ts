import { supabase } from "@/integrations/supabase/client";

export interface IdeogramGenerateRequest {
  prompt: string;
  aspect_ratio: 'ASPECT_10_16' | 'ASPECT_16_10' | 'ASPECT_9_16' | 'ASPECT_16_9' | 'ASPECT_3_2' | 'ASPECT_2_3' | 'ASPECT_4_3' | 'ASPECT_3_4' | 'ASPECT_1_1' | 'ASPECT_1_3' | 'ASPECT_3_1';
  model: 'V_3';
  magic_prompt_option: 'AUTO' | 'OFF';
  seed?: number;
  style_type?: 'AUTO' | 'GENERAL' | 'REALISTIC' | 'DESIGN' | 'RENDER_3D' | 'ANIME';
  count?: number;
}

export interface IdeogramGenerateResponse {
  success: boolean;
  images?: Array<{
    prompt: string;
    resolution: string;
    url: string;
    is_image_safe: boolean;
  }>;
  message?: string;
}

export class IdeogramAPIError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'IdeogramAPIError';
  }
}

export function hasIdeogramApiKey(): boolean {
  return true; // Always true since keys are stored server-side
}

export function isUsingBackend(): boolean {
  return true; // Always use backend edge function
}

export async function generateIdeogramImage(request: IdeogramGenerateRequest): Promise<IdeogramGenerateResponse> {
  console.log('Starting Ideogram image generation via Supabase Edge Function:', request);
  
  try {
    const payload = {
      prompt: request.prompt,
      aspect_ratio: request.aspect_ratio,
      model: 'V_3', // Always use V3
      magic_prompt_option: request.magic_prompt_option,
      ...(request.seed !== undefined && { seed: request.seed }),
      ...(request.style_type && { style_type: request.style_type }),
      ...(request.count && { count: request.count })
    };

    const { data, error } = await supabase.functions.invoke('ideogram-generate', {
      body: payload
    });

    if (error) {
      console.error('Supabase edge function error:', error);
      throw new IdeogramAPIError(
        error.message || 'Failed to generate image via edge function',
        'EDGE_FUNCTION_ERROR'
      );
    }

    if (!data) {
      throw new IdeogramAPIError('No data received from edge function', 'NO_DATA');
    }

    if (!data.success) {
      throw new IdeogramAPIError(
        data.message || 'Image generation failed',
        'GENERATION_FAILED'
      );
    }

    return {
      success: true,
      images: data.data || data.images,
      message: data.message || 'Images generated successfully'
    };
  } catch (error) {
    if (error instanceof IdeogramAPIError) {
      throw error;
    }
    
    console.error('Unexpected error in generateIdeogramImage:', error);
    throw new IdeogramAPIError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      'UNKNOWN_ERROR'
    );
  }
}