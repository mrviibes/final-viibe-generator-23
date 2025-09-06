// Viibe Generator AI Spec - Complete Implementation
export interface CategoryContext {
  category: string;
  subcategory: string;
  entity?: string;
  contextId: string;
}

export interface TextConfig {
  tone: string;
  layout: string;
  textOption: 'ai' | 'manual' | 'none';
  tags: string[];
  manualText?: string;
}

export interface VisualConfig {
  visualStyle: string;
  subjectOption: 'ai' | 'upload' | 'none';
  visualTags: string[];
  dimensions: string;
}

export interface FinalPayload {
  textContent?: string;
  textLayoutSpec?: any;
  visualStyle: string;
  visualPrompt?: string;
  negativePrompt?: string;
  dimensions: string;
  contextId: string;
  tone: string;
  tags: string[];
}

// 4-Lane Text Generation (Platform, Audience, Skill, Absurdity)
export interface TextLanes {
  platform: string;  // ~50 chars
  audience: string;   // ~70 chars  
  skill: string;      // ~90 chars
  absurdity: string;  // ≤100 chars
}

// 4-Lane Visual Generation (Objects, Group, Solo, Creative)
export interface VisualLanes {
  objects: string;    // Props/environment only (no people)
  group: string;      // Multiple people, candid gestures
  solo: string;       // One person doing an action (verb required)
  creative: string;   // Symbolic/abstract composition
}

export interface VisualContract {
  visualOptions: VisualLanes;
  negativePrompt: string;
}

// Constants
export const CATEGORIES = ["Celebrations", "Sports", "Daily Life", "Vibes & Punchlines", "Pop Culture"];

export const SUBCATEGORIES_BY_CATEGORY = {
  "Celebrations": ["Birthday Party", "Wedding", "Graduation", "Anniversary"],
  "Sports": ["Hockey", "Football", "Basketball", "Soccer"],
  "Daily Life": ["Work", "Home", "Travel", "Food"],
  "Vibes & Punchlines": ["Funny", "Motivational", "Sarcastic"],
  "Pop Culture": ["Celebrities", "Movies", "Music", "TV Shows"]
};

export const TONE_OPTIONS = [
  "Humorous", "Savage", "Sentimental", "Nostalgic", 
  "Romantic", "Inspirational", "Playful", "Serious"
];

export const LAYOUT_OPTIONS = [
  "negativeSpace", "memeTopBottom", "lowerThird", 
  "sideBarLeft", "badgeSticker", "subtleCaption"
];

export const VISUAL_STYLES = [
  "realistic", "caricature", "anime", 
  "3dAnimated", "illustrated", "popArt"
];

export const DIMENSION_OPTIONS = ["square", "landscape", "portrait", "custom"];

// AI Prompt Builders
export function buildTextLanesPrompt(context: CategoryContext, textConfig: TextConfig): string {
  const systemPrompt = `You are a witty content generator that creates 4 distinct one-liners following specific lanes and rules.

LANES STRUCTURE:
- Platform (~50 chars): Reference the context/setting
- Audience (~70 chars): Speak to who this resonates with  
- Skill (~90 chars): Highlight abilities or actions
- Absurdity (≤100 chars): Push boundaries with unexpected twists

TONE: ${textConfig.tone}
${getToneInstructions(textConfig.tone)}

RULES:
- All tags must appear in EVERY line: ${textConfig.tags.join(', ')}
- Use only commas, periods, colons (NO em-dash or --)
- Each lane must be unique in approach
- JSON format: {"platform": "...", "audience": "...", "skill": "...", "absurdity": "..."}`;

  const userPrompt = `Generate 4 one-liners for: ${context.category} → ${context.subcategory}${context.entity ? ` (${context.entity})` : ''}

Tags to include: ${textConfig.tags.join(', ')}
Tone: ${textConfig.tone}

Follow the 4-lane structure exactly.`;

  return JSON.stringify({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  });
}

export function buildVisualLanesPrompt(context: CategoryContext, visualConfig: VisualConfig): string {
  const systemPrompt = `You are a visual prompt generator that creates 4 distinct image prompts following specific lanes.

LANES STRUCTURE:
- Objects: Props/environment only (NO people)
- Group: Multiple people with candid gestures  
- Solo: One person doing a specific action (verb required)
- Creative: Symbolic/abstract composition

RULES:
- All tags must appear in every lane: ${visualConfig.visualTags.join(', ')}
- Objects lane: NO people words allowed
- Group lane: Must mention multiple people
- Solo lane: Must include one person + action verb
- Creative lane: Must say "symbolic" or "abstract"
- Keep prompts ≤300 chars each
- Do NOT include style words (realistic, anime, etc.)
- Provide category-aware negative prompt

JSON format: {"visualOptions": {"objects": "...", "group": "...", "solo": "...", "creative": "..."}, "negativePrompt": "..."}`;

  const userPrompt = `Generate 4 visual prompts for: ${context.category} → ${context.subcategory}${context.entity ? ` (${context.entity})` : ''}

Visual tags: ${visualConfig.visualTags.join(', ')}
Style: ${visualConfig.visualStyle} (don't include in prompts)

Follow the 4-lane structure exactly.`;

  return JSON.stringify({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  });
}

