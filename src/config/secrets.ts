// REPLACE THESE WITH YOUR ACTUAL API KEYS
export const OPENAI_API_KEY = "REPLACE_WITH_YOUR_OPENAI_API_KEY";
export const IDEOGRAM_API_KEY = "REPLACE_WITH_YOUR_IDEOGRAM_API_KEY";

// Validate that keys have been replaced
if (OPENAI_API_KEY === "REPLACE_WITH_YOUR_OPENAI_API_KEY") {
  console.error("❌ OpenAI API key not set! Please update src/config/secrets.ts");
  throw new Error("OpenAI API key not configured");
}

if (IDEOGRAM_API_KEY === "REPLACE_WITH_YOUR_IDEOGRAM_API_KEY") {
  console.error("❌ Ideogram API key not set! Please update src/config/secrets.ts");
  throw new Error("Ideogram API key not configured");
}

console.log("✅ API keys loaded successfully");