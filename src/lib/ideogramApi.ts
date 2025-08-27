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
  magic_prompt_option: 'AUTO' | 'OFF';
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

let apiKey: string | null = null;
let proxySettings: ProxySettings = { type: 'direct' };
let useBackendAPI: boolean = true; // Use Supabase backend by default

export function setIdeogramApiKey(key: string) {
  apiKey = key;
  localStorage.setItem('ideogram_api_key', key);
  useBackendAPI = false; // Switch to frontend mode when key is set
}

export function getIdeogramApiKey(): string | null {
  if (apiKey) return apiKey;
  
  const stored = localStorage.getItem('ideogram_api_key');
  if (stored) {
    apiKey = stored;
    return stored;
  }
  
  return null;
}

export function clearIdeogramApiKey() {
  apiKey = null;
  localStorage.removeItem('ideogram_api_key');
  useBackendAPI = true; // Go back to backend mode
}

export function hasIdeogramApiKey(): boolean {
  return useBackendAPI || !!getIdeogramApiKey();
}

export function isUsingBackend(): boolean {
  return useBackendAPI;
}

export function setProxySettings(settings: ProxySettings) {
  proxySettings = settings;
  localStorage.setItem('ideogram_proxy_settings', JSON.stringify(settings));
}

export function getProxySettings(): ProxySettings {
  const stored = localStorage.getItem('ideogram_proxy_settings');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      proxySettings = parsed;
      return parsed;
    } catch {
      // Invalid JSON, fallback to default
    }
  }
  return proxySettings;
}

