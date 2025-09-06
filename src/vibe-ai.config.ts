/*
  Vibe Generator — Single-Source-of-Truth AI Config
  Purpose: Keep every AI rule, prompt, toggle, schema, and validator in ONE place.
  How to use:
    import { AI_CONFIG, buildOutput, validateInputs } from "./vibe-ai.config";
    const ok = validateInputs(userInputs);
    const result = buildOutput(userInputs);

  Change log:
    - v1.0.0 initial extraction
    - v1.1.0 added runtime overrides system
*/

import { detectExactTextRequest } from './lib/textUtils';

// Runtime overrides (stored in localStorage)
export interface AIRuntimeOverrides {
  model?: string;
  temperature?: number;
  spellcheckEnabled?: boolean;
  cleanBackgroundDefault?: boolean;
  spellingGuaranteeDefault?: boolean;
  defaultVisualStyle?: VisualStyle;
  defaultTone?: Tone;
  magicPromptEnabled?: boolean;
  ideogramModel?: 'V_2A_TURBO' | 'V_3';
  typographyStyle?: 'negative-space' | 'meme-style' | 'lower-third' | 'side-bar' | 'badge-sticker' | 'subtle-caption';
  strictModelEnabled?: boolean;
  fastVisualsEnabled?: boolean;
  showAdvancedPromptDetails?: boolean;
}

// Get runtime overrides from localStorage
export function getRuntimeOverrides(): AIRuntimeOverrides {
  try {
    const stored = localStorage.getItem('ai-runtime-overrides');
    let overrides: AIRuntimeOverrides = stored ? JSON.parse(stored) : {};
    
    // Force defaults for locked customer settings
    overrides.spellcheckEnabled = true; // Always ON
    if (!overrides.ideogramModel) {
      overrides.ideogramModel = 'V_3'; // Default to V3
    }
    
    // Set admin defaults if not explicitly set
    if (overrides.strictModelEnabled === undefined) {
      overrides.strictModelEnabled = true;
    }
    
    return overrides;
  } catch {
    // Set forced defaults as fallback
    const defaults = {
      spellcheckEnabled: true,
      ideogramModel: 'V_3' as const,
      strictModelEnabled: true
    };
    setRuntimeOverrides(defaults);
    return defaults;
  }
}

// Set runtime overrides in localStorage - ADMIN ONLY VIA CODE
// Customer UI cannot modify these settings
export function setRuntimeOverrides(overrides: Partial<AIRuntimeOverrides>): void {
  // No-op for customers - settings are hard-locked
  // To change defaults, modify the values in getRuntimeOverrides() function above
  console.log('setRuntimeOverrides called - settings are locked. To change defaults, modify code in vibe-ai.config.ts');
}

// Clear all runtime overrides
export function clearRuntimeOverrides(): void {
  try {
    localStorage.removeItem('ai-runtime-overrides');
  } catch (error) {
    console.warn('Failed to clear AI runtime overrides:', error);
  }
}

// =========================
// 1) Types and Enums
// =========================
export type ReasoningEffort = "low" | "medium" | "high";
export type VisualStyle = "Realistic" | "Caricature" | "Anime" | "3D Animated" | "Illustrated" | "Pop Art";
export type VisualGenOption = "AI Assist" | "Design Myself" | "No Visuals";
export type Tone =
  | "Humorous"
  | "Savage"
  | "Sentimental"
  | "Nostalgic"
  | "Romantic"
  | "Inspirational"
  | "Playful"
  | "Serious";

export type Category =
  | "Celebrations"
  | "Sports"
  | "Daily Life"
  | "Vibes & Punchlines"
  | "Pop Culture"
  | "No Category";

export type AspectPreset = "Square" | "Landscape" | "Portrait" | "Custom";

export interface AspectRatioSpec {
  preset: AspectPreset;
  width_px?: number; // required when preset === "Custom"
  height_px?: number; // required when preset === "Custom"
  aspect_ratio?: string; // required when preset === "Custom", e.g., "3:2"
}

export interface UserInputs {
  category: Category;
  subcategory?: string | null; // required unless category === "No Category"
  secondary_subcategory?: string | null; // Pop Culture only
  search_term?: string | null; // optional
  tone: Tone; // required
  tags?: string[]; // optional
  visual_style?: VisualStyle; // required if visuals used
  visual_generation_option: VisualGenOption; // required
  aspect_ratio: AspectRatioSpec; // required
  recipient_name?: string; // optional
  relationship?: string; // optional
  language?: string; // optional
}

export interface GeneratedPhrase {
  text: string; // max 100 chars
  truncated: boolean;
}

export interface GeneratedImagePrompt {
  prompt: string;
  relevance: string; // short rationale
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
  aspect_ratio: Required<AspectRatioSpec> | AspectRatioSpec; // preserve user intention
  errors: string[];
}

// Legacy types for backward compatibility
export interface VibeInputs extends Partial<UserInputs> {
  // Backward compatibility mappings
}

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

// =========================
// 2) Feature Flags and Constants  
// =========================

// Shortened negative prompt for more focused generation
export const DEFAULT_NEGATIVE_PROMPT = "misspellings, blurry text, watermarks, logos, extra text, microtext, low contrast";
// Model fallback chains for retry strategy
export const MODEL_FALLBACK_CHAINS = {
  text: [
    'gpt-5-mini-2025-08-07',
    'gpt-4.1-2025-04-14', 
    'o4-mini-2025-04-16'
  ],
  visual: [
    'gpt-5-mini-2025-08-07',
    'gpt-4.1-2025-04-14',
    'o4-mini-2025-04-16'
  ]
};

// Available models for UI  
export const AVAILABLE_MODELS = [
  'gpt-4o-mini',
  'gpt-5-mini-2025-08-07',
  'gpt-5-2025-08-07', 
  'gpt-4.1-2025-04-14',
  'o4-mini-2025-04-16',
  'o3-2025-04-16'
];

// Friendly model names for display
export const MODEL_DISPLAY_NAMES: Record<string, string> = {
  'gpt-5-2025-08-07': 'GPT-5',
  'gpt-5-mini-2025-08-07': 'GPT-5 Mini', 
  'gpt-4.1-2025-04-14': 'GPT-4.1',
  'gpt-4.1-mini-2025-04-14': 'GPT-4.1 Mini',
  'o4-mini-2025-04-16': 'O4 Mini',
  'o3-2025-04-16': 'O3',
  'gpt-4o-mini': 'GPT-4o Mini (Legacy)',
  'gpt-4o': 'GPT-4o (Legacy)'
};

export const AI_CONFIG = {
  version: "1.0.0",
  reasoning_effort: "medium" as ReasoningEffort,
  limits: {
    max_phrases: 4,
    max_image_prompts: 4,
    phrase_char_limit: 100
  },
  spellcheck: {
    enabled: true,
    // crude stoplist-only fallback. Use your preferred spellcheck service in production
    allowlist: [
      "Pop", "Art", "Anime", "3D", "Birthday", "Billy", "Madison",
      "Okanagan", "Kelowna", "NonStop", "Disposal"
    ]
  },
  visual_defaults: {
    style: "Illustrated" as VisualStyle,
    option: "AI Assist" as VisualGenOption
  },
  aspect_defaults: {
    preset: "Square" as AspectPreset
  },
  categories: {
    requireSubcategory: (cat: Category) => cat !== "No Category",
    popCultureAllowsSecondary: (cat: Category) => cat === "Pop Culture"
  },
  generation: {
    max_candidates: 6,
    temperature: 0.7,
    max_tokens: 80, // Further reduced for speed
    model: 'gpt-4.1-2025-04-14' // GPT-4.1 only
  },
  visual_generation: {
    max_tokens: 350, // Reduced for faster concepts 
    fast_max_tokens: 120, // For ultra-fast generation
    model: 'gpt-4o-mini' // Fast mini model by default
  }
};

// Helper to get smart fallback chain based on user's selected model
export function getSmartFallbackChain(userModel: string, type: 'text' | 'visual' = 'text'): string[] {
  const baseChain = MODEL_FALLBACK_CHAINS[type];
  
  // If user model is in our chain, start with it and add others
  if (baseChain.includes(userModel)) {
    return [userModel, ...baseChain.filter(m => m !== userModel)];
  }
  
  // If user selected a model outside our chain, try it first then fallback
  return [userModel, ...baseChain];
}

// Get effective configuration with runtime overrides applied
export function getEffectiveConfig() {
  const overrides = getRuntimeOverrides();
  
  // Force GPT-4.1 for any saved override to ensure consistency
  const forcedModel = 'gpt-4.1-2025-04-14';
  
  return {
    ...AI_CONFIG,
    spellcheck: {
      ...AI_CONFIG.spellcheck,
      enabled: true // Always enabled for customers
    },
    visual_defaults: {
      ...AI_CONFIG.visual_defaults,
      style: overrides.defaultVisualStyle ?? AI_CONFIG.visual_defaults.style
    },
    generation: {
      ...AI_CONFIG.generation,
      model: forcedModel, // Always use GPT-4.1
      temperature: overrides.temperature ?? AI_CONFIG.generation.temperature
    },
    visual_generation: {
      ...AI_CONFIG.visual_generation,
      model: forcedModel, // Always use GPT-4.1
      max_tokens: overrides.fastVisualsEnabled ? AI_CONFIG.visual_generation.fast_max_tokens : AI_CONFIG.visual_generation.max_tokens
    }
  };
}

// Utility to inject dynamic variation into prompts to prevent duplicate outputs
export function injectPromptVariation(basePrompt: string): string {
  const variationId = Math.floor(Math.random() * 10000);
  const timestamp = Date.now() % 1000;
  const uniqueSeed = `[VAR:${variationId}_${timestamp}]`;
  
  // Add variation seed and ensure unique outputs
  return basePrompt.replace('JSON:', `CRITICAL: Generate completely unique content, no repetition across sessions. ${uniqueSeed} JSON:`);
}

