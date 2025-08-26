/*
 * PASTE YOUR REAL API KEYS HERE (one-time setup):
 * 
 * 1. Replace BOTH keys below with your actual keys:
 *    - OpenAI: Get from https://platform.openai.com/api-keys
 *    - Ideogram: Get from https://ideogram.ai/api
 * 
 * 2. Keys will be visible to anyone who inspects the code
 * 
 * Optional obfuscation (copy/paste in browser console to encode):
 *   btoa("your-actual-openai-key-here")
 *   btoa("your-actual-ideogram-key-here")
 */

// PASTE YOUR ACTUAL KEYS HERE (or base64 encoded versions):
const OPENAI_KEY_ENCODED = "sk-proj-YOUR_REAL_OPENAI_KEY_HERE";
const IDEOGRAM_KEY_ENCODED = "YOUR_REAL_IDEOGRAM_KEY_HERE";

// Decode function (handles both plain and base64)
function decodeKey(key: string): string {
  try {
    // If it looks like base64, decode it
    if (!key.startsWith('sk-') && !key.includes('-')) {
      return atob(key);
    }
  } catch (e) {
    // Not base64, return as-is
  }
  return key;
}

export function getOpenAIKey(): string {
  return decodeKey(OPENAI_KEY_ENCODED);
}

export function getIdeogramKey(): string {
  return decodeKey(IDEOGRAM_KEY_ENCODED);
}

// Health check for development (no key logging)
console.log("🔑 Keys configured:", {
  openai: getOpenAIKey().length > 0,
  ideogram: getIdeogramKey().length > 0
});