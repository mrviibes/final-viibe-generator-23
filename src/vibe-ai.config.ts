/*
  Vibe Generator — Single-Source-of-Truth AI Config
  Purpose: Keep every AI rule, prompt, toggle, schema, and validator in ONE place.
  How to use:
    import { AI_CONFIG, buildOutput, validateInputs } from "./vibe-ai.config";
    const ok = validateInputs(userInputs);
    const result = buildOutput(userInputs);

  Change log:
    - v1.0.0 initial extraction
*/

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
    textSpeed?: string;
    usedFallback: boolean;
    blockedCount: number;
    candidateCount: number;
    reason?: string;
    retryAttempt?: number;
    originalModel?: string;
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
}

// =========================
// 2) Feature Flags and Constants
// =========================
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
    max_tokens: 150,
    model: 'gpt-4o-mini'
  }
};

// =========================
// 3) Prompts and System Messages
// =========================
export const SYSTEM_PROMPTS = {
  vibe_maker: `You are the Vibe Maker writer. Produce a single line under 100 characters based on user choices. Follow the tone guide. Use tags as hints, not as a list. Be witty or sincere as required, never cruel. No emojis. No hashtags. No quotation marks. No newlines. No profanity or slurs. No hate or harassment. No sexual content about minors. No doxxing or personal data. Output JSON only in this exact shape: {"line":"..."} Nothing else.`,
  
  vibe_generator: `You are a witty, creative copywriter specializing in short-form content. 
Your task is to write 6 distinct options that vary significantly in structure, theme, and wording while maintaining the specified tone.
Make each option distinctly different - avoid repeating similar phrases, structures, or concepts.
Always output valid JSON only.`,

  visual_generator: `Generate 4 visual concepts for graphics that MUST align with the provided text and tone. Be concise.

RULES:
- Return ONLY valid JSON - no markdown, no extra text
- Each prompt: 40-60 words maximum
- 4 slots: "background-only", "subject+background", "object", "singing"
- CRITICAL: Visual concepts MUST relate to the provided text/joke content and tone
- For Pride themes: Include rainbow, drag queens, parades, celebrations, fabulous elements
- For jokes: Match the humor and subject matter exactly
- SINGING SLOT: Always include musical/performance elements in the 4th option

Format:
{
  "options": [
    {
      "slot": "background-only",
      "subject": "brief description",
      "background": "brief description", 
      "prompt": "concise prompt (40-60 words)"
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
  humorous: "Short and witty like you asked",
  savage: "Bold and direct as requested",
  sentimental: "Heartfelt message coming right up",
  nostalgic: "Memory lane vibes activated",
  romantic: "Sweet words in progress",
  inspirational: "Motivational mode engaged",
  playful: "Fun and light as ordered",
  serious: "Thoughtful message loading"
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
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[—–]/g, '-')
    .trim();
}

function truncateIfNeeded(s: string, limit = AI_CONFIG.limits.phrase_char_limit): GeneratedPhrase {
  const over = s.length > limit;
  return { text: over ? s.slice(0, limit) : s, truncated: over };
}

function spellcheck(s: string): string[] {
  if (!AI_CONFIG.spellcheck.enabled) return [];
  // naive check, replace with real spellchecker as needed
  const tokens = s.split(/[^A-Za-z0-9']/).filter(Boolean);
  const issues: string[] = [];
  for (const t of tokens) {
    const looksWord = /[A-Za-z]{3,}/.test(t);
    if (!looksWord) continue;
    const ok = AI_CONFIG.spellcheck.allowlist.includes(t) || /^[A-Za-z][a-z]+$/.test(t);
    if (!ok) issues.push(`possible spelling issue: ${t}`);
  }
  return issues;
}

export function postProcessLine(line: string, tone: string, requiredTags?: string[]): VibeCandidate {
  // Trim spaces
  let cleaned = line.trim();
  
  // Remove banned patterns (emojis, hashtags, quotes, newlines)
  for (const pattern of BANNED_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Apply text normalization
  cleaned = normalizeTypography(cleaned);
  
  // Fix common text generation errors
  // Remove duplicate words (e.g., "to beance to become" -> "to become")
  cleaned = cleaned.replace(/\b(\w+)\s+\w*\1/gi, '$1');
  
  // Fix repeated "to" patterns specifically
  cleaned = cleaned.replace(/\bto\s+\w*to\b/gi, 'to');
  
  // Fix common spelling errors specific to generation
  cleaned = cleaned.replace(/\basement\b/gi, 'basement')
    .replace(/\bcarrer\b/gi, 'career')
    .replace(/\bskils\b/gi, 'skills');
  
  // Remove double spaces and clean up
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // Hard truncate to 100 characters
  if (cleaned.length > 100) {
    cleaned = cleaned.slice(0, 100);
  }
  
  // Check for banned words
  const lowerCleaned = cleaned.toLowerCase();
  for (const word of BANNED_WORDS) {
    if (lowerCleaned.includes(word)) {
      return {
        line: TONE_FALLBACKS[tone.toLowerCase()] || TONE_FALLBACKS.humorous,
        blocked: true,
        reason: `Contains banned word: ${word}`
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
  
  // Enforce savage tone quality - block joke-like content for savage
  if (tone.toLowerCase() === 'savage') {
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
  
  // Check tag coverage for important tags (skip visual-only tags) - relaxed approach
  if (requiredTags && requiredTags.length > 0) {
    const visualOnlyTags = ['person', 'people', 'group', 'man', 'woman', 'male', 'female'];
    const contentTags = requiredTags.filter(tag => !visualOnlyTags.includes(tag.toLowerCase()));
    
    if (contentTags.length > 0) {
      // Create a simple synonyms map for common terms
      const synonymsMap: Record<string, string[]> = {
        'work': ['job', 'career', 'office', 'workplace', 'employment'],
        'job': ['work', 'career', 'employment', 'position'],
        'career': ['work', 'job', 'profession', 'employment'],
        'birthday': ['bday', 'birth', 'celebration', 'party'],
        'party': ['celebration', 'bash', 'gathering', 'event'],
        'funny': ['hilarious', 'comedy', 'humor', 'joke', 'laughter'],
        'movie': ['film', 'cinema', 'flick'],
        'music': ['song', 'album', 'band', 'artist'],
        'love': ['romance', 'relationship', 'dating', 'crush'],
        'food': ['eat', 'meal', 'cooking', 'restaurant', 'dining']
      };
      
      // Extract keywords from tags and check for matches with synonyms
      const hasTagCoverage = contentTags.some(tag => {
        const lowerTag = tag.toLowerCase();
        
        // Direct match
        if (lowerCleaned.includes(lowerTag)) return true;
        
        // Check for synonyms
        const synonyms = synonymsMap[lowerTag] || [];
        if (synonyms.some(synonym => lowerCleaned.includes(synonym))) return true;
        
        // Check for partial word matches (e.g., "birthday" matches "birth")
        if (lowerTag.length > 4) {
          const rootWord = lowerTag.slice(0, -2); // Remove last 2 chars for partial match
          if (lowerCleaned.includes(rootWord)) return true;
        }
        
        return false;
      });
      
      if (!hasTagCoverage) {
        // Don't block for tag issues - just mark it
        return {
          line: cleaned,
          blocked: false,
          reason: `Partial tag coverage: ${contentTags.join(', ')}`
        };
      }
    }
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
  
  // Create 4 distinct variations based on tone and context
  const variations = [
    baseFallback,
    `${baseFallback} today`,
    `${baseFallback} vibes`,
    `${baseFallback} energy`
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
// 9) Ideogram-specific Functions
// =========================
export function buildIdeogramPrompt(handoff: IdeogramHandoff, cleanBackground: boolean = false): string {
  const parts: string[] = [];
  
  // EXACT TEXT RENDERING (if present)
  if (handoff.key_line && handoff.key_line.trim()) {
    const cleanText = handoff.key_line.replace(/[""]/g, '"').replace(/['']/g, "'").replace(/[—–]/g, '-').trim();
    parts.push(`EXACT TEXT: "${cleanText}"`);
  }
  
  // OCCASION/CATEGORY
  if (handoff.category && handoff.subcategory_primary) {
    parts.push(`Occasion: ${handoff.category}, ${handoff.subcategory_primary}${handoff.subcategory_secondary ? ` (${handoff.subcategory_secondary})` : ''}.`);
  }
  
  // MAIN SUBJECT
  let subject = handoff.rec_subject;
  if (!subject && handoff.chosen_visual) {
    const visualParts = handoff.chosen_visual.split(' - ');
    subject = visualParts.length >= 2 ? visualParts[0].trim() : handoff.chosen_visual;
  }
  if (subject) {
    parts.push(`Subject: ${subject}.`);
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
  
  // PEOPLE INCLUSION (when recommended)
  const peopleKeywords = ['friends', 'crowd', 'people', 'group', 'party', 'audience', 'performers', 'celebrating'];
  const needsPeople = peopleKeywords.some(keyword => 
    handoff.chosen_visual?.toLowerCase().includes(keyword) || 
    handoff.rec_subject?.toLowerCase().includes(keyword) ||
    handoff.rec_background?.toLowerCase().includes(keyword)
  );
  if (needsPeople) {
    parts.push("Include multiple people clearly visible in the scene.");
  }
  
  // COMPOSITION & STYLE
  if (handoff.visual_style) {
    parts.push(`Style: ${handoff.visual_style}.`);
  }
  if (handoff.tone) {
    parts.push(`Tone: ${handoff.tone}.`);
  }
  if (handoff.aspect_ratio) {
    parts.push(`Format: ${handoff.aspect_ratio}.`);
  }
  
  // TEXT PLACEMENT (if present)
  if (handoff.key_line && handoff.key_line.trim()) {
    parts.push("Place text clearly visible in available space, not blocking main subject.");
  }
  
  // AVOID LIST
  const avoidList = ["typos", "misspellings", "extra text", "wrong spelling"];
  if (handoff.visual_style?.toLowerCase() === 'realistic') {
    avoidList.push("cartoon style", "flat colors");
  }
  if (cleanBackground) {
    avoidList.push("visual clutter", "decorative elements");
  }
  if (needsPeople) {
    avoidList.push("empty scenes", "isolated backgrounds");
  }
  parts.push(`Avoid: ${avoidList.join(', ')}.`);
  
  return parts.join(' ');
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