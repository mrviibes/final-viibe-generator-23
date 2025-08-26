// Hardcoded API keys for direct frontend usage
// TODO: Replace "your-ideogram-api-key-here" with your actual Ideogram API key
export const HARDCODED_API_KEYS = {
  OPENAI_API_KEY: "your-openai-api-key-here",
  IDEOGRAM_API_KEY: "your-ideogram-api-key-here", // Replace this with your actual key
} as {
  OPENAI_API_KEY?: string;
  IDEOGRAM_API_KEY?: string;
};

export const hasHardcodedOpenAIKey = (): boolean => {
  return !!HARDCODED_API_KEYS.OPENAI_API_KEY && HARDCODED_API_KEYS.OPENAI_API_KEY !== "your-openai-api-key-here";
};

export const hasHardcodedIdeogramKey = (): boolean => {
  return !!HARDCODED_API_KEYS.IDEOGRAM_API_KEY && HARDCODED_API_KEYS.IDEOGRAM_API_KEY !== "your-ideogram-api-key-here";
};