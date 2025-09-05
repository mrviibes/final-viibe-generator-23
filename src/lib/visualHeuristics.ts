import type { VisualInputs, VisualOption } from './visualModel';

// Predefined mappings for imagery by category/subcategory
const IMAGERY_ELEMENTS: Record<string, Record<string, string[]>> = {
  "celebrations": {
    "birthday": ["birthday cake", "candles", "balloons", "wrapped gifts", "party hats", "confetti"],
    "anniversary": ["champagne glasses", "roses", "candlelight dinner", "couple holding hands", "celebration"],
    "wedding": ["wedding cake", "flowers", "rings", "bride and groom", "ceremony"],
    "engagement": ["engagement ring", "couple", "romantic setting", "celebration", "flowers"],
    "baby shower": ["baby items", "pastel colors", "gifts", "celebration", "family"],
    "graduation": ["graduation cap", "diploma", "celebration", "achievements", "ceremony"],
    "christmas": ["christmas tree", "presents", "snow", "holiday lights", "festive"],
    "halloween": ["pumpkins", "costumes", "spooky", "candy", "autumn"],
    "valentine's day": ["hearts", "roses", "romantic", "red colors", "love"],
    "celebration (generic)": ["streamers", "ribbons", "festive lights", "confetti", "gift wrap", "bows"]
  },
  "sports": {
    "basketball": ["basketball court", "basketball hoop", "player dribbling", "crowd cheering", "arena"],
    "football": ["football field", "players", "stadium", "touchdown", "crowd"],
    "soccer": ["soccer field", "goal", "players", "ball", "stadium"],
    "baseball": ["baseball diamond", "bat", "glove", "stadium", "crowd"],
    "hockey": ["ice rink", "hockey stick", "puck", "players", "arena"],
    "tennis": ["tennis court", "racket", "ball", "net", "players"],
    "golf": ["golf course", "golf club", "ball", "green", "flag"],
    "volleyball": ["volleyball court", "net", "players", "beach", "sand"],
    "running": ["track", "runner", "finish line", "stadium", "competition"],
    "swimming": ["pool", "swimmer", "lanes", "water", "competition"]
  },
  "daily life": {
    "work": ["office", "desk", "computer", "meeting", "workplace"],
    "school": ["classroom", "books", "students", "learning", "education"],
    "gym": ["fitness equipment", "workout", "exercise", "health", "strength"],
    "coffee": ["coffee cup", "cafe", "morning", "steam", "relaxation"],
    "pets": ["dog", "cat", "pet toys", "home", "companionship"],
    "cooking": ["kitchen", "ingredients", "cooking utensils", "food", "preparation"],
    "travel": ["luggage", "transportation", "destination", "journey", "adventure"],
    "cleaning": ["cleaning supplies", "organized space", "home", "tidiness", "fresh"],
    "hobbies": ["hobby materials", "creative space", "passion", "skill", "enjoyment"],
    "family": ["family gathering", "home", "togetherness", "love", "bonding"]
  },
  "vibes & punchlines": {
    "dad jokes": ["dad figure", "family", "humor", "casual setting", "laughter"],
    "one-liners": ["simple scene", "everyday moment", "relatable", "humor", "casual"],
    "puns": ["wordplay visual", "clever imagery", "humor", "wit", "creative"],
    "knock-knock": ["door", "doorway", "greeting", "surprise", "humor"],
    "comebacks": ["confident person", "bold expression", "attitude", "strength", "wit"],
    "relatable mood": ["everyday scene", "mood", "expression", "relatable", "life"],
    "affirmations": ["positive imagery", "uplifting", "motivational", "strength", "confidence"],
    "sarcastic": ["subtle expression", "irony", "wit", "clever", "attitude"],
    "flirty": ["romantic elements", "playful", "charming", "attraction", "chemistry"],
    "shower thoughts": ["contemplative scene", "thinking", "revelation", "insight", "wonder"]
  },
  "pop culture": {
    "movies": ["cinema", "film reel", "popcorn", "movie theater", "entertainment"],
    "tv shows": ["television", "couch", "binge watching", "entertainment", "screen"],
    "music": ["musical instruments", "concert", "headphones", "sound waves", "rhythm"],
    "video games": ["gaming setup", "controller", "screen", "virtual world", "competition"],
    "internet trends": ["social media", "viral content", "trending", "digital", "online"],
    "superhero": ["heroic pose", "cape", "powers", "action", "adventure"],
    "anime": ["anime style", "vibrant colors", "characters", "fantasy", "adventure"],
    "award shows": ["red carpet", "awards", "glamour", "ceremony", "recognition"],
    "celebrity": ["spotlight", "fame", "glamour", "entertainment", "public"],
    "franchises": ["iconic elements", "brand recognition", "series", "characters", "legacy"]
  },
  "no category": {
    "generic": ["simple scene", "everyday moment", "casual", "relatable", "life"]
  }
};

// Style descriptors for each visual style
const STYLE_DESCRIPTORS: Record<string, string> = {
  "realistic": "a detailed, photorealistic image",
  "caricature": "a fun cartoon caricature drawing",
  "anime": "an anime-style illustration",
  "3d animated": "a 3D CGI render (Pixar-style)",
  "illustrated": "a hand-drawn illustration",
  "pop art": "a pop art style graphic"
};

// Tone descriptors for mood and atmosphere
const TONE_DESCRIPTORS: Record<string, string> = {
  "nostalgic": "warm, nostalgic atmosphere, vintage colors",
  "humorous": "in a funny, humorous way",
  "sentimental": "heartwarming and soft lighting",
  "savage": "bold, edgy mood",
  "inspirational": "bright, uplifting mood",
  "romantic": "romantic soft glow",
  "playful": "vibrant, playful scene",
  "serious": "serious, realistic tone"
};

