// Visual Prompt Generator - Four-Angle Recommendation System
// Generates diverse AI visual recommendations based on category, tone, and text content

interface VisualPromptInputs {
  category: string;
  subcategory: string;
  tone: string;
  finalLine: string;
  visualStyle: string;
  visualTags: string[];
}

interface VisualPromptOption {
  subject: string;
  background: string;
  prompt: string;
  role: string; // literal, context, tone, creative
}

// Predefined mappings for imagery and style cues
const IMAGERY_ELEMENTS: Record<string, Record<string, string[]>> = {
  "Celebrations": {
    "Birthday": ["birthday cake", "candles", "balloons", "wrapped gifts", "party hats", "confetti"],
    "Anniversary": ["champagne glasses", "roses", "candlelight dinner", "couple holding hands"],
    "Wedding": ["wedding dress", "flowers", "rings", "ceremony altar", "bride and groom"],
    "Graduation": ["cap and gown", "diploma", "graduation ceremony", "academic regalia"],
    "Holiday": ["decorations", "family gathering", "festive lights", "holiday meal"]
  },
  "Sports": {
    "Basketball": ["basketball court", "basketball hoop", "player dribbling", "crowd cheering"],
    "Football": ["football field", "touchdown", "helmet", "stadium crowd"],
    "Soccer": ["soccer field", "goal posts", "soccer ball", "players running"],
    "Tennis": ["tennis court", "tennis racket", "net", "tennis ball"],
    "Baseball": ["baseball diamond", "bat", "pitcher's mound", "home plate"]
  },
  "Life Events": {
    "Moving": ["moving boxes", "new home", "keys", "packing materials"],
    "Job": ["office setting", "interview", "workplace", "professional attire"],
    "Travel": ["suitcase", "passport", "airplane", "destination landmarks"],
    "Relationship": ["couple", "romantic setting", "date night", "intimacy"]
  },
  "Holidays": {
    "Christmas": ["Christmas tree", "presents", "snow", "holiday lights"],
    "Halloween": ["pumpkins", "costumes", "decorations", "trick or treat"],
    "Easter": ["Easter eggs", "bunny", "spring flowers", "family gathering"],
    "Thanksgiving": ["turkey dinner", "family table", "autumn leaves", "grateful gathering"]
  }
};

const STYLE_DESCRIPTORS: Record<string, string> = {
  "Realistic": "a detailed, photorealistic image",
  "Caricature": "a fun cartoon caricature drawing",
  "Anime": "an anime-style illustration",
  "3D Animated": "a 3D CGI render (Pixar-style)",
  "Illustrated": "a hand-drawn illustration",
  "Pop Art": "a pop art style graphic with bold lines and colors"
};

const TONE_DESCRIPTORS: Record<string, string> = {
  "nostalgic": "warm, nostalgic atmosphere with vintage colors",
  "humorous": "in a funny, humorous way with playful elements",
  "sentimental": "heartwarming and soft lighting with emotional depth",
  "savage": "bold, edgy mood with dramatic contrast",
  "inspirational": "bright, uplifting mood with positive energy",
  "romantic": "romantic soft glow with intimate lighting",
  "playful": "vibrant, playful scene with energetic colors",
  "serious": "serious, realistic tone with professional composition"
};

function extractKeywords(text: string): string[] {
  if (!text) return [];
  
  // Simple keyword extractor - look for significant nouns
  const words = text.toLowerCase().match(/\w+/g) || [];
  const stopwords = new Set(['the','and','but','with','just','than','feel','when','was','are','is','as','still','have','had','will','would','could','should','can','may','might','must','shall','do','does','did','get','got','go','went','come','came','see','saw','know','knew','think','thought','say','said','tell','told','give','gave','take','took','make','made','want','like','look','use','find','work','call','try','ask','need','seem','help','show','play','move','live','believe','hold','bring','happen','write','provide','sit','stand','lose','add','hear','let','meet','include','continue','set','start','might','turn','follow','stop','create','speak','read','allow','add','spend','grow','open','walk','win','teach','offer','remember','consider','appear','buy','wait','serve','die','send','expect','build','stay','fall','cut','reach','kill','remain']);
  
  return words
    .filter(word => word.length > 3)
    .filter(word => !stopwords.has(word))
    .slice(0, 5); // Take first 5 keywords
}

