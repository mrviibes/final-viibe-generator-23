// Legacy file - API keys are now managed server-side
// These functions are kept for backward compatibility but always return false

export function hasOpenAIKey(): boolean {
  console.warn('hasOpenAIKey() is deprecated - use server health checks instead');
  return false;
}

export function hasIdeogramKey(): boolean {
  console.warn('hasIdeogramKey() is deprecated - use server health checks instead');  
  return false;
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