// Hardcoded API keys and proxy settings
// WARNING: These keys will be exposed in the frontend bundle

export const IDEOGRAM_API_KEY = "your-ideogram-api-key-here";
export const OPENAI_API_KEY = "your-openai-api-key-here";

// CORS proxy configuration for Ideogram API
export const CORS_PROXY_TYPE = "proxy-cors-sh" as const;
export const CORS_PROXY_API_KEY = "your-proxy-cors-sh-api-key-here"; // Optional, only for proxy.cors.sh

// Available proxy types:
// - "proxy-cors-sh": Most reliable, requires API key
// - "cors-anywhere": Free but requires manual activation
// - "allorigins": Free but GET only, won't work for Ideogram
// - "thingproxy": Free but unreliable
// - "direct": No proxy, will likely fail due to CORS