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
  _fallback_note?: string;
  endpoint_used?: string;
  model_used?: string;
  _model_used?: string;
  _original_model_requested?: string;
  errorType?: string;
}

export class IdeogramAPIError extends Error {
  constructor(
    message: string, 
    public status?: number, 
    public errorType?: string,
    public shouldRetryWithTurbo?: boolean,
    public shouldShowExactTextOverlay?: boolean
  ) {
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
  
  // Always use backend API for V_3 model to ensure proper V3 endpoint usage
  // Also prioritize backend for exact text requests to get better V3 routing
  const isExactTextRequest = /EXACT TEXT:/i.test(request.prompt);
  const forceBackend = requestWithModel.model === 'V_3' || isExactTextRequest;
  
  // Try backend API first if enabled or if V_3 model or exact text request
  if (useBackendAPI || forceBackend) {
    const reasonForBackend = requestWithModel.model === 'V_3' ? 'V3 model' : 
                           isExactTextRequest ? 'exact text request' : 'backend';
    console.log(`Calling Ideogram backend (${reasonForBackend}) - Model: ${request.model}, Style: ${request.style_type || 'AUTO'}, Prompt: ${request.prompt.substring(0, 50)}...`);
    
    try {
      const { data, error } = await supabase.functions.invoke('ideogram-generate', {
        body: requestWithModel
      });

      if (error) {
        console.error('Backend Ideogram API error:', error);
        
        // Surface real backend error by making a direct fetch to get JSON response
        const backendError = await surfaceBackendError(requestWithModel);
        if (backendError) {
          throw backendError;
        }
        
        // Fallback to generic error if surfacing fails
        throw new IdeogramAPIError(`Backend API error: ${error.message}`);
      }

      if (!data) {
        throw new IdeogramAPIError('No data received from backend API');
      }

      // Check for fallback notification and log V3 status
      if (data._fallback_note) {
        console.log('⚠️ V3 unavailable, used fallback:', data._fallback_note);
        if (isExactTextRequest) {
          console.log('⚠️ Exact text request fell back to V2A_TURBO - text quality may be affected');
        }
      } else if (data.endpoint_used && data.endpoint_used.startsWith('v3')) {
        console.log(`✅ V3 endpoint working (${data.endpoint_used})`);
        if (isExactTextRequest) {
          console.log('✅ Exact text request using V3 - enhanced text rendering');
        }
      }

      const modelUsed = data._fallback_note ? 'V_2A_TURBO (fallback)' : request.model;
      console.log(`Backend Ideogram API success - Generated ${data.data?.length || 0} image(s) with Model: ${modelUsed}, Style: ${request.style_type || 'AUTO'}`);
      
      // Add metadata for UI handling
      const responseWithMetadata = {
        ...data,
        model_used: modelUsed,
        exact_text_request: isExactTextRequest,
        spelling_guarantee_active: isExactTextRequest && !data._fallback_note
      } as IdeogramGenerateResponse;
      
      return responseWithMetadata;

    } catch (error) {
      console.error('Backend Ideogram API call failed:', error);
      
      // Only fallback to frontend if not V_3 model and we have a key
      if (!forceBackend) {
        const key = getIdeogramApiKey();
        if (key) {
          console.log('Falling back to frontend Ideogram API...');
          useBackendAPI = false;
          const result = await generateIdeogramImageFrontend(requestWithModel);
          useBackendAPI = true; // Reset for next call
          return result;
        }
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
    let url = IDEOGRAM_API_BASE;
    const headers: Record<string, string> = {
      'Api-Key': key,
      'Content-Type': 'application/json',
    };

    // Configure URL and headers based on proxy type
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
      case 'direct':
      default:
        // Use direct URL
        break;
    }

    // Always use JSON format wrapped in image_request
    // Use the model as requested (no forced downgrade)
    let modelToUse = currentModel;

    const payload: any = {
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

    const requestBody = JSON.stringify({ image_request: payload });

    // Debug log the request structure (without sensitive headers)
    console.log('Ideogram API request:', { 
      url: url.replace(key, '[REDACTED]'), 
      model: currentModel,
      payload: { ...payload, prompt: payload.prompt.substring(0, 50) + '...' }
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
      
      // If V3 failed and we haven't tried V2A_TURBO yet, try downgrading
      if (currentModel === 'V_3' && (error as any).status !== 403) {
        try {
          console.log('Retrying with V_2A_TURBO model...');
          return await tryRequest(proxyType, 'V_2A_TURBO');
        } catch (downgradeError) {
          console.log(`${proxyType} also failed with V_2A_TURBO:`, downgradeError);
        }
      }
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

// Surface real backend error by making direct fetch to get JSON details
async function surfaceBackendError(request: IdeogramGenerateRequest): Promise<IdeogramAPIError | null> {
  try {
    console.log('Surfacing backend error for request:', { prompt: request.prompt.substring(0, 100) + '...' });
    
    // Create a direct fetch call with anon key to get the actual backend error
    const functionUrl = `https://qdigssobxfgoeuvkejpo.supabase.co/functions/v1/ideogram-generate`;
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkaWdzc29ieGZnb2V1dmtlanBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NzI0OTgsImV4cCI6MjA3MDU0ODQ5OH0.TfV0LEBdE6fFoCT8Xz0jgV53XC4Exf0YVq_15z8Lfnw`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      try {
        const errorText = await response.text();
        console.log('Raw backend response:', { status: response.status, text: errorText });
        
        // Try to parse as JSON first
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          // Check for specific 404 V3 unavailable pattern based on edge function logs
          if (response.status === 404 && errorText.includes('Not Found')) {
            // This is the V3 unavailable scenario we see in logs
            errorData = {
              errorType: 'V3_UNAVAILABLE',
              message: 'V3 model temporarily unavailable',
              status: 404,
              shouldRetryWithTurbo: true,
              shouldShowExactTextOverlay: request.prompt?.includes('EXACT TEXT:') || false
            };
          } else {
            // If not JSON, treat as plain text
            errorData = { error: errorText };
          }
        }
        
        return mapBackendErrorToUserError(response.status, errorData, request);
      } catch (parseError) {
        console.log('Failed to parse backend error response:', parseError);
        return new IdeogramAPIError(
          `Backend error ${response.status}: Unable to process response`,
          response.status
        );
      }
    }
  } catch (error) {
    console.log('Could not surface backend error details:', error);
  }
  
  return null;
}

// Map backend errors to user-friendly messages with specific actions
function mapBackendErrorToUserError(status: number, errorData: any, request: IdeogramGenerateRequest): IdeogramAPIError {
  const isExactTextRequest = /EXACT TEXT:/i.test(request.prompt);
  
  console.log('[mapBackendErrorToUserError] Processing error:', { 
    status, 
    errorType: errorData.errorType, 
    isExactTextRequest, 
    model: request.model 
  });
  
  // Handle specific V3 unavailable scenarios with correct error types
  if (errorData.errorType === 'V3_UNAVAILABLE_FOR_EXACT_TEXT' || 
      (errorData.errorType === 'V3_UNAVAILABLE' && isExactTextRequest) ||
      (status === 404 && request.model === 'V_3' && isExactTextRequest)) {
    console.log('[mapBackendErrorToUserError] Mapping to V3_UNAVAILABLE_FOR_EXACT_TEXT');
    return new IdeogramAPIError(
      'V3 model is temporarily unavailable. Use Caption Overlay for guaranteed text accuracy or try Turbo model.',
      status,
      'V3_UNAVAILABLE_FOR_EXACT_TEXT',
      true, // shouldRetryWithTurbo
      true  // shouldShowExactTextOverlay
    );
  }
  
  if (errorData.errorType === 'V3_UNAVAILABLE' || (status === 404 && request.model === 'V_3')) {
    console.log('[mapBackendErrorToUserError] Mapping to V3_UNAVAILABLE');
    return new IdeogramAPIError(
      'V3 model is temporarily unavailable. Try the Turbo model for reliable generation.',
      status,
      'V3_UNAVAILABLE',
      true, // shouldRetryWithTurbo
      false // shouldShowExactTextOverlay
    );
  }
  
  // Handle other specific error types
  if (errorData.errorType) {
    switch (errorData.errorType) {
      case 'MISSING_BACKEND_KEY':
        return new IdeogramAPIError(
          'Ideogram API key not configured in backend. Set a frontend API key to continue.',
          status,
          'MISSING_BACKEND_KEY'
        );
      case 'RATE_LIMIT':
        return new IdeogramAPIError(
          'Rate limit exceeded. Please wait a moment before trying again.',
          status,
          'RATE_LIMIT'
        );
      case 'CONTENT_POLICY':
        return new IdeogramAPIError(
          'Content policy violation. Please modify your prompt and try again.',
          status,
          'CONTENT_POLICY'
        );
      default:
        return new IdeogramAPIError(
          errorData.message || 'Ideogram API error',
          status,
          errorData.errorType
        );
    }
  }
  
  // Handle HTTP status codes
  switch (status) {
    case 503:
      return new IdeogramAPIError(
        'Ideogram service temporarily unavailable. Please try again in a moment.',
        status,
        'SERVICE_UNAVAILABLE',
        true // Allow retry with turbo
      );
    case 401:
      return new IdeogramAPIError(
        'Invalid API key. Please check your API key configuration.',
        status,
        'INVALID_API_KEY'
      );
    case 429:
      return new IdeogramAPIError(
        'Rate limit exceeded. Please wait before trying again.',
        status,
        'RATE_LIMIT'
      );
    default:
      const message = errorData.error || errorData.message || `HTTP ${status} error`;
      return new IdeogramAPIError(
        message,
        status,
        'UNKNOWN_ERROR',
        status >= 500 // Retry on server errors
      );
  }
}

// Test Ideogram backend connectivity
// Test V3 endpoint connectivity specifically
export async function testV3Endpoint(): Promise<{ success: boolean; error?: string }> {
  try {
    const testRequest: IdeogramGenerateRequest = {
      prompt: "EXACT TEXT: \"Test\"",
      aspect_ratio: 'ASPECT_1_1',
      model: 'V_3',
      magic_prompt_option: 'OFF',
      count: 1
    };
    
    const result = await surfaceBackendError(testRequest);
    if (result?.errorType === 'V3_UNAVAILABLE' || result?.errorType === 'V3_UNAVAILABLE_FOR_EXACT_TEXT') {
      return { success: false, error: 'V3 endpoint currently unavailable' };
    }
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('404') || errorMessage.includes('V3')) {
      return { success: false, error: 'V3 endpoint unavailable' };
    }
    return { success: false, error: errorMessage };
  }
}

export async function testIdeogramBackend(): Promise<{ success: boolean; error?: string; latency?: number }> {
  const startTime = Date.now();
  
  try {
    const testRequest: IdeogramGenerateRequest = {
      prompt: 'Test connectivity',
      aspect_ratio: 'ASPECT_1_1',
      model: 'V_2A_TURBO',
      magic_prompt_option: 'OFF'
    };
    
    const { error } = await supabase.functions.invoke('ideogram-generate', {
      body: testRequest
    });
    
    const latency = Date.now() - startTime;
    
    if (error) {
      // Try to get more specific error details
      const detailedError = await surfaceBackendError(testRequest);
      return { 
        success: false, 
        error: detailedError?.message || error.message,
        latency 
      };
    }
    
    return { success: true, latency };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      latency: Date.now() - startTime
    };
  }
}