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
    "New job / Promotion": ["confetti","office desk","congrats banner"],
    "Celebration (Generic)": ["streamers","ribbons","festive lights","confetti","gift wrap","bows"]
  },
  "Sports": {
    "Basketball": ["basketball court","basketball hoop","basketball","sneakers","scoreboard","arena","players dribbling","team huddle","basketball practice","indoor gym"],
    "Football (American)": ["football field","goalposts","football helmet","turf","stadium lights","players tackling","touchdown","football practice","sideline"],
    "Soccer": ["soccer field","soccer goal","soccer ball","cleats","crowd","pitch","players kicking","soccer practice","penalty box"],
    "Baseball": ["baseball diamond","baseball bat","baseball glove","scoreboard","bullpen","pitcher's mound","baseball practice","dugout","home plate"],
    "Hockey": ["ice rink","hockey sticks","hockey puck","goal crease","arena lights","hockey helmet","skates","hockey practice","face-off circle","penalty box"],
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
  "Humorous": { mood: "playful energy", light: "bright color", verb: "leans into the joke" },
  "Savage": { mood: "edgy attitude", light: "hard contrast", verb: "cuts with dry wit" },
  "Sentimental": { mood: "tender warmth", light: "soft glow", verb: "centers emotion" },
  "Nostalgic": { mood: "retro charm", light: "golden-hour warmth", verb: "hints at the past" },
  "Romantic": { mood: "dreamy affection", light: "creamy bokeh", verb: "leans into warmth" },
  "Inspirational": { mood: "hopeful uplift", light: "sunrise hues", verb: "aims upward" },
  "Playful": { mood: "whimsical vibe", light: "vivid color", verb: "keeps it fun" },
  "Serious": { mood: "matter-of-fact", light: "neutral palette", verb: "keeps it direct" }
};

// Subcategory keyword mappings for inference
const SUBCATEGORY_KEYWORDS: Record<string, string[]> = {
  "Christmas": ["christmas", "sweater", "ornaments", "tinsel", "lights", "tree", "ugly sweater", "xmas"],
  "Halloween": ["halloween", "costume", "pumpkin", "spooky", "witch", "cobwebs"],
  "Wedding": ["wedding", "bride", "groom", "rings", "vows", "marriage"],
  "Graduation": ["graduation", "diploma", "cap", "gown", "graduate"],
  "Baby shower / New baby": ["baby shower", "rattle", "crib", "newborn", "infant"],
  "Valentine's Day": ["valentine", "heart", "roses", "cupid", "romantic"],
  "Birthday": ["birthday", "cake", "candles", "balloons", "party", "bday"],
  "Anniversary": ["anniversary", "years together", "milestone"],
  "Basketball": ["basketball", "court", "hoop", "dribble", "practice", "team", "arena"],
  "Football (American)": ["football", "field", "helmet", "practice", "team", "stadium"],
  "Soccer": ["soccer", "ball", "goal", "field", "practice", "team", "pitch"],
  "Baseball": ["baseball", "bat", "glove", "practice", "team", "diamond"],
  "Hockey": ["hockey", "ice", "rink", "stick", "puck", "practice", "team", "skating"],
  "Tennis": ["tennis", "court", "racket", "practice", "serve"],
  "Golf": ["golf", "course", "club", "practice", "tee"],
  "Volleyball": ["volleyball", "net", "practice", "spike", "court"],
  "Running / Track": ["running", "track", "practice", "sprint", "marathon"],
  "Swimming": ["swimming", "pool", "practice", "stroke", "dive"],
  "Work / Office": ["work", "office", "job", "meeting", "desk"],
  "Gym / Fitness": ["gym", "workout", "fitness", "exercise", "training"]
};

