/*
 * DEPRECATED: API keys are now managed server-side for security
 * 
 * This file is kept for backward compatibility but keys are no longer used.
 * All API calls now go through the secure server proxy.
 * 
 * To configure API keys:
 * 1. Deploy the server from server/ folder  
 * 2. Set OPENAI_API_KEY and IDEOGRAM_API_KEY environment variables on server
 * 3. Set VITE_SERVER_URL to your deployed server URL in frontend
 * 
 * See server/DEPLOYMENT.md for detailed instructions.
 */

// Legacy functions kept for compatibility (return empty strings)
export function getOpenAIKey(): string {
  console.warn('getOpenAIKey() is deprecated - API keys are now server-side');
  return "";
}

export function getIdeogramKey(): string {
  console.warn('getIdeogramKey() is deprecated - API keys are now server-side');
  return "";
}

export function getIdeogramProxyUrl(): string {
  console.warn('getIdeogramProxyUrl() is deprecated - all requests use server proxy');
  return "";
}