// Feature flags to control AI functionality
export interface FeatureFlags {
  AI_ENABLED: boolean;
  IDEOGRAM_ENABLED: boolean;
  TEXT_GENERATION_ENABLED: boolean;
  VISUAL_GENERATION_ENABLED: boolean;
  POP_CULTURE_CONTEXT_ENABLED: boolean;
}

// Set all AI flags to false to disable AI functionality
export const FEATURE_FLAGS: FeatureFlags = {
  AI_ENABLED: false,
  IDEOGRAM_ENABLED: false,
  TEXT_GENERATION_ENABLED: false,
  VISUAL_GENERATION_ENABLED: false,
  POP_CULTURE_CONTEXT_ENABLED: false,
};

// Helper functions to check feature flags
export const isAIEnabled = () => FEATURE_FLAGS.AI_ENABLED;
export const isIdeogramEnabled = () => FEATURE_FLAGS.IDEOGRAM_ENABLED;
export const isTextGenerationEnabled = () => FEATURE_FLAGS.TEXT_GENERATION_ENABLED;
export const isVisualGenerationEnabled = () => FEATURE_FLAGS.VISUAL_GENERATION_ENABLED;
export const isPopCultureContextEnabled = () => FEATURE_FLAGS.POP_CULTURE_CONTEXT_ENABLED;