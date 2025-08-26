// REPLACE THESE WITH YOUR ACTUAL API KEYS
export const OPENAI_API_KEY = "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".trim();
export const IDEOGRAM_API_KEY = "eNjkjRoZLZXZtZCYZ2gJCEAWFv6b-3TCLuAui6FV2EE5NFPwKDOssGQfDMa4eNSvM0HtYaspNZ0TYiAHB3k4IQ".trim();

// Helper function to create masked preview of API keys
const getMaskedKey = (key: string) => {
  if (!key || key.length < 8) return "Not set";
  return `${key.substring(0, 4)}****...${key.substring(key.length - 4)}`;
};

// Check if keys have been replaced (more robust detection)
export const HAS_OPENAI_KEY = OPENAI_API_KEY && 
  OPENAI_API_KEY.length > 0 && 
  !OPENAI_API_KEY.includes("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");

export const HAS_IDEOGRAM_KEY = IDEOGRAM_API_KEY && 
  IDEOGRAM_API_KEY.length > 0 && 
  !IDEOGRAM_API_KEY.includes("eNjkjRoZLZXZtZCYZ2gJCEAWFv6b-3TCLuAui6FV2EE5NFPwKDOssGQfDMa4eNSvM0HtYaspNZ0TYiAHB3k4IQ");

// Export masked previews for UI display
export const OPENAI_KEY_PREVIEW = getMaskedKey(OPENAI_API_KEY);
export const IDEOGRAM_KEY_PREVIEW = getMaskedKey(IDEOGRAM_API_KEY);

// Log detailed key status for debugging
console.log("🔑 API Key Status:");
console.log(`OpenAI: ${HAS_OPENAI_KEY ? '✅ Loaded' : '❌ Missing'} (Length: ${OPENAI_API_KEY?.length || 0})`);
console.log(`Ideogram: ${HAS_IDEOGRAM_KEY ? '✅ Loaded' : '❌ Missing'} (Length: ${IDEOGRAM_API_KEY?.length || 0})`);

if (!HAS_OPENAI_KEY) {
  console.warn("⚠️ OpenAI API key not set! Please update src/config/secrets.ts");
}

if (!HAS_IDEOGRAM_KEY) {
  console.warn("⚠️ Ideogram API key not set! Please update src/config/secrets.ts");
}

if (HAS_OPENAI_KEY && HAS_IDEOGRAM_KEY) {
  console.log("✅ All API keys loaded successfully");
}