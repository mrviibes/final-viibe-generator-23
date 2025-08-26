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

const IDEOGRAM_API_BASE = 'https://api.ideogram.ai/generate';

export function hasIdeogramApiKey(): boolean {
  // Always return true since API keys are managed server-side
  return true;
}

export function isUsingBackend(): boolean {
  return true; // Always use backend for Ideogram to avoid CORS
}

export function getIdeogramApiKey(): string | null {
  // Not needed since API keys are managed server-side
  return null;
}

export function setIdeogramApiKey(key: string): void {
  // Not needed since API keys are managed server-side
}

export function removeIdeogramApiKey(): void {
  // Not needed since API keys are managed server-side
}

export async function generateIdeogramImage(request: IdeogramGenerateRequest): Promise<IdeogramGenerateResponse> {
  console.log('Ideogram generation request via Edge Function:', {
    prompt: request.prompt.substring(0, 100) + '...',
    aspect_ratio: request.aspect_ratio,
    model: request.model,
    count: request.count
  });

  try {
    const { data, error } = await supabase.functions.invoke('ideogram-generate', {
      body: request
    });

    if (error) {
      console.error('Ideogram Edge Function error:', error);
      throw new IdeogramAPIError(error.message || 'Image generation failed');
    }

    if (data.error) {
      console.error('Ideogram API error:', data.error);
      throw new IdeogramAPIError(data.error);
    }

    console.log('Ideogram API success via Edge Function');
    return data;
  } catch (error) {
    console.error('Error in generateIdeogramImage:', error);
    
    if (error instanceof IdeogramAPIError) {
      throw error;
    }
    
    throw new IdeogramAPIError(error instanceof Error ? error.message : 'Unknown error occurred');
  }
}