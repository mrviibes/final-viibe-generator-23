// Thin wrapper - all AI logic now centralized in vibe-ai.config.ts
// This file maintains backward compatibility while pointing to the single source of truth

export {
  systemPrompt,
  buildDeveloperPrompt,
  fewShotAnchors,
  fallbackByTone,
  bannedPatterns,
  bannedWords,
  type VibeInputs
} from '../vibe-ai.config';