/**
 * Simple keyword extractor from text
 * Focuses on content words longer than 3 characters
 */
function extractKeywords(text: string): string[] {
  if (!text) return [];
  
  // Extract words (alphanumeric) longer than 3 letters
  const words = text.match(/\w+/g) || [];
  
  // Filter out common stopwords
  const stopwords = new Set([
    "the", "and", "but", "with", "just", "than", "feel", "when", "was", 
    "are", "is", "as", "still", "this", "that", "have", "has", "will",
    "would", "could", "should", "can", "may", "might", "must", "shall",
    "they", "them", "their", "there", "here", "where", "what", "who",
    "how", "why", "which", "some", "any", "all", "each", "every",
    "most", "more", "less", "much", "many", "few", "little", "big",
    "small", "large", "good", "bad", "best", "worst", "better", "worse"
  ]);
  
  return words
    .filter(word => word.length > 3 && !stopwords.has(word.toLowerCase()))
    .slice(0, 5); // Limit to first 5 significant keywords
}

/**
 * Generate four distinct visual recommendations using heuristic approach
 */
export function generateHeuristicVisuals(inputs: VisualInputs): VisualOption[] {
  const {
    category = "no category",
    subcategory = "generic",
    tone = "playful",
    finalLine = "",
    visualStyle = "realistic",
    tags = []
  } = inputs;

  // 1. Get base elements from category & subcategory
  const categoryKey = category.toLowerCase();
  const subcategoryKey = subcategory.toLowerCase();
  
  let baseElements: string[] = [];
  if (IMAGERY_ELEMENTS[categoryKey]?.[subcategoryKey]) {
    baseElements = IMAGERY_ELEMENTS[categoryKey][subcategoryKey];
  } else if (categoryKey === "celebrations" && subcategoryKey === "celebration (generic)") {
    // Use generic celebration elements to avoid birthday bias
    baseElements = IMAGERY_ELEMENTS[categoryKey]["celebration (generic)"];
  } else if (IMAGERY_ELEMENTS[categoryKey]) {
    // For Daily Life categories, flatten is okay; for Celebrations, use generic
    if (categoryKey === "celebrations") {
      baseElements = IMAGERY_ELEMENTS[categoryKey]["celebration (generic)"];
    } else {
      const categoryElements = Object.values(IMAGERY_ELEMENTS[categoryKey]).flat();
      baseElements = [...new Set(categoryElements)]; // Remove duplicates
    }
  } else {
    baseElements = IMAGERY_ELEMENTS["no category"]["generic"];
  }

  // 2. Extract keywords from text
  const textKeywords = extractKeywords(finalLine);
  
  // 3. Combine with user-provided tags
  const allElements = [
    ...baseElements,
    ...textKeywords,
    ...tags
  ].filter(Boolean);

  // 4. Get style and tone descriptors
  const styleDesc = STYLE_DESCRIPTORS[visualStyle.toLowerCase()] || STYLE_DESCRIPTORS["realistic"];
  const toneDesc = TONE_DESCRIPTORS[tone.toLowerCase()] || "";

  // 5. Generate four distinct prompts
  const prompts: VisualOption[] = [];

  // Prompt 1: Literal depiction (focus on text keywords)
  const literalSubject = textKeywords.length > 0 
    ? textKeywords.slice(0, 3).join(" ") 
    : subcategory;
  
  const literalPrompt = `${styleDesc} of ${literalSubject}. ${toneDesc}`.trim();
  prompts.push({
    subject: literalSubject,
    background: "simple background",
    prompt: `[TEXT_SAFE_ZONE: center] ${literalPrompt} [NEGATIVE_PROMPT: text, watermark, logo, blurry, low quality]`,
    textAligned: true,
    subcategoryAligned: true
  });

  // Prompt 2: Context scene (focus on category elements)
  const contextElements = baseElements.slice(0, 2).join(", ");
  const contextPrompt = `${styleDesc} of a ${subcategory.toLowerCase()} scene with ${contextElements}. ${toneDesc}`.trim();
  prompts.push({
    subject: `${subcategory} scene`,
    background: contextElements,
    prompt: `[TEXT_SAFE_ZONE: bottom] ${contextPrompt} [NEGATIVE_PROMPT: text, watermark, logo, blurry, low quality]`,
    textAligned: false,
    subcategoryAligned: true
  });

  // Prompt 3: Tone-focused (emphasize mood/atmosphere)
  const moodPrompt = `${styleDesc} of a ${subcategory.toLowerCase()} scene evoking ${toneDesc}`.trim();
  prompts.push({
    subject: `${subcategory} atmosphere`,
    background: "atmospheric background",
    prompt: `[TEXT_SAFE_ZONE: top] ${moodPrompt} [NEGATIVE_PROMPT: text, watermark, logo, blurry, low quality]`,
    textAligned: false,
    subcategoryAligned: true
  });

  // Prompt 4: Creative mix (combine multiple elements)
  const creativeElements = allElements.slice(0, 3).join(", ");
  const creativePrompt = `${styleDesc} featuring ${creativeElements}. ${toneDesc}`.trim();
  prompts.push({
    subject: "creative composition",
    background: creativeElements,
    prompt: `[TEXT_SAFE_ZONE: corner] ${creativePrompt} [NEGATIVE_PROMPT: text, watermark, logo, blurry, low quality]`,
    textAligned: textKeywords.length > 0,
    subcategoryAligned: true
  });

  return prompts;
}