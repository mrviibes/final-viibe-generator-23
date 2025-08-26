// Export proxy service as main service
export { ideogramProxyService } from './ideogramProxy';
export { IdeogramAPIError } from './ideogramProxy';
export type { IdeogramGenerateRequest, IdeogramGenerateResponse } from './ideogramProxy';

// Legacy types and interfaces for backward compatibility
export interface ProxySettings {
  type: 'direct' | 'cors-anywhere' | 'proxy-cors-sh' | 'allorigins' | 'thingproxy';
  apiKey?: string;
}

// Legacy proxy settings (now unused but kept for compatibility)
let currentProxySettings: ProxySettings = { type: 'direct' };

// Legacy functions for backward compatibility
export const generateIdeogramImage = async (params: any, aspectRatio?: string) => {
  const { ideogramProxyService } = await import('./ideogramProxy');
  
  // Handle both old (prompt, aspectRatio) and new (full params object) signatures
  if (typeof params === 'string') {
    // Old signature: generateIdeogramImage(prompt, aspectRatio)
    const prompt = params;
    const ratio = aspectRatio || "ASPECT_1_1";
    return ideogramProxyService.generateImage(prompt, ratio);
  } else {
    // New signature: generateIdeogramImage(fullParamsObject)
    return ideogramProxyService.generateImage(params.prompt, params.aspect_ratio || "ASPECT_1_1");
  }
};

export const hasIdeogramApiKey = async () => {
  const { ideogramProxyService } = await import('./ideogramProxy');
  return ideogramProxyService.hasApiKey();
};

export const testProxyConnection = async (proxyType?: string) => {
  try {
    const { ideogramProxyService } = await import('./ideogramProxy');
    await ideogramProxyService.generateImage("test", "ASPECT_1_1");
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
  return true; // Always true since we're using the proxy service
};