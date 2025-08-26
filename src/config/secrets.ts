// ⚠️ SECURITY WARNING ⚠️
// Hardcoding API keys in frontend code exposes them to all users
// Only use this for development or if you understand the security risks
// For production, consider using a backend proxy or server-side API calls

export const HARDCODED_API_KEYS = {
  // Add your API keys here to hardcode them
  OPENAI_API_KEY: "your-openai-api-key-here",
  IDEOGRAM_API_KEY: "your-ideogram-api-key-here",
} as {
  OPENAI_API_KEY?: string;
  IDEOGRAM_API_KEY?: string;
};

// Check if hardcoded keys are available and valid
export const hasHardcodedOpenAIKey = (): boolean => {
  const key = HARDCODED_API_KEYS.OPENAI_API_KEY;
  return Boolean(
    key && 
    key !== "your-openai-api-key-here" && 
    key.startsWith("sk-") && 
    key.length > 20
  );
};

export const hasHardcodedIdeogramKey = (): boolean => {
  const key = HARDCODED_API_KEYS.IDEOGRAM_API_KEY;
  return Boolean(
    key && 
    key !== "your-ideogram-api-key-here" && 
    key.length > 10
  );
};