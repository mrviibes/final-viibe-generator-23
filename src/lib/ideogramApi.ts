import { HARDCODED_API_KEYS, hasHardcodedIdeogramKey } from "@/config/secrets";

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

const IDEOGRAM_API_BASE = 'https://api.ideogram.ai/generate';

export function hasIdeogramApiKey(): boolean {
  return hasHardcodedIdeogramKey() || Boolean(localStorage.getItem('ideogram_api_key'));
}

export function isUsingBackend(): boolean {
  return false; // Direct client-side API calls
}

export function getIdeogramApiKey(): string | null {
  if (hasHardcodedIdeogramKey()) {
    return HARDCODED_API_KEYS.IDEOGRAM_API_KEY || null;
  }
  return localStorage.getItem('ideogram_api_key');
}

export function setIdeogramApiKey(key: string): void {
  localStorage.setItem('ideogram_api_key', key);
}

export function removeIdeogramApiKey(): void {
  localStorage.removeItem('ideogram_api_key');
}

export async function generateIdeogramImage(request: IdeogramGenerateRequest): Promise<IdeogramGenerateResponse> {
  console.log('Starting Ideogram image generation with V3 API:', request);
  
  const apiKey = getIdeogramApiKey();
  if (!apiKey) {
    throw new IdeogramAPIError('No Ideogram API key found. Please set your API key.', 'NO_API_KEY');
  }

  try {
    const count = request.count || 1;
    
    if (count === 1) {
      // Single image generation with FormData for V3 API
      const formData = new FormData();
      formData.append('prompt', request.prompt);
      formData.append('aspect_ratio', request.aspect_ratio);
      formData.append('model', 'V_3'); // Always use V3
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
          'Api-Key': apiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Ideogram API error:', response.status, errorText);
        
        let errorMessage = 'Failed to generate image';
        if (response.status === 401) {
          errorMessage = 'Invalid API key. Please check your Ideogram API key.';
        } else if (response.status === 429) {
          errorMessage = 'Rate limit exceeded. Please try again later.';
        }
        
        throw new IdeogramAPIError(
          errorMessage,
          `HTTP_${response.status}`
        );
      }

      const data = await response.json();
      
      return {
        success: true,
        images: data.data || [],
        message: 'Image generated successfully'
      };
    } else {
      // Multiple image generation - generate them sequentially
      const allImages: any[] = [];
      
      for (let i = 0; i < count; i++) {
        const formData = new FormData();
        formData.append('prompt', request.prompt);
        formData.append('aspect_ratio', request.aspect_ratio);
        formData.append('model', 'V_3');
        formData.append('magic_prompt', request.magic_prompt_option);
        
        if (request.seed !== undefined) {
          formData.append('seed', (request.seed + i).toString()); // Vary seed for different results
        }
        
        if (request.style_type) {
          formData.append('style_type', request.style_type);
        }

        const response = await fetch(IDEOGRAM_API_BASE, {
          method: 'POST',
          headers: {
            'Api-Key': apiKey,
          },
          body: formData,
        });

        if (!response.ok) {
          console.warn(`Failed to generate image ${i + 1}/${count}`);
          continue; // Skip this one and continue
        }

        const data = await response.json();
        if (data.data && data.data.length > 0) {
          allImages.push(...data.data);
        }
      }

      return {
        success: true,
        images: allImages,
        message: `Generated ${allImages.length} images successfully`
      };
    }
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