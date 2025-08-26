import { HARDCODED_API_KEYS, hasHardcodedIdeogramKey } from "@/config/secrets";

const IDEOGRAM_API_BASE = 'https://api.ideogram.ai/generate';

export interface ProxySettings {
  type: 'none' | 'cors-anywhere' | 'proxy-cors-sh' | 'allorigins' | 'thingproxy';
  apiKey?: string;
}

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

// Global state for API key and settings
let ideogramApiKey: string | null = null;
let proxySettings: ProxySettings = { type: 'none' };

export function setIdeogramApiKey(key: string): void {
  ideogramApiKey = key;
  localStorage.setItem('ideogram_api_key', key);
}

export function getIdeogramApiKey(): string | null {
  return ideogramApiKey || localStorage.getItem('ideogram_api_key') || HARDCODED_API_KEYS.IDEOGRAM_API_KEY || null;
}

export function clearIdeogramApiKey(): void {
  ideogramApiKey = null;
  localStorage.removeItem('ideogram_api_key');
}

export function hasIdeogramApiKey(): boolean {
  return Boolean(getIdeogramApiKey() || hasHardcodedIdeogramKey());
}

export function isUsingBackend(): boolean {
  return false; // Always use frontend now
}

export function setProxySettings(settings: ProxySettings): void {
  proxySettings = settings;
  localStorage.setItem('ideogram_proxy_settings', JSON.stringify(settings));
}

export function getProxySettings(): ProxySettings {
  const stored = localStorage.getItem('ideogram_proxy_settings');
  if (stored) {
    try {
      proxySettings = JSON.parse(stored);
    } catch {
      // Use default
    }
  }
  return proxySettings;
}

export async function testProxyConnection(proxyType: ProxySettings['type']): Promise<boolean> {
  try {
    const testUrls: Record<ProxySettings['type'], string> = {
      'none': 'https://httpbin.org/status/200',
      'cors-anywhere': 'https://cors-anywhere.herokuapp.com/https://httpbin.org/status/200',
      'proxy-cors-sh': 'https://proxy.cors.sh/https://httpbin.org/status/200',
      'allorigins': 'https://api.allorigins.win/raw?url=https://httpbin.org/status/200',
      'thingproxy': 'https://thingproxy.freeboard.io/fetch/https://httpbin.org/status/200'
    };

    const response = await fetch(testUrls[proxyType], { 
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function findBestProxy(): Promise<ProxySettings['type']> {
  const proxyTypes: ProxySettings['type'][] = ['none', 'proxy-cors-sh', 'allorigins', 'thingproxy', 'cors-anywhere'];
  
  for (const proxyType of proxyTypes) {
    try {
      const works = await testProxyConnection(proxyType);
      if (works) {
        return proxyType;
      }
    } catch (error) {
      console.log(`Failed to test ${proxyType}:`, error);
    }
  }
  
  return 'none';
}

export async function generateIdeogramImage(request: IdeogramGenerateRequest): Promise<IdeogramGenerateResponse> {
  console.log('Starting Ideogram image generation with request:', request);
  
  if (!hasIdeogramApiKey()) {
    throw new IdeogramAPIError(
      'Ideogram API key is required. Please set your API key.',
      'NO_API_KEY'
    );
  }
  
  // Direct frontend API implementation
  return generateIdeogramImageFrontend(request);
}

async function generateIdeogramImageFrontend(request: IdeogramGenerateRequest): Promise<IdeogramGenerateResponse> {
  const key = getIdeogramApiKey();
  if (!key) {
    throw new IdeogramAPIError('No API key provided', 'NO_API_KEY');
  }

  const settings = getProxySettings();
  
  const PROXY_CONFIGS = {
    'none': '',
    'cors-anywhere': 'https://cors-anywhere.herokuapp.com/',
    'proxy-cors-sh': 'https://proxy.cors.sh/',
    'allorigins': 'https://api.allorigins.win/raw?url=',
    'thingproxy': 'https://thingproxy.freeboard.io/fetch/'
  };

  const makeRequest = async (proxyType: ProxySettings['type']): Promise<Response> => {
    let url = IDEOGRAM_API_BASE;
    const headers: Record<string, string> = {
      'Api-Key': key,
      'Content-Type': 'application/json',
    };

    switch (proxyType) {
      case 'cors-anywhere':
        url = PROXY_CONFIGS['cors-anywhere'] + IDEOGRAM_API_BASE;
        headers['X-Requested-With'] = 'XMLHttpRequest';
        break;
      case 'proxy-cors-sh':
        url = PROXY_CONFIGS['proxy-cors-sh'] + IDEOGRAM_API_BASE;
        if (settings.apiKey) {
          headers['x-cors-api-key'] = settings.apiKey;
        }
        break;
      case 'allorigins':
        url = PROXY_CONFIGS['allorigins'] + encodeURIComponent(IDEOGRAM_API_BASE);
        break;
      case 'thingproxy':
        url = PROXY_CONFIGS['thingproxy'] + IDEOGRAM_API_BASE;
        break;
      case 'none':
      default:
        break;
    }

    const payload: any = {
      prompt: request.prompt,
      aspect_ratio: request.aspect_ratio,
      model: 'V_3', // Always use V3
      magic_prompt_option: request.magic_prompt_option,
    };
    
    if (request.seed !== undefined) {
      payload.seed = request.seed;
    }
    
    if (request.style_type) {
      payload.style_type = request.style_type;
    }

    const requestBody = JSON.stringify({ image_request: payload });

    return fetch(url, {
      method: 'POST',
      headers,
      body: requestBody,
    });
  };

  // Try different proxy methods
  const proxyMethods: ProxySettings['type'][] = [settings.type];
  if (settings.type !== 'none') proxyMethods.push('none');
  if (settings.type !== 'proxy-cors-sh') proxyMethods.push('proxy-cors-sh');
  if (settings.type !== 'allorigins') proxyMethods.push('allorigins');

  let lastError: Error | null = null;

  for (const proxyType of proxyMethods) {
    try {
      const response = await makeRequest(proxyType);

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`Request failed with ${response.status}:`, errorText);
        
        if (response.status === 403 && errorText.includes('corsdemo')) {
          throw new IdeogramAPIError(
            'CORS proxy requires demo approval',
            'CORS_DEMO_REQUIRED'
          );
        }
        
        throw new IdeogramAPIError(`HTTP ${response.status}: ${errorText}`, 'HTTP_ERROR');
      }

      const data = await response.json();
      return {
        success: true,
        images: data.data,
        message: 'Images generated successfully'
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.log(`${proxyType} failed:`, lastError.message);
    }
  }

  throw new IdeogramAPIError(
    `All connection methods failed. Last error: ${lastError?.message || 'Unknown error'}`,
    'CONNECTION_FAILED'
  );
}