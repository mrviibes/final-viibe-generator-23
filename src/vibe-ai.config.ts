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

import { advancedSpellCheck, validateGrammar, containsDerogatory } from './lib/textUtils';

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
  enableMagicPrompt?: boolean;
  ideogramModel?: 'V_2A_TURBO' | 'V_3';
  typographyStyle?: 'poster' | 'negative_space';
  popCultureWebFacts?: boolean;
  popCultureRecency?: 'month' | 'year' | 'all';
}

// Get runtime overrides from localStorage
export function getRuntimeOverrides(): AIRuntimeOverrides {
  try {
    const stored = localStorage.getItem('ai-runtime-overrides');
    let overrides: AIRuntimeOverrides = stored ? JSON.parse(stored) : {};
    
    // Migrate legacy ideogram model setting
    if (!overrides.ideogramModel) {
      const legacyModel = localStorage.getItem('ideogram_selected_model');
      if (legacyModel === 'V_3') {
        overrides.ideogramModel = 'V_3';
        setRuntimeOverrides({ ideogramModel: 'V_3' });
        localStorage.removeItem('ideogram_selected_model');
      }
    }
    
    return overrides;
  } catch {
    return {};
  }
}

// Set runtime overrides in localStorage
export function setRuntimeOverrides(overrides: Partial<AIRuntimeOverrides>): void {
  try {
    const current = getRuntimeOverrides();
    const updated = { ...current, ...overrides };
    localStorage.setItem('ai-runtime-overrides', JSON.stringify(updated));
  } catch (error) {
    console.warn('Failed to save AI runtime overrides:', error);
  }
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
  | "Careers"
  | "Anything Goes"
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
  exactWordingTags?: string[]; // optional - words that must appear in text
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
  exactWordingTags?: string[]; // Support exact wording tags
}