export function generateVisualPrompts(inputs: VisualPromptInputs): VisualPromptOption[] {
  const { category, subcategory, tone, finalLine, visualStyle, visualTags } = inputs;
  
  // 1. Get base elements from category & subcategory
  let baseElements: string[] = [];
  if (IMAGERY_ELEMENTS[category]?.[subcategory]) {
    baseElements = IMAGERY_ELEMENTS[category][subcategory];
  } else if (IMAGERY_ELEMENTS[category]) {
    // Use any elements from the category if subcategory not found
    baseElements = Object.values(IMAGERY_ELEMENTS[category]).flat();
  }
  
  // 2. Extract keywords from text
  const textKeywords = extractKeywords(finalLine);
  
  // 3. Combine all elements
  const allElements = [...new Set([...baseElements, ...textKeywords, ...visualTags])];
  
  // 4. Get style and tone descriptors
  const styleDesc = STYLE_DESCRIPTORS[visualStyle] || "a detailed image";
  const toneDesc = TONE_DESCRIPTORS[tone.toLowerCase()] || "balanced atmosphere";
  
  // 5. Generate four distinct prompts
  const prompts: VisualPromptOption[] = [];
  
  // Prompt 1: Literal depiction (focus on text content)
  if (textKeywords.length > 0) {
    const mainSubject = textKeywords.slice(0, 3).join(", ");
    prompts.push({
      subject: `Scene featuring ${mainSubject}`,
      background: `${subcategory} setting with ${toneDesc}`,
      prompt: `${styleDesc} featuring ${mainSubject} in a ${subcategory.toLowerCase()} context. ${toneDesc}. Clear text-safe zone [TEXT_SAFE_ZONE: center 60x35] [NEGATIVE_PROMPT: text, watermark, logo, blurry]`,
      role: "literal"
    });
  } else {
    prompts.push({
      subject: `${subcategory} themed scene`,
      background: `Classic ${subcategory.toLowerCase()} environment`,
      prompt: `${styleDesc} of a ${subcategory.toLowerCase()} scene. ${toneDesc}. Clear composition [TEXT_SAFE_ZONE: center 60x35] [NEGATIVE_PROMPT: text, watermark, logo, blurry]`,
      role: "literal"
    });
  }
  
  // Prompt 2: Context elements (focus on category imagery)
  if (baseElements.length >= 2) {
    const contextElements = baseElements.slice(0, 2).join(" and ");
    prompts.push({
      subject: `${subcategory} scene with ${contextElements}`,
      background: `Traditional ${category.toLowerCase()} environment`,
      prompt: `${styleDesc} of a ${subcategory.toLowerCase()} scene featuring ${contextElements}. ${toneDesc}. Well-composed background [TEXT_SAFE_ZONE: center 60x35] [NEGATIVE_PROMPT: text, watermark, logo, blurry]`,
      role: "context"
    });
  } else {
    prompts.push({
      subject: `Classic ${subcategory} elements`,
      background: `${category} themed setting`,
      prompt: `${styleDesc} showcasing classic ${subcategory.toLowerCase()} elements in a ${category.toLowerCase()} context. ${toneDesc} [TEXT_SAFE_ZONE: center 60x35] [NEGATIVE_PROMPT: text, watermark, logo, blurry]`,
      role: "context"
    });
  }
  
  // Prompt 3: Tone/mood focused
  prompts.push({
    subject: `${tone} mood visualization`,
    background: `Atmospheric ${subcategory.toLowerCase()} setting`,
    prompt: `${styleDesc} that captures the essence of ${tone} emotion in a ${subcategory.toLowerCase()} context. ${toneDesc}. Emphasizes mood and atmosphere [TEXT_SAFE_ZONE: center 60x35] [NEGATIVE_PROMPT: text, watermark, logo, blurry]`,
    role: "tone"
  });
  
  // Prompt 4: Creative/alternate angle
  if (allElements.length >= 3) {
    const creativeElements = allElements.slice(0, 3).join(", ");
    prompts.push({
      subject: `Creative composition with ${creativeElements}`,
      background: `Artistic interpretation of ${subcategory.toLowerCase()}`,
      prompt: `${styleDesc} featuring an artistic blend of ${creativeElements}. ${toneDesc}. Creative composition with unique perspective [TEXT_SAFE_ZONE: center 60x35] [NEGATIVE_PROMPT: text, watermark, logo, blurry]`,
      role: "creative"
    });
  } else {
    prompts.push({
      subject: `Abstract ${subcategory} concept`,
      background: `Stylized ${tone} environment`,
      prompt: `${styleDesc} presenting an abstract or symbolic take on ${subcategory.toLowerCase()}. ${toneDesc}. Unique creative perspective [TEXT_SAFE_ZONE: center 60x35] [NEGATIVE_PROMPT: text, watermark, logo, blurry]`,
      role: "creative"
    });
  }
  
  return prompts;
}