function getToneInstructions(tone: string): string {
  const instructions = {
    "Humorous": "Use light puns and exaggeration. Keep it fun and accessible.",
    "Savage": "Bold wit and roasts. Push boundaries but stay clever.",
    "Sentimental": "Heartfelt and warm. Focus on emotional connections.",
    "Nostalgic": "Wistful, retro callbacks. Reference past eras fondly.",
    "Romantic": "Affectionate and dreamy. Focus on love and connection.",
    "Inspirational": "Uplifting and motivational. Encourage and empower.",
    "Playful": "Cheeky and mischievous. Light teasing and fun.",
    "Serious": "Factual and respectful. Maintain dignity and accuracy."
  };
  return instructions[tone] || "Maintain appropriate tone for the context.";
}

export function getCategoryNegativePrompt(category: string): string {
  const negatives = {
    "Sports": "no laptops, no desks, no coffee mugs, no office settings",
    "Celebrations": "no background lettering, no banners with words, no text overlays",
    "Daily Life": "no balloons, no confetti, no sports gear, no party items",
    "Vibes & Punchlines": "no specific branded items, no corporate logos",
    "Pop Culture": "no generic people, no stock photo looks"
  };
  return negatives[category] || "no inappropriate content";
}

// Utility Functions
export function updateContextId(category: string, subcategory: string, entity?: string): string {
  const parts = [
    category.toLowerCase().replace(/\s+/g, ''),
    subcategory.toLowerCase().replace(/\s+/g, '')
  ];
  if (entity) {
    parts.push(entity.toLowerCase().replace(/\s+/g, ''));
  }
  return parts.join('.');
}

export function validateTextLanes(lanes: TextLanes, tags: string[]): boolean {
  // Check if all tags appear in every lane
  const allLines = [lanes.platform, lanes.audience, lanes.skill, lanes.absurdity];
  return tags.every(tag => 
    allLines.every(line => 
      line.toLowerCase().includes(tag.toLowerCase())
    )
  );
}

export function validateVisualLanes(lanes: VisualLanes): boolean {
  // Objects lane should not mention people
  const peopleWords = ['person', 'people', 'man', 'woman', 'guy', 'girl', 'he', 'she', 'they'];
  const objectsHasPeople = peopleWords.some(word => 
    lanes.objects.toLowerCase().includes(word)
  );
  
  // Group lane should mention multiple people
  const groupMentionsPeople = lanes.group.toLowerCase().includes('people') || 
    lanes.group.toLowerCase().includes('group') ||
    lanes.group.toLowerCase().includes('friends');
  
  // Solo lane should mention one person and an action
  const soloMentionsPerson = lanes.solo.toLowerCase().includes('person') ||
    lanes.solo.toLowerCase().includes('man') ||
    lanes.solo.toLowerCase().includes('woman');
  
  return !objectsHasPeople && groupMentionsPeople && soloMentionsPerson;
}

// Layout Specifications
export const LAYOUT_SPECS = {
  negativeSpace: {
    type: "negativeSpace",
    rules: "Find largest empty area; never overlap subject",
    zones: []
  },
  memeTopBottom: {
    type: "memeTopBottom",
    zones: [
      { pos: "top", height: "18%", align: "center", caps: true, stroke: "2px black" },
      { pos: "bottom", height: "18%", align: "center", caps: true, stroke: "2px black" }
    ]
  },
  lowerThird: {
    type: "lowerThirdBanner", 
    rules: "Solid/blur bar at bottom; opacity 70-80%; align left"
  },
  sideBarLeft: {
    type: "sideBarLeft",
    rules: "Vertical panel 28% width; white text; dark overlay"
  },
  badgeSticker: {
    type: "badgeStickerCallout",
    rules: "Circular badge; top-right corner; high contrast"
  },
  subtleCaption: {
    type: "subtleCaption", 
    rules: "Small caption at bottom; never cover faces"
  }
};

// Sample payload for testing
export const SAMPLE_PAYLOAD: FinalPayload = {
  textContent: "Jesse raising a glass mid-toast, balloons behind, playful grin.",
  textLayoutSpec: LAYOUT_SPECS.memeTopBottom,
  visualStyle: "realistic",
  visualPrompt: "Friends in party hats, Jesse holding a drink, candid cheers, colorful balloons in background",
  negativePrompt: "no background lettering, no banners with words, no text overlays",
  dimensions: "portrait",
  contextId: "celebrations.birthdayparty.jesse",
  tone: "playful",
  tags: ["Jesse", "balloons", "drinking", "party", "celebration"]
};