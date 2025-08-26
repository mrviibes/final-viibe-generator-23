// REPLACE THESE WITH YOUR ACTUAL API KEYS
export const OPENAI_API_KEY = "REPLACE_WITH_YOUR_OPENAI_API_KEY";
export const IDEOGRAM_API_KEY = "REPLACE_WITH_YOUR_IDEOGRAM_API_KEY";

// Check if keys have been replaced
export const HAS_OPENAI_KEY = OPENAI_API_KEY !== "REPLACE_WITH_YOUR_OPENAI_API_KEY";
export const HAS_IDEOGRAM_KEY = IDEOGRAM_API_KEY !== "REPLACE_WITH_YOUR_IDEOGRAM_API_KEY";

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