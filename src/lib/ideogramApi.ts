// Export secure client service as main service
export { ideogramClientService as ideogramDirectService } from './ideogramClient';
export { IdeogramAPIError } from './ideogramClient';
export type { IdeogramGenerateRequest, IdeogramGenerateResponse } from './ideogramClient';

// Legacy types and interfaces for backward compatibility
export interface ProxySettings {
  type: 'direct' | 'cors-anywhere' | 'proxy-cors-sh' | 'allorigins' | 'thingproxy';
  apiKey?: string;
}

// Legacy proxy settings (now unused but kept for compatibility)
let currentProxySettings: ProxySettings = { type: 'direct' };

// Legacy functions for backward compatibility
export const generateIdeogramImage = async (params: any, aspectRatio?: string) => {
  const { ideogramClientService } = await import('./ideogramClient');
  
  console.log("🔍 generateIdeogramImage called with:", { params, aspectRatio });
  
  // Handle both old (prompt, aspectRatio) and new (full params object) signatures
  if (typeof params === 'string') {
    // Old signature: generateIdeogramImage(prompt, aspectRatio)
    const prompt = params;
    const ratio = aspectRatio || "ASPECT_1_1";
    console.log("🔍 Using old signature:", { prompt, ratio });
    return ideogramClientService.generateImage(prompt, ratio);
  } else {
    // New signature: generateIdeogramImage(fullParamsObject)
    console.log("🔍 Using new signature:", params);
    return ideogramClientService.generateImage(params.prompt, params.aspect_ratio || "ASPECT_1_1");
  }
};

export const hasIdeogramApiKey = async () => {
  const { ideogramClientService } = await import('./ideogramClient');
  return ideogramClientService.hasApiKey();
};

export const testProxyConnection = async (proxyType?: string) => {
  try {
    const { ideogramClientService } = await import('./ideogramClient');
    await ideogramClientService.generateImage("test", "ASPECT_1_1");
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Test failed' 
    };
  }
};

// Legacy proxy management functions (now no-ops but kept for compatibility)
export const getProxySettings = (): ProxySettings => {
  return currentProxySettings;
};

export const setProxySettings = (settings: ProxySettings): void => {
  currentProxySettings = settings;
  console.log('⚠️ Proxy settings are now managed on the server. This setting is ignored.');
};

export const isUsingBackend = (): boolean => {
  return false; // Always false since we're using direct API calls
};