// =========================
// 3) Prompts and System Messages
// =========================
export const SYSTEM_PROMPTS = {
  vibe_maker: `Create a single line under 100 characters. Match the tone. Use tags as hints. Be witty or sincere, never cruel. Write complete, natural phrases - avoid filler words and awkward endings. JSON only: {"line":"..."}`,
  
  vibe_generator: `Write 6 distinct short-form options in the specified tone. Vary structure, theme, and wording. No repetition. Write complete, natural phrases that flow well - avoid filler words like "just" and awkward incomplete endings. JSON only.`,

  visual_generator: `Generate 4 unique visual concepts for image generation. Each 30-50 words with tags: [TAGS: keywords], [TEXT_SAFE_ZONE: zone], [CONTRAST_PLAN: strategy], [TEXT_HINT: color]. Match user context exactly. Vary compositions dramatically. High contrast text zones. Write complete, natural descriptions that flow well - avoid filler words and awkward endings. JSON: {"concepts": ["...", "...", "...", "..."]}`,

  visual_generator_fast: `Generate 4 distinct visual concepts. Each 20-40 words with: [TAGS: keywords], [TEXT_SAFE_ZONE: zone], [CONTRAST_PLAN: strategy], [TEXT_HINT: color]. Match context. Vary compositions significantly. Write complete, natural descriptions - avoid filler words and incomplete phrases. JSON: {"concepts": ["...", "...", "...", "..."]}`,
};

// =========================
// 4) Validation and Banned Content
// =========================
export const BANNED_PATTERNS = [
  /here are .*:?$/i,
  /here's .*:?$/i,
  /\bhere are some\b/i,
  /\bhere's some\b/i,
  /\bhere are a few\b/i,
  /\bhere's a few\b/i,
  /^1\./,
  /^•/,
  /^\*/,
  /^-\s/,
  /\bfor example\b/i,
  /\balternatively\b/i,
  /\banother option\b/i,
  /\bhow about\b/i,
  /\byou could also say\b/i,
  /\btry this\b/i,
  /\bhave fun with\b/i,
  /\bmake it fun\b/i,
  /\bgood luck\b/i,
  /\bhope this helps\b/i,
  /let me know if/i,
  /\bsuggestion\b/i,
  /\brecommendation\b/i,
  /\boption\b.*\d/i,
  /version \d/i,
  /variation \d/i,
  /:$/,
  /^Note:/i,
  /^Remember:/i,
  /^Keep in mind/i,
  /^Feel free/i,
  /^Don't forget/i,
  /^Make sure/i,
  /^You can/i,
  /^Consider/i,
  /^Think about/i,
  /\bassistant\b/i,
  /\bAI\b/,
  /\bgenerat/i,
  /\bcreat/i,
  /\bsuggestion/i,
  /\bmeta/i,
  /\binstead\b/i,
  /\bother\b.*\boption/i,
  /\banother\b.*\bidea/i,
  /\balternat/i,
  /\bvariation/i,
  /^\d+[\.\)]/,
  /\bchoose\b/i,
  /\bselect\b/i,
  /\bpick\b/i,
  /\bdecide\b/i,
  /\bupdate\b.*\bwith\b/i,
  /\breplace\b.*\bwith\b/i,
  /\bswap\b.*\bfor\b/i,
  /\bchange\b.*\bto\b/i,
  /feel free to/i,
  /\btip\b:/i,
  /\bbonus\b:/i,
  /\bpro tip\b/i,
  /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu, // emojis
  /#\w+/g, // hashtags
  /["'""`]/g, // quotes
  /\n|\r/g, // newlines
  // Ban "vibes/energy" endings and specific patterns
  /\bvibes?\s*$/i,
  /\benergy\s*$/i,
  /\bold and direct as requested\s+(vibes?|energy)/i
];

// Additional patterns for meta/filler phrases that should never appear
export const META_BANNED_PHRASES = [
  /short and witty like you asked/i,
  /witty like you asked/i,
  /as requested/i,
  /per your request/i,
  /like you wanted/i,
  /as you asked/i,
  /here you go/i,
  /there you have it/i,
  /voila/i,
  /ta-da/i,
  /perfect for you/i,
  /just for you/i,
  /custom.*for you/i,
  /tailored.*for you/i,
  /made.*for you/i,
  /\bvibes?\s+(activated?|on|ready|engaged)\b/i,
  /\benergy\s+(activated?|mode|vibes?)\b/i,
  /\bmode\s+(activated?|on|engaged)\b/i
];

export const BANNED_WORDS = [
  'assistant',
  'ai',
  'generate',
  'generator',
  'create',
  'creating',
  'suggestion',
  'recommend',
  'option',
  'alternative',
  'variation',
  'example',
  'sample',
  'shit', 'fuck', 'damn', 'bitch', 'ass', 'hell',
  'stupid', 'idiot', 'moron', 'loser', 'ugly', 'fat'
];

export const TONE_FALLBACKS: Record<string, string> = {
  humorous: "Comedy finds you when you least expect it.",
  savage: "Reality hits harder than expectations.",
  sentimental: "Feelings matter more than we admit.",
  nostalgic: "Yesterday's memories become today's treasures.",
  romantic: "Hearts connect when minds align perfectly.",
  inspirational: "Dreams become reality through consistent action.",
  playful: "Fun happens when you stop overthinking.",
  serious: "Professional excellence requires constant dedication."
};

