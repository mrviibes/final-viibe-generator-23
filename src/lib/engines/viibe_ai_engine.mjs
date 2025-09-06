/* viibe_ai_engine.mjs
   One-file engine for Step 2 (TEXT) + Step 3 (VISUALS) with validators + fallbacks.
   Models: lock to GPT-4.1 Mini by default. Toggle TEXT_MODEL if you later want gpt-4.1.
*/

// ---------- MODEL LOCK ----------
export const TEXT_MODEL  = "gpt-4.1-mini-2025-04-14";   // change to "gpt-4.1-2025-04-14" if you want sharper text
export const VIS_MODEL   = "gpt-4.1-mini-2025-04-14";

// ---------- STATIC MAPS (light but useful) ----------
const ANCHORS = {
  "celebrations.birthday": ["cake","candles","balloons","confetti","party hats","gifts"],
  "celebrations.anniversary": ["candles","rose petals","champagne","ring","dinner table"],
  "sports.hockey": ["ice rink","stick","puck","goal net","helmets","locker room"],
  "sports.basketball": ["indoor court","hoop","net","sneakers","scoreboard","bench"],
  "dailylife.work commute": ["train","bus","subway","traffic","stoplight","coffee","headphones","platform"],
  "_celebrations": ["balloons","confetti","streamers","cake"],
  "_sports": ["scoreboard","jersey","bench","crowd"],
  "_dailylife": ["coffee","phone","bag","window light"]
};

const NEGATIVES = {
  celebrations: "no background lettering, no banners with words, no signage, no extra text",
  sports: "no laptops, no desks, no coffee mugs, no signage text",
  dailylife: "no party props, no sports gear, no signage text",
  default: "no watermarks, no logos, no misspellings, no extra text"
};

const SOLO_ACTION = {
  birthday: "blowing out candles (smoke visible)",
  hockey: "hard stop with ice spray",
  basketball: "jump shot mid-air",
  "work commute": "walking with coffee through station",
  _default: "interacting with key props in motion"
};

const CLICHES = [
  "laughter is the best medicine",
  "timing is everything",
  "finds you when you least expect it",
  "truth hurts",
  "change everything",
  "memories shape our future",
  "run deeper than logic"
];

const LANES = ["platform","audience","skill","absurdity"];
const LANE_RX = /^\s*(platform|audience|skill|absurdity|skillability)\s*:\s*/i;
const PUNCT_RX = /[—–]|--/g;

// ---------- HELPERS ----------
const lc = s => String(s||"").toLowerCase();
const pick = a => a[Math.floor(Math.random()*a.length)];
const dedupe = a => Array.from(new Set(a.filter(Boolean)));
const clamp = s => s.replace(PUNCT_RX,":").replace(/\s+/g," ").trim().slice(0,100);

function ctxId(category, subcategory, entity){
  const c = lc(category), s = lc(subcategory), e = lc(entity||"");
  return e ? `${c}.${s}.${e}` : `${c}.${s}`;
}

function anchorPack(category, subcategory){
  const key = ctxId(category, subcategory);
  if (ANCHORS[key]) return ANCHORS[key];
  if (ANCHORS[`${lc(category)}.${lc(subcategory).split(" ")[0]}`]) return ANCHORS[`${lc(category)}.${lc(subcategory).split(" ")[0]}`];
  if (ANCHORS[`_${lc(category)}`]) return ANCHORS[`_${lc(category)}`];
  return ["subject","background","props"]; // ultra-safe fallback
}

function negativesFor(category){
  return NEGATIVES[lc(category)] || NEGATIVES.default;
}

function soloActionFor(subcategory){
  return SOLO_ACTION[lc(subcategory)] || SOLO_ACTION._default;
}

function ensureTagsInEveryLine(text, tags){
  let out = text;
  const low = out.toLowerCase();
  for (const t of (tags||[])) {
    if (!low.includes(String(t).toLowerCase())) {
      out = out.endsWith(".") ? out.slice(0,-1)+`, ${t}.` : `${out}, ${t}`;
    }
  }
  return out;
}

// ---------- STEP 2: TEXT (AI) ----------
const SYS_TEXT = `
Return ONLY JSON:
{"lines":[
 {"lane":"platform","text":"..."},
 {"lane":"audience","text":"..."},
 {"lane":"skill","text":"..."},
 {"lane":"absurdity","text":"..."}
]}
Rules:
- text = user-facing one-liner; NEVER include lane names or prefixes.
- Generate 4 lines in that order. ≤100 chars. Only commas/periods/colons.
- ALL TAGS must appear in EVERY line.
- Use at least one provided anchor word per line for concreteness.
- Avoid clichés and vague platitudes.
- Tone must guide style (Humorous/Playful light; Savage roast behavior not identity; Sentimental/Serious respectful).
- Do not invent names/occasions not provided.
`;

