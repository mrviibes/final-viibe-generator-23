import { getOpenAIKey, getIdeogramKey } from "@/config/secrets";

// Helper function to check if we have valid API keys (config-only)
export function hasOpenAIKey(): boolean {
  const key = getOpenAIKey();
  return key && key.length > 0 && key.startsWith('sk-');
}

export function hasIdeogramKey(): boolean {
  const key = getIdeogramKey();
  return key && key.length > 0;
}

// Simple rate limiting (1 request per 3 seconds per tab)
const requestTimes = new Map<string, number>();

export function checkRateLimit(apiType: 'openai' | 'ideogram'): boolean {
  const now = Date.now();
  const lastRequest = requestTimes.get(apiType) || 0;
  
  if (now - lastRequest < 3000) {
    return false; // Rate limited
  }
  
  requestTimes.set(apiType, now);
  return true;
}