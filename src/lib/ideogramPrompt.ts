import { 
  buildIdeogramPrompt as buildPrompt,
  getAspectRatioForIdeogram as getAspectRatio,
  getStyleTypeForIdeogram as getStyleType,
  type IdeogramHandoff
} from '../vibe-ai.config';

// All functions now imported from centralized config
export const buildIdeogramPrompt = buildPrompt;
export const getAspectRatioForIdeogram = getAspectRatio;
export const getStyleTypeForIdeogram = getStyleType;