export async function testProxyConnection(proxyType: ProxySettings['type']): Promise<boolean> {
  try {
    const testUrls: Record<ProxySettings['type'], string> = {
      'direct': 'https://httpbin.org/status/200',
      'cors-anywhere': 'https://cors-anywhere.herokuapp.com/https://httpbin.org/status/200',
      'proxy-cors-sh': 'https://proxy.cors.sh/https://httpbin.org/status/200',
      'allorigins': 'https://api.allorigins.win/raw?url=https://httpbin.org/status/200',
      'thingproxy': 'https://thingproxy.freeboard.io/fetch/https://httpbin.org/status/200'
    };

    const headers: Record<string, string> = {};
    if (proxyType === 'cors-anywhere') {
      headers['X-Requested-With'] = 'XMLHttpRequest';
    }
    
    const response = await fetch(testUrls[proxyType], { 
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Auto-select the best working proxy
export async function findBestProxy(): Promise<ProxySettings['type']> {
  const proxyTypes: ProxySettings['type'][] = ['direct', 'proxy-cors-sh', 'allorigins', 'thingproxy', 'cors-anywhere'];
  
  for (const proxyType of proxyTypes) {
    try {
      const works = await testProxyConnection(proxyType);
      if (works) {
        console.log(`Auto-selected proxy: ${proxyType}`);
        return proxyType;
      }
    } catch (error) {
      console.log(`Failed to test ${proxyType}:`, error);
    }
  }
  
  // Fallback to direct if nothing works
  return 'direct';
}

export async function generateIdeogramImage(request: IdeogramGenerateRequest): Promise<IdeogramGenerateResponse> {
  // Use the model specified in the request (no automatic override)
  const requestWithModel: IdeogramGenerateRequest = { ...request };
  
  // Try backend API first if enabled
  if (useBackendAPI) {
    console.log(`Calling Ideogram backend API - Model: ${request.model}, Style: ${request.style_type || 'AUTO'}, Prompt: ${request.prompt.substring(0, 50)}...`);
    
    try {
      const { data, error } = await supabase.functions.invoke('ideogram-generate', {
        body: requestWithModel
      });

      if (error) {
        console.error('Backend Ideogram API error:', error);
        throw new IdeogramAPIError(`Backend API error: ${error.message}`);
      }

      if (!data) {
        throw new IdeogramAPIError('No data received from backend API');
      }

      // Check for fallback notification
      if (data._fallback_note) {
        console.log('⚠️ Backend used fallback:', data._fallback_note);
        // You could show a toast here if needed
      }

      console.log(`Backend Ideogram API success - Generated ${data.data?.length || 0} image(s) with Model: ${request.model}, Style: ${request.style_type || 'AUTO'}`);
      return data as IdeogramGenerateResponse;

    } catch (error) {
      console.error('Backend Ideogram API call failed:', error);
      
      // Fallback to frontend if backend fails and we have a key
      const key = getIdeogramApiKey();
      if (key) {
        console.log('Falling back to frontend Ideogram API...');
        useBackendAPI = false;
        const result = await generateIdeogramImageFrontend(requestWithModel);
        useBackendAPI = true; // Reset for next call
        return result;
      }
      
      throw error instanceof IdeogramAPIError ? error : new IdeogramAPIError(
        error instanceof Error ? error.message : 'Backend API call failed'
      );
    }
  }

  // Frontend mode
  return generateIdeogramImageFrontend(requestWithModel);
}

async function generateIdeogramImageFrontend(request: IdeogramGenerateRequest): Promise<IdeogramGenerateResponse> {
  const key = getIdeogramApiKey();
  if (!key) {
    throw new IdeogramAPIError('No API key provided');
  }

  const settings = getProxySettings();
  
  const makeRequest = async (proxyType: ProxySettings['type'], currentModel: string): Promise<Response> => {
    const headers: Record<string, string> = {
      'Api-Key': key,
    };

    // Choose endpoint based on model
    const baseUrl = currentModel === 'V_3' ? 'https://api.ideogram.ai/v3/generate' : IDEOGRAM_API_BASE;
    let url = baseUrl;
    
    // Configure URL and headers based on proxy type
    switch (proxyType) {
      case 'cors-anywhere':
        url = PROXY_CONFIGS['cors-anywhere'] + baseUrl;
        headers['X-Requested-With'] = 'XMLHttpRequest';
        break;
      case 'proxy-cors-sh':
        url = PROXY_CONFIGS['proxy-cors-sh'] + baseUrl;
        if (settings.apiKey) {
          headers['x-cors-api-key'] = settings.apiKey;
        }
        break;
      case 'allorigins':
        url = PROXY_CONFIGS['allorigins'] + encodeURIComponent(baseUrl);
        break;
      case 'thingproxy':
        url = PROXY_CONFIGS['thingproxy'] + baseUrl;
        break;
      case 'direct':
      default:
        url = baseUrl;
        break;
    }

    // Handle different request formats for V3 vs legacy models
    let requestBody: string | FormData;
    
    if (currentModel === 'V_3') {
      // V3 uses multipart/form-data
      const formData = new FormData();
      formData.append('prompt', request.prompt);
      
      // Map aspect_ratio to resolution for V3
      const aspectToResolution: Record<string, string> = {
        'ASPECT_1_1': '1024x1024',
        'ASPECT_16_9': '1280x720',
        'ASPECT_9_16': '720x1280',
        'ASPECT_16_10': '1280x800',
        'ASPECT_10_16': '800x1280',
        'ASPECT_3_2': '1536x1024',
        'ASPECT_2_3': '1024x1536',
        'ASPECT_4_3': '1152x896',
        'ASPECT_3_4': '896x1152',
        'ASPECT_3_1': '1728x576',
        'ASPECT_1_3': '576x1728'
      };
      
      formData.append('resolution', aspectToResolution[request.aspect_ratio] || '1024x1024');
      
      if (request.seed !== undefined) {
        formData.append('seed', request.seed.toString());
      }
      
      // Map style_type to style for V3 if provided
      if (request.style_type && request.style_type !== 'AUTO') {
        const styleMapping: Record<string, string> = {
          'GENERAL': 'general',
          'REALISTIC': 'realistic',
          'DESIGN': 'design',
          'RENDER_3D': '3d_render',
          'ANIME': 'anime'
        };
        if (styleMapping[request.style_type]) {
          formData.append('style', styleMapping[request.style_type]);
        }
      }
      
      requestBody = formData;
      // Don't set Content-Type for FormData - browser will set it with boundary
    } else {
      // Legacy models use JSON format
      headers['Content-Type'] = 'application/json';
      
      const payload: any = {
        prompt: request.prompt,
        aspect_ratio: request.aspect_ratio,
        model: currentModel,
        magic_prompt_option: request.magic_prompt_option,
      };
      
      if (request.seed !== undefined) {
        payload.seed = request.seed;
      }
      
      if (request.style_type) {
        payload.style_type = request.style_type;
      }

      requestBody = JSON.stringify({ image_request: payload });
    }

    // Debug log the request structure (without sensitive headers)
    console.log('Ideogram API request:', { 
      url: url.replace(key, '[REDACTED]'), 
      model: currentModel,
      requestType: currentModel === 'V_3' ? 'multipart/form-data' : 'application/json'
    });

    return fetch(url, {
      method: 'POST',
      headers,
      body: requestBody,
    });
  };

  let currentModel = request.model;
  let lastError: Error | null = null;

  // Auto-retry logic with model downgrade
  const tryRequest = async (proxyType: ProxySettings['type'], model: string): Promise<IdeogramGenerateResponse> => {
    try {
      const response = await makeRequest(proxyType, model);

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`Request failed with ${response.status}:`, errorText);
        
        let errorMessage = `HTTP ${response.status}`;
        
        // Check for specific CORS demo error
        if (response.status === 403 && errorText.includes('corsdemo')) {
          throw new IdeogramAPIError(
            'CORS_DEMO_REQUIRED',
            403
          );
        }
        
        // Check for 415 errors (common with proxy issues)
        if (response.status === 415) {
          throw new IdeogramAPIError(
            'Media type error (415). This may be a proxy configuration issue.',
            415
          );
        }
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error?.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new IdeogramAPIError(errorMessage, response.status);
      }

      const data = await response.json();
      return data as IdeogramGenerateResponse;
    } catch (error) {
      if (error instanceof IdeogramAPIError) {
        throw error;
      }
      throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Auto-select best proxy if user hasn't manually configured one
  let proxyMethods: ProxySettings['type'][];
  
  if (settings.type === 'direct') {
    // If user selected direct, try auto-selection first, then fallbacks
    const bestProxy = await findBestProxy();
    proxyMethods = [bestProxy];
    if (bestProxy !== 'proxy-cors-sh') proxyMethods.push('proxy-cors-sh');
    if (bestProxy !== 'allorigins') proxyMethods.push('allorigins');
    if (bestProxy !== 'thingproxy') proxyMethods.push('thingproxy');
    if (bestProxy !== 'cors-anywhere') proxyMethods.push('cors-anywhere');
  } else {
    // User has specific preference, try it first then fallbacks
    proxyMethods = [settings.type];
    const fallbacks: ProxySettings['type'][] = ['proxy-cors-sh', 'allorigins', 'thingproxy', 'cors-anywhere', 'direct'];
    for (const fallback of fallbacks) {
      if (fallback !== settings.type) {
        proxyMethods.push(fallback);
      }
    }
  }

  for (const proxyType of proxyMethods) {
    try {
      return await tryRequest(proxyType, currentModel);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.log(`${proxyType} failed with model ${currentModel}:`, lastError.message);
      
    }
  }
  // If all methods failed, throw the last error
  if (lastError instanceof IdeogramAPIError) {
    throw lastError;
  }
  
  // Check if it's a CORS error
  if (lastError instanceof TypeError && lastError.message.includes('Failed to fetch')) {
    throw new IdeogramAPIError(
      'CORS error: Unable to connect to Ideogram API directly. Try enabling a CORS proxy in settings.',
      0
    );
  }
  
  // Check for common content filtering keywords that might cause issues
  const contentFilteringKeywords = ['marijuana', 'cannabis', 'weed', 'joint', 'drug', 'smoking'];
  const hasFilteredContent = contentFilteringKeywords.some(keyword => 
    request.prompt.toLowerCase().includes(keyword)
  );
  
  if (hasFilteredContent) {
    throw new IdeogramAPIError(
      'Content may have been flagged by content filters. Try using different words or themes to test if the API is working.',
      400
    );
  }
  
  throw new IdeogramAPIError(
    `All connection methods failed. Last error: ${lastError?.message || 'Unknown error'}`
  );
}