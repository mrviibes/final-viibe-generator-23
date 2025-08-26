import { getIdeogramKey } from "@/config/secrets";
import { hasIdeogramKey, checkRateLimit } from "@/lib/keyManager";

const IDEOGRAM_API_BASE = 'https://api.ideogram.ai/generate';

export interface ProxySettings {
  type: 'direct' | 'cors-anywhere' | 'proxy-cors-sh' | 'allorigins' | 'thingproxy';
  apiKey?: string;
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

// Current proxy settings
let currentProxySettings: ProxySettings = { type: 'direct' };

console.info("Ideogram Service: Using direct API calls with hardcoded key and proxy fallbacks");

export function hasIdeogramApiKey(): boolean {
  return hasIdeogramKey();
}

export function isUsingBackend(): boolean {
  return false;
}

export function setIdeogramApiKey(_key: string) {
  console.warn("setIdeogramApiKey is deprecated - using hardcoded key");
}

export function getProxySettings(): ProxySettings {
  return currentProxySettings;
}

export function setProxySettings(settings: ProxySettings) {
  currentProxySettings = settings;
  console.log(`Proxy settings updated to: ${settings.type}`);
}

export async function testProxyConnection(proxyType: ProxySettings['type']): Promise<boolean> {
  const testUrl = 'https://httpbin.org/get';
  const proxyPrefix = PROXY_CONFIGS[proxyType];
  
  try {
    const url = proxyPrefix ? `${proxyPrefix}${encodeURIComponent(testUrl)}` : testUrl;
    const headers: Record<string, string> = {};
    
    if (proxyType === 'proxy-cors-sh' && currentProxySettings.apiKey) {
      headers['x-cors-api-key'] = currentProxySettings.apiKey;
    }
    
    const response = await fetch(url, { 
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(5000)
    });
    
    return response.ok;
  } catch {
    return false;
  }
}

export async function findBestProxy(): Promise<ProxySettings['type']> {
  const proxies: ProxySettings['type'][] = ['direct', 'cors-anywhere', 'proxy-cors-sh', 'allorigins', 'thingproxy'];
  
  for (const proxy of proxies) {
    console.log(`Testing proxy: ${proxy}`);
    if (await testProxyConnection(proxy)) {
      console.log(`Best proxy found: ${proxy}`);
      return proxy;
    }
  }
  
  console.warn('No working proxy found, defaulting to direct');
  return 'direct';
}

async function callIdeogramAPI(request: IdeogramGenerateRequest, proxyType: ProxySettings['type']): Promise<IdeogramGenerateResponse> {
  if (!checkRateLimit('ideogram')) {
    throw new IdeogramAPIError("Rate limited - please wait", 429);
  }

  const apiKey = getIdeogramKey().trim();
  const proxyPrefix = PROXY_CONFIGS[proxyType];
  const url = proxyPrefix ? `${proxyPrefix}${encodeURIComponent(IDEOGRAM_API_BASE)}` : IDEOGRAM_API_BASE;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Api-Key': apiKey,
  };
  
  if (proxyType === 'proxy-cors-sh' && currentProxySettings.apiKey) {
    headers['x-cors-api-key'] = currentProxySettings.apiKey;
  }
  
  console.log(`Calling Ideogram API via ${proxyType} - Model: ${request.model}, Prompt: ${request.prompt.substring(0, 50)}...`);
  
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    const errorData = await response.text();
    throw new IdeogramAPIError(`API error: ${response.status} ${errorData}`, response.status);
  }
  
  const data = await response.json();
  console.log(`Ideogram API success via ${proxyType} - Generated ${data.data?.length || 0} image(s)`);
  return data;
}

export async function generateIdeogramImage(request: IdeogramGenerateRequest): Promise<IdeogramGenerateResponse> {
  // Try current proxy first
  try {
    return await callIdeogramAPI(request, currentProxySettings.type);
  } catch (error) {
    console.warn(`Failed with ${currentProxySettings.type} proxy:`, error);
    
    // If direct call failed, try finding a working proxy
    if (currentProxySettings.type === 'direct') {
      console.log('Direct call failed, searching for working proxy...');
      const bestProxy = await findBestProxy();
      
      if (bestProxy !== 'direct') {
        setProxySettings({ type: bestProxy });
        try {
          return await callIdeogramAPI(request, bestProxy);
        } catch (proxyError) {
          console.error('Proxy call also failed:', proxyError);
        }
      }
    }
    
    // Re-throw the original error if all attempts failed
    throw error instanceof IdeogramAPIError ? error : new IdeogramAPIError(
      error instanceof Error ? error.message : 'API call failed'
    );
  }
}