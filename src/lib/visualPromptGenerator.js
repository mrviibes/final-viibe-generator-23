// visualPromptGenerator.js
// Copy-paste ready. No external deps. ESM default export.
//
// Usage:
//   import generateVisualPrompts from "./visualPromptGenerator.js";
//   const out = generateVisualPrompts({
//     category: "Celebrations",
//     subcategory: "Birthday",
//     tone: "Humorous",
//     text: "Make a wish before the cake steals all the attention.",
//     style: "Realistic",
//     tags: ["balloons","candles"]
//   });
//   console.log(out);

/* ============================== Config =============================== */

const STYLE_DESCRIPTORS = {
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

// Category imagery (expand freely)
const IMAGERY = {
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

// Tone lexicon (short, non-repetitive)
const TONE_LEX = {
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

// Composition cues per variation
const COMP = {
  literal: ["clear subject emphasis","center-weighted framing","clean negative space for headline"],
  context: ["wide scene","environment details","storytelling mise-en-scène"],
  mood: ["selective focus","close-up details","light-driven composition"],
  creative: ["unexpected perspective","symbolic objects","graphic balance"]
};

/* ============================== Helpers ============================= */

const clamp = (s, max = 300) => (s.length <= max ? s : s.slice(0, max - 1).trim() + "…");
const uniq = arr => Array.from(new Set((arr || []).filter(Boolean)));
const join = arr => uniq(arr).join(", ");
const norm = s => (s || "").toString().trim();

function pickN(arr = [], n = 3) {
  const u = uniq(arr);
  if (u.length <= n) return u;
  return u.slice(0, n);
}

function imageryFor(category, subcategory) {
  const cat = IMAGERY[category];
  if (!cat) return IMAGERY["No Category (Freeform)"]["_generic"];
  const sub = cat[subcategory];
  if (Array.isArray(sub)) return sub;
  const flat = Object.values(cat).flat();
  return flat.length ? flat : IMAGERY["No Category (Freeform)"]["_generic"];
}

function toneFor(tone) {
  return TONE_LEX[tone] || TONE_LEX["Serious"];
}

function stylePhrases(style) {
  const s = STYLE_DESCRIPTORS[style] || STYLE_DESCRIPTORS["Realistic"];
  return uniq([...s.phrases, ...s.camera]);
}

function negativeFor(style) {
  const s = STYLE_DESCRIPTORS[style] || STYLE_DESCRIPTORS["Realistic"];
  return s.negative.join(", ");
}

// crude noun-ish keyword filter with denylist + "keep only if useful"
const DENY = new Set([
  "another","year","years","gone","same","exactly","still","very","really","quite","thing","stuff",
  "calorie","calories","count","counts","like","feel","feels","felt","make","made","makeup","text",
  "disappointment","person","people","time","today","yours","mine","ours"
]);

function extractProperNouns(originalText) {
  // returns words that appear Capitalized in the original text (names etc.)
  const matches = (originalText || "").match(/\b[A-Z][a-z]+(?:'[a-z]+)?\b/g) || [];
  return uniq(matches.map(s => s.toLowerCase()));
}

function extractKeywords(text, imageryTokens) {
  const words = (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const candidates = words.filter(w =>
    w.length > 3 &&
    !/\d/.test(w) &&
    !DENY.has(w)
  );

  // keep only if appears in imagery tokens OR appears multiple times
  const freq = {};
  for (const w of candidates) freq[w] = (freq[w] || 0) + 1;

  const keep = candidates.filter(w => imageryTokens.has(w) || freq[w] > 1);
  return uniq(keep).slice(0, 6);
}

function tokenizeImagery(list) {
  // break imagery phrases into tokens to match text keywords
  const t = new Set();
  (list || []).forEach(p => {
    p.toLowerCase().split(/[^a-z0-9]+/).forEach(w => {
      if (w && w.length > 3) t.add(w);
    });
  });
  return t;
}

function sentence(parts) {
  const text = parts.filter(Boolean).join(" ");
  // tidy commas, spaces
  return text
    .replace(/\s+,/g, ",")
    .replace(/,+\s*,/g, ",")
    .replace(/\s+/g, " ")
    .trim();
}

/* =============================== Core =============================== */

/**
 * Generate four polished, distinct prompts (Literal / Context / Mood / Creative).
 * @param {Object} params
 * @param {string} params.category
 * @param {string} params.subcategory
 * @param {string} params.tone
 * @param {string} params.text             // <= 100 chars
 * @param {string} params.style            // Realistic | Caricature | Anime | 3D Animated | Illustrated | Pop Art
 * @param {string[]} [params.tags]
 * @returns {Array<{textPrompt:string, style:string, positiveTags:string[], negativePrompt:string}>}
 */
function generateVisualPrompts(params) {
  const category = norm(params.category) || "No Category (Freeform)";
  const subcategory = norm(params.subcategory) || "_generic";
  const toneKey = norm(params.tone) || "Serious";
  const text = norm(params.text || "").slice(0, 100);
  const style = norm(params.style) || "Realistic";
  const tags = Array.isArray(params.tags) ? params.tags.map(norm).filter(Boolean) : [];

  const baseImagery = imageryFor(category, subcategory);
  const imageryTokens = tokenizeImagery(baseImagery);
  const proper = extractProperNouns(params.text || "");
  const textKeywords = extractKeywords(text, imageryTokens);
  const tone = toneFor(toneKey);
  const styleBits = stylePhrases(style);
  const neg = negativeFor(style);

  // Build object pools (ordered by specificity)
  const objectsLiteral = uniq([...tags, ...textKeywords, ...proper, ...baseImagery]).slice(0, 5);
  const objectsContext = pickN(baseImagery, 4);
  const objectsMood = pickN([...textKeywords, ...baseImagery].reverse(), 3);
  const objectsCreative = pickN(uniq([...tags, ...baseImagery, ...textKeywords]).reverse(), 4);

  // Short mood/lighting strings rotated to avoid repetition
  const moodStr = pickN(tone.mood, 1)[0] || "";
  const lightStr = pickN(tone.light, 1)[0] || "";
  const verbStr = pickN(tone.verbs, 1)[0] || "";

  // Shared prefix (style cues up front so generators "lock" the look)
  const styleLead = join(styleBits);

  // 1) LITERAL — mirrors the text with key objects, clear subject, headline space
  const literalLine = sentence([
    `${styleLead}, close-up of ${join(objectsLiteral)}.`,
    `${lightStr}; ${moodStr}.`,
    "Clear negative space for headline."
  ]);
  const literalPrompt = clamp(literalLine);

  // 2) CONTEXT — wide scene built from subcategory staples (storytelling)
  const contextLine = sentence([
    `${styleLead}, wide ${subcategory.toLowerCase()} scene with ${join(objectsContext)}.`,
    `${lightStr}; ${verbStr}.`,
    "Environmental storytelling."
  ]);
  const contextPrompt = clamp(contextLine);

  // 3) MOOD — detail-first composition that foregrounds feeling and light
  const moodLine = sentence([
    `${styleLead}, ${join(objectsMood)} in selective focus.`,
    `${lightStr}; conveys ${moodStr}.`,
    "Light-driven composition."
  ]);
  const moodPrompt = clamp(moodLine);

  // 4) CREATIVE — symbolic/alternate angle with graphic balance
  const creativeLine = sentence([
    `${styleLead}, symbolic arrangement of ${join(objectsCreative)}.`,
    `${lightStr}; ${verbStr}.`,
    "Unexpected perspective, graphic balance."
  ]);
  const creativePrompt = clamp(creativeLine);

  // Positive tags surfaced for downstream UIs
  const positiveTags = uniq([subcategory, ...tags, ...textKeywords, ...proper]);

  return [
    { textPrompt: literalPrompt,  style, positiveTags, negativePrompt: neg },
    { textPrompt: contextPrompt,  style, positiveTags, negativePrompt: neg },
    { textPrompt: moodPrompt,     style, positiveTags, negativePrompt: neg },
    { textPrompt: creativePrompt, style, positiveTags, negativePrompt: neg }
  ];
}

export default generateVisualPrompts;
