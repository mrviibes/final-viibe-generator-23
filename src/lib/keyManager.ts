import { OPENAI_API_KEY, IDEOGRAM_API_KEY } from "@/config/secrets";

// Helper function to get API keys from localStorage with fallback to config
export function getOpenAIKey(): string {
  const localKey = localStorage.getItem('openai_api_key');
  return localKey || OPENAI_API_KEY;
}

export function getIdeogramKey(): string {
  const localKey = localStorage.getItem('ideogram_api_key');
  return localKey || IDEOGRAM_API_KEY;
}

// Helper function to check if we have valid API keys
export function hasOpenAIKey(): boolean {
  const key = getOpenAIKey();
  return key && key.length > 0 && key.startsWith('sk-') && !key.includes("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");
}

export function hasIdeogramKey(): boolean {
  const key = getIdeogramKey();
  return key && key.length > 0 && !key.includes("eNjkjRoZLZXZtZCYZ2gJCEAWFv6b-3TCLuAui6FV2EE5NFPwKDOssGQfDMa4eNSvM0HtYaspNZ0TYiAHB3k4IQ");
}

// Helper function to create masked preview of API keys
export function getMaskedKey(key: string): string {
  if (!key || key.length < 8) return "Not set";
  return `${key.substring(0, 4)}****...${key.substring(key.length - 4)}`;
}

// Export masked previews for UI display
export function getOpenAIKeyPreview(): string {
  return getMaskedKey(getOpenAIKey());
}

export function getIdeogramKeyPreview(): string {
  return getMaskedKey(getIdeogramKey());
}

// Key source indicator
export function getKeySource(type: 'openai' | 'ideogram'): 'localStorage' | 'config' | 'none' {
  if (type === 'openai') {
    if (localStorage.getItem('openai_api_key')) return 'localStorage';
    if (OPENAI_API_KEY && !OPENAI_API_KEY.includes("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")) return 'config';
  } else {
    if (localStorage.getItem('ideogram_api_key')) return 'localStorage';
    if (IDEOGRAM_API_KEY && !IDEOGRAM_API_KEY.includes("eNjkjRoZLZXZtZCYZ2gJCEAWFv6b-3TCLuAui6FV2EE5NFPwKDOssGQfDMa4eNSvM0HtYaspNZ0TYiAHB3k4IQ")) return 'config';
  }
  return 'none';
}