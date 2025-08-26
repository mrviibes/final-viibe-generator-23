import { IDEOGRAM_API_KEY, CORS_PROXY_TYPE, CORS_PROXY_API_KEY } from '@/config/secrets';

interface ProxySettings {
  type: 'direct' | 'allorigins' | 'cors-anywhere' | 'thingproxy' | 'proxy-cors-sh';
  apiKey?: string;
}

interface IdeogramGenerateRequest {
  image_request: {
    model: "V_1" | "V_1_TURBO" | "V_2" | "V_2_TURBO";
    prompt: string;
    aspect_ratio: "ASPECT_1_1" | "ASPECT_10_16" | "ASPECT_16_10" | "ASPECT_9_16" | "ASPECT_16_9" | "ASPECT_4_3" | "ASPECT_3_4" | "ASPECT_3_2" | "ASPECT_2_3";
    magic_prompt_option: "AUTO" | "ON" | "OFF";
    seed?: number;
    style_type?: "AUTO" | "GENERAL" | "REALISTIC" | "DESIGN" | "RENDER_3D" | "ANIME";
    negative_prompt?: string;
  };
}

interface IdeogramGenerateResponse {
  url: string;
}

export class IdeogramAPIError extends Error {
  constructor(
    message: string,
    public status: number = 500,
    public type: 'network_error' | 'api_error' | 'cors_error' | 'missing_api_key' | 'auth_error' | 'rate_limit' | 'invalid_response' | 'backend_error' = 'api_error'
  ) {
    super(message);
    this.name = 'IdeogramAPIError';
  }
}

// State management - hardcoded frontend-only mode
let currentProxySettings: ProxySettings = { 
  type: CORS_PROXY_TYPE,
  apiKey: CORS_PROXY_API_KEY 
};

export function setIdeogramApiKey(key: string) {
  console.warn('setIdeogramApiKey ignored - using hardcoded key from config/secrets.ts');
}

export function getIdeogramApiKey(): string | null {
  return IDEOGRAM_API_KEY;
}

export function clearIdeogramApiKey() {
  console.warn('clearIdeogramApiKey ignored - using hardcoded key from config/secrets.ts');
}

export function setProxySettings(settings: ProxySettings) {
  console.warn('setProxySettings ignored - using hardcoded proxy from config/secrets.ts');
}

export function getProxySettings(): ProxySettings {
  return currentProxySettings;
}

export async function generateIdeogramImage(request: IdeogramGenerateRequest): Promise<IdeogramGenerateResponse> {
  if (!IDEOGRAM_API_KEY) {
    throw new IdeogramAPIError('Ideogram API key not found - check config/secrets.ts', 401, 'missing_api_key');
  }

  let apiUrl: string;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Api-Key': IDEOGRAM_API_KEY,
  };

  // Configure proxy
  switch (currentProxySettings.type) {
    case 'direct':
      apiUrl = 'https://api.ideogram.ai/generate';
      break;
    case 'proxy-cors-sh':
      apiUrl = 'https://proxy.cors.sh/https://api.ideogram.ai/generate';
      if (currentProxySettings.apiKey) {
        headers['x-cors-api-key'] = currentProxySettings.apiKey;
      }
      break;
    case 'cors-anywhere':
      apiUrl = 'https://cors-anywhere.herokuapp.com/https://api.ideogram.ai/generate';
      break;
    default:
      apiUrl = 'https://proxy.cors.sh/https://api.ideogram.ai/generate';
      if (CORS_PROXY_API_KEY) {
        headers['x-cors-api-key'] = CORS_PROXY_API_KEY;
      }
      break;
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new IdeogramAPIError(`API Error: ${errorText}`, response.status, 'api_error');
  }

  const data = await response.json();
  if (!data.data || !data.data[0] || !data.data[0].url) {
    throw new IdeogramAPIError('Invalid response structure', 500, 'invalid_response');
  }

  return { url: data.data[0].url };
}

export type { ProxySettings, IdeogramGenerateRequest, IdeogramGenerateResponse };