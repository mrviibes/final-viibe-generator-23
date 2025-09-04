// TypeScript implementation based on visualPromptGenerator.js
// Maps existing interface to the new cleaner implementation

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

// Inline the JS logic to avoid import issues
const STYLE_DESCRIPTORS: Record<string, any> = {
  "Realistic": {
    phrases: ["photorealistic", "high detail", "natural lighting", "shallow depth of field"],
    camera: ["50mm lens", "soft bokeh"],
    negative: [
      "blurry","low quality","pixelated","overexposed","underexposed",
      "watermark","logo","text overlay","duplicate","deformed hands","distorted face"
    ]
  },
  "Caricature": {
    phrases: ["cartoon caricature", "exaggerated features", "bold outlines", "flat shading"],
    camera: ["clean backdrop"],
    negative: ["blurry","low quality","messy line art","scribbles","watermark","logo","text overlay"]
  },
  "Anime": {
    phrases: ["anime style", "cel shading", "expressive eyes", "clean line art"],
    camera: ["dynamic angle"],
    negative: ["blurry","low quality","extra fingers","distorted anatomy","watermark","logo","text overlay"]
  },
  "3D Animated": {
    phrases: ["3D CGI render", "soft global illumination", "studio lighting", "pixar-like"],
    camera: ["subsurface scattering"],
    negative: ["blurry","low poly","artifacting","fireflies","watermark","logo","text overlay"]
  },
  "Illustrated": {
    phrases: ["hand-drawn illustration", "digital painting", "clean line work", "textured brush"],
    camera: ["balanced composition"],
    negative: ["blurry","muddy colors","messy strokes","watermark","logo","text overlay"]
  },
  "Pop Art": {
    phrases: ["pop art style", "bold halftone dots", "comic book inking", "retro palette"],
    camera: ["poster composition"],
    negative: ["blurry","muddy colors","uneven halftone","watermark","logo","text overlay"]
  }
};

const IMAGERY: Record<string, Record<string, string[]>> = {
  "Celebrations": {
    "Birthday": ["birthday cake","candles","balloons","wrapped gifts","confetti","party hats","streamers","cupcakes","sparklers","table setting"],
    "Anniversary": ["champagne glasses","rose petals","candlelight dinner","golden bokeh"],
    "Wedding": ["wedding cake","bouquet","rings","aisle","archway"],
    "Engagement": ["ring box","sparkle","hands intertwined"],
    "Baby shower / New baby": ["tiny shoes","pastel balloons","crib","rattle"],
    "Graduation": ["cap and gown","diploma","tossed caps"],
    "Christmas": ["string lights","ornaments","evergreen tree","wrapped gifts"],
    "Halloween": ["jack-o'-lanterns","cobwebs","moonlit yard","costumes"],
    "Valentine's Day": ["hearts","roses","chocolates"],
    "New job / Promotion": ["confetti","office desk","congrats banner"]
  },
  "Sports": {
    "Basketball": ["indoor court","hoop","net","sneakers","scoreboard"],
    "Football (American)": ["stadium lights","goalposts","helmet","turf"],
    "Soccer": ["pitch","goal net","cleats","crowd"],
    "Baseball": ["diamond","bat and glove","scoreboard","bullpen"],
    "Hockey": ["ice rink","sticks","goal crease","arena lights"],
    "Tennis": ["baseline","racket","net","fresh court"],
    "Golf": ["green","flagstick","fairway","sunrise mist"],
    "Volleyball": ["sand court","net","jump serve","waves"],
    "Running / Track": ["starting blocks","track lanes","finish tape"],
    "Swimming": ["lane lines","splash","goggles","pool reflections"]
  },
  "Daily Life": {
    "Work / Office": ["laptop","desk plant","coffee mug","sunlit window"],
    "School / Studying": ["notebooks","pencils","desk","textbooks"],
    "Gym / Fitness": ["dumbbells","treadmill","chalk dust"],
    "Coffee / Morning routine": ["steaming mug","sunbeam","newspaper"],
    "Pets (dogs, cats)": ["paw prints","toy ball","cushion"],
    "Cooking / Food": ["cutting board","fresh herbs","cast iron pan"],
    "Commute / Travel": ["train window","city lights","luggage"],
    "Chores / Cleaning": ["bubbles","laundry basket","sunny laundry line"],
    "Hobbies / Weekend": ["workbench","paint tubes","camera"],
    "Family time / Relationships": ["couch","photo frames","warm living room"]
  },
  "Vibes & Punchlines": {
    "Dad jokes": ["whiteboard","marker doodles","oversized props"],
    "One-liners": ["mic stand","spotlight","brick backdrop"],
    "Puns / Wordplay": ["letter tiles","speech bubbles","playful props"],
    "Knock-knock": ["front door","peephole","doormat"],
    "Comebacks / Roasts (clean)": ["spotlight","stage","mic drop"],
    "Relatable mood / Daily vibe": ["couch","phone screen","messy desk"],
    "Affirmations / Motivational": ["sunrise","mountain ridge","pathway"],
    "Sarcastic / Deadpan": ["flat backdrop","neon sign","deadpan portrait"],
    "Flirty / Playful lines": ["neon heart","candy","sparkles"],
    "Shower thoughts / Random": ["foggy mirror","bath tiles","window light"]
  },
  "Pop Culture": {
    "Movies (films)": ["film grain","projector beam","theater seats"],
    "TV shows / Streaming": ["sofa","remote","LED glow"],
    "Music (artists, songs)": ["vinyl","stage lights","studio mic"],
    "Video games": ["controller","pixel glow","HUD overlay"],
    "Internet trends / Memes": ["reaction props","caption space","polaroid tape"],
    "Superhero franchises (Marvel, DC)": ["city skyline","dramatic rim light","cape silhouette"],
    "Anime / Manga": ["speed lines","panel frames","screen tone"],
    "Award shows / Events": ["red carpet","golden statue","press wall"],
    "Celebrity (safe public figures)": ["podium","flash bulbs","interview chair"],
    "Major franchises": ["star field","cloak silhouette","mystic glow"]
  },
  "No Category (Freeform)": { "_generic": ["clean backdrop","soft gradient","spotlight","graphic shapes"] }
};

