// Enhanced Input Validation System
// Validates inputs according to Vibe Maker AI Training Sheet specifications

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  normalizedInputs?: ValidatedInputs;
}

export interface ValidatedInputs {
  category: string;
  subcategory: string;
  tone: string;
  text_tags: string[];
  recipient_name?: string;
  relationship?: string;
  language?: string;
}

// Allowed categories with their subcategories
export const CATEGORY_MAP: Record<string, string[]> = {
  "celebrations": [
    "birthday", "christmas-day", "thanksgiving-us", "new-years-eve", "christmas-eve",
    "halloween", "mothers-day", "fathers-day", "independence-day-us", "new-years-day",
    "easter", "memorial-day-us", "valentines-day", "wedding", "wedding-anniversary",
    "graduation", "baby-shower", "retirement-party", "housewarming-party"
  ],
  "sports": [
    "football", "basketball", "baseball", "soccer", "tennis", "golf", "swimming",
    "running", "cycling", "gym-workout", "yoga", "boxing", "martial-arts",
    "skateboarding", "skiing", "snowboarding", "surfing", "rock-climbing"
  ],
  "daily-life": [
    "work", "school", "commute", "cooking", "cleaning", "shopping", "gardening",
    "pets", "family-time", "friends", "dating", "hobbies", "travel", "home",
    "technology", "social-media", "food", "coffee", "sleep"
  ],
  "vibes-punchlines": [
    "motivational", "self-talk", "mood", "energy", "confidence", "humor",
    "sarcasm", "jokes", "memes", "quotes", "philosophy", "life-lessons",
    "observations", "commentary", "reactions"
  ],
  "pop-culture": [
    "movies", "tv-shows", "music", "celebrities", "memes", "social-media-trends",
    "viral-content", "streaming", "gaming", "books", "podcasts", "news",
    "fashion", "beauty", "lifestyle-trends"
  ]
};

// Allowed tones
export const ALLOWED_TONES = [
  "humorous", "savage", "romantic", "sarcastic", "wholesome", 
  "flirty", "inspirational", "edgy", "roast", "nostalgic"
] as const;

export type AllowedTone = typeof ALLOWED_TONES[number];

// Unsafe/banned content patterns
const UNSAFE_PATTERNS = [
  /\b(kill|die|suicide|harm|hurt|violence)\b/i,
  /\b(hate|racism|sexist|homophobic|transphobic)\b/i,
  /\b(doxx|address|phone|email|ssn)\b/i,
  /\b(slur|nazi|terrorist)\b/i
];

const SLUR_PATTERNS = [
  // This would contain actual slur detection in production
  /\b(placeholder-slur-pattern)\b/i
];

export function validateInputs(inputs: any): ValidationResult {
  const errors: ValidationError[] = [];

  // 1. Check required fields
  if (!inputs.category) {
    errors.push({
      field: "category",
      message: "Category is required",
      code: "REQUIRED_FIELD"
    });
  }

  if (!inputs.subcategory) {
    errors.push({
      field: "subcategory", 
      message: "Subcategory is required",
      code: "REQUIRED_FIELD"
    });
  }

  if (!inputs.tone) {
    errors.push({
      field: "tone",
      message: "Tone is required", 
      code: "REQUIRED_FIELD"
    });
  }

  if (!inputs.text_tags || !Array.isArray(inputs.text_tags)) {
    errors.push({
      field: "text_tags",
      message: "text_tags must be an array",
      code: "INVALID_TYPE"
    });
  }

  // Early return if required fields missing
  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // 2. Normalize inputs
  const normalizedCategory = inputs.category.toLowerCase().trim();
  const normalizedSubcategory = inputs.subcategory.toLowerCase().trim();
  const normalizedTone = inputs.tone.toLowerCase().trim();
  const normalizedTags = inputs.text_tags
    .filter((tag: any) => typeof tag === 'string')
    .map((tag: string) => tag.trim())
    .filter((tag: string) => tag.length > 0);

  // 3. Validate category exists
  if (!CATEGORY_MAP[normalizedCategory]) {
    errors.push({
      field: "category",
      message: `Invalid category: ${normalizedCategory}. Must be one of: ${Object.keys(CATEGORY_MAP).join(', ')}`,
      code: "INVALID_CATEGORY"
    });
  }

  // 4. Validate subcategory maps to category
  if (CATEGORY_MAP[normalizedCategory] && !CATEGORY_MAP[normalizedCategory].includes(normalizedSubcategory)) {
    errors.push({
      field: "subcategory",
      message: `Invalid subcategory for ${normalizedCategory}: ${normalizedSubcategory}`,
      code: "INVALID_SUBCATEGORY"
    });
  }

  // 5. Validate tone
  if (!ALLOWED_TONES.includes(normalizedTone as AllowedTone)) {
    errors.push({
      field: "tone",
      message: `Invalid tone: ${normalizedTone}. Must be one of: ${ALLOWED_TONES.join(', ')}`,
      code: "INVALID_TONE"
    });
  }

  // 6. Validate tags array length
  if (normalizedTags.length > 8) {
    errors.push({
      field: "text_tags",
      message: "Maximum 8 tags allowed",
      code: "TOO_MANY_TAGS"
    });
  }

  // 7. Check for unsafe tags
  for (const tag of normalizedTags) {
    if (UNSAFE_PATTERNS.some(pattern => pattern.test(tag))) {
      errors.push({
        field: "text_tags",
        message: `Unsafe content detected in tag: ${tag}`,
        code: "UNSAFE_TAG"
      });
    }

    if (SLUR_PATTERNS.some(pattern => pattern.test(tag))) {
      errors.push({
        field: "text_tags", 
        message: `Inappropriate language detected in tag: ${tag}`,
        code: "SLUR_TAG"
      });
    }
  }

  // Return result
  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  const normalizedInputs: ValidatedInputs = {
    category: normalizedCategory,
    subcategory: normalizedSubcategory, 
    tone: normalizedTone,
    text_tags: normalizedTags,
    recipient_name: inputs.recipient_name?.trim() || undefined,
    relationship: inputs.relationship?.trim() || undefined,
    language: inputs.language?.trim() || "English"
  };

  return {
    isValid: true,
    errors: [],
    normalizedInputs
  };
}