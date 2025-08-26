import { supabase } from "@/integrations/supabase/client";

const IDEOGRAM_API_BASE = 'https://api.ideogram.ai/generate';

export interface ProxySettings {
  type: 'direct' | 'cors-anywhere' | 'proxy-cors-sh' | 'allorigins' | 'thingproxy';
  apiKey?: string; // For proxy.cors.sh
}

const PROXY_CONFIGS = {
  'direct': '',
  'cors-anywhere': 'https://cors-anywhere.herokuapp.com/',
  'proxy-cors-sh': 'https://proxy.cors.sh/',
  'allorigins': 'https://api.allorigins.win/raw?url=',
  'thingproxy': 'https://thingproxy.freeboard.io/fetch/'
};

export interface IdeogramGenerateRequest {
  prompt: string;
  aspect_ratio: 'ASPECT_10_16' | 'ASPECT_16_10' | 'ASPECT_9_16' | 'ASPECT_16_9' | 'ASPECT_3_2' | 'ASPECT_2_3' | 'ASPECT_4_3' | 'ASPECT_3_4' | 'ASPECT_1_1' | 'ASPECT_1_3' | 'ASPECT_3_1';
  model: 'V_1' | 'V_1_TURBO' | 'V_2' | 'V_2_TURBO' | 'V_2A' | 'V_2A_TURBO' | 'V_3';
  magic_prompt_option: 'AUTO';
  seed?: number;
  style_type?: 'AUTO' | 'GENERAL' | 'REALISTIC' | 'DESIGN' | 'RENDER_3D' | 'ANIME';
  count?: number;
}

export interface IdeogramGenerateResponse {
  created: string;
  data: Array<{
    prompt: string;
    resolution: string;
    url: string;
    is_image_safe: boolean;
  }>;
}

export class IdeogramAPIError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'IdeogramAPIError';
  }
}

// Backend-only mode: No API key or proxy handling needed
console.info("Ideogram Service: Using Supabase backend for all API calls");

export function hasIdeogramApiKey(): boolean {
  return true; // Always available via Supabase backend
}

export function isUsingBackend(): boolean {
  return true; // Always using backend
}

// Deprecated functions for backward compatibility (no-op)
export function setIdeogramApiKey(_key: string) {
  console.warn("setIdeogramApiKey is deprecated - using Supabase backend");
}

export function getProxySettings(): ProxySettings {
  return { type: 'direct' }; // Default for compatibility
}

export function setProxySettings(_settings: ProxySettings) {
  console.warn("setProxySettings is deprecated - using Supabase backend");
}

// Deprecated proxy functions for backward compatibility
export async function testProxyConnection(_proxyType: ProxySettings['type']): Promise<boolean> {
  console.warn("testProxyConnection is deprecated - using Supabase backend");
  return true;
}

export async function findBestProxy(): Promise<ProxySettings['type']> {
  console.warn("findBestProxy is deprecated - using Supabase backend");
  return 'direct';
}

export async function generateIdeogramImage(request: IdeogramGenerateRequest): Promise<IdeogramGenerateResponse> {
  console.log(`Calling Ideogram backend API - Model: ${request.model}, Prompt: ${request.prompt.substring(0, 50)}...`);
  
  try {
    const { data, error } = await supabase.functions.invoke('ideogram-generate', {
      body: request
    });

    if (error) {
      console.error('Backend Ideogram API error:', error);
      throw new IdeogramAPIError(`Backend API error: ${error.message}`);
    }

    if (!data) {
      throw new IdeogramAPIError('No data received from backend API');
    }

    console.log(`Backend Ideogram API success - Generated ${data.data?.length || 0} image(s)`);
    return data as IdeogramGenerateResponse;

  } catch (error) {
    console.error('Backend Ideogram API call failed:', error);
    throw error instanceof IdeogramAPIError ? error : new IdeogramAPIError(
      error instanceof Error ? error.message : 'Backend API call failed'
    );
  }
}