// =========================
// 5) Validation Functions
// =========================
export function validateInputs(u: Partial<UserInputs>): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!u.category) errors.push("category is required");
  if (!u.tone) errors.push("tone is required");
  if (!u.visual_generation_option) errors.push("visual_generation_option is required");
  if (!u.aspect_ratio) errors.push("aspect_ratio is required");

  if (u.category && AI_CONFIG.categories.requireSubcategory(u.category)) {
    if (!u.subcategory || u.subcategory === "") {
      errors.push("subcategory is required for this category");
    }
  }

  if (u.category === "Pop Culture" && u.secondary_subcategory === undefined) {
    // optional but present as empty string for schema consistency
  }

  if (u.visual_generation_option !== "No Visuals") {
    if (!u.visual_style) errors.push("visual_style is required when visuals are used");
  }

  if (u.aspect_ratio) {
    if (u.aspect_ratio.preset === "Custom") {
      if (!u.aspect_ratio.width_px || !u.aspect_ratio.height_px || !u.aspect_ratio.aspect_ratio) {
        errors.push("custom aspect_ratio requires width_px, height_px, and aspect_ratio string");
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

// =========================
// 6) Text Processing Functions
// =========================
function normalizeTypography(text: string): string {
  return text
    // Convert curly quotes to straight quotes
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    // Convert em/en dashes to regular hyphens
    .replace(/[—–]/g, '-')
    // Normalize ellipsis
    .replace(/…/g, '...')
    .trim();
}

function applyIdiomsAndContractions(text: string): string {
  return text
    // Fix common hyphenated compounds
    .replace(/\bas-been\b/gi, 'has-been')
    .replace(/\ball-time\b/gi, 'all-time')
    .replace(/\bwell-known\b/gi, 'well-known')
    .replace(/\bhand-made\b/gi, 'handmade')
    .replace(/\bon-line\b/gi, 'online')
    .replace(/\boff-line\b/gi, 'offline')
    .replace(/\bre-do\b/gi, 'redo')
    .replace(/\bre-make\b/gi, 'remake')
    .replace(/\bto-do\b/gi, 'to-do')
    .replace(/\bup-to-date\b/gi, 'up-to-date')
    .replace(/\bstate-of-the-art\b/gi, 'state-of-the-art')
    .replace(/\bself-made\b/gi, 'self-made')
    .replace(/\bworld-class\b/gi, 'world-class')
    
    // Fix common missing apostrophes in contractions
    .replace(/\byoud\b/gi, "you'd")
    .replace(/\byoure\b/gi, "you're")
    .replace(/\byoull\b/gi, "you'll")
    .replace(/\byouve\b/gi, "you've")
    .replace(/\btheyre\b/gi, "they're")
    .replace(/\btheyll\b/gi, "they'll")
    .replace(/\btheyve\b/gi, "they've")
    .replace(/\bwere\b/gi, "we're")
    .replace(/\bwell\b/gi, "we'll")
    .replace(/\bweve\b/gi, "we've")
    .replace(/\bits\b/gi, "it's")
    .replace(/\bim\b/gi, "I'm")
    .replace(/\bive\b/gi, "I've")
    .replace(/\bill\b/gi, "I'll")
    .replace(/\bid\b/gi, "I'd")
    .replace(/\bwont\b/gi, "won't")
    .replace(/\bcant\b/gi, "can't")
    .replace(/\bdont\b/gi, "don't")
    .replace(/\bdidnt\b/gi, "didn't")
    .replace(/\bwasnt\b/gi, "wasn't")
    .replace(/\bwerent\b/gi, "weren't")
    .replace(/\bisnt\b/gi, "isn't")
    .replace(/\barent\b/gi, "aren't")
    .replace(/\bhasnt\b/gi, "hasn't")
    .replace(/\bhavent\b/gi, "haven't")
    .replace(/\bhadnt\b/gi, "hadn't")
    .replace(/\bshouldnt\b/gi, "shouldn't")
    .replace(/\bwouldnt\b/gi, "wouldn't")
    .replace(/\bcouldnt\b/gi, "couldn't")
    
    // Fix common idiom errors
    .replace(/\bfor all intensive purposes\b/gi, 'for all intents and purposes')
    .replace(/\bcould care less\b/gi, 'couldn\'t care less')
    .replace(/\bone in the same\b/gi, 'one and the same')
    .replace(/\bmake due\b/gi, 'make do')
    .replace(/\bnip it in the butt\b/gi, 'nip it in the bud')
    .replace(/\bI could of\b/gi, 'I could have')
    .replace(/\bshould of\b/gi, 'should have')
    .replace(/\bwould of\b/gi, 'would have')
    .replace(/\bmight of\b/gi, 'might have');
}

function truncateIfNeeded(s: string, limit = AI_CONFIG.limits.phrase_char_limit): GeneratedPhrase {
  const over = s.length > limit;
  return { text: over ? s.slice(0, limit) : s, truncated: over };
}

function spellcheck(s: string): string[] {
  const config = getEffectiveConfig();
  if (!config.spellcheck.enabled) return [];
  // naive check, replace with real spellchecker as needed
  const tokens = s.split(/[^A-Za-z0-9']/).filter(Boolean);
  const issues: string[] = [];
  for (const t of tokens) {
    const looksWord = /[A-Za-z]{3,}/.test(t);
    if (!looksWord) continue;
    const ok = config.spellcheck.allowlist.includes(t) || /^[A-Za-z][a-z]+$/.test(t);
    if (!ok) issues.push(`possible spelling issue: ${t}`);
  }
  return issues;
}

export function postProcessLine(
  line: string, 
  tone: string, 
  tags?: string[], 
  options?: { allowNewlines?: boolean; format?: 'knockknock'; enforceNameGuard?: boolean; enforceTagPlacement?: boolean }
): VibeCandidate {
  // Clean up the line
  let cleaned = line.trim()
    .replace(/^["']|["']$/g, '')  // Remove quotes
    .replace(/^\d+[\.\)\-]\s*/, '') // Remove numbering
    .replace(/^[•\-\*]\s*/, '')     // Remove bullet points
    .replace(/[—–]/g, (match, offset, string) => {
      // If surrounded by spaces, replace with comma + space
      if (offset > 0 && offset < string.length - 1 && 
          string[offset - 1] === ' ' && string[offset + 1] === ' ') {
        return ', ';
      }
      // Otherwise replace with regular hyphen
      return '-';
    })
    // Remove forbidden symbols that cause text corruption
    .replace(/[%#&\/\\]/g, '')
    .trim();

  // Handle knock-knock format preservation
  if (options?.format === 'knockknock' && options?.allowNewlines) {
    // For knock-knock jokes, preserve the structure but clean excess whitespace
    cleaned = cleaned.replace(/\n\s*\n/g, '\n'); // Remove excessive line breaks
  } else {
    // For other formats, remove newlines as before
    cleaned = cleaned.replace(/\s*\n\s*/g, ' ');
  }

  // Universal Contract: Check punctuation whitelist first
  const bannedPunctuation = /[—""'']/g;
  if (bannedPunctuation.test(cleaned)) {
    return {
      line: cleaned,
      blocked: true,
      reason: 'Universal Contract violation: Contains banned punctuation (em-dashes, fancy quotes)'
    };
  }

  // Universal Contract: Check all tags are present (case-insensitive)
  if (tags && tags.length > 0) {
    const cleanedLower = cleaned.toLowerCase();
    const missingTags = tags.filter(tag => !cleanedLower.includes(tag.toLowerCase()));
    if (missingTags.length > 0) {
      return {
        line: cleaned,
        blocked: true,
        reason: `Universal Contract violation: Missing required tags: ${missingTags.join(', ')}`
      };
    }
  }

  // Check for banned patterns (meta-responses, instructional content)
  const isBannedPattern = BANNED_PATTERNS.some(pattern => pattern.test(cleaned));
  if (isBannedPattern) {
    return {
      line: cleaned,
      blocked: true,
      reason: 'Content contains banned patterns (meta-response or instructional)'
    };
  }

  // Check for meta/filler phrases that should never appear
  const isMetaBannedPhrase = META_BANNED_PHRASES.some(pattern => pattern.test(cleaned));
  if (isMetaBannedPhrase) {
    return {
      line: cleaned,
      blocked: true,
      reason: 'Content contains meta/filler phrases'
    };
  }

  // Check for banned words in isolation
  const words = cleaned.toLowerCase().split(/\s+/);
  const hasBannedWord = words.some(word => 
    BANNED_WORDS.some(banned => word.includes(banned.toLowerCase()))
  );
  if (hasBannedWord) {
    return {
      line: cleaned,
      blocked: true,
      reason: 'Content contains banned words (meta or instructional language)'
    };
  }

  // Name guard: block random proper names unless approved in tags
  if (options?.enforceNameGuard) {
    const approvedNames = tags?.map(tag => tag.toLowerCase()) || [];
    const commonNames = ['amy', 'steve', 'john', 'sarah', 'mike', 'lisa', 'david', 'karen', 'bob', 'jenny'];
    
    const hasRandomName = commonNames.some(name => {
      const namePattern = new RegExp(`\\b${name}\\b`, 'i');
      return namePattern.test(cleaned) && !approvedNames.some(approved => approved.includes(name));
    });
    
    if (hasRandomName) {
      return {
        line: cleaned,
        blocked: true,
        reason: 'Contains unapproved proper name'
      };
    }
  }

  // Spelling and quality checks
  const commonMisspellings = [
    { wrong: /\brecieve\b/gi, right: 'receive' },
    { wrong: /\bdefinate\b/gi, right: 'definite' },
    { wrong: /\boccured\b/gi, right: 'occurred' },
    { wrong: /\bexercizes\b/gi, right: 'exercises' },
    { wrong: /\benvironement\b/gi, right: 'environment' },
    { wrong: /\bmaintainence\b/gi, right: 'maintenance' },
    { wrong: /\binconvienient\b/gi, right: 'inconvenient' },
    { wrong: /\bprefer\b(?!red|ence|able)\w*/gi, right: 'prefer' }
  ];

  let hasSpellingIssues = false;
  for (const { wrong } of commonMisspellings) {
    if (wrong.test(cleaned)) {
      hasSpellingIssues = true;
      break;
    }
  }

  if (hasSpellingIssues) {
    return {
      line: cleaned,
      blocked: true,
      reason: 'Spelling issues detected'
    };
  }

  // Enhanced tag validation with placement checks
  if (tags && tags.length > 0) {
    // Filter out proper names from tag requirements (capitalized single words)
    const contentTags = tags.filter(tag => 
      !(tag.length <= 15 && /^[A-Z][a-z]+$/.test(tag.trim()))
    );
    
    if (contentTags.length > 0) {
      // Require ALL tags to be present (exact casing match)
      const missingTags = contentTags.filter(tag => {
        const lowerTag = tag.toLowerCase();
        const lowerCleaned = cleaned.toLowerCase();
        return !lowerCleaned.includes(lowerTag) && 
               // Allow partial matches for longer tags
               !(tag.length > 4 && lowerCleaned.includes(lowerTag.slice(0, -2)));
      });
      
      if (missingTags.length > 0) {
        return {
          line: cleaned,
          blocked: true,
          reason: `Missing required tags: ${missingTags.join(', ')}`
        };
      }
    }
  }

  // Length validation (hard limit 100 characters)
  if (cleaned.length > 100) {
    return {
      line: cleaned,
      blocked: true,
      reason: `Exceeds 100 character limit (${cleaned.length} chars)`
    };
  }

  // Forbidden punctuation check
  const forbiddenPunctuation = /[—–""'']/;
  if (forbiddenPunctuation.test(cleaned)) {
    return {
      line: cleaned,
      blocked: true,
      reason: 'Contains forbidden punctuation (em-dashes, smart quotes)'
    };
  }

  return {
    line: cleaned,
    blocked: false
  };
}

// =========================
// 7) Phrase Generation Rules
// =========================
function getFallbackVariants(tone: string, category: string, subcategory: string): string[] {
  const baseFallback = TONE_FALLBACKS[tone.toLowerCase()] || TONE_FALLBACKS.humorous;
  
  // Create 4 distinct variations based on tone and context (removing vibes/energy endings)
  const variations = [
    baseFallback,
    `${baseFallback} today`,
    `${baseFallback} right now`,
    `${baseFallback} perfectly`
  ];
  
  return variations;
}

function phraseCandidates(u: UserInputs): string[] {
  // minimal, deterministic templates per tone
  const base: Record<Tone, string[]> = {
    Humorous: [
      "Adding years, not wisdom, apparently.",
      "Proof you survived another lap around the sun.",
      "Cake first, decisions later.",
      "Aging like a meme from 2016."
    ],
    Savage: [
      "Another year, same excuses.",
      "You call those goals? Cute.",
      "Age is a number, discipline is not.",
      "Legends train, tourists post."
    ],
    Sentimental: [
      "Your story keeps getting better.",
      "Grateful for your light.",
      "Small moments, big meaning.",
      "Today, you matter most."
    ],
    Nostalgic: [
      "Back when plans were simple.",
      "Save the playlist, keep the memories.",
      "Old jokes, new laughs.",
      "Yesterday called, it misses you."
    ],
    Romantic: [
      "Meet me where the sparks are.",
      "Your smile reroutes the day.",
      "Hands, heartbeat, home.",
      "Two tickets to always."
    ],
    Inspirational: [
      "Small steps, loud results.",
      "Progress loves consistency.",
      "Start now, fix fast.",
      "Do the boring reps."
    ],
    Playful: [
      "Chaos with extra sprinkles.",
      "Try it, then brag.",
      "Snack now, plan later.",
      "Vibes set to mischievous."
    ],
    Serious: [
      "Decide, then execute.",
      "Remove noise, keep signal.",
      "Respect the process.",
      "Outcomes beat opinions."
    ]
  };

  let candidates = [...base[u.tone]];

  // Light context seasoning
  if (u.category === "Pop Culture" && u.search_term) {
    candidates = [...candidates];
    candidates[0] = `${u.search_term}: scene-stealer energy.`;
  }
  if (u.tags && u.tags.length) {
    candidates = [...candidates];
    candidates[1] = `${base[u.tone][1]} #${u.tags[0].replace(/\s+/g, "-")}`;
  }

  return candidates.slice(0, AI_CONFIG.limits.max_phrases);
}

// =========================
// 8) Image Prompt Builders
// =========================
function baseImagePrompt(u: UserInputs) {
  const ctx: string[] = [];
  ctx.push(`style: ${u.visual_style}`);
  ctx.push(`tone: ${u.tone}`);
  ctx.push(`category: ${u.category}`);
  if (u.subcategory) ctx.push(`subcategory: ${u.subcategory}`);
  if (u.secondary_subcategory) ctx.push(`secondary: ${u.secondary_subcategory}`);
  if (u.search_term) ctx.push(`reference: ${u.search_term}`);
  if (u.tags?.length) ctx.push(`tags: ${u.tags.join(", ")}`);
  ctx.push("clean background, high detail, studio lighting, no text");
  return ctx.join(", ");
}

function imagePromptVariants(u: UserInputs): GeneratedImagePrompt[] {
  if (u.visual_generation_option === "No Visuals") return [];

  const b = baseImagePrompt(u);
  const out: GeneratedImagePrompt[] = [
    { prompt: `${b}, primary scene, subject centered, dynamic composition`, relevance: "Primary context match" },
    { prompt: `${b}, candid moment, off-center framing, environmental details`, relevance: "Alt framing, same tone" },
    { prompt: `${b}, close-up portrait, shallow depth, expressive face`, relevance: "Portrait option" },
    { prompt: `${b}, wide shot, group energy, action captured`, relevance: "Group option" }
  ];

  return out.slice(0, AI_CONFIG.limits.max_image_prompts);
}

// =========================
// 8.5) Background Style System
// =========================
export interface BackgroundPreset {
  id: string;
  name: string;
  keywords: string[];
  textSafeZone: 'top' | 'bottom' | 'left' | 'right' | 'corners';
  style: string;
}

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  { id: 'minimal', name: 'Clean & Minimal', keywords: ['minimal background', 'clean white space', 'simple backdrop'], textSafeZone: 'corners', style: 'modern minimalist' },
  { id: 'urban', name: 'Urban Street', keywords: ['city street', 'urban landscape', 'graffiti wall', 'brick wall'], textSafeZone: 'top', style: 'gritty urban' },
  { id: 'nature', name: 'Natural Outdoors', keywords: ['forest background', 'mountain vista', 'beach setting', 'park scene'], textSafeZone: 'bottom', style: 'natural lighting' },
  { id: 'neon', name: 'Neon Nights', keywords: ['neon lights', 'night city', 'glowing signs', 'electric atmosphere'], textSafeZone: 'corners', style: 'cyberpunk aesthetic' },
  { id: 'vintage', name: 'Retro Vintage', keywords: ['retro diner', 'vintage wallpaper', '80s aesthetic', 'old school'], textSafeZone: 'left', style: 'vintage film' },
  { id: 'gradient', name: 'Gradient Backdrop', keywords: ['gradient background', 'color wash', 'studio backdrop', 'seamless blend'], textSafeZone: 'right', style: 'studio photography' },
  { id: 'texture', name: 'Textured Surface', keywords: ['marble texture', 'wood grain', 'concrete wall', 'fabric backdrop'], textSafeZone: 'top', style: 'tactile texture' },
  { id: 'sports', name: 'Sports Venue', keywords: ['stadium background', 'gym setting', 'field view', 'arena lights'], textSafeZone: 'bottom', style: 'dynamic sports' },
  { id: 'abstract', name: 'Abstract Art', keywords: ['abstract shapes', 'geometric patterns', 'artistic background', 'modern art'], textSafeZone: 'corners', style: 'contemporary art' },
  { id: 'workspace', name: 'Modern Workspace', keywords: ['office setting', 'modern desk', 'workspace backdrop', 'professional environment'], textSafeZone: 'left', style: 'professional lighting' },
  { id: 'party', name: 'Party Scene', keywords: ['party atmosphere', 'celebration backdrop', 'festive setting', 'balloons and lights'], textSafeZone: 'top', style: 'festive energy' },
  { id: 'luxury', name: 'Luxury Style', keywords: ['luxury interior', 'marble columns', 'gold accents', 'upscale setting'], textSafeZone: 'right', style: 'elegant luxury' },
  { id: 'cosmic', name: 'Space & Cosmic', keywords: ['starry night', 'galaxy background', 'cosmic setting', 'space theme'], textSafeZone: 'bottom', style: 'cosmic wonder' },
  { id: 'industrial', name: 'Industrial Edge', keywords: ['industrial setting', 'metal backdrop', 'warehouse vibe', 'concrete industrial'], textSafeZone: 'corners', style: 'industrial grit' },
  { id: 'artistic', name: 'Creative Studio', keywords: ['art studio', 'creative workspace', 'artistic chaos', 'paint splatter'], textSafeZone: 'left', style: 'artistic freedom' }
];

export function getBackgroundPreset(presetId: string): BackgroundPreset | null {
  return BACKGROUND_PRESETS.find(p => p.id === presetId) || null;
}

// =========================
// 9) Ideogram-specific Functions
// =========================
export function buildIdeogramPrompt(handoff: IdeogramHandoff, cleanBackground: boolean = false): string {
  const parts: string[] = [];
  const overrides = getRuntimeOverrides();
  const typographyStyle = overrides.typographyStyle || 'negative-space'; // Default to negative-space for cleaner results
  
  // Add unique session variation to prevent duplicate outputs across users
  const sessionVariation = Math.floor(Math.random() * 9999) + 1000;
  const timeVariation = Date.now() % 1000;
  const uniqueId = `${sessionVariation}_${timeVariation}`;
  
  // EXACT TEXT RENDERING (if present) with enhanced quality controls
  if (handoff.key_line && handoff.key_line.trim()) {
    const cleanText = handoff.key_line.replace(/[""]/g, '"').replace(/['']/g, "'").replace(/[—–]/g, '-').trim();
    
    // Check if this is an EXACT TEXT request for meme format
    const { isExactText } = detectExactTextRequest(cleanText);
    if (isExactText) {
      // Split into TOP/BOTTOM for meme layout
      const { top, bottom } = splitMemeLines(cleanText);
      parts.push(`EXACT TEXT TOP: "${top}"`);
      parts.push(`EXACT TEXT BOTTOM: "${bottom}"`);
    } else {
      parts.push(`EXACT TEXT: ${cleanText}`);
    }
    
    // CRITICAL FIX: Add TEXT ZONE directive for EXACT TEXT requests
    const typographyZone = getTypographyStyleZone(typographyStyle);
    parts.push(typographyZone);
    
    // Enhanced birthday-themed backgrounds for celebrations/birthday
    let background = handoff.rec_background;
    const isBirthday = handoff.category?.toLowerCase() === 'celebrations' && 
                      handoff.subcategory_primary?.toLowerCase().includes('birthday');
    
    if (isBirthday) {
      // Replace "Clean" with "Vibrant, colorful" and ensure birthday objects are present
      if (handoff.chosen_visual) {
        let enhancedVisual = handoff.chosen_visual.replace(/\bClean\b/gi, 'Vibrant, colorful');
        const visualParts = enhancedVisual.split(' - ');
        if (visualParts.length >= 2) {
          background = visualParts[1].trim();
        }
      }
      
      // Always inject concrete birthday elements for birthday subcategory
      const birthdayObjects = ["balloons", "birthday cake", "confetti", "party decorations", "gift boxes", "streamers"];
      const hasConcreteObjects = birthdayObjects.some(obj => background?.toLowerCase().includes(obj));
      
      if (!hasConcreteObjects) {
        background = `vibrant birthday party scene with colorful balloons, birthday cake, confetti, celebration decorations and streamers`;
      }
      
      // Add soft directive to ensure objects appear
      background += " (include birthday balloons and cake)";
    } else if (!background && handoff.chosen_visual) {
      const visualParts = handoff.chosen_visual.split(' - ');
      background = visualParts.length >= 2 ? visualParts[1].trim() : `${handoff.category} themed background`;
    }
    
    if (!background) {
      background = isBirthday ? "vibrant birthday celebration with colorful balloons, birthday cake, party decorations" : 
                   `${handoff.category || 'contextually appropriate'} themed background`;
    }
    
    // Log the final background phrase for verification
    console.log(`Final background phrase: ${background}`);
    if (cleanBackground) {
      background = "clean, minimal background with high contrast for text";
    }
    
    // Compact scene description without labels
    let subject = handoff.rec_subject;
    if (!subject && handoff.chosen_visual) {
      const visualParts = handoff.chosen_visual.split(' - ');
      subject = visualParts.length >= 2 ? visualParts[0].trim() : handoff.chosen_visual;
    }
    
    // Use chosen_visual as primary scene description with action reinforcement
    if (handoff.chosen_visual) {
      let enhancedVisual = handoff.chosen_visual;
      
      // Action reinforcement for birthday scenes
      if (isBirthday && enhancedVisual.includes('blowing out candles')) {
        enhancedVisual = enhancedVisual.replace(/single person blowing out candles/gi, 
          'portrait of one person with cheeks puffed, leaning toward cake, candles mid-blow, flame smoke visible');
      }
      
      // Add scene directive for better action rendering
      parts.push(`SCENE: ${enhancedVisual}`);
    } else {
      parts.push(`SCENE: Clean ${handoff.visual_style || 'realistic'} ${subject || handoff.category} environment scene with ${background}.`);
    }
    
    // STRENGTHEN anti-giant-text constraints for caption mode
    if (typographyStyle === 'subtle-caption') {
      parts.push("Do NOT place large central text overlay, keep text small and unobtrusive in corner only");
    }
  } else {
    // Non-EXACT TEXT: use original labeling format
    // OCCASION/CATEGORY
    if (handoff.category && handoff.subcategory_primary) {
      parts.push(`Occasion: ${handoff.category}, ${handoff.subcategory_primary}${handoff.subcategory_secondary ? ` (${handoff.subcategory_secondary})` : ''}.`);
    }
    
    // Use chosen_visual as primary scene description if available
    if (handoff.chosen_visual) {
      parts.push(handoff.chosen_visual);
    } else {
      // Fallback to component-based description
      let subject = handoff.rec_subject;
      if (subject) {
        parts.push(`Subject: ${subject}.`);
      }
    }
    
    // BACKGROUND WITH ON-THEME ELEMENTS
    let background = handoff.rec_background;
    if (!background && handoff.chosen_visual) {
      const visualParts = handoff.chosen_visual.split(' - ');
      background = visualParts.length >= 2 ? visualParts[1].trim() : `${handoff.category} themed background`;
    }
    if (!background) {
      background = `${handoff.category || 'contextually appropriate'} themed background`;
    }
    if (cleanBackground) {
      background = "clean, minimal background with high contrast for text";
    }
    parts.push(`Background: ${background}.`);
  }
  
  // PEOPLE INCLUSION (lane-aware directives)
  const peopleKeywords = ['friends', 'crowd', 'people', 'group', 'party', 'audience', 'performers', 'celebrating', 'family', 'parents', 'kids', 'children'];
  const soloKeywords = ['single person', 'one person', 'individual', 'solo'];
  
  const hasGroup = peopleKeywords.some(keyword => 
    handoff.chosen_visual?.toLowerCase().includes(keyword)
  );
  const hasSolo = soloKeywords.some(keyword => 
    handoff.chosen_visual?.toLowerCase().includes(keyword)
  );
  
  if (hasGroup && !hasSolo) {
    parts.push("Include multiple people clearly visible in the scene.");
  } else if (hasSolo && !hasGroup) {
    parts.push("Include exactly one person in the scene.");
  }
  
  // COMPOSITION & STYLE WITH ENHANCED DIRECTIVES
  if (handoff.key_line && handoff.key_line.trim()) {
    // More compact style description with realistic tone
    parts.push(`${handoff.visual_style || 'realistic'} style, ${handoff.tone || 'savage'} tone, ${handoff.aspect_ratio || 'Square'} format.`);
    
    // Typography constraints with plain English
    const typographyConstraints = getTypographyStyleConstraints(typographyStyle);
    parts.push(typographyConstraints);
  } else {
    // Non-EXACT TEXT: use original labeling format
    if (handoff.visual_style) {
      parts.push(`Style: ${handoff.visual_style}, professional quality with rich colors and detailed textures.`);
    }
    if (handoff.tone) {
      parts.push(`Tone: ${handoff.tone} with emotional depth and visual impact.`);
    }
    if (handoff.aspect_ratio) {
      parts.push(`Format: ${handoff.aspect_ratio} with balanced composition.`);
    }
    
    // ENHANCED QUALITY DIRECTIVES with composition variety
    const varietyKeywords = [
      'dynamic angles', 'creative perspective', 'bold composition',
      'innovative layout', 'fresh viewpoint', 'original framing'
    ];
    const varietyBoost = varietyKeywords[Math.floor(Math.random() * varietyKeywords.length)];
    
    parts.push(`HIGH QUALITY, professional composition, ${varietyBoost}`);
    parts.push("CONTRAST: strong color contrast for text readability");
    
    // ENHANCED TYPOGRAPHY STYLE PLACEMENT with text quality controls
    if (handoff.key_line && handoff.key_line.trim()) {
      const typographyZone = getTypographyStyleZone(typographyStyle);
      const typographyConstraints = getTypographyStyleConstraints(typographyStyle);
      
      // Add text rendering quality controls
      const textQuality = "TEXT QUALITY: perfect spelling, clear fonts, no distortion";
      const readabilityBoost = "READABILITY: high contrast background, crisp edges, proper spacing";
      
      parts.push(typographyZone);
      parts.push(typographyConstraints);
      parts.push(textQuality);
      parts.push(readabilityBoost);
    }
  }
  
  // GLOBAL NEGATIVE PROMPT ENFORCEMENT - Add anti-text artifacts
  const negativePrompts = [
    'no background lettering', 'no banners with words', 'no wall decorations with text',
    'no text on props', 'no signage', 'no writing on objects', 'no idle person'
  ];
  
  // Add action-specific negative prompts for birthday scenes
  const isBirthdayScene = handoff.category?.toLowerCase() === 'celebrations' && 
                         handoff.subcategory_primary?.toLowerCase().includes('birthday');
  if (isBirthdayScene && handoff.chosen_visual?.includes('blowing out candles')) {
    negativePrompts.push('no static idle person', 'must show blowing candles action');
  }
  
  // Inject negative prompt directive
  parts.push(`NEGATIVE PROMPT: ${negativePrompts.join(', ')}`);
  
  const finalPrompt = parts.join(' ');
  
  // PROMPT VERIFICATION: Log final prompt when advanced details enabled
  if (overrides.showAdvancedPromptDetails) {
    console.log('🔍 IDEOGRAM PROMPT VERIFICATION:');
    console.log('Typography Style:', typographyStyle);
    console.log('Full Prompt:', finalPrompt);
    if (handoff.key_line && typographyStyle === 'subtle-caption') {
      console.log('⚠️  Caption Mode: Checking for TEXT ZONE directive and 8% size constraint...');
      const hasTextZone = finalPrompt.includes('TEXT ZONE:');
      const hasMaxArea = finalPrompt.includes('maximum 8%') || finalPrompt.includes('max 6%') || finalPrompt.includes('under 8%');
      console.log('Has TEXT ZONE directive:', hasTextZone);
      console.log('Has size constraint:', hasMaxArea);
      if (!hasTextZone || !hasMaxArea) {
        console.warn('❌ Missing critical caption constraints! Text may appear oversized.');
      } else {
        console.log('✅ Caption constraints properly applied.');
      }
    }
  }
  
  return finalPrompt;
}

export function getAspectRatioForIdeogram(aspectRatio: string): 'ASPECT_10_16' | 'ASPECT_16_10' | 'ASPECT_9_16' | 'ASPECT_16_9' | 'ASPECT_3_2' | 'ASPECT_2_3' | 'ASPECT_4_3' | 'ASPECT_3_4' | 'ASPECT_1_1' | 'ASPECT_1_3' | 'ASPECT_3_1' {
  const ratioMap: Record<string, 'ASPECT_10_16' | 'ASPECT_16_10' | 'ASPECT_9_16' | 'ASPECT_16_9' | 'ASPECT_3_2' | 'ASPECT_2_3' | 'ASPECT_4_3' | 'ASPECT_3_4' | 'ASPECT_1_1' | 'ASPECT_1_3' | 'ASPECT_3_1'> = {
    'Portrait': 'ASPECT_9_16',
    'Landscape': 'ASPECT_16_9',
    'Square': 'ASPECT_1_1',
    'Tall': 'ASPECT_10_16',
    'Wide': 'ASPECT_16_10'
  };
  
  return ratioMap[aspectRatio] || 'ASPECT_16_9';
}

export function getStyleTypeForIdeogram(visualStyle: string): 'AUTO' | 'GENERAL' | 'REALISTIC' | 'DESIGN' | 'RENDER_3D' | 'ANIME' {
  const styleMap: Record<string, 'AUTO' | 'GENERAL' | 'REALISTIC' | 'DESIGN' | 'RENDER_3D' | 'ANIME'> = {
    'realistic': 'REALISTIC',
    'cartoon': 'ANIME',
    'design': 'DESIGN',
    '3d': 'RENDER_3D',
    'general': 'GENERAL'
  };
  
  return styleMap[visualStyle?.toLowerCase()] || 'AUTO';
}

// Typography helper functions for compact prompt building with enhanced variety
// Layout block mapper for explicit positioning directives
export function getLayoutBlock(layout: string, aspectRatio: string = "square"): string {
  const L = layout.toLowerCase();
  
  if (L.includes("side bar") || L.includes("side-bar")) {
    return `TEXT ZONE: LEFT PANEL
CANVAS: ${aspectRatio}
REGION: x=0% y=0% w=28% h=100%
TEXT: align=left, valign=center, line-wrap=balanced, max-lines=5
STYLE: high-contrast, white text on subtle dark overlay (opacity 35–45%)
SAFE: 24px padding inside region, no subject/props inside region
RULES: Overlay text must render exactly as provided, no substitutions, no injected characters. DO NOT center text. DO NOT place text outside REGION. Reserve REGION as solid panel.
NEGATIVE PROMPT: no background lettering, no banners with words, no wall decorations with text`;
  }

  if (L.includes("negative")) {
    return `TEXT ZONE: NEGATIVE SPACE
PLACEMENT: find largest empty area away from main subject
BOUNDS: margin 6% from edges, keep 8% from subject mask
TEXT: align=left, max 3 lines, weight=bold
SAFE: subtle drop shadow
RULES: Overlay text must render exactly as provided, no substitutions, no injected characters. DO NOT overlap primary subject; shrink text if needed.
NEGATIVE PROMPT: no background lettering, no banners with words, no wall decorations with text`;
  }

  if (L.includes("meme")) {
    return `TEXT ZONE: MEME
TOP: x=0% y=0% w=100% h=18%, align=center, all caps, stroke=2px black
BOTTOM: x=0% y=82% w=100% h=18%, align=center, all caps, stroke=2px black
RULES: Overlay text must render exactly as provided, no substitutions, no injected characters. Keep faces visible (6% margin).
NEGATIVE PROMPT: no background lettering, no banners with words, no wall decorations with text`;
  }

  if (L.includes("lower third") || L.includes("lower-third")) {
    return `TEXT ZONE: LOWER THIRD
REGION: x=0% y=72% w=100% h=28%
BANNER: solid/blur 70–80% opacity
TEXT: align=left, padding=24px
RULES: Overlay text must render exactly as provided, no substitutions, no injected characters
NEGATIVE PROMPT: no background lettering, no banners with words, no wall decorations with text`;
  }

  if (L.includes("badge") || L.includes("sticker")) {
    return `TEXT ZONE: BADGE
REGION: x=72% y=6% w=24% h=24%
STYLE: circular, high-contrast, drop shadow
TEXT: center, max 4 lines
RULES: Overlay text must render exactly as provided, no substitutions, no injected characters. Move to safe corner if overlap.
NEGATIVE PROMPT: no background lettering, no banners with words, no wall decorations with text`;
  }

  if (L.includes("subtle") || L.includes("caption")) {
    return `TEXT ZONE: CAPTION
REGION: x=6% y=86% w=88% h=12%
TEXT: align=left, small, on soft strip
RULES: Overlay text must render exactly as provided, no substitutions, no injected characters. Never cover faces; reduce size if needed.
NEGATIVE PROMPT: no background lettering, no banners with words, no wall decorations with text`;
  }

  return "";
}

export function getTypographyStyleZone(typography: string): string {
  // Use explicit layout blocks for consistent positioning
  const layoutBlock = getLayoutBlock(typography);
  if (layoutBlock) {
    console.log(`Using explicit layout block for ${typography}`);
    return layoutBlock;
  }
  
  // Fallback to original random options for backwards compatibility
  const randomSeed = Math.floor(Math.random() * 3) + 1;
  
  switch (typography) {
    case 'negative-space':
      const nsOptions = [
        'TEXT ZONE: natural empty areas, top/bottom/sides placement',
        'TEXT ZONE: use background negative space, avoid subject overlap',
        'TEXT ZONE: find natural text areas in composition'
      ];
      return nsOptions[randomSeed - 1];
    case 'poster':
      return 'TEXT ZONE: centered or balanced poster overlay with clear separation';
    default:
      return 'TEXT ZONE: poster-style overlay with clear separation';
  }
}

export function getTypographyStyleConstraints(typography: string): string {
  switch (typography) {
    case 'negative-space':
      return `Text in natural empty areas, 10-20% of image size, avoid covering main subject`;
    case 'meme-style':
      return `Classic meme layout: split text into TOP band and BOTTOM band, each band maximum 22% height, center-aligned text, Impact-like font, white text with black outline`;
    case 'lower-third':
      return `Text banner at bottom 20% only, high contrast background, news-style overlay`;
    case 'side-bar':
      return `Side panel text taking 25-30% width, vertical orientation, clear separation from main image`;
    case 'badge-sticker':
      return `Small corner badge or sticker style, doesn't cover main subject, minimal size`;
    case 'subtle-caption':
      return `Tiny corner caption only, maximum 8% of image area, very unobtrusive, one text instance only, no large central text overlays`;
    case 'poster':
      return `Balanced poster text overlay, one text instance only, no credits or taglines`;
    default:
      return `Balanced text layout with clear readable space`;
  }
}

// =========================
// 10) Text Processing and Layout Functions
// =========================

// Split meme text into TOP and BOTTOM lines intelligently
export function splitMemeLines(text: string): { top: string; bottom: string } {
  const words = text.trim().split(/\s+/);
  const totalWords = words.length;
  
  if (totalWords <= 4) {
    // Short text: put first half on top, rest on bottom
    const splitPoint = Math.ceil(totalWords / 2);
    return {
      top: words.slice(0, splitPoint).join(' '),
      bottom: words.slice(splitPoint).join(' ')
    };
  }
  
  // Longer text: look for natural break points
  const midPoint = Math.floor(totalWords / 2);
  
  // Check for punctuation near midpoint
  for (let i = midPoint - 1; i <= midPoint + 1; i++) {
    if (i >= 0 && i < totalWords - 1) {
      const word = words[i];
      if (word.match(/[,.!?;:]$/)) {
        return {
          top: words.slice(0, i + 1).join(' '),
          bottom: words.slice(i + 1).join(' ')
        };
      }
    }
  }
  
  // No punctuation found, split at midpoint
  return {
    top: words.slice(0, midPoint).join(' '),
    bottom: words.slice(midPoint).join(' ')
  };
}

// =========================
// 11) Legacy Support Functions
// =========================
export function buildDeveloperPrompt(inputs: VibeInputs): string {
  const {
    category,
    subcategory,
    tone,
    tags = [],
    recipient_name = "-",
    relationship = "-",
    language = "English"
  } = inputs;

  const tagsCSV = tags.join(', ');
  
  // Enhanced instructions for movie/pop culture + quotes
  const isMovie = category === "Pop Culture" && subcategory?.toLowerCase().includes("movie");
  const hasQuotes = tags.some(tag => tag.toLowerCase().includes("quote"));
  const hasPersonalRoast = tags.some(tag => tag.toLowerCase().includes("making fun") || tag.toLowerCase().includes("bald") || tag.toLowerCase().includes("roast"));

  let specialInstructions = "";
  if (isMovie && hasQuotes) {
    specialInstructions = " When creating content about a specific movie with quote tags, reference the movie's iconic characters, themes, or memorable elements. Make it sound like it could be dialogue or a reference from that movie's universe.";
  }
  if (hasPersonalRoast && recipient_name !== "-") {
    specialInstructions += ` Incorporate ${recipient_name} naturally into the movie context while maintaining the roasting tone.`;
  }

  return `Context
Category: ${category} > ${subcategory}
Tone: ${tone}
Recipient: ${recipient_name}
Relationship: ${relationship}
Language: ${language}
Tags: ${tagsCSV}
HardLimit: 100 characters

Instructions
Write ONE original line for the subcategory above in the selected tone. Stay under 100 characters including spaces. Use plain text. No emojis, hashtags, quotes, or newlines. Use tags as content hints. Do not list the tags. If any tag is unsafe, ignore it and continue.${specialInstructions} Return JSON only.`;
}

export const fewShotAnchors = `

Examples:
Birthday, Savage: {"line":"30 already? Sprint to the cake for once, Alex."}
Birthday, Humorous: {"line":"Happy birthday, Alex. Your warranty expired years ago."}
Birthday, Playful: {"line":"Happy birthday, Alex. Cake speedrun starts now."}
Birthday, Sentimental: {"line":"Happy birthday, Alex. Grateful for every laugh this year."}
Sports, Humorous: {"line":"Congrats on the W. Your victory lap was longer than cardio day."}
Daily life, Serious: {"line":"Proud of your grind. Small steps, better habits, steady wins."}
Pop Culture Movies, Savage: {"line":"Jesse's head shinier than Zohan's silky smooth moves."}
Pop Culture Movies, Humorous: {"line":"Even Zohan couldn't save Jesse's hairline from retirement."}`;

// =========================
// 11) Main Builder Function
// =========================
export function buildOutput(u0: Partial<UserInputs>): OutputSchema {
  const defaults: UserInputs = {
    category: u0.category || "Celebrations",
    subcategory: u0.subcategory ?? "Birthday",
    secondary_subcategory: u0.secondary_subcategory ?? "",
    search_term: u0.search_term ?? "",
    tone: u0.tone || "Humorous",
    tags: u0.tags || [],
    visual_style: u0.visual_style || AI_CONFIG.visual_defaults.style,
    visual_generation_option: u0.visual_generation_option || AI_CONFIG.visual_defaults.option,
    aspect_ratio: u0.aspect_ratio || AI_CONFIG.aspect_defaults
  } as UserInputs;

  const { ok, errors } = validateInputs(defaults);

  // Phrases
  const raw = phraseCandidates(defaults);
  const phrases: GeneratedPhrase[] = raw.map(truncateIfNeeded);

  // Spelling pass
  for (const p of phrases) {
    const issues = spellcheck(p.text);
    for (const i of issues) errors.push(i);
  }

  // Images
  const images = imagePromptVariants(defaults);

  // Final shape
  const output: OutputSchema = {
    category: defaults.category,
    subcategory: defaults.subcategory || "",
    secondary_subcategory: defaults.secondary_subcategory || "",
    search_term: defaults.search_term || "",
    tone: defaults.tone,
    tags: defaults.tags || [],
    generated_phrases: phrases,
    visual_style: defaults.visual_style || "",
    visual_generation_option: defaults.visual_generation_option,
    generated_image_prompts: images,
    aspect_ratio: defaults.aspect_ratio,
    errors
  };

  return output;
}

// =========================
// 12) Re-exports for Backward Compatibility
// =========================
export const systemPrompt = SYSTEM_PROMPTS.vibe_maker;
export const fallbackByTone = TONE_FALLBACKS;
export const bannedPatterns = BANNED_PATTERNS;
export const bannedWords = BANNED_WORDS;

// =====================================================================
// ADDITIONAL EXPORTS - UI Constants and Helpers
// =====================================================================

export const VISUAL_STYLES = [
  { id: "Realistic", name: "Realistic" },
  { id: "Caricature", name: "Caricature" },
  { id: "Anime", name: "Anime" },
  { id: "3D Animated", name: "3D Animated" },
  { id: "Illustrated", name: "Illustrated" },
  { id: "Pop Art", name: "Pop Art" }
];

export const TONES = [
  { id: "Humorous", name: "Humorous" },
  { id: "Savage", name: "Savage" },
  { id: "Sentimental", name: "Sentimental" },
  { id: "Nostalgic", name: "Nostalgic" },
  { id: "Romantic", name: "Romantic" },
  { id: "Inspirational", name: "Inspirational" },
  { id: "Playful", name: "Playful" },
  { id: "Serious", name: "Serious" }
];

// Helper function to check if current model supports temperature
export const isTemperatureSupported = (modelId: string): boolean => {
  // GPT-5, GPT-4.1, O3, and O4 models don't support temperature
  // Only older models like gpt-4o and gpt-4o-mini support temperature
  return modelId.includes('gpt-4o') && !modelId.includes('gpt-4.1');
};

// =====================================================================
// MESSAGE BUILDERS - Centralized prompt construction
// =====================================================================

// Generate contextual negative prompts to prevent off-topic content
export function getContextualBans(inputs: any): string[] {
  const { finalLine, subcategory, tags = [], category } = inputs;
  const bans: string[] = [];
  
  // Core opposite/ambiguous bans
  const oppositeMappings: Record<string, string[]> = {
    'night shift': ['graveyard', 'cemetery', 'tombstone', 'death', 'grave'],
    'grave': ['night shift', 'work schedule', 'employee'],
    'shift': ['graveyard', 'cemetery'] // Only if not "grave shift"
  };
  
  // Apply opposite bans based on finalLine content
  if (finalLine) {
    const lowerLine = finalLine.toLowerCase();
    for (const [trigger, bannedWords] of Object.entries(oppositeMappings)) {
      if (lowerLine.includes(trigger) && !lowerLine.includes('grave')) {
        bans.push(...bannedWords);
      }
    }
    
    // Context-specific bans
    if (lowerLine.includes('work') || lowerLine.includes('job') || lowerLine.includes('employee')) {
      bans.push('graveyard', 'cemetery', 'tombstone', 'death');
    }
    if (lowerLine.includes('hockey') && !lowerLine.includes('street')) {
      bans.push('basketball', 'soccer', 'football');
    }
  }
  
  // Category-level bans to prevent cross-contamination
  if (category === 'Sports' || category === 'sports') {
    bans.push('laptop', 'desk', 'office', 'computer', 'meeting', 'workplace', 'cubicle', 'coffee mug', 'notebook', 'pen', 'paperwork', 'conference room', 'email', 'document');
  }
  
  // Subcategory-specific bans
  if (subcategory) {
    const lowerSub = subcategory.toLowerCase();
    if (lowerSub.includes('hockey')) {
      bans.push('basketball', 'soccer ball', 'football', 'laptop', 'desk', 'office', 'computer', 'coffee', 'meeting', 'workplace', 'notebook', 'pen', 'paperwork');
    } else if (lowerSub.includes('basketball')) {
      bans.push('hockey stick', 'puck', 'soccer ball', 'football', 'laptop', 'desk', 'office', 'computer', 'coffee', 'meeting', 'workplace', 'notebook', 'pen', 'paperwork');
    } else if (lowerSub.includes('work') || lowerSub.includes('office')) {
      bans.push('basketball', 'football', 'hockey stick', 'soccer ball', 'sports equipment', 'arena', 'court', 'field', 'rink');
    }
  }
  
  return [...new Set(bans)]; // Remove duplicates
}

// Helper to get style keywords for visual prompts
export function getStyleKeywords(visualStyle?: string): string {
  const styles: Record<string, string> = {
    'realistic': 'photographic, detailed, natural lighting',
    'illustrated': 'clean illustration, vibrant colors', 
    '3d-animated': 'clean 3D animation, smooth surfaces',
    'minimalist': 'simple, clean, minimal design'
  };
  return styles[visualStyle || '3d-animated'] || 'modern visual style';
}

interface PopCultureContext {
  subject: string;
  bullets: string[];
  trend_mode?: string;
}

// Builder for vibe generator chat messages
export function buildVibeGeneratorMessages(
  inputs: VibeInputs, 
  popCulture?: PopCultureContext
): Array<{role: string; content: string}> {
  // Check for knock-knock jokes
  const isKnockKnock = inputs.subcategory?.toLowerCase().includes("knock");
  
  if (isKnockKnock) {
    console.log("🪵 Using knock-knock format");
    
    const recipientInstruction = inputs.recipient_name && inputs.recipient_name !== "-" 
      ? `\n• Incorporate "${inputs.recipient_name}" naturally into the setup or punchline (PG-rated, no slurs)`
      : '';
    
    const corePrompt = `Generate 6 knock-knock joke options. Each joke must be exactly 5 lines with newlines between them:

Line 1: "Knock, knock."
Line 2: "Who's there?"
Line 3: [Setup word or name]
Line 4: [Setup] who?
Line 5: [Punchline]

Category: ${inputs.category} > ${inputs.subcategory}
Tone: ${inputs.tone}
${inputs.recipient_name && inputs.recipient_name !== "-" ? `Target: ${inputs.recipient_name}` : ''}${recipientInstruction}

Each joke should be a single string with actual newline characters (\\n) between the 5 lines.
Keep total length under 180 characters including newlines.

Return only: {"lines":["joke1\\nwith\\nnewlines","joke2\\nwith\\nnewlines","joke3\\nwith\\nnewlines","joke4\\nwith\\nnewlines","joke5\\nwith\\nnewlines","joke6\\nwith\\nnewlines"]}`;

    return [
      { role: 'system', content: 'Generate proper 5-line knock-knock jokes with newlines. JSON array only. No explanations.' },
      { role: 'user', content: corePrompt }
    ];
  }

  // Original logic for non-knock-knock content
  const isMovie = inputs.category === "Pop Culture" && inputs.subcategory?.toLowerCase().includes("movie");
  const hasQuotes = inputs.tags?.some(tag => tag.toLowerCase().includes("quote")) || false;
  const hasPersonalRoast = inputs.tags?.some(tag => 
    tag.toLowerCase().includes("making fun") || 
    tag.toLowerCase().includes("bald") || 
    tag.toLowerCase().includes("roast")
  ) || false;

  let specialInstructions = "";
  if (isMovie && hasQuotes) {
    specialInstructions = "\n• When creating content about a specific movie with quote tags, reference the movie's iconic characters, themes, or memorable elements\n• Make it sound like it could be dialogue or a reference from that movie's universe";
  }
  if (hasPersonalRoast && inputs.recipient_name && inputs.recipient_name !== "-") {
    specialInstructions += `\n• Incorporate ${inputs.recipient_name} naturally into the content while maintaining the roasting tone`;
  }
  
  if (inputs.recipient_name && inputs.recipient_name !== "-" && inputs.tone === "Savage") {
    specialInstructions += `\n• CRITICAL: Every line must specifically target ${inputs.recipient_name} by name - make fun of them directly, not generic content`;
  }

  const tagRequirement = inputs.tags && inputs.tags.length > 0 
    ? `\n• UNIVERSAL CONTRACT RULE: Every single line must include ALL of these words/phrases: ${inputs.tags.join(', ')}. No exceptions. Case-insensitive matching is fine.`
    : '';

  // Universal Contract 4-lane system enforcement
  const universalContractLanes = `
• UNIVERSAL CONTRACT FOUR LANES (use exactly one of each):
  1. Platform/Prop - joke about tools/gear/stage of the ${inputs.subcategory}
  2. Audience/Reaction - joke about how people respond to ${inputs.subcategory}  
  3. Skill/Ability - joke about competence/style in ${inputs.subcategory}
  4. Absurdity/Lifestyle - wild comparison or exaggerated scenario for ${inputs.subcategory}

• TAG PLACEMENT VARIETY: No two options should place tags in same position (leading/middle/closing)
• LENGTH VARIETY: Mix approximately 50, 70, 90, and ≤100 characters 
• PUNCTUATION RULES: Use only commas, periods, colons. NO em-dashes (—), NO double dashes (--)
• TONE ENFORCEMENT: ${inputs.tone} wording throughout (Playful=cheeky, Savage=sharp, etc.)
• NO RANDOM NAMES unless provided as tags
• CATEGORY ANCHORING: Treat "${inputs.category}" as theme, "${inputs.subcategory}" refines it`;

  const getUniversalLanes = (subcategory: string) => [
    `Platform/Prop - tools/gear/stage of ${subcategory}`,
    `Audience/Reaction - how people respond to ${subcategory}`,
    `Skill/Ability - competence/style in ${subcategory}`,
    `Absurdity/Lifestyle - wild comparisons for ${subcategory}`
  ];

  const lanes = getUniversalLanes(inputs.subcategory || inputs.category);

  // Inject Pop Culture Context if available
  const popCultureBlock = popCulture && popCulture.bullets.length > 0 ? `
Pop Culture Context:
${popCulture.bullets.map(bullet => `- ${bullet}`).join('\n')}

Use the context as joke fuel. Do not invent facts. Use "reported/viral" framing for sensitive topics. No defamation.

` : '';

  const corePrompt = `${popCultureBlock}${universalContractLanes}

Generate exactly 4 distinct options for ${inputs.category} > ${inputs.subcategory} in ${inputs.tone} tone.

UNIVERSAL CONTRACT ENFORCEMENT:
• Each option must be ≤100 characters (hard limit)
• Each option must be a complete, standalone line with clear subject and verb
• Each option must match ${inputs.tone} tone consistently  
• Each option must be clearly about ${inputs.subcategory || inputs.category}

TAG PLACEMENT REQUIREMENTS:
${tagRequirement ? `• ALL tags must appear in EVERY option: ${inputs.tags?.join(', ')}
• Vary tag placement: at least one leading, one mid-sentence, one closing across the 4 options
• Tags must be exact casing; no extra symbols added` : ''}

LANE DISTRIBUTION (generate exactly one option for each angle):
Lane 1: ${lanes[0]}
Lane 2: ${lanes[1]} 
Lane 3: ${lanes[2]}
Lane 4: ${lanes[3]}

LENGTH DIVERSITY REQUIREMENTS:
• Option 1: Short (55-65 characters)
• Option 2: Medium (70-85 characters) 
• Option 3: Medium (70-85 characters)
• Option 4: Long (95-100 characters)

PUNCTUATION WHITELIST:
• Allowed: commas, periods, colons, exclamation marks
• FORBIDDEN: em-dashes (—), double dashes (--), quotes, hashtags, emojis, newlines
• FORBIDDEN symbols: %, /, #, &, \

VARIETY ENFORCEMENT:
• No repeated opening words across the 4 options
• Each option must have different sentence structure and rhythm
• Wording and phrasing must differ significantly between options

STRICT QUALITY CONTROLS:
• NO generic phrases like "energy", "vibes", "mode activated"  
• NO proper names unless specifically provided in tags (avoid random names like "Amy", "Steve", etc.)
• NO meta commentary or instructions
• NO emojis, hashtags, quotes, or newlines
• NO stray symbols (%, /, #, &, \)

${specialInstructions}

${inputs.recipient_name && inputs.recipient_name !== "-" ? `Target: ${inputs.recipient_name}` : ''}

If any option fails these requirements, regenerate just that option and return a compliant set of 4.

Return exactly: {"lines":["lane1_option","lane2_option","lane3_option","lane4_option"]}`;

  const systemMessage = inputs.tone === 'Savage' 
    ? 'Generate short, savage roasts/burns. Make them cutting and direct, NOT joke-like. JSON array only. Never include meta commentary.'
    : 'Generate short, witty text. JSON array only. No explanations or meta commentary.';
  
  return [
    { role: 'system', content: systemMessage },
    { role: 'user', content: corePrompt }
  ];
}

// Utility to extract domain keywords from subcategory
function extractSubcategoryKeywords(subcategory: string): string[] {
  if (!subcategory || subcategory === '-') return [];
  
  const tokens = subcategory.toLowerCase()
    .split(/[\s\-\/]+/)
    .filter(token => token.length >= 3);
  
  // Add synonym enrichment for common occasions
  const synonymMap: Record<string, string[]> = {
    'christmas': ['tree', 'ornaments', 'lights', 'snow', 'wreath', 'carolers', 'santa'],
    'halloween': ['pumpkin', 'costume', 'ghost', 'witch', 'candy', 'spooky'],
    'easter': ['bunny', 'eggs', 'basket', 'flowers', 'spring'],
    'valentine': ['hearts', 'roses', 'romance', 'couples', 'love'],
    'thanksgiving': ['turkey', 'feast', 'autumn', 'harvest', 'family'],
    'new': ['party', 'celebration', 'countdown', 'fireworks'],
    'year': ['party', 'celebration', 'countdown', 'fireworks'],
    'hanukkah': ['menorah', 'candles', 'dreidel', 'lights'],
    'diwali': ['lights', 'lamps', 'celebration', 'colors'],
    'birthday': ['cake', 'candles', 'balloons', 'party'],
    'wedding': ['rings', 'flowers', 'celebration', 'ceremony'],
    'graduation': ['cap', 'gown', 'diploma', 'ceremony'],
    'pride': ['rainbow', 'parade', 'flags', 'celebration']
  };
  
  const enrichedTokens = [...tokens];
  for (const token of tokens) {
    if (synonymMap[token]) {
      enrichedTokens.push(...synonymMap[token]);
    }
  }
  
  return [...new Set(enrichedTokens)].slice(0, 8); // Max 8 keywords
}

// Halloween context detection helper
function checkHalloweenContext(inputs: any): boolean {
  const halloweenKeywords = ['halloween', 'costume', 'pumpkin', 'spooky', 'witch', 'ghost', 'bats', 'cobweb', 'candy', 'jack-o-lantern', 'trick-or-treat', 'october', 'haunted'];
  
  const checkText = [
    inputs.subcategory?.toLowerCase() || '',
    inputs.finalLine?.toLowerCase() || '',
    ...(inputs.tags?.map((t: string) => t.toLowerCase()) || [])
  ].join(' ');
  
  return halloweenKeywords.some(keyword => checkText.includes(keyword));
}

// Builder for visual generator chat messages  
export function buildVisualGeneratorMessages(inputs: any): Array<{role: string; content: string}> {
  const { category, subcategory, tone, tags, visualStyle, finalLine } = inputs;
  const config = getEffectiveConfig();
  const overrides = getRuntimeOverrides();

  // Check for AI settings overrides
  const cleanBackground = overrides.cleanBackgroundDefault ?? false;
  const magicPrompt = overrides.magicPromptEnabled ?? false;
  const spellingGuarantee = overrides.spellingGuaranteeDefault ?? false;
  
  // Build additional requirements based on settings
  let additionalRequirements = '';
  if (cleanBackground) {
    additionalRequirements += '\n- CLEAN BACKGROUND: Use minimal, uncluttered backgrounds that won\'t compete with text overlay';
  }
  if (magicPrompt) {
    additionalRequirements += '\n- ENHANCED CREATIVITY: Add unexpected creative elements, unique perspectives, or artistic flair';
  }
  if (spellingGuarantee) {
    additionalRequirements += '\n- SPELLING ACCURACY: Ensure all visible text elements are spelled correctly';
  }

  // Extract subcategory keywords for anchoring
  const subcategoryKeywords = extractSubcategoryKeywords(subcategory);
  
  // Get contextual bans to prevent off-topic content
  const contextualBans = getContextualBans(inputs);
  
  // Check if music/singing content is actually relevant  
  const musicKeywords = ['music', 'song', 'sing', 'concert', 'band', 'album', 'lyrics', 'carol', 'choir'];
  const hasMusicRelevance = tags.some(tag => 
    musicKeywords.some(keyword => tag.toLowerCase().includes(keyword))
  ) || (finalLine && musicKeywords.some(keyword => finalLine.toLowerCase().includes(keyword)));

  // Combine default and contextual negative prompts
  const allNegatives = [...DEFAULT_NEGATIVE_PROMPT.split(', '), ...contextualBans];
  const negativePromptSection = allNegatives.slice(0, 8).join(', ');

  // Build contextual prompt focusing on actual meaning
  const userPrompt = `CONTEXT: ${subcategory} | TONE: ${tone} | STYLE: ${visualStyle || 'Illustrated'}
${finalLine ? `TEXT LINE: "${finalLine}" - Create visuals that match this ACTUAL CONTENT and TONE` : ''}

CRITICAL INSTRUCTION: Focus on the ACTUAL SCENE, MOOD, and SUBCATEGORY. Do NOT repeat user's proper names or generic adjectives from input tags. Create authentic visual concepts based on the text meaning and subcategory atmosphere.

${['baby shower', 'birthday', 'wedding'].includes(subcategory?.toLowerCase() || '') ? 
  `CELEBRATION FOCUS: Base visuals on ${subcategory} atmosphere and ${tone} mood. Use contextual elements like party setup, decorations, and celebration scenes - NOT user's personal tags.` : ''}

SUBCATEGORY ANCHORING (CRITICAL):
${subcategoryKeywords.length > 0 ? `- Domain keywords to incorporate: ${subcategoryKeywords.join(', ')}
- ALL 4 concepts must include clear visual cues from these domain keywords
- Vary wording; don't copy the subcategory verbatim every time
- Make domain connections natural and witty/sincere per tone, not generic or slogan-y` : ''}

BANNED ELEMENTS (CRITICAL - DO NOT INCLUDE):
${contextualBans.length > 0 ? `- STRICTLY FORBIDDEN: ${contextualBans.join(', ')}
- These elements would create opposite/wrong meanings from the user's intent
- Focus on the correct semantic interpretation of the text` : ''}

TYPOGRAPHY STYLE PREFERENCE:
${overrides.typographyStyle ? `- Layout style requested: ${overrides.typographyStyle}
- Tailor [TEXT_SAFE_ZONE] directives to match this typography preference
- For "negative-space": Use natural empty areas like sky, walls, backgrounds
- For "meme-style": Reserve top and bottom zones for impact-style text  
- For "lower-third": Dedicate bottom 20% for horizontal banner text
- For "side-bar": Reserve left 25-30% for vertical text panel
- For "badge-sticker": Include decorative frame or badge placement areas
- For "subtle-caption": Use corner/edge placement with minimal text zones` : ''}

TEXT ALIGNMENT REQUIREMENTS (CRITICAL):
${finalLine ? `- ALL 4 concepts must directly reflect the exact content/semantics of: "${finalLine}"
- Avoid unrelated gag props (rubber chickens, potatoes, random animals) unless the text mentions them
- For award/Oscar references, emphasize documentary/poster-like interpretations with award symbols
- For LGBTQ/pride themes, include explicit visual cues: rainbow flags, male couples, pride parades, drag elements, wardrobe/mirror scenes
- For "came out" or similar phrases, show supportive relationship scenes or pride celebration contexts
- For cross-dressing themes, include wardrobe elements, mirrors, makeup, or tasteful costume details
- Visual concepts MUST NOT be subtle - make the connection obvious and direct
- Each concept MUST include embedded layout directives: [TAGS: relevant, keywords], [TEXT_SAFE_ZONE: center 60x35|upper third|lower third|sides], [CONTRAST_PLAN: auto|dark|light], [NEGATIVE_PROMPT: specific negatives], [ASPECTS: 1:1 base, crop-safe 4:5, 9:16], [TEXT_HINT: dark text|light text]` : ''}

REQUIRED OBJECTS/SUBJECTS (must be visible in each concept):
- ${subcategory === 'Ice Hockey' ? 'hockey stick and puck' : 'relevant category objects'}
- Specific, tangible items matching the theme${additionalRequirements}

SEASONAL MIX REQUIREMENTS:
${checkHalloweenContext(inputs) ? `- HALLOWEEN THEMED: Make at least 3 of the 4 concepts clearly Halloween-themed (pumpkins, costumes, spooky elements, Halloween parties)
- One concept MUST be background-only with Halloween elements but NO people (moonlit pumpkins, candles, fog, cobwebs)
- For LGBTQ+ content: Include Halloween party scenes with male couples in costumes and subtle rainbow accents
- The remaining concept should be different but still relevant (e.g., documentary/pride/seasonal non-Halloween)
- Ensure Halloween atmosphere while maintaining text placement zones` : ''}

VARIETY RULES:
- Generate exactly one background-only concept with clean negative space
- Create 2-3 distinct subject+background or action/scene concepts
- Include one object-centric or detail-focused concept
- Each concept must be completely different in composition
- Mix close-ups, wide shots, action scenes, and environmental shots
- Vary camera angles: high angle, low angle, eye level, dramatic perspectives
${!hasMusicRelevance ? '- DO NOT include singing, concerts, or music themes unless explicitly relevant to the content' : ''}

TEXT PLACEMENT DIRECTIVES:
- Find natural negative space areas for text (sky, walls, backgrounds)
- Avoid placing text over faces, main subjects, or busy areas
- Consider TOP, BOTTOM, LEFT, RIGHT zones - not just center
- Leave clear areas for text that won't compete with visuals
- MANDATORY: Include bracketed layout tags in each prompt: [TEXT_SAFE_ZONE: specific zone], [CONTRAST_PLAN: contrast strategy], [NEGATIVE_PROMPT: avoid these elements]

LAYOUT TAG REQUIREMENTS (EMBED IN EACH PROMPT):
- [TAGS: ${tags.slice(0, 3).join(', ')}] (relevant concept keywords)
- [TEXT_SAFE_ZONE: center 60x35] or "upper third", "lower third", "sides" (text placement zone)
- [CONTRAST_PLAN: auto] or "dark", "light" (text contrast strategy)
- [NEGATIVE_PROMPT: ${negativePromptSection}] (per-concept negatives including contextual bans)
- [ASPECTS: 1:1 base, crop-safe 4:5, 9:16] (aspect ratio handling)
- [TEXT_HINT: dark text] or "light text" (suggested text color)

IMPORTANT: Visual concepts must directly relate to the joke/text content above. For Pride themes, include rainbow colors, drag queens, parades, celebration elements.

4 unique concepts. Each 40-60 words WITH embedded layout tags. No slots required.

JSON only.`;

  return [
    { role: 'system', content: SYSTEM_PROMPTS.visual_generator },
    { role: 'user', content: userPrompt }
  ];
}

// Builder for pop culture search prompts
export function buildPopCultureSearchPrompt(category: string, searchTerm: string): string {
  return `Generate exactly 5 creative and relevant ${category.toLowerCase()} suggestions related to "${searchTerm}". Focus on popular, well-known entries that would be engaging for users. Keep descriptions concise (1-2 sentences).

Return as a JSON object with this exact format:
{
  "suggestions": [
    {"title": "Suggestion Title", "description": "Brief description"}
  ]
}`;
}

// Builder for general text generation
export function buildGenerateTextMessages(params: {
  tone: string;
  category?: string;
  subtopic?: string;
  pick?: string;
  tags?: string[];
  characterLimit: number;
}): Array<{role: string; content: string}> {
  const { tone, category, subtopic, pick, tags = [], characterLimit } = params;
  
  let contextParts = [];
  if (category) contextParts.push(`Category: ${category}`);
  if (subtopic) contextParts.push(`Topic: ${subtopic}`);
  if (pick) contextParts.push(`Specific focus: ${pick}`);
  
  const context = contextParts.join(', ');
  
  let prompt = `Generate exactly 4 short ${tone.toLowerCase()} text options for: ${context}.`;
  
  if (tags.length > 0) {
    prompt += ` IMPORTANT: Each option MUST include ALL of these exact words/tags: ${tags.join(', ')}.`;
  }
  
  prompt += ` Each option must be ${characterLimit} characters or fewer. Be creative and engaging.

Return as a JSON object with this exact format:
{
  "options": ["text option 1", "text option 2", "text option 3", "text option 4"]
}`;

  return [
    { role: 'user', content: prompt }
  ];
}