const TONE_LEX: Record<string, any> = {
  "Humorous": {
    mood: ["playful energy","light, cheeky vibe"],
    light: ["bright, even lighting","crisp, lively color"],
    verbs: ["leans into the joke","keeps it witty"]
  },
  "Savage": {
    mood: ["edgy attitude","bold confidence"],
    light: ["hard contrast","dramatic shadows"],
    verbs: ["cuts with dry wit","keeps it unapologetic"]
  },
  "Sentimental": {
    mood: ["tender, heartfelt","intimate warmth"],
    light: ["soft glow","gentle highlights"],
    verbs: ["centers emotion","keeps it sincere"]
  },
  "Nostalgic": {
    mood: ["bittersweet memory","retro charm"],
    light: ["golden-hour warmth","subtle film grain"],
    verbs: ["hints at the past","embraces vintage cues"]
  },
  "Romantic": {
    mood: ["soft, loving","dreamy"],
    light: ["creamy bokeh","rose-tinted palette"],
    verbs: ["keeps it affectionate","leans into warmth"]
  },
  "Inspirational": {
    mood: ["uplifting","hopeful"],
    light: ["sunrise hues","open, airy light"],
    verbs: ["aims upward","sparkles with optimism"]
  },
  "Playful": {
    mood: ["whimsical","bouncy"],
    light: ["vivid color","dynamic angle"],
    verbs: ["keeps it fun","invites a grin"]
  },
  "Serious": {
    mood: ["matter-of-fact","respectful"],
    light: ["neutral palette","clean composition"],
    verbs: ["keeps it direct","stays grounded"]
  }
};

// Helper functions
const clamp = (s: string, max = 300) => (s.length <= max ? s : s.slice(0, max - 1).trim() + "…");
const uniq = (arr: string[]) => Array.from(new Set((arr || []).filter(Boolean)));
const join = (arr: string[]) => uniq(arr).join(", ");
const norm = (s: string) => (s || "").toString().trim();

function pickN(arr: string[] = [], n = 3): string[] {
  const u = uniq(arr);
  if (u.length <= n) return u;
  return u.slice(0, n);
}

function imageryFor(category: string, subcategory: string): string[] {
  const cat = IMAGERY[category];
  if (!cat) return IMAGERY["No Category (Freeform)"]["_generic"];
  const sub = cat[subcategory];
  if (Array.isArray(sub)) return sub;
  const flat = Object.values(cat).flat();
  return flat.length ? flat : IMAGERY["No Category (Freeform)"]["_generic"];
}

function toneFor(tone: string) {
  return TONE_LEX[tone] || TONE_LEX["Serious"];
}

function stylePhrases(style: string): string[] {
  const s = STYLE_DESCRIPTORS[style] || STYLE_DESCRIPTORS["Realistic"];
  return uniq([...s.phrases, ...s.camera]);
}

function negativeFor(style: string): string {
  const s = STYLE_DESCRIPTORS[style] || STYLE_DESCRIPTORS["Realistic"];
  return s.negative.join(", ");
}

function sentence(parts: string[]): string {
  const text = parts.filter(Boolean).join(" ");
  return text
    .replace(/\s+,/g, ",")
    .replace(/,+\s*,/g, ",")
    .replace(/\s+/g, " ")
    .trim();
}

// Case normalization mappings
const CATEGORY_MAPPINGS: Record<string, string> = {
  "celebrations": "Celebrations",
  "sports": "Sports", 
  "daily life": "Daily Life",
  "vibes & punchlines": "Vibes & Punchlines",
  "pop culture": "Pop Culture",
  "no category (freeform)": "No Category (Freeform)"
};

