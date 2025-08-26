// ⚠️ DEPRECATED ⚠️
// API keys are now managed server-side through Supabase Edge Functions
// This file is kept for backward compatibility but is no longer used

export const HARDCODED_API_KEYS = {
  // These are no longer used - API keys are managed in Supabase Secrets
  OPENAI_API_KEY: "your-openai-api-key-here",
  IDEOGRAM_API_KEY: "your-ideogram-api-key-here",
} as {
  OPENAI_API_KEY?: string;
  IDEOGRAM_API_KEY?: string;
};

// Deprecated functions - kept for backward compatibility
export const hasHardcodedOpenAIKey = (): boolean => false;
export const hasHardcodedIdeogramKey = (): boolean => false;