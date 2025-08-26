import { getIdeogramKey, getIdeogramProxyUrl } from "@/config/secrets";

export interface IdeogramGenerateRequest {
  image_request: {
    prompt: string;
    aspect_ratio?: string;
    model?: string;
    magic_prompt_option?: string;
  };
}

export interface IdeogramGenerateResponse {
  created: string;
  data: Array<{ url: string; is_image_safe: boolean; prompt: string }>;
}

export class IdeogramAPIError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "IdeogramAPIError";
  }
}

class IdeogramDirectService {
  hasApiKey(): boolean {
    const key = getIdeogramKey();
    return !!key;
  }

  async generateImage(prompt: string, aspectRatio: string = "ASPECT_1_1"): Promise<IdeogramGenerateResponse> {
    const key = getIdeogramKey();
    if (!key) throw new IdeogramAPIError("Missing Ideogram API key");

    const body: IdeogramGenerateRequest = {
      image_request: {
        prompt,
        aspect_ratio: aspectRatio,
        model: "V_2",
        magic_prompt_option: "AUTO",
      },
    };

    // Use proxy if configured, otherwise direct API
    const proxyUrl = getIdeogramProxyUrl();
    let apiUrl = "https://api.ideogram.ai/generate";
    let useProxyHeaders = false;
    
    if (proxyUrl) {
      if (proxyUrl.includes('allorigins.win')) {
        // AllOrigins proxy - doesn't forward headers properly
        apiUrl = proxyUrl;
        useProxyHeaders = false;
      } else {
        // Custom proxy (like Cloudflare Worker)
        apiUrl = proxyUrl;
        useProxyHeaders = true;
      }
    }
    
    console.log("🔍 Ideogram API Debug:", { 
      proxyUrl, 
      apiUrl, 
      usingProxy: !!proxyUrl,
      useProxyHeaders
    });

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    // Handle API key headers based on proxy type
    if (!proxyUrl) {
      // Direct API call
      headers["Api-Key"] = key;
    } else if (useProxyHeaders) {
      // Custom proxy that forwards headers
      headers["X-API-Key"] = key;
    } else {
      // Public proxy that doesn't forward headers - need to modify request
      // For AllOrigins, we need to make a different type of request
    }

    let requestBody = JSON.stringify(body);
    let requestUrl = apiUrl;
    
    // Special handling for AllOrigins proxy
    if (proxyUrl && proxyUrl.includes('allorigins.win')) {
      // AllOrigins requires the full URL with the API key in the request
      const originalUrl = `https://api.ideogram.ai/generate`;
      requestUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(originalUrl)}`;
      
      // We need to make the request differently for AllOrigins
      // This won't work well because we can't send the API key securely
      console.warn("⚠️ AllOrigins proxy cannot securely handle API keys. Please use a custom proxy.");
      throw new IdeogramAPIError("AllOrigins proxy cannot handle authenticated requests. Please configure a custom proxy in Settings.");
    }

    const resp = await fetch(requestUrl, {
      method: "POST",
      headers,
      body: requestBody,
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      // Enhanced error messaging for CORS issues
      if (resp.status === 0 || resp.type === 'opaque') {
        throw new IdeogramAPIError("CORS error: Set proxy URL in Settings → Ideogram Proxy URL", resp.status);
      }
      throw new IdeogramAPIError(data?.error?.message || `Ideogram error ${resp.status}`, resp.status);
    }
    return data as IdeogramGenerateResponse;
  }
}

export const ideogramDirectService = new IdeogramDirectService();