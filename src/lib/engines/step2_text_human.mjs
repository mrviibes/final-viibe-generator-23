// step2_text_human.mjs
// Deterministic, human-sounding one‑liners for Step‑2 (no model).
// Guarantees: 4 lanes, ≤80 chars, tags (incl. subcategory) in EVERY line.

const MAX = 80;
const LANES = ["platform","audience","skill","absurdity"];
const BDAY_PROPS = ["cake","candles","balloons","confetti","party hats","gifts"];

const byWords = (s,max=MAX)=>{
  if (s.length<=max) return s;
  const cut = s.slice(0,max+1).split(/\s+/).slice(0,-1).join(" ");
  return (/[.!?]$/.test(cut)?cut:cut.replace(/[,:;]?\s*$/,".")); // end clean
};

const isName = s => /^[a-z][a-z\s.'-]{1,24}$/i.test(s||"");
const toLower = s => (s||"").toLowerCase();

export function generateTextOptionsHuman({
  category="Celebrations",
  subcategory="Birthday",
  tone="Humorous",
  tags=[]
}){
  // enforce subcategory word as a tag (e.g., "birthday")
  const topic = toLower(subcategory);
  const name  = (tags.find(isName) || "Jesse").trim();
  const trait = (tags.find(t=>!isName(t)&&toLower(t)!==topic) || "").trim();
  const must  = Array.from(new Set([topic, ...tags.map(String)]));

  // pick two birthday props so lanes aren't clones
  const [a,b] = (()=>{ const x=[...BDAY_PROPS]; const A=x[Math.floor(Math.random()*x.length)];
                        const y=x.filter(t=>t!==A); const B=y[Math.floor(Math.random()*y.length)]||A; return [A,B]; })();

  // tone switch (keep it light for Humorous, sharper for Savage)
  const roast = toLower(tone)==="savage";

  // four lane templates (already varied in length; all include name + topic + optional trait)
  const T = {
    platform: roast
      ? `${name}'s ${topic} ${a} works harder than the guests. ${trait?trait+" ":""}`
      : `${name}'s ${topic} ${a} steals the spotlight; ${b} just pose. ${trait?trait+" ":""}`,
    audience: roast
      ? `Laughs spike when ${name} stops reorganizing the ${b}. ${topic} ${trait?trait:""}`
      : `The room laughs before the joke; it's ${name}'s ${topic}. ${trait?trait:""}`,
    skill: roast
      ? `${name} goes for one breath; three ${a} survive. ${topic} chaos ${trait?trait:""}`
      : `${name} tries one breath; a few ${a} hold out. ${topic} science ${trait?trait:""}`,
    absurdity: roast
      ? `Even the ${b} flinch when ${name} leads the ${topic}. ${trait?trait:""}`
      : `Even the ${b} look confused at ${name}'s ${topic}. ${trait?trait:""}`
  };

  // inject all tags naturally; keep ≤80 and tidy
  const ensureTags = (s)=>{
    let out = s.replace(/\s+/g," ").trim();
    const low = out.toLowerCase();
    for (const t of must) if (t && !low.includes(toLower(t))) out += ` ${t}`;
    out = out.replace(/\s+/g," ").replace(/\s*[,:;]\s*$/, ".").trim();
    return byWords(out, MAX);
  };

  const lines = [
    { lane:"platform",  text: ensureTags(T.platform)  },
    { lane:"audience",  text: ensureTags(T.audience)  },
    { lane:"skill",     text: ensureTags(T.skill)     },
    { lane:"absurdity", text: ensureTags(T.absurdity) }
  ];

  return lines;
}