// Subcategory-specific SOLO actions for the third lane
const SOLO_ACTION: Record<string, string> = {
  "Birthday": "blowing out candles on a cake",
  "Graduation": "tossing a mortarboard cap",
  "Wedding": "holding a bouquet close to the chest",
  "Anniversary": "toasting with champagne",
  "Valentine's Day": "holding a heart-shaped box of chocolates",
  "Christmas": "tugging at loose tinsel on a sweater",
  "Halloween": "adjusting a costume mask",
  "Basketball": "dribbling a basketball toward the hoop",
  "Football (American)": "throwing a football in practice gear",
  "Soccer": "kicking a soccer ball on the field",
  "Baseball": "swinging a baseball bat at practice",
  "Hockey": "skating with a hockey stick and helmet on ice",
  "Tennis": "serving a tennis ball with racket",
  "Golf": "teeing up a golf ball on the course",
  "Volleyball": "spiking a volleyball at the net",
  "Running / Track": "sprinting on the track wearing running gear",
  "Swimming": "diving into the pool with goggles",
  "Work / Office": "typing on a laptop near a sunlit window",
  "_default": "interacting with the key props"
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

function negativeFor(style: string, category?: string): string {
  const s = STYLE_DESCRIPTORS[style] || STYLE_DESCRIPTORS["Realistic"];
  const baseNegative = [
    ...s.negative,
    "background lettering",
    "banners with words"
  ];
  
  // Add category-specific negatives to prevent cross-contamination
  if (category === "Sports") {
    baseNegative.push("laptop", "desk", "coffee mug", "office", "computer", "meeting room", "workplace", "cubicle");
  } else if (category === "Daily Life" && style === "Work / Office") {
    baseNegative.push("sports equipment", "hockey stick", "basketball", "football", "soccer ball");
  }
  
  return baseNegative.join(", ");
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

function inferOccasion(text: string, tags: string[]): { category: string, subcategory: string } {
  const allText = [text, ...tags].join(" ").toLowerCase();
  
  // Check all subcategory keywords
  for (const [subcategory, keywords] of Object.entries(SUBCATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => allText.includes(keyword))) {
      console.log(`🎯 ${subcategory} context inferred from text/tags`);
      
      // Determine appropriate category based on subcategory
      if (["Christmas", "Halloween", "Wedding", "Graduation", "Baby shower / New baby", "Valentine's Day", "Birthday", "Anniversary"].includes(subcategory)) {
        return { category: "Celebrations", subcategory };
      } else if (["Basketball", "Football (American)", "Soccer", "Baseball", "Hockey", "Tennis", "Golf", "Volleyball", "Running / Track", "Swimming"].includes(subcategory)) {
        return { category: "Sports", subcategory };
      } else if (["Work / Office", "Gym / Fitness"].includes(subcategory)) {
        return { category: "Daily Life", subcategory };
      }
    }
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

  // Occasion inference from text/tags
  if (!category || category === inputs.category) { // No valid mapping found
    const inferred = inferOccasion(text, tags);
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
    subcategory = category === "Celebrations" ? "Celebration (Generic)" : "_generic";
  }
  if (!toneKey || !TONE_LEX[toneKey]) {
    toneKey = "Serious";
  }

  console.log(`🎨 Visual Generator - Category: "${category}", Subcategory: "${subcategory}", Tone: "${toneKey}"`);
  console.log(`🎨 Original inputs - Category: "${inputs.category}", Subcategory: "${inputs.subcategory}", Tone: "${inputs.tone}"`);

  const baseImagery = imageryFor(category, subcategory);
  const tone = toneFor(toneKey);

  // Filter out bracketed control tags and build clean object pools
  const cleanTags = tags.filter(tag => !tag.includes('[') && !tag.includes(']'));
  const objects = uniq([...baseImagery, ...cleanTags]);
  const propsTight = pickN(objects, 4);
  const propsWide = pickN(objects, 6);
  const propsMood = pickN([...objects].reverse(), 3);
  const propsSym = pickN(objects, 4);

  // Lane 1: OBJECTS (no people)
  const laneObjects = clamp(sentence([
    `Close-up of ${join(propsTight)}`,
    `${tone.light}; ${tone.mood}`,
    "clear negative space for headline"
  ]));

  // Lane 2: GROUP (people visible)
  const groupPhrases = [
    "friends gathered", "group of people", "laughter", "candid moment", "natural gestures"
  ];
  const laneGroup = clamp(sentence([
    `Wide ${subcategory.toLowerCase()} scene with ${join(propsWide)}`,
    `${join(groupPhrases)}`,
    `${tone.light}; ${tone.verb}`
  ]));

  // Lane 3: SOLO (one person doing a subcategory-relevant action)
  const soloAction = SOLO_ACTION[subcategory] || SOLO_ACTION["_default"];
  const laneSolo = clamp(sentence([
    `Single person ${soloAction}`,
    `surrounded by ${join(pickN(objects, 3))}`,
    `${tone.light}; ${tone.mood}`
  ]));

  // Lane 4: CREATIVE (symbolic / abstract / collage)
  const creativeExtra = [
    "symbolic arrangement", "unexpected perspective", "graphic balance", "tasteful negative space"
  ];
  const laneCreative = clamp(sentence([
    `${join(creativeExtra)} using ${join(propsSym)}`,
    `${tone.light}; ${tone.verb}`
  ]));

  const lanes = [laneObjects, laneGroup, laneSolo, laneCreative];
  const roles = ['objects', 'group', 'solo', 'creative'];
  
  return lanes.map((prompt, index) => ({
    subject: `${subcategory} scene`,
    background: `${toneKey} atmosphere`,
    prompt: prompt,
    role: roles[index]
  }));
}