const SUBCATEGORY_MAPPINGS: Record<string, string> = {
  "birthday": "Birthday",
  "anniversary": "Anniversary", 
  "wedding": "Wedding",
  "engagement": "Engagement",
  "baby shower / new baby": "Baby shower / New baby",
  "graduation": "Graduation",
  "christmas": "Christmas",
  "halloween": "Halloween",
  "valentine's day": "Valentine's Day",
  "new job / promotion": "New job / Promotion",
  "basketball": "Basketball",
  "football (american)": "Football (American)",
  "soccer": "Soccer",
  "baseball": "Baseball",
  "hockey": "Hockey",
  "tennis": "Tennis",
  "golf": "Golf",
  "volleyball": "Volleyball",
  "running / track": "Running / Track",
  "swimming": "Swimming"
};

const TONE_MAPPINGS: Record<string, string> = {
  "humorous": "Humorous",
  "savage": "Savage", 
  "sentimental": "Sentimental",
  "nostalgic": "Nostalgic",
  "romantic": "Romantic",
  "inspirational": "Inspirational",
  "playful": "Playful",
  "serious": "Serious"
};

function normalizeKey(input: string, mappings: Record<string, string>): string {
  const normalized = norm(input).toLowerCase();
  return mappings[normalized] || input;
}

function inferBirthdayContext(text: string, tags: string[]): { category: string, subcategory: string } {
  const allText = [text, ...tags].join(" ").toLowerCase();
  const birthdayTokens = ["birthday", "cake", "candles", "balloon", "party", "celebrate", "bday"];
  
  if (birthdayTokens.some(token => allText.includes(token))) {
    console.log("🎂 Birthday context inferred from text/tags");
    return { category: "Celebrations", subcategory: "Birthday" };
  }
  
  return { category: "", subcategory: "" };
}

export function generateVisualPrompts(inputs: VisualPromptInputs): VisualPromptOption[] {
  const text = norm(inputs.finalLine || "").slice(0, 100);
  const style = norm(inputs.visualStyle) || "Realistic";
  const tags = Array.isArray(inputs.visualTags) ? inputs.visualTags.map(norm).filter(Boolean) : [];

  // Normalize inputs with case mappings
  let category = normalizeKey(inputs.category, CATEGORY_MAPPINGS);
  let subcategory = normalizeKey(inputs.subcategory, SUBCATEGORY_MAPPINGS);
  let toneKey = normalizeKey(inputs.tone, TONE_MAPPINGS);

  // Birthday inference guard
  if (!category || category === inputs.category) { // No valid mapping found
    const inferred = inferBirthdayContext(text, tags);
    if (inferred.category) {
      category = inferred.category;
      subcategory = inferred.subcategory;
    }
  }

  // Final fallbacks
  if (!category || !IMAGERY[category]) {
    category = "No Category (Freeform)";
  }
  if (!subcategory || (IMAGERY[category] && !IMAGERY[category][subcategory])) {
    subcategory = category === "Celebrations" ? "Birthday" : "_generic";
  }
  if (!toneKey || !TONE_LEX[toneKey]) {
    toneKey = "Serious";
  }

  console.log(`🎨 Visual Generator - Category: "${category}", Subcategory: "${subcategory}", Tone: "${toneKey}"`);
  console.log(`🎨 Original inputs - Category: "${inputs.category}", Subcategory: "${inputs.subcategory}", Tone: "${inputs.tone}"`);

  const baseImagery = imageryFor(category, subcategory);
  const tone = toneFor(toneKey);
  const styleBits = stylePhrases(style);
  const neg = negativeFor(style);

  // Build object pools
  const objectsLiteral = uniq([...tags, ...baseImagery]).slice(0, 5);
  const objectsContext = pickN(baseImagery, 4);
  const objectsMood = pickN([...baseImagery].reverse(), 3);
  const objectsCreative = pickN(uniq([...tags, ...baseImagery]).reverse(), 4);

  // Short mood/lighting strings
  const moodStr = pickN(tone.mood, 1)[0] || "";
  const lightStr = pickN(tone.light, 1)[0] || "";
  const verbStr = pickN(tone.verbs, 1)[0] || "";

  // Shared prefix
  const styleLead = join(styleBits);

  // Generate four distinct prompts
  const literalLine = sentence([
    `${styleLead}, close-up of ${join(objectsLiteral)}.`,
    `${lightStr}; ${moodStr}.`,
    "Clear negative space for headline."
  ]);

  const contextLine = sentence([
    `${styleLead}, wide ${subcategory.toLowerCase()} scene with ${join(objectsContext)}.`,
    `${lightStr}; ${verbStr}.`,
    "Environmental storytelling."
  ]);

  const moodLine = sentence([
    `${styleLead}, ${join(objectsMood)} in selective focus.`,
    `${lightStr}; conveys ${moodStr}.`,
    "Light-driven composition."
  ]);

  const creativeLine = sentence([
    `${styleLead}, symbolic arrangement of ${join(objectsCreative)}.`,
    `${lightStr}; ${verbStr}.`,
    "Unexpected perspective, graphic balance."
  ]);

  const roles = ['literal', 'context', 'mood', 'creative'];
  const prompts = [literalLine, contextLine, moodLine, creativeLine];
  
  return prompts.map((prompt, index) => ({
    subject: `${subcategory} scene`,
    background: `${toneKey} atmosphere`,
    prompt: clamp(prompt),
    role: roles[index] || 'creative'
  }));
}