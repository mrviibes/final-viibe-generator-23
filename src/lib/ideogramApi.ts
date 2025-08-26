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

const IDEOGRAM_API_V3_ENDPOINT = 'https://api.ideogram.ai/generate';
const IDEOGRAM_API_LEGACY_ENDPOINT = 'https://api.ideogram.ai/generate';

import { HARDCODED_API_KEYS, hasHardcodedIdeogramKey } from '@/config/secrets';

const IDEOGRAM_API_KEY_STORAGE = 'ideogram_api_key';

export function hasIdeogramApiKey(): boolean {
  return hasHardcodedIdeogramKey() || !!localStorage.getItem(IDEOGRAM_API_KEY_STORAGE);
}

export function isUsingBackend(): boolean {
  return false; // Direct frontend calls
}

export function getIdeogramApiKey(): string | null {
  // Use hardcoded key first, fallback to localStorage
  if (hasHardcodedIdeogramKey()) {
    return HARDCODED_API_KEYS.IDEOGRAM_API_KEY!;
  }
  return localStorage.getItem(IDEOGRAM_API_KEY_STORAGE);
}

export function setIdeogramApiKey(key: string): void {
  localStorage.setItem(IDEOGRAM_API_KEY_STORAGE, key);
}

export function removeIdeogramApiKey(): void {
  localStorage.removeItem(IDEOGRAM_API_KEY_STORAGE);
}

export async function generateIdeogramImage(request: IdeogramGenerateRequest): Promise<IdeogramGenerateResponse> {
  const apiKey = getIdeogramApiKey();
  if (!apiKey) {
    throw new IdeogramAPIError('Ideogram API key not found. Please add your API key.');
  }

  console.log('Ideogram generation request (direct API):', {
    prompt: request.prompt.substring(0, 100) + '...',
    aspect_ratio: request.aspect_ratio,
    model: request.model,
    count: request.count
  });

  // Try V3 API first (JSON format)
  try {
    const response = await fetch(IDEOGRAM_API_V3_ENDPOINT, {
      method: 'POST',
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_request: {
          prompt: request.prompt,
          aspect_ratio: request.aspect_ratio,
          model: request.model,
          magic_prompt_option: request.magic_prompt_option,
          seed: request.seed,
          style_type: request.style_type || 'AUTO',
        },
        count: request.count || 1,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Ideogram V3 API success');
      return {
        success: true,
        images: data.data?.map((item: any) => ({
          prompt: item.prompt,
          resolution: item.resolution,
          url: item.url,
          is_image_safe: item.is_image_safe,
        })) || [],
      };
    }

    console.log('V3 API failed, trying legacy format...');
  } catch (error) {
    console.log('V3 API error, trying legacy format:', error);
  }

  // Fallback to legacy API (multipart/form-data)
  try {
    const formData = new FormData();
    formData.append('prompt', request.prompt);
    formData.append('aspect_ratio', request.aspect_ratio);
    formData.append('model', request.model);
    formData.append('magic_prompt_option', request.magic_prompt_option);
    if (request.seed) formData.append('seed', request.seed.toString());
    if (request.style_type) formData.append('style_type', request.style_type);
    if (request.count) formData.append('count', request.count.toString());

    const response = await fetch(IDEOGRAM_API_LEGACY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Api-Key': apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ideogram API error:', response.status, errorText);
      throw new IdeogramAPIError(`Ideogram API error (${response.status}): ${errorText || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log('Ideogram legacy API success');
    
    // Normalize legacy response format
    return {
      success: true,
      images: data.data?.map((item: any) => ({
        prompt: item.prompt,
        resolution: item.resolution,
        url: item.url,
        is_image_safe: item.is_image_safe,
      })) || [],
    };
  } catch (error) {
    console.error('Error in generateIdeogramImage:', error);
    
    if (error instanceof IdeogramAPIError) {
      throw error;
    }
    
    throw new IdeogramAPIError(error instanceof Error ? error.message : 'Unknown error occurred');
  }
}