// REPLACE THESE WITH YOUR ACTUAL API KEYS
export const OPENAI_API_KEY = "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";
export const IDEOGRAM_API_KEY = "eNjkjRoZLZXZtZCYZ2gJCEAWFv6b-3TCLuAui6FV2EE5NFPwKDOssGQfDMa4eNSvM0HtYaspNZ0TYiAHB3k4IQ";

// Check if keys have been replaced
export const HAS_OPENAI_KEY = OPENAI_API_KEY !== "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";
export const HAS_IDEOGRAM_KEY = IDEOGRAM_API_KEY !== "eNjkjRoZLZXZtZCYZ2gJCEAWFv6b-3TCLuAui6FV2EE5NFPwKDOssGQfDMa4eNSvM0HtYaspNZ0TYiAHB3k4IQ";

// Log warnings for missing keys
if (!HAS_OPENAI_KEY) {
  console.warn("⚠️ OpenAI API key not set! Please update src/config/secrets.ts");
}

if (!HAS_IDEOGRAM_KEY) {
  console.warn("⚠️ Ideogram API key not set! Please update src/config/secrets.ts");
}

if (HAS_OPENAI_KEY && HAS_IDEOGRAM_KEY) {
  console.log("✅ API keys loaded successfully");
}