export interface VibeCandidate {
  line: string;
  blocked: boolean;
  reason?: string;
  hasBannedExactWords?: boolean;
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
    usedBackupPrompt?: boolean;
    usedAntiEcho?: boolean;
    sanitizedTags?: Array<{ original: string; replacement: string; reason: string; }>;
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

// Sensitive tag detection and rewriting system
export interface SensitiveTagResult {
  original: string;
  replacement: string;
  reason: string;
  wasSanitized: boolean;
}

export function rewriteSensitiveTags(tags: string[]): SensitiveTagResult[] {
  return tags.map(tag => {
    const lowerTag = tag.toLowerCase().trim();
    
    // Pattern: "[name] is so gay" or similar derogatory usage
    const derogatoryGayPattern = /(.+)\s+is\s+so\s+gay/i;
    const match = derogatoryGayPattern.exec(tag);
    
    if (match) {
      const name = match[1];
      return {
        original: tag,
        replacement: `${name} is fabulous`,
        reason: 'Converted derogatory usage to positive expression',
        wasSanitized: true
      };
    }
    
    // Check for other potentially problematic phrases
    const problematicPatterns = [
      { pattern: /\b(retard|retarded)\b/i, replacement: 'silly', reason: 'Replaced ableist language' },
      { pattern: /\b(lame)\b/i, replacement: 'uncool', reason: 'Replaced ableist language' },
      { pattern: /\b(crazy|insane)\b/i, replacement: 'wild', reason: 'Replaced mental health language' }
    ];
    
    for (const { pattern, replacement, reason } of problematicPatterns) {
      if (pattern.test(lowerTag)) {
        return {
          original: tag,
          replacement: tag.replace(pattern, replacement),
          reason,
          wasSanitized: true
        };
      }
    }
    
    // No sanitization needed
    return {
      original: tag,
      replacement: tag,
      reason: '',
      wasSanitized: false
    };
  });
}

export function getSensitiveTagSuggestions(tag: string): string[] {
  const lowerTag = tag.toLowerCase();
  
  if (lowerTag.includes('gay')) {
    return ['fabulous', 'camp', 'theatrical', 'pride'];
  }
  
  if (lowerTag.includes('crazy') || lowerTag.includes('insane')) {
    return ['wild', 'chaotic', 'unpredictable', 'intense'];
  }
  
  if (lowerTag.includes('lame')) {
    return ['uncool', 'boring', 'disappointing', 'weak'];
  }
  
  return ['stylish', 'dramatic', 'expressive', 'bold'];
}

// Fixed negative prompt applied to all image generations - keep short and focused
export const DEFAULT_NEGATIVE_PROMPT = "misspellings, distorted letters, typos, incorrect spelling, garbled text, unreadable text, handwriting, cursive, script font, ligatures, broken kerning, cramped kerning, letter swaps, split letters, watermark, logo, captions, duplicated words";
// Model fallback chains for retry strategy
export const MODEL_FALLBACK_CHAINS = {
  text: [
    'gpt-4.1-2025-04-14',
    'gpt-5-mini-2025-08-07',
    'gpt-5-2025-08-07'
  ],
  visual: [
    'gpt-4.1-2025-04-14',
    'gpt-5-mini-2025-08-07'
  ]
};

// Available models for UI
export const AVAILABLE_MODELS = [
  { value: 'gpt-4.1-2025-04-14', label: 'GPT-4.1', isRecommended: true },
  { value: 'gpt-5-mini-2025-08-07', label: 'GPT-5 Mini', isRecommended: false },
  { value: 'gpt-5-2025-08-07', label: 'GPT-5', isRecommended: false }
];

// Friendly model names for display
export const MODEL_DISPLAY_NAMES: Record<string, string> = {
  'gpt-4.1-2025-04-14': 'GPT-4.1',
  'gpt-5-mini-2025-08-07': 'GPT-5 Mini',
  'gpt-5-2025-08-07': 'GPT-5'
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
    max_tokens: 400,
    model: 'gpt-4.1-2025-04-14' // Default to GPT-4.1 as requested
  },
  visual_generation: {
    max_tokens: 450, // Reduced for faster concepts
    model: 'gpt-4.1-2025-04-14' // Default to GPT-4.1 as requested
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
  return {
    ...AI_CONFIG,
    spellcheck: {
      ...AI_CONFIG.spellcheck,
      enabled: overrides.spellcheckEnabled ?? AI_CONFIG.spellcheck.enabled
    },
    visual_defaults: {
      ...AI_CONFIG.visual_defaults,
      style: overrides.defaultVisualStyle ?? AI_CONFIG.visual_defaults.style
    },
    generation: {
      ...AI_CONFIG.generation,
      model: overrides.model ?? AI_CONFIG.generation.model,
      temperature: overrides.temperature ?? AI_CONFIG.generation.temperature
    },
    visual_generation: {
      ...AI_CONFIG.visual_generation,
      model: overrides.model ?? AI_CONFIG.visual_generation.model
    }
  };
}

// =========================
// 3) Prompts and System Messages
// =========================
export const SYSTEM_PROMPTS = {
  vibe_maker: `You are the Vibe Maker writer. Produce a single line under 100 characters based on user choices. Follow the tone guide. Use tags as hints, not as a list. Be witty or sincere as required, never cruel. No emojis. No hashtags. No quotation marks. No newlines. No profanity or slurs. No hate or harassment. No sexual content about minors. No doxxing or personal data. Output JSON only in this exact shape: {"line":"..."} Nothing else.`,
  
  vibe_generator: `You are a witty, creative copywriter specializing in short-form content. 
Your task is to write 6 distinct options that vary significantly in structure, theme, and wording while maintaining the specified tone.
Make each option distinctly different - avoid repeating similar phrases, structures, or concepts.
CRITICAL: Do NOT echo user tags verbatim. Use the spirit and meaning of tags without repeating the exact words.
Focus on proper grammar, natural flow, and complete thoughts. Avoid broken sentences or nonsensical word combinations.
Always output valid JSON only.`,

  visual_generator: `Generate 4 visual concepts for graphics that MUST align with the provided text and tone. Be ultra-concise.

RULES:
- Return ONLY valid JSON - no markdown, no extra text
- Each prompt: ONE SENTENCE, maximum ~20 words
- Generate exactly 4 diverse visual concepts
- CRITICAL: Visual concepts MUST relate to the provided text/joke content and tone
- Provide exactly one background-only concept and 3 distinct subject+background concepts
- For Pride themes: Include rainbow, drag queens, parades, celebrations, fabulous elements
- For jokes: Match the humor and subject matter exactly
- EXCLUDE music/singing content unless tags explicitly include music, singing, concert, or performance

Format:
{
  "options": [
    {
      "subject": "brief description (optional for background-only)",
      "background": "brief description", 
      "prompt": "ultra-concise prompt (~20 words max)"
    }
  ]
}`
};

// =========================
// 4) Validation and Banned Content
// =========================
export const BANNED_PATTERNS = [
  /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu, // emojis
  /#\w+/g, // hashtags
  /["'""`]/g, // quotes
  /\n|\r/g // newlines
];

export const BANNED_WORDS = [
  'shit', 'fuck', 'damn', 'bitch', 'ass', 'hell',
  'stupid', 'idiot', 'moron', 'loser', 'ugly', 'fat'
];

export const TONE_FALLBACKS: Record<string, string> = {
  humorous: "Life's too short for boring moments",
  savage: "Excellence is the only standard",
  sentimental: "Cherishing every meaningful moment",
  nostalgic: "Taking a trip down memory lane",
  romantic: "Love fills every heartbeat",
  inspirational: "Dreams become reality with action",
  playful: "Ready for some fun adventures",
  serious: "Reflecting on life's important moments"
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

export function postProcessLine(line: string, tone: string, requiredTags?: string[], options?: { allowNewlines?: boolean; format?: 'knockknock'; exactWordingTags?: string[] }): VibeCandidate {
  
  // Trim spaces
  let cleaned = line.trim();
  
  // Apply grammar and idiom fixes first
  cleaned = applyIdiomsAndContractions(cleaned);
  
  // Handle knock-knock format
  const isKnockKnock = options?.format === 'knockknock';
  
  if (isKnockKnock) {
    // For knock-knock jokes, validate the 5-line structure
    const lines = cleaned.split('\n');
    if (lines.length !== 5) {
      return {
        line: TONE_FALLBACKS[tone.toLowerCase()] || TONE_FALLBACKS.humorous,
        blocked: true,
        reason: 'Invalid knock-knock structure - needs exactly 5 lines'
      };
    }
    
    // Validate basic knock-knock pattern (tolerant)
    const knockKnockPattern = /knock[,\s]*knock/i;
    const whoTherePattern = /who'?s\s+there/i;
    const whoPattern = /who\?/i;
    
    if (!knockKnockPattern.test(lines[0]) || 
        !whoTherePattern.test(lines[1]) || 
        !whoPattern.test(lines[3])) {
      return {
        line: TONE_FALLBACKS[tone.toLowerCase()] || TONE_FALLBACKS.humorous,
        blocked: true,
        reason: 'Invalid knock-knock pattern'
      };
    }
    
    // Use higher length cap for knock-knock (180 chars total, ~60 per line max)
    if (cleaned.length > 180) {
      cleaned = cleaned.slice(0, 180);
    }
    
    // Skip savage tone block for knock-knock format and don't remove newlines
    // Still check for banned words but allow the structure
  } else {
    // Remove banned patterns (emojis, hashtags, quotes, newlines) for non-knock-knock
    for (const pattern of BANNED_PATTERNS) {
      cleaned = cleaned.replace(pattern, '');
    }
  }
  
  // Apply text normalization and fixes
  cleaned = normalizeTypography(cleaned);
  
  // Enhanced spellcheck and grammar validation
  const spellResults = advancedSpellCheck(cleaned);
  const grammarResults = validateGrammar(cleaned);
  
  // Block if too many spelling/grammar issues
  if (spellResults.score < 0.7 || spellResults.issues.length > 2) {
    return {
      line: TONE_FALLBACKS[tone.toLowerCase()] || TONE_FALLBACKS.humorous,
      blocked: true,
      reason: `Spelling issues: ${spellResults.issues.slice(0, 2).join(', ')}`
    };
  }
  
  // Block if grammar is severely broken
  if (!grammarResults.hasBasicStructure || grammarResults.issues.length > 1) {
    return {
      line: TONE_FALLBACKS[tone.toLowerCase()] || TONE_FALLBACKS.humorous,
      blocked: true,
      reason: `Grammar issues: ${grammarResults.issues.slice(0, 1).join(', ')}`
    };
  }
  
  // Safety check for derogatory content
  if (containsDerogatory(cleaned)) {
    return {
      line: TONE_FALLBACKS[tone.toLowerCase()] || TONE_FALLBACKS.humorous,
      blocked: true,
      reason: 'Contains inappropriate content'
    };
  }
  
  // Fix adjacent duplicate words only (safer approach)
  const words = cleaned.split(' ');
  for (let i = 0; i < words.length - 1; i++) {
    if (words[i] === words[i + 1] && words[i].length > 2) {
      words.splice(i + 1, 1);
      i--; // Check the same position again
    }
  }
  cleaned = words.join(' ');
  
  // Remove double spaces and clean up
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // Hard truncate to 100 characters (or 180 for knock-knock)
  const maxLength = isKnockKnock ? 180 : 100;
  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength);
  }
  
  // Check for banned words in exact wording tags and mask them
  const hasBannedExactWords = options?.exactWordingTags?.some(tag => 
    BANNED_WORDS.some(word => tag.toLowerCase().includes(word.toLowerCase()))
  );
  
  // Check for banned words in the generated text
  const lowerCleaned = cleaned.toLowerCase();
  for (const word of BANNED_WORDS) {
    if (lowerCleaned.includes(word)) {
      return {
        line: TONE_FALLBACKS[tone.toLowerCase()] || TONE_FALLBACKS.humorous,
        blocked: true,
        reason: `Contains banned word: ${word}`,
        hasBannedExactWords // Pass this info for special handling
      };
    }
  }
  
  // Check if empty after cleaning
  if (!cleaned || cleaned.length === 0) {
    return {
      line: TONE_FALLBACKS[tone.toLowerCase()] || TONE_FALLBACKS.humorous,
      blocked: true,
      reason: 'Empty after cleaning'
    };
  }
  
  // Enforce savage tone quality - block joke-like content for savage (skip for knock-knock)
  if (tone.toLowerCase() === 'savage' && !isKnockKnock) {
    // Block obvious joke patterns that don't fit savage tone
    if (cleaned.match(/^(why did|what do you call|knock knock)/i) || 
        cleaned.match(/\?\!*$/i) ||
        cleaned.match(/\bhaha\b|\blol\b|\bmeh\b/i)) {
      return {
        line: TONE_FALLBACKS.savage,
        blocked: true,
        reason: 'Not savage enough - too joke-like'
      };
    }
  }
  
  // Only block meta/instructional tags, allow content tags like 'christmas', 'birthday', etc.
  const metaTags = ['meta', 'instruction', 'system', 'prompt', 'generate', 'create', 'format', 'json', 'array'];
  const generalTags = requiredTags?.filter(tag => 
    !options?.exactWordingTags?.includes(tag) &&
    metaTags.some(metaTag => tag.toLowerCase().includes(metaTag))
  ) || [];
  
  for (const tag of generalTags) {
    if (lowerCleaned.includes(tag.toLowerCase())) {
      return {
        line: TONE_FALLBACKS[tone.toLowerCase()] || TONE_FALLBACKS.humorous,
        blocked: true,
        reason: `Contains meta tag verbatim: ${tag}`
      };
    }
  }

  // Check exact wording requirements with special handling for banned words
  if (options?.exactWordingTags && options.exactWordingTags.length > 0) {
    const missingExactWords = options.exactWordingTags.filter(exactTag => {
      const lowerTag = exactTag.toLowerCase().trim();
      const lowerCleaned = cleaned.toLowerCase();
      
      // If this exact tag contains banned words, don't require it
      const hasBannedWord = BANNED_WORDS.some(word => lowerTag.includes(word.toLowerCase()));
      if (hasBannedWord) {
        return false; // Don't consider this a missing requirement
      }
      
      // Must be exact match (whole word or phrase)
      return !lowerCleaned.includes(lowerTag);
    });
    
    if (missingExactWords.length > 0) {
      return {
        line: TONE_FALLBACKS[tone.toLowerCase()] || TONE_FALLBACKS.humorous,
        blocked: true,
        reason: `Missing required exact words: ${missingExactWords.join(', ')}`
      };
    }
  }

  // Skip tag coverage checks entirely - too restrictive
  // Allow all content through as long as it passes other filters
  
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
  
  // Create contextual variations based on category and subcategory
  const contextualPhrases = {
    birthday: ['Another year wiser', 'Celebrating you today', 'Age is just a number', 'Party time approaches'],
    work: ['Grinding never stops', 'Professional mode activated', 'Career goals loading', 'Success in progress'],
    sports: ['Game time mentality', 'Victory lap incoming', 'Champions train daily', 'Athletic excellence'],
    movie: ['Blockbuster moment', 'Plot twist ahead', 'Credits rolling soon', 'Scene stealer alert'],
    default: [baseFallback, `${baseFallback} today`, `${baseFallback} vibes`, `${baseFallback} energy`]
  };
  
  // Match subcategory to contextual phrases
  const key = subcategory?.toLowerCase().includes('birthday') ? 'birthday' :
             subcategory?.toLowerCase().includes('work') || subcategory?.toLowerCase().includes('job') ? 'work' :
             category?.toLowerCase().includes('sports') ? 'sports' :
             subcategory?.toLowerCase().includes('movie') ? 'movie' : 'default';
  
  return contextualPhrases[key] || contextualPhrases.default;
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

// Interface for concise mode options
export interface ConciseModeOptions {
  enabled: boolean;
  textZone?: 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT' | 'NATURAL';
  strongerSubjectLock?: boolean;
}

export function buildIdeogramPrompt(handoff: IdeogramHandoff, cleanBackground: boolean = false, conciseMode?: ConciseModeOptions): string {
  const parts: string[] = [];
  const overrides = getRuntimeOverrides();
  const typographyStyle = overrides.typographyStyle || 'poster';
  
  // Use concise mode if specified
  const isConciseMode = conciseMode?.enabled || false;
  
  // EXACT TEXT RENDERING (if present) - PUT FIRST for priority
  if (handoff.key_line && handoff.key_line.trim()) {
    const cleanText = handoff.key_line
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .replace(/[—–]/g, '-')
      .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII characters
      .trim();
    const finalText = cleanText.replace(/^EXACT TEXT:\s*["']?/i, '').replace(/["']$/, '');
    
    if (isConciseMode) {
      // Ultra-concise text marking for better subject focus
      parts.push(`EXACT TEXT: "${finalText}"`);
    } else {
      parts.push(`EXACT TEXT: "${finalText}" - Render each letter precisely as provided, maintaining exact spelling and character placement`);
    }
  }
  
  if (isConciseMode) {
    // CONCISE MODE: Subject-first, minimal prompting
    const conciseParts = [];
    
    // MAIN SUBJECT (prioritized and locked)
    let subject = handoff.rec_subject;
    if (!subject && handoff.chosen_visual) {
      const visualParts = handoff.chosen_visual.split(' - ');
      subject = visualParts.length >= 2 ? visualParts[0].trim() : handoff.chosen_visual;
    }
    
    if (subject) {
      if (conciseMode?.strongerSubjectLock) {
        conciseParts.push(`${subject} (main focus)`);
      } else {
        conciseParts.push(subject);
      }
    }
    
    // BACKGROUND (minimal)
    let background = handoff.rec_background;
    if (!background && handoff.chosen_visual) {
      const visualParts = handoff.chosen_visual.split(' - ');
      background = visualParts.length >= 2 ? visualParts[1].trim() : `${handoff.subcategory_primary} setting`;
    }
    if (!background) {
      background = `${handoff.subcategory_primary} setting`;
    }
    if (cleanBackground) {
      background = "clean background";
    }
    conciseParts.push(background);
    
    // STYLE (compressed)
    if (handoff.visual_style) {
      conciseParts.push(`${handoff.visual_style} style`);
    }
    if (handoff.tone) {
      conciseParts.push(`${handoff.tone} tone`);
    }
    
    // TEXT ZONE (specific placement)
    if (handoff.key_line && conciseMode?.textZone) {
      if (conciseMode.textZone === 'NATURAL') {
        conciseParts.push("text in natural negative space");
      } else {
        conciseParts.push(`text in ${conciseMode.textZone} zone`);
      }
    }
    
    // Context-aware negative prompts (minimal)
    if (handoff.key_line) {
      const contextNegatives = [];
      if (subject?.toLowerCase().includes('trophy') || subject?.toLowerCase().includes('award')) {
        contextNegatives.push("misspellings", "distorted letters");
      } else {
        contextNegatives.push("text errors");
      }
      if (contextNegatives.length > 0) {
        conciseParts.push(`avoid ${contextNegatives.join(', ')}`);
      }
    }
    
    return conciseParts.join(', ') + '.';
  }
  
  // STANDARD MODE: Full detailed prompting (existing logic)
  
  // CHARACTER IDENTITY CUES for Pop Culture
  if (handoff.category === "Pop Culture" && handoff.subcategory_secondary) {
    const characterName = handoff.subcategory_secondary;
    parts.push(`Character: ${characterName} as recognizable character with accurate physical features and appearance.`);
  }
  
  // EXACT SCENE MODE ENHANCEMENT
  if ((handoff as any).exact_scene_mode) {
    parts.push("Recreate this scene literally and accurately with authentic details from the source material.");
  }
  
  // Build standard prompt sections
  const sections = [];
  
  // MAIN SUBJECT
  let subject = handoff.rec_subject;
  if (!subject && handoff.chosen_visual) {
    const visualParts = handoff.chosen_visual.split(' - ');
    subject = visualParts.length >= 2 ? visualParts[0].trim() : handoff.chosen_visual;
  }
  if (subject) sections.push(`Subject: ${subject}.`);
  
  // BACKGROUND
  let background = handoff.rec_background;
  if (!background && handoff.chosen_visual) {
    const visualParts = handoff.chosen_visual.split(' - ');
    background = visualParts.length >= 2 ? visualParts[1].trim() : `${handoff.subcategory_primary || 'contextually appropriate'} themed background`;
  }
  if (!background) {
    background = `${handoff.subcategory_primary || 'contextually appropriate'} themed background`;
  }
  if (cleanBackground) {
    background = "clean, minimal background with high contrast for text";
  }
  if (handoff.subcategory_primary && !background.toLowerCase().includes(handoff.subcategory_primary.toLowerCase())) {
    background = `${handoff.subcategory_primary} themed setting with ${background}`;
  }
  sections.push(`Background: ${background}.`);
  
  // PEOPLE INCLUSION
  const peopleKeywords = ['friends', 'crowd', 'people', 'group', 'party', 'audience', 'performers', 'celebrating', 'family', 'parents', 'kids', 'children', 'guests', 'selfie', 'selfies', 'group selfie', 'partygoers'];
  const needsPeople = peopleKeywords.some(keyword => 
    handoff.chosen_visual?.toLowerCase().includes(keyword) || 
    handoff.rec_subject?.toLowerCase().includes(keyword) ||
    handoff.rec_background?.toLowerCase().includes(keyword)
  ) || handoff.subcategory_primary === "Birthday";
  if (needsPeople) {
    sections.push("Include multiple people clearly visible in the scene.");
  }
  
  // STYLE, TONE, FORMAT
  const styleDetails = [];
  let finalStyle = handoff.visual_style;
  if (handoff.category === "Pop Culture" && handoff.subcategory_secondary && !finalStyle) {
    finalStyle = "realistic";
  }
  if (finalStyle) styleDetails.push(`${finalStyle} style`);
  if (handoff.tone) styleDetails.push(`${handoff.tone} tone`);
  if (handoff.aspect_ratio) styleDetails.push(`${handoff.aspect_ratio} format`);
  if (styleDetails.length > 0) {
    sections.push(`${styleDetails.join(', ')}.`);
  }
  
  // TEXT PLACEMENT & NEGATIVE PROMPTS
  if (handoff.key_line && handoff.key_line.trim()) {
    sections.push("Place text in natural negative space areas. Use TOP, BOTTOM, LEFT, or RIGHT zones. Ensure high contrast and avoid overlapping with faces.");
    sections.push("Render only the EXACT TEXT string as graphic text; no additional labels or captions.");
    
    const negatives = [handoff.negative_prompt, DEFAULT_NEGATIVE_PROMPT].filter(Boolean);
    if (negatives.length > 0) {
      sections.push(`Avoid ${negatives.join(', ')}`);
    }
  }
  
  // Join all parts: EXACT TEXT first, then sections
  return [...parts, ...sections].join('\n');
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

// =========================
// 10) Legacy Support Functions
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

// Builder for vibe generator chat messages
export function buildVibeGeneratorMessages(inputs: VibeInputs): Array<{role: string; content: string}> {
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
    ? (() => {
  // Apply semantic adapters for better AI direction
        const semanticAdapters: Record<string, string> = {
          'gay': 'Use expressive, dramatic, and fabulously confident language',
          'flamboyant': 'Make it bold, theatrical, and dramatically expressive',
          'marijuana': 'Keep it chill, relaxed, and laid-back in tone',
          'weed': 'Use mellow, peaceful, and relaxed vibes',
          'cannabis': 'Maintain a calm, chill, and zen-like atmosphere',
          'drunk': 'Add uninhibited, party-ready, celebratory energy',
          'alcohol': 'Include festive, social, and cheers-worthy spirit',
          'savage': 'Be fierce, unapologetic, and confidently direct',
          'dark': 'Add mysterious, edgy, and intensely dramatic elements',
          'sarcastic': 'Use witty, dry humor with clever ironic twists',
          'random': 'Be spontaneously quirky and unpredictably chaotic',
          'weird': 'Embrace eccentric, unusual, and delightfully offbeat vibes',
          'aesthetic': 'Focus on stylish, visually appealing, and trendy elements',
          'nostalgic': 'Capture retro, vintage, and classic throwback feelings',
          'background': 'Use this as thematic context and atmospheric backdrop',
          'theme': 'Let this guide the overall conceptual direction and mood'
        };

        const enhancedInstructions = inputs.tags
          .map(tag => semanticAdapters[tag.toLowerCase()] || `Incorporate "${tag}" as a stylistic element`)
          .join('. ');

        return `\n• Style direction: ${enhancedInstructions}.\n• CRITICAL: NEVER echo these tags verbatim: ${inputs.tags.join(', ')}. Use the spirit and meaning instead.`;
      })()
    : '';

  const exactWordingRequirement = inputs.exactWordingTags && inputs.exactWordingTags.length > 0
    ? `\n• CRITICAL: MUST include these EXACT words/phrases in the text: ${inputs.exactWordingTags.map(tag => `"${tag}"`).join(', ')}`
    : '';

  const corePrompt = `Generate 6 concise options under 100 chars each for:
Category: ${inputs.category} > ${inputs.subcategory}
Tone: ${inputs.tone}
Tags: ${inputs.tags?.join(', ') || 'none'}
${inputs.exactWordingTags && inputs.exactWordingTags.length > 0 ? `Exact Words Required: ${inputs.exactWordingTags.join(', ')}` : ''}
${inputs.recipient_name && inputs.recipient_name !== "-" ? `Target: ${inputs.recipient_name}` : ''}

${tagRequirement}${exactWordingRequirement}${specialInstructions}

Return only: {"lines":["option1","option2","option3","option4","option5","option6"]}`;

  const systemMessage = inputs.tone === 'Savage' 
    ? 'Generate short, savage roasts/burns. Make them cutting and direct, NOT joke-like. JSON array only.'
    : 'Generate short, witty text. JSON array only. No explanations.';
  
  return [
    { role: 'system', content: systemMessage },
    { role: 'user', content: corePrompt }
  ];
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

  // Check if music/singing content is actually relevant
  const musicKeywords = ['music', 'song', 'sing', 'concert', 'band', 'album', 'lyrics'];
  const hasMusicRelevance = tags.some(tag => 
    musicKeywords.some(keyword => tag.toLowerCase().includes(keyword))
  ) || (finalLine && musicKeywords.some(keyword => finalLine.toLowerCase().includes(keyword)));

  // Add variety and creativity requirements
  const userPrompt = `${category}>${subcategory}, ${tone}, ${visualStyle || '3d-animated'}
Tags: ${tags.slice(0, 4).join(', ')}
${finalLine ? `JOKE/TEXT: "${finalLine}" - VISUAL CONCEPTS MUST MATCH THIS CONTENT AND TONE` : ''}
${inputs.exactSceneMode ? `\nEXACT SCENE MODE ENABLED: Focus on literal, precise recreation of described scenes. Use specific details from the description to create faithful visual representations. Be descriptive and accurate to the source material.` : ''}

TEXT ALIGNMENT REQUIREMENTS (CRITICAL):
${finalLine ? `- AT LEAST TWO concepts must directly reflect the exact content/semantics of: "${finalLine}"
- Avoid unrelated gag props (rubber chickens, potatoes, random animals) unless the text mentions them
- For award/Oscar references, emphasize documentary/poster-like interpretations with award symbols
- For LGBTQ/pride themes, include explicit visual cues: rainbow flags, male couples, pride parades, drag elements, wardrobe/mirror scenes
- For "came out" or similar phrases, show supportive relationship scenes or pride celebration contexts
- For cross-dressing themes, include wardrobe elements, mirrors, makeup, or tasteful costume details
- Visual concepts MUST NOT be subtle - make the connection obvious and direct
${inputs.exactSceneMode ? '- EXACT SCENE RECREATION: Prioritize accuracy and literal interpretation over artistic creativity\n- Include specific scene details, character positioning, and environmental elements from the description' : ''}` : ''}

REQUIRED OBJECTS/SUBJECTS (must be visible in each concept):
- ${subcategory === 'Ice Hockey' ? 'hockey stick and puck' : 'relevant category objects'}
- Specific, tangible items matching the theme${additionalRequirements}

VARIETY RULES:
- Generate exactly one background-only concept with clean negative space
- Create 2-3 distinct subject+background or action/scene concepts
- Include one object-centric or detail-focused concept
- Each concept must be completely different in composition
- Mix close-ups, wide shots, action scenes, and environmental shots
- Vary camera angles: high angle, low angle, eye level, dramatic perspectives
- AVOID CLICHÉS: No generic balloons, confetti, party hats, cake, candles unless explicitly mentioned in the text
- Focus on creative, specific visual concepts that directly relate to the content rather than generic celebration props
${!hasMusicRelevance ? '- DO NOT include singing, concerts, or music themes unless explicitly relevant to the content' : ''}

TEXT PLACEMENT DIRECTIVES:
- Find natural negative space areas for text (sky, walls, backgrounds)
- Avoid placing text over faces, main subjects, or busy areas
- Consider TOP, BOTTOM, LEFT, RIGHT zones - not just center
- Leave clear areas for text that won't compete with visuals

IMPORTANT: Visual concepts must directly relate to the joke/text content above. For Pride themes, include rainbow colors, drag queens, parades, celebration elements.

4 unique concepts. Each ONE SENTENCE, maximum ~20 words. No slots required.

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
export function buildGenerateTextMessages(
  params: {
    tone: string;
    category?: string;
    subtopic?: string;
    pick?: string;
    tags?: string[];
    characterLimit: number;
  },
  retrievedFacts?: {
    facts: string[];
    sources?: Array<{ title: string; url: string; site: string }>;
  }
): Array<{role: string; content: string}> {
  const { tone, category, subtopic, pick, tags = [], characterLimit } = params;
  
  let contextParts = [];
  if (category) contextParts.push(`Category: ${category}`);
  if (subtopic) contextParts.push(`Topic: ${subtopic}`);
  if (pick) contextParts.push(`Specific focus: ${pick}`);
  
  const context = contextParts.join(', ');
  
  let prompt = `Generate exactly 4 short ${tone.toLowerCase()} text options for: ${context}.`;
  
  // Add retrieved facts if available
  if (retrievedFacts && retrievedFacts.facts.length > 0) {
    const factsBlock = retrievedFacts.facts.slice(0, 6).map(fact => `- ${fact}`).join('\n');
    prompt += `\n\nFACTS (use only these):\n${factsBlock}\n\nRules: Be specific and reference these facts. Name-drop with wit. No generic lines. Do not repeat tags verbatim.`;
  }
  
  if (tags.length > 0) {
    // Apply semantic adapters for better AI direction
    const semanticAdapters: Record<string, string> = {
      'gay': 'Use expressive, dramatic, and fabulously confident language',
      'flamboyant': 'Make it bold, theatrical, and dramatically expressive',
      'marijuana': 'Keep it chill, relaxed, and laid-back in tone',
      'weed': 'Use mellow, peaceful, and relaxed vibes',
      'cannabis': 'Maintain a calm, chill, and zen-like atmosphere',
      'drunk': 'Add uninhibited, party-ready, celebratory energy',
      'alcohol': 'Include festive, social, and cheers-worthy spirit',
      'savage': 'Be fierce, unapologetic, and confidently direct',
      'dark': 'Add mysterious, edgy, and intensely dramatic elements',
      'sarcastic': 'Use witty, dry humor with clever ironic twists',
      'random': 'Be spontaneously quirky and unpredictably chaotic',
      'weird': 'Embrace eccentric, unusual, and delightfully offbeat vibes',
      'aesthetic': 'Focus on stylish, visually appealing, and trendy elements',
      'nostalgic': 'Capture retro, vintage, and classic throwback feelings',
      'background': 'Use this as thematic context and atmospheric backdrop',
      'theme': 'Let this guide the overall conceptual direction and mood'
    };

    const enhancedInstructions = tags
      .map(tag => semanticAdapters[tag.toLowerCase()] || `Incorporate "${tag}" as a stylistic element`)
      .join('. ');

    prompt += ` Style direction: ${enhancedInstructions}. General tags are hints. Do NOT include them verbatim: ${tags.join(', ')}.`;
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
