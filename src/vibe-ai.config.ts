/*
  Vibe Generator — FRAME MODE (AI DISABLED)
  Purpose: Minimal config for frame-only interface
  All AI functionality has been disabled
*/

// Minimal runtime config for frame mode
export interface AIRuntimeOverrides {
  frameMode?: boolean;
}

export function getRuntimeOverrides(): AIRuntimeOverrides {
  return { frameMode: true };
}

export function setRuntimeOverrides(overrides: Partial<AIRuntimeOverrides>): void {
  // No-op in frame mode
}

export function clearRuntimeOverrides(): void {
  // No-op in frame mode
}

// Basic types for UI compatibility
export type ReasoningEffort = "low" | "medium" | "high";
export type VisualStyle = "Realistic" | "Caricature" | "Anime" | "3D Animated" | "Illustrated" | "Pop Art";
export type VisualGenOption = "AI Assist" | "Design Myself" | "No Visuals";
export type Tone = "Humorous" | "Savage" | "Sentimental" | "Nostalgic" | "Romantic" | "Inspirational" | "Playful" | "Serious";
export type Category = "Celebrations" | "Sports" | "Daily Life" | "Vibes & Punchlines" | "Pop Culture" | "No Category";
export type AspectPreset = "Square" | "Landscape" | "Portrait" | "Custom";

export interface AspectRatioSpec {
  preset: AspectPreset;
  width_px?: number;
  height_px?: number;
  aspect_ratio?: string;
}

export interface UserInputs {
  category: Category;
  subcategory?: string | null;
  secondary_subcategory?: string | null;
  search_term?: string | null;
  tone: Tone;
  tags?: string[];
  visual_style?: VisualStyle;
  visual_generation_option: VisualGenOption;
  aspect_ratio: AspectRatioSpec;
  recipient_name?: string;
  relationship?: string;
  language?: string;
}

export interface GeneratedPhrase {
  text: string;
  truncated: boolean;
}

export interface GeneratedImagePrompt {
  prompt: string;
  relevance: string;
}

export interface OutputSchema {
  category: string;
  subcategory: string;
  secondary_subcategory: string;
  search_term: string;
  tone: string;
  tags: string[];
  generated_phrases: GeneratedPhrase[];
  visual_style: string;
  visual_generation_option: string;
  generated_image_prompts: GeneratedImagePrompt[];
  aspect_ratio: Required<AspectRatioSpec> | AspectRatioSpec;
  errors: string[];
}

// Legacy compatibility
export interface VibeInputs extends Partial<UserInputs> {}
export interface VibeCandidate {
  line: string;
  blocked: boolean;
  reason?: string;
}
export interface VibeResult {
  candidates: string[];
  picked: string;
  audit: {
    model: string;
    modelDisplayName?: string;
    textSpeed?: string;
    usedFallback: boolean;
    blockedCount: number;
    candidateCount: number;
    reason?: string;
    retryAttempt?: number;
    originalModel?: string;
    originalModelDisplayName?: string;
    spellingFiltered?: number;
    topUpUsed?: boolean;
  };
}

export interface IdeogramHandoff {
  key_line?: string;
  category?: string;
  subcategory_primary?: string;
  subcategory_secondary?: string;
  rec_subject?: string;
  rec_background?: string;
  chosen_visual?: string;
  visual_style?: string;
  tone?: string;
  aspect_ratio?: string;
  negative_prompt?: string;
}

// Minimal config for frame mode
export const AI_CONFIG = {
  version: "1.0.0-frame",
  frameMode: true,
  limits: {
    max_phrases: 4,
    max_image_prompts: 4,
    phrase_char_limit: 100
  }
};

// Empty defaults to prevent errors
export const DEFAULT_NEGATIVE_PROMPT = "";
export const MODEL_FALLBACK_CHAINS = { text: [], visual: [] };
export const AVAILABLE_MODELS: string[] = [];
export const MODEL_DISPLAY_NAMES: Record<string, string> = {};
export const SYSTEM_PROMPTS = {};
export const BANNED_PATTERNS: RegExp[] = [];
export const META_BANNED_PHRASES: RegExp[] = [];
export const BANNED_WORDS: string[] = [];
export const TONE_FALLBACKS: Record<string, string> = {};
export const BACKGROUND_PRESETS: any[] = [];
export const TONES: Tone[] = ["Humorous", "Savage", "Sentimental", "Nostalgic", "Romantic", "Inspirational", "Playful", "Serious"];
export const VISUAL_STYLES: VisualStyle[] = ["Realistic", "Caricature", "Anime", "3D Animated", "Illustrated", "Pop Art"];

// Stub functions to prevent errors
export function getEffectiveConfig() {
  return AI_CONFIG;
}

export function getSmartFallbackChain(userModel: string, type: 'text' | 'visual' = 'text'): string[] {
  return [];
}

export function buildCompactVibeMessages(inputs: VibeInputs): any[] {
  return [];
}

export function buildCompactVisualMessages(inputs: any): any[] {
  return [];
}

export function buildStrictLaneMessages(inputs: VibeInputs): any[] {
  return [];
}

export function injectPromptVariation(basePrompt: string): string {
  return basePrompt;
}

export function buildPopCultureSearchPrompt(category: string, searchTerm: string): string {
  return `Frame mode: Search for ${category} - ${searchTerm}`;
}

export function buildGenerateTextMessages(params: any): any[] {
  return [];
}