const textUser = ({category, subcategory, tone, tags, anchors}) =>
`Category: ${category}
Subcategory: ${subcategory}
Tone: ${tone}
TAGS (must appear in every line): ${tags.join(", ")}
Anchors (use at least one per line): ${anchors.join(", ")}
Never use these phrases: ${CLICHES.join(" | ")}
Generate JSON now.`;

// validate & repair model output
function validateTextLines(lines, {tags, anchors}){
  if (!Array.isArray(lines) || lines.length!==4) return null;
  const reqTags = (tags||[]).map(lc);
  const out = lines.map((L,i)=>{
    let txt = (L?.text||"").replace(LANE_RX,"").trim();
    if (!txt) return null;
    // clichés
    if (CLICHES.some(ph=>txt.toLowerCase().includes(ph))) return null;
    // anchors
    if (!anchors.some(a=>txt.toLowerCase().includes(lc(a)))) return null;
    // enforce tags
    txt = ensureTagsInEveryLine(txt, tags);
    txt = clamp(txt);
    return { lane: LANES[i], text: txt };
  });
  return out.every(Boolean) ? out : null;
}

// deterministic local fallback (keeps tags & anchors)
function localTextFallback({category, subcategory, tone, tags}){
  const anchors = anchorPack(category, subcategory);
  const a = pick(anchors), b = pick(anchors.filter(x=>x!==a)) || a;
  const name = tags.find(t=>/^[a-z][a-z\s'-]{1,24}$/i.test(t)) || (tags[0]||"friend");
  const tagStr = tags.join(", ");
  const roast = tone.toLowerCase()==="savage";

  const raw = [
    {lane:"platform",  text: roast ? `${name} turns the ${a} into damage control, ${tagStr}.` 
                                   : `${name} brightens the ${a} just by showing up, ${tagStr}.`},
    {lane:"audience",  text: roast ? `Guests only relax when ${name} steps away from the ${b}, ${tagStr}.`
                                   : `People grin when ${name} drifts by the ${b}, ${tagStr}.`},
    {lane:"skill",     text: roast ? `${name} tackles ${a} with the grace of a forklift, ${tagStr}.`
                                   : `${name} handles the ${a} like a quiet pro, ${tagStr}.`},
    {lane:"absurdity", text: roast ? `Even the ${b} filed a complaint against ${name}, ${tagStr}.`
                                   : `Even the ${b} seems to cheer for ${name}, ${tagStr}.`}
  ];
  return raw.map(r=>({lane:r.lane, text: clamp(r.text)}));
}

export async function generateTextOptions(openai, {category, subcategory, tone, tags=[]}) {
  // make sure the subcategory word is present as a tag (forces "birthday", "hockey", etc.)
  const tagsAll = dedupe([lc(subcategory), ...tags]);
  const anchors = anchorPack(category, subcategory);

  // 1) call model lean
  let resp;
  try {
    resp = await openai.chat.completions.create({
      model: TEXT_MODEL,
      response_format: { type: "json_object" },
      max_completion_tokens: 220,
      messages: [
        { role: "system", content: SYS_TEXT },
        { role: "user",   content: textUser({category, subcategory, tone, tags: tagsAll, anchors}) }
      ],
    });
  } catch { resp = null; }

  let lines;
  try { lines = JSON.parse(resp?.choices?.[0]?.message?.content||"{}").lines; } catch { lines = null; }
  let fixed = validateTextLines(lines, {tags: tagsAll, anchors});

  // 2) one retry if needed
  if (!fixed) {
    try {
      const resp2 = await openai.chat.completions.create({
        model: TEXT_MODEL,
        response_format: { type: "json_object" },
        max_completion_tokens: 220,
        messages: [
          { role: "system", content: SYS_TEXT },
          { role: "user",   content: textUser({category, subcategory, tone, tags: tagsAll, anchors}) + "\nBe concrete; avoid clichés strictly." }
        ],
      });
      let lines2;
      try { lines2 = JSON.parse(resp2?.choices?.[0]?.message?.content||"{}").lines; } catch { lines2 = null; }
      fixed = validateTextLines(lines2, {tags: tagsAll, anchors});
    } catch { /* ignore */ }
  }

  // 3) fallback
  return fixed || localTextFallback({category, subcategory, tone, tags: tagsAll});
}

// ---------- STEP 3: VISUALS (AI) ----------
const SYS_VIS = `
You return ONLY JSON:
{
  "visualOptions":[
    {"lane":"objects","prompt":"..."},
    {"lane":"group","prompt":"..."},
    {"lane":"solo","prompt":"..."},
    {"lane":"creative","prompt":"..."}
  ],
  "negativePrompt":"..."
}
Rules:
- Do not include style words (realistic, anime, 3D, illustration). Describe the scene only.
- Lanes:
  * objects  = props/environment only (no people).
  * group    = multiple people interacting, candid gestures.
  * solo     = ONE person doing an action (clear verb + visible cue).
  * creative = symbolic/abstract arrangement, bold perspective.
- Use ALL tags in EVERY lane. Vary emphasis so lanes feel different.
- If a tag is clothing → attach in solo/group. Props/setting tags → spread across all lanes.
- If a tag is an ACTIVITY (drinking, dancing, smoking) → solo/group show the action; objects/creative show props/symbols.
- No more than 2 props may repeat across lanes.
- Keep each prompt ≤300 characters.
`;

function visUser({category, subcategory, tone, tags, anchors, negatives, soloAction}) {
  return `Category: ${category}
Subcategory: ${subcategory}
Tone: ${tone}
Tags: ${tags.join(", ")}
Anchors: ${anchors.join(", ")}
SoloAction: ${soloAction}
Provide the 4 lanes + negativePrompt per rules above.
For negativePrompt include: ${negatives}.`;
}

// visual validators
function validateVisual(json, {category}){
  if (!json?.visualOptions || json.visualOptions.length!==4) return null;
  const byLane = Object.fromEntries(json.visualOptions.map(v=>[v.lane,v.prompt||""]));
  if (!byLane.objects || /\b(person|people|man|woman|crowd)\b/i.test(byLane.objects)) return null;
  if (!byLane.group   || !/\b(people|friends|team|crowd|group)\b/i.test(byLane.group)) return null;
  if (!byLane.solo    || !/\b(one|single)\b/i.test(byLane.solo) || !/\b(run|jump|blow|skate|shoot|toast|dance|walk|hold|raise|spray|spin|cheer)\b/i.test(byLane.solo)) return null;
  if (!byLane.creative|| !/\b(symbolic|abstract|arrangement|metaphor)\b/i.test(byLane.creative)) return null;
  const neg = json.negativePrompt || "";
  if (!neg.length) return null;
  return { visualOptions: json.visualOptions, negativePrompt: neg };
}

// deterministic visual fallback
function localVisualFallback({category, subcategory, tone, tags}){
  const anchors = anchorPack(category, subcategory);
  const a = pick(anchors), b = pick(anchors.filter(x=>x!==a)) || a;
  const activity = soloActionFor(subcategory);
  const t = tags.join(", ");
  return {
    visualOptions: [
      { lane:"objects",  prompt:`Close-up of ${a} and ${b} arranged on a surface; clear empty area for headline, ${t}.` },
      { lane:"group",    prompt:`Friends/team gathered around ${a}, candid gestures and laughter; ${t}.` },
      { lane:"solo",     prompt:`One person ${activity}; motion cue visible; ${t}.` },
      { lane:"creative", prompt:`Symbolic/abstract arrangement of ${a} and ${b}, unexpected perspective; ${t}.` }
    ],
    negativePrompt: (negativesFor(category) + ", no watermarks, no logos, no extra text")
  };
}

export async function generateVisualOptions(openai, {category, subcategory, tone, tags=[]}){
  const anchors = anchorPack(category, subcategory);
  const negatives = negativesFor(category);
  const soloAct = soloActionFor(subcategory);
  const tagsAll = dedupe([lc(subcategory), ...tags]);

  let resp;
  try {
    resp = await openai.chat.completions.create({
      model: VIS_MODEL,
      response_format: { type: "json_object" },
      max_completion_tokens: 550,
      messages: [
        { role:"system", content: SYS_VIS },
        { role:"user",   content: visUser({category, subcategory, tone, tags: tagsAll, anchors, negatives, soloAction: soloAct}) }
      ],
    });
  } catch { resp = null; }

  let json;
  try { json = JSON.parse(resp?.choices?.[0]?.message?.content||"{}"); } catch { json = null; }
  let fixed = validateVisual(json, {category});

  if (!fixed) fixed = localVisualFallback({category, subcategory, tone, tags: tagsAll});
  return fixed;
}

// ---------- FINAL PAYLOAD COMPOSER (Step 4 uses this) ----------
export function composeFinalPayload({
  textContent, textLayoutId, layoutLibrary,
  visualStyle, visualOption, negativePrompt,
  dimensions, category, subcategory, tone, tags=[]
}){
  const textLayoutSpec = layoutLibrary?.[textLayoutId] || { type:"negativeSpace" };
  return {
    textContent: textContent||"",
    textLayoutSpec,
    visualStyle,                          // apply style at render time (do NOT put in prompts)
    visualPrompt: visualOption?.prompt||"",
    negativePrompt: (negativePrompt||NEGATIVES.default),
    dimensions,
    contextId: ctxId(category, subcategory),
    tone, tags: dedupe([lc(subcategory), ...tags])
  };
}
