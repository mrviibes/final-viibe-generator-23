import { openAIService } from './openai';
import { 
  postProcessLine,
  TONE_FALLBACKS,
  AI_CONFIG,
  getEffectiveConfig,
  getSmartFallbackChain,
  MODEL_DISPLAY_NAMES,
  SYSTEM_PROMPTS,
  buildVibeGeneratorMessages,
  buildCompactVibeMessages,
  buildStrictLaneMessages,
  getRuntimeOverrides,
  type VibeInputs,
  type VibeCandidate,
  type VibeResult
} from '../vibe-ai.config';
import type { ChatMessage } from '../ai/prompts';

// Build text hotfix messages for stricter lane generation
function buildTextHotfixMessages(inputs: VibeInputs): ChatMessage[] {
  const tagsCSV = (inputs.tags || []).join(', ');
  const anchors = getTextAnchors(inputs.category, inputs.subcategory || '');
  const banlist = TEXT_CLICHES;
  
  return [
    {
      role: 'system',
      content: `Return ONLY JSON:
{"lines":[
 {"lane":"platform","text":"..."},
 {"lane":"audience","text":"..."},
 {"lane":"skill","text":"..."},
 {"lane":"absurdity","text":"..."}
]}
Rules:
- 4 one-liners, lanes in that order; user-facing text only (no lane labels/prefixes).
- ≤100 chars each; use commas/periods/colons only (no em-dash or --).
- ALL tags must appear in EVERY line (case-insensitive).
- Avoid clichés, vague platitudes, and generic advice.
- Each line must include at least ONE concrete noun from the provided anchor list.
- Tone must guide word choice (Humorous/Playful=light, Savage=roast behavior not identity, Sentimental/Serious=respectful, etc.).
- No invented names/occasions beyond inputs.`
    },
    {
      role: 'user',
      content: `Category: ${inputs.category}
Subcategory: ${inputs.subcategory || 'general'}
Tone: ${inputs.tone}
TAGS (must appear in every line): ${tagsCSV}
Anchors (use at least one per line): ${anchors.join(', ')}
Never use these phrases: ${banlist.join(' | ')}
Generate 4 one-liners in JSON per the schema and rules.`
    }
  ];
}
import { TextContract, buildUniversalContract } from './contracts';
import { getPopCultureContext, extractSubjectFromInputs } from './popCultureContext';
import { 
  validateFourLaneOutput,
  getLanesForCategory,
  validateTagPlacement,
  validateLengthDiversity,
  validateOpeningWordVariety
} from './textGenerationGuards';

// Subcategory anchors (require at least 1 per line)
const TEXT_ANCHORS: Record<string, string[]> = {
  "celebrations.birthday": ["cake","candles","balloons","confetti","party hats","gifts"],
  "dailylife.work commute": ["train","bus","subway","traffic","stoplight","headphones","coffee","windshield","platform","carpool"],
  "sports.hockey": ["ice rink","stick","puck","helmet","skates","goal net","locker room"],
  "dailylife.grocery shopping": ["cart","checkout","aisle","produce","cashier","receipt","bag"],
  "celebrations.wedding": ["dress","ring","bouquet","vows","altar","reception","cake"],
  "sports.football": ["field","touchdown","quarterback","helmet","stadium","end zone"],
  "dailylife.morning routine": ["coffee","shower","alarm","toothbrush","mirror","breakfast"],
  "work.meeting": ["conference room","presentation","laptop","whiteboard","agenda","deadline"],
};

// Phrases to ban (kills generic, fortune-cookie lines)
const TEXT_CLICHES = [
  "laughter is the best medicine",
  "timing is everything", 
  "memories shape our future",
  "finds you when you least expect it",
  "run deeper than logic",
  "change everything",
  "truth hurts",
  "life is a journey",
  "everything happens for a reason",
  "follow your dreams",
  "live laugh love",
  "be yourself",
];

const LANE_RX = /^\s*(platform|audience|skill|absurdity|skillability)\s*:\s*/i;
const PUNCT_RX = /[—–]|--/g;

// Helper functions
function keyMatch(category: string, subcategory: string): string {
  return `${category.toLowerCase()}.${subcategory.toLowerCase()}`;
}

function getTextAnchors(category: string, subcategory: string): string[] {
  const key = keyMatch(category, subcategory);
  return TEXT_ANCHORS[key] || [];
}

function includesAny(hay: string, list: string[]): boolean {
  const lower = hay.toLowerCase();
  return list.some(x => lower.includes(x.toLowerCase()));
}

export function fixAndValidate(lines: any[], tags: string[], anchors: string[] = [], max: number = 100) {
  if (!Array.isArray(lines) || lines.length !== 4) return null;
  const reqTags = (tags || []).map(t => t.toLowerCase());
  const lanes = ["platform", "audience", "skill", "absurdity"];
  const out = lines.map((L, i) => {
    let txt = (L?.text || "").replace(LANE_RX, "").replace(PUNCT_RX, ":").trim();
    if (!txt) return null;
    
    // Check for clichés
    if (TEXT_CLICHES.some(cliche => txt.toLowerCase().includes(cliche.toLowerCase()))) {
      return null;
    }
    
    // enforce tags
    for (const t of reqTags) {
      if (!txt.toLowerCase().includes(t)) {
        txt = `${txt}, ${t}`;
      }
    }
    
    // anchor must appear (if anchors provided)
    if (anchors.length > 0 && !includesAny(txt, anchors)) {
      return null;
    }
    
    if (txt.length > max) txt = txt.slice(0, max).trim();
    return { lane: lanes[i], text: txt };
  });
  return out.every(Boolean) ? out : null;
}

// Re-export types for backward compatibility
export type { VibeCandidate, VibeResult } from '../vibe-ai.config';

// Build tag-injected fallbacks that guarantee all tags in every line
export function buildTagInjectedFallbacks(inputs: VibeInputs): VibeCandidate[] {
  const { tone, category, subcategory, tags } = inputs;
  const tagsText = tags?.join(', ') || '';
  
  console.log(`🔧 Building tag-injected fallbacks for ${category}/${subcategory} with tags: ${tagsText}`);
  
  // Target lengths: ~50, ~70, ~90, <=100
  const templates = [
    `${tagsText} brings the energy.`,
    `Everyone watching ${tagsText} knows what's coming next.`,
    `The skill of handling ${tagsText} perfectly shows true ${tone} mastery every time.`,
    `When ${tagsText} gets chaotic, that's when the real ${tone} magic happens in ${category}.`
  ];
  
  // Clean up templates and inject tags more naturally
  const lines = templates.map((template, index) => {
    let line = template;
    
    // Ensure all tags are present, vary their placement
    tags?.forEach((tag, tagIndex) => {
      if (!line.toLowerCase().includes(tag.toLowerCase())) {
        const position = (index + tagIndex) % 3;
        if (position === 0) {
          line = `${tag} ${line}`;
        } else if (position === 1) {
          const words = line.split(' ');
          const midPoint = Math.floor(words.length / 2);
          words.splice(midPoint, 0, tag);
          line = words.join(' ');
        } else {
          line = `${line} ${tag}`;
        }
      }
    });
    
    // Ensure punctuation compliance and length limits
    line = line.replace(/--+/g, ',').replace(/[—–]/g, ',').replace(/;/g, ',');
    if (line.length > 100) {
      line = line.substring(0, 97) + '...';
    }
    
    return line.trim();
  });
  
  return lines.map((line, index) => ({
    line,
    blocked: true,
    reason: index === 0 ? 'Tag-injected fallback (validation failed)' : 'Fallback variant'
  }));
}

// Timeout wrapper for 12-second limit with one retry
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('timeout')), ms)
    )
  ]);
}

// Generate 4-lane strict candidates with manual retry
// Build local hotfix fallback (never generic, always tagged & anchored)
function buildLocalHotfixFallback(inputs: VibeInputs): VibeCandidate[] {
  const { tone, tags, category, subcategory } = inputs;
  const anchors = getTextAnchors(category, subcategory || '');
  const t0 = anchors[0] || "coffee";
  const t1 = anchors[1] || "train";
  const tagStr = (tags || []).join(", ");
  
  return [
    { line: `${tagStr} ${t0} becomes the metronome of this moment.`.slice(0, 100), blocked: false },
    { line: `${tagStr} strangers share a nod at the ${t1}; it feels like belonging.`.slice(0, 100), blocked: false },
    { line: `${tagStr} carrying hope through ${t0} stops is today's quiet talent.`.slice(0, 100), blocked: false },
    { line: `${tagStr} the ${t1} sighs; the city answers back like an old friend.`.slice(0, 100), blocked: false }
  ];
}

export async function generateLaneStrictCandidates(inputs: VibeInputs): Promise<VibeCandidate[]> {
  const targetModel = 'gpt-4.1-mini-2025-04-14';
  
  console.log(`🎯 Strict lane generation with model: ${targetModel}`);
  
  // Build text hotfix messages with anchors and cliché bans
  const messages = buildTextHotfixMessages(inputs);
  const anchors = getTextAnchors(inputs.category, inputs.subcategory || '');
  
  // First attempt with 12s timeout
  try {
    const result = await withTimeout(
      openAIService.chatJSON(messages, {
        max_completion_tokens: 220,
        model: targetModel,
        temperature: 0.9
      }),
      12000
    );
    
    // Use the stricter validator with anchors
    const fixedLines = fixAndValidate(result.lines, inputs.tags || [], anchors);
    if (!fixedLines) {
      console.warn('fixAndValidate failed, retrying once...');
      
      // Retry once with higher temperature and additional guidance
      const retryMessages = [...messages];
      retryMessages[1].content += `\nAvoid clichés strictly. Ensure at least one anchor word in EVERY line.`;
      
      const retryResult = await withTimeout(
        openAIService.chatJSON(retryMessages, {
          max_completion_tokens: 220,
          model: targetModel,
          temperature: 0.95
        }),
        12000
      );
      
      if (retryResult.lines) {
        const retryFixed = fixAndValidate(retryResult.lines, inputs.tags || [], anchors);
        if (retryFixed) {
          return retryFixed.map((line: any) => ({
            line: line.text,
            blocked: false
          }));
        }
      }
      
      console.warn('Retry also failed, using local hotfix fallback');
      return buildLocalHotfixFallback(inputs);
    }

    return fixedLines.map((line: any) => ({
      line: line.text,
      blocked: false
    }));
    
  } catch (error) {
    console.error(`🚨 Lane generation failed, using local hotfix fallback: ${error}`);
    return buildLocalHotfixFallback(inputs);
  }
}

// Interfaces now imported from centralized config

function getFallbackVariants(tone: string, category: string, subcategory: string): string[] {
  const baseFallback = TONE_FALLBACKS[tone.toLowerCase()] || TONE_FALLBACKS.humorous;
  
  // Create 4 distinct variations - no "vibes/energy" appendages
  const variations = [
    baseFallback,
    `${baseFallback} today.`,
    `${baseFallback} always.`,
    `${baseFallback} perfectly.`
  ];
  
  return variations;
}

// Post-processing now handled by centralized config

async function generateMultipleCandidates(inputs: VibeInputs, overrideModel?: string, useCompact: boolean = false): Promise<VibeCandidate[]> {
  console.log("🎯 generateMultipleCandidates called with:", JSON.stringify(inputs, null, 2));

  // Pop Culture Context Fetch
  let popCultureContext = null;
  if (inputs.category === 'Pop Culture' && 
      inputs.subcategory && 
      (inputs.subcategory.toLowerCase().includes('celebr') || 
       inputs.subcategory.toLowerCase().includes('influencer'))) {
    
    const subject = extractSubjectFromInputs({
      search_term: inputs.search_term,
      tags: inputs.tags,
      subcategory: inputs.subcategory
    });

    if (subject) {
      // Determine trend mode from tags
      const trendMode = inputs.tags?.includes('recent') ? 'recent' : 'evergreen';
      
      try {
        popCultureContext = await getPopCultureContext(subject, trendMode, {
          category: inputs.category,
          subcategory: inputs.subcategory,
          tone: inputs.tone,
          tags: inputs.tags
        });
        
        if (popCultureContext) {
          console.log(`🎭 Pop culture context fetched: ${popCultureContext.bullets.length} bullets for ${subject}`);
        } else {
          console.log(`🎭 No pop culture context found for ${subject}`);
        }
      } catch (error) {
        console.error('Pop culture context fetch error:', error);
      }
    }
  }

  try {
    // Use effective config with runtime overrides
    const config = getEffectiveConfig();
    const targetModel = overrideModel || config.generation.model;
    
    console.log(`🚀 Text generation starting with user-selected model: ${targetModel}${useCompact ? ' (compact mode)' : ''}`);
    
    // Use centralized message builder (compact for retries)
    const messages = useCompact ? buildCompactVibeMessages(inputs) : buildVibeGeneratorMessages(inputs, popCultureContext);
    
    // Increase token budget for 4-lane generation with quality controls
    const maxTokens = 200;
    
    const result = await openAIService.chatJSON(messages, {
      max_completion_tokens: maxTokens,
      temperature: config.generation.temperature,
      model: targetModel
    });
    
    // Store the API metadata for later use
    const apiMeta = result._apiMeta;
    
    // Extract lines from JSON response - enforce exactly 4 lines
    const lines = result.lines || result.options || result.candidates || result.texts || [];
    if (!Array.isArray(lines)) {
      console.error('API format mismatch - expected array, got:', typeof lines);
      throw new Error('Local placeholder (API format mismatch)');
    }
    
    // Enforce exactly 4 lines requirement
    if (lines.length !== 4) {
      console.warn(`Expected exactly 4 lines, got ${lines.length}. Adjusting...`);
      // Pad with fallbacks if too few, or trim if too many
      if (lines.length < 4) {
        const fallbacks = getFallbackVariants(inputs.tone, inputs.category, inputs.subcategory);
        while (lines.length < 4) {
          lines.push(fallbacks[lines.length % fallbacks.length]);
        }
      } else if (lines.length > 4) {
        lines.splice(4); // Keep only first 4
      }
    }
    
    // Check if this is knock-knock format
    const isKnockKnock = inputs.subcategory?.toLowerCase().includes("knock");
    const postProcessOptions = isKnockKnock ? { allowNewlines: true, format: 'knockknock' as const } : undefined;
    
    // Post-process each line with enhanced tag validation and variety checks
    const enhancedOptions = { 
      ...postProcessOptions, 
      enforceNameGuard: true,
      enforceTagPlacement: true
    };
    const candidates = lines.map((line: string) => postProcessLine(line, inputs.tone, inputs.tags, enhancedOptions));
    
    // Add variety guard enforcement
    const candidateLines = candidates.map(c => c.line);
    const varietyCheckedLines = applyVarietyGuard(candidateLines, inputs);
    
    // Update candidates with variety-checked lines
    const finalCandidates = candidates.map((candidate, index) => ({
      ...candidate,
      line: varietyCheckedLines[index]
    }));
    
    // Add API metadata to candidates for later extraction
    if (apiMeta && finalCandidates.length > 0) {
      (finalCandidates as any)._apiMeta = apiMeta;
    }
    
    return finalCandidates;
  } catch (error) {
    console.error('Failed to generate multiple candidates:', error);
    // Generate exactly 4 fallback variants with proper tag integration
    const fallbackVariants = getFallbackVariants(inputs.tone, inputs.category, inputs.subcategory);
    
    return fallbackVariants.slice(0, 4).map((line, index) => {
      // Integrate first tag if available
      let finalLine = line;
      if (inputs.tags && inputs.tags.length > 0) {
        const firstTag = inputs.tags[0];
        // Simple tag integration for fallbacks
        if (index === 0) finalLine = `${firstTag}. ${line}`;
        else if (index === 1) finalLine = `${line} ${firstTag}.`;
        else if (index === 2) finalLine = line.replace('.', `, ${firstTag}.`);
        else finalLine = `${line} (${firstTag})`;
      }
      
      // Validate fallback through postProcessLine
      const processedFallback = postProcessLine(finalLine, inputs.tone, inputs.tags || []);
      
      return {
        line: processedFallback.blocked ? line : processedFallback.line,
        blocked: true,
        reason: index === 0 ? `Local placeholder (${error instanceof Error ? error.message : 'API failure'})` : 'Local fallback variant'
      };
    });
  }
}

// Utility to tokenize subcategory for keyword extraction
function tokenizeSubcategory(subcategory: string): string[] {
  if (!subcategory || subcategory === '-') return [];
  
  const stopwords = new Set(['the', 'of', 'and', 'or', 'for', 'to', 'in', 'on', 'at', 'by', 'with']);
  
  return subcategory
    .toLowerCase()
    .split(/[\s\-\/]+/)
    .filter(token => token.length >= 3 && !stopwords.has(token))
    .map(token => {
      // Simple plural to singular conversion
      if (token.endsWith('s') && token.length > 4) {
        return token.slice(0, -1);
      }
      return token;
    });
}

// Build keyword set for subcategory matching
function buildKeywordSet(subcategory: string): Set<string> {
  const tokens = tokenizeSubcategory(subcategory);
  const keywords = new Set<string>();
  
  for (const token of tokens) {
    keywords.add(token);
    // Add common variants
    keywords.add(token + 's'); // plural
    keywords.add(token + 'ing'); // gerund
    keywords.add(token + 'ed'); // past tense
  }
  
  return keywords;
}

// Calculate subcategory relevance score
function subcategoryRelevanceScore(line: string, subcategory: string): number {
  if (!subcategory || subcategory === '-') return 0;
  
  const keywords = buildKeywordSet(subcategory);
  const lineWords = line.toLowerCase().split(/\W+/);
  
  let matches = 0;
  let exactMatches = 0;
  
  for (const word of lineWords) {
    if (keywords.has(word)) {
      matches++;
      // Check if it's an exact token match (not variant)
      if (tokenizeSubcategory(subcategory).includes(word)) {
        exactMatches++;
      }
    }
  }
  
  // Score: exact matches get higher weight, cap to avoid overfitting
  return Math.min(exactMatches * 15 + matches * 5, 40);
}

// Build anchored fallbacks for subcategory with baby shower specific seasoning
function buildAnchoredFallbacks(tone: string, subcategory: string, tags?: string[]): string[] {
  if (!subcategory || subcategory === '-') return [];
  
  // Baby shower specific fallbacks for variety
  const isBabyShower = subcategory.toLowerCase().includes('baby') && subcategory.toLowerCase().includes('shower');
  if (isBabyShower) {
    const babyShowerTemplates: Record<string, string[]> = {
      humorous: [
        `Baby prep mode: coffee in, sanity out.`,
        `Nine months later and still not ready for this.`,
        `Diaper duty training starts immediately.`,
        `Sleep schedules are officially obsolete now.`
      ],
      savage: [
        `Congratulations on your upcoming sleep deprivation.`,
        `Hope you enjoyed those full nights while they lasted.`,
        `Say goodbye to personal time forever.`,
        `Welcome to the chaos you signed up for.`
      ],
      sentimental: [
        `Tiny hands will soon hold your heart.`,
        `Beautiful beginnings deserve perfect celebrations.`,
        `Love multiplies when families grow.`,
        `Every baby brings endless possibilities.`
      ],
      nostalgic: [
        `Remember when weekends meant sleeping in?`,
        `Those peaceful mornings are precious memories now.`,
        `Simpler times before bottles and bedtime stories.`,
        `When your biggest worry was what to watch.`
      ],
      romantic: [
        `Growing families mean growing love stories.`,
        `Two hearts creating a third miracle.`,
        `Love letters written in tiny heartbeats.`,
        `Partnership becomes parenthood beautifully.`
      ],
      inspirational: [
        `Every parent was once somebody's miracle.`,
        `Strength you never knew existed emerges.`,
        `Greatest adventures begin with smallest steps.`,
        `Courage grows when protecting what matters most.`
      ],
      playful: [
        `Tiny boss arriving soon, prepare accordingly.`,
        `Professional nap disruption services incoming.`,
        `Advanced hide-and-seek training begins shortly.`,
        `Cuteness overload warnings now in effect.`
      ],
      serious: [
        `Parenting excellence requires constant adaptation.`,
        `Responsible planning ensures successful transitions.`,
        `Professional development includes family leadership.`,
        `Strategic preparation builds confident caregivers.`
      ]
    };
    
    return babyShowerTemplates[tone.toLowerCase()] || babyShowerTemplates.humorous;
  }
  
  const tokens = tokenizeSubcategory(subcategory);
  if (tokens.length === 0) return [];
  
  const primaryToken = tokens[0];
  
  const toneTemplates: Record<string, string[]> = {
    humorous: [
      `My ${primaryToken} game is surprisingly strong today.`,
      `Turns out ${primaryToken} expertise comes naturally to me.`
    ],
    savage: [
      `Your ${primaryToken} skills need serious improvement.`,
      `That ${primaryToken} attempt was painfully amateur.`
    ],
    sentimental: [
      `${primaryToken} moments remind me of what matters most.`,
      `Nothing beats the feeling of perfect ${primaryToken} connection.`
    ],
    nostalgic: [
      `Remember when ${primaryToken} used to be so much simpler?`,
      `Those classic ${primaryToken} days were truly golden.`
    ],
    romantic: [
      `You make even ${primaryToken} feel romantic and special.`,
      `Our ${primaryToken} moments together are absolutely magical.`
    ],
    inspirational: [
      `Every ${primaryToken} challenge builds stronger character.`,
      `Success in ${primaryToken} starts with believing in yourself.`
    ],
    playful: [
      `${primaryToken} adventures make the best unexpected memories.`,
      `Who knew ${primaryToken} could be this much fun?`
    ],
    serious: [
      `Professional ${primaryToken} excellence requires consistent dedication.`,
      `Strategic ${primaryToken} planning delivers measurable results.`
    ]
  };
  
  return toneTemplates[tone.toLowerCase()] || toneTemplates.humorous;
}

// Helper function to calculate sentence quality score for ranking
function sentenceQualityScore(line: string, tone: string): number {
  let score = 0;
  
  // Word count preference (7+ words is good)
  const wordCount = line.trim().split(/\s+/).length;
  if (wordCount >= 7) score += 30;
  else if (wordCount >= 5) score += 15;
  else score -= 10; // Penalty for very short lines
  
  // Punctuation presence (indicates complete sentences)
  if (/[.!?]/.test(line)) score += 20;
  
  // Clause markers (complexity indicators)
  if (/[,;—-]/.test(line)) score += 10;
  
  // Penalty for slogan patterns
  const sloganPatterns = [
    /\b(vibes?|energy|mode)\s+(activated?|on|ready|engaged)\b/i,
    /\b(maximum|pure|zero)\s+(effort|intensity|chill)\b/i,
    /\benergy\s*$/i,
    /\bvibes?\s*(only|activated)\b/i,
    /\bmode\s+(on|activated)\b/i
  ];
  
  for (const pattern of sloganPatterns) {
    if (pattern.test(line)) {
      score -= 15; // Strong penalty for slogan-like phrases
    }
  }
  
  return score;
}

// Helper function to generate tone-specific phrase candidates (no tags appended)
function phraseCandidates(tone: string, tags?: string[]): string[] {
  const toneMap: Record<string, string[]> = {
    humorous: ['Comedy finds you when you least expect it.', 'Laughter is the best medicine, apparently.', 'Funny things happen to serious people.', 'Humor is timing, and timing is everything.'],
    sarcastic: ['Oh, absolutely perfect timing as always.', 'Well, this is exactly what we needed.', 'Clearly the universe has a sense of humor.', 'Obviously this was going to happen.'],
    savage: ['No mercy, no excuses, just results.', 'Brutally honest conversations change everything.', 'Reality hits harder than expectations.', 'Truth hurts, but lies hurt more.'],
    witty: ['Clever minds think outside the obvious.', 'Sharp wit cuts through the nonsense.', 'Intelligence shows up in small moments.', 'Smart choices lead to better stories.'],
    playful: ['Fun happens when you stop overthinking.', 'Playful hearts find joy in everything.', 'Good vibes attract better experiences.', 'Cheerful moments make the best memories.'],
    romantic: ['Love finds you in unexpected places.', 'Hearts connect when minds align perfectly.', 'Romance blooms in ordinary moments.', 'Sweet gestures speak louder than words.'],
    sentimental: ['Feelings matter more than we admit.', 'Heartfelt moments stay with us forever.', 'Emotional connections run deeper than logic.', 'Touching memories shape our future.'],
    nostalgic: ['Yesterday\'s memories become today\'s treasures.', 'Past experiences light up present moments.', 'Vintage souls appreciate timeless beauty.', 'Memory lane leads to happy places.'],
    inspirational: ['Dreams become reality through consistent action.', 'Success starts with believing in yourself.', 'Greatness lives inside ordinary people.', 'Motivation turns possibilities into achievements.'],
    serious: ['Professional excellence requires constant dedication.', 'Business success demands strategic thinking.', 'Focused effort produces measurable results.', 'Serious commitment leads to lasting change.']
  };
  
  return toneMap[tone.toLowerCase()] || toneMap.humorous;
}

// Set-level variety guard to replace repetitive openings with subcategory-aware fallbacks
function applyVarietyGuard(candidates: string[], inputs: VibeInputs): string[] {
  const openingWords = candidates.map(line => {
    const firstWord = line.trim().split(' ')[0].toLowerCase();
    return firstWord;
  });
  
  // Find duplicated openings
  const wordCounts = openingWords.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const duplicatedWords = Object.keys(wordCounts).filter(word => wordCounts[word] > 1);
  
  if (duplicatedWords.length === 0) {
    return candidates; // No duplicates, return as-is
  }
  
  console.log(`🔄 Variety guard: Found duplicated openings: ${duplicatedWords.join(', ')}`);
  
  // Get subcategory-aware fallbacks
  const fallbacks = buildAnchoredFallbacks(inputs.tone, inputs.subcategory, inputs.tags);
  let fallbackIndex = 0;
  
  // Replace duplicates (keep first occurrence, replace others)
  const seenWords = new Set<string>();
  const result = candidates.map((line, index) => {
    const firstWord = line.trim().split(' ')[0].toLowerCase();
    
    if (seenWords.has(firstWord)) {
      // This is a duplicate, replace with fallback
      const replacement = fallbacks[fallbackIndex % fallbacks.length] || line;
      fallbackIndex++;
      console.log(`🔄 Replaced duplicate "${line}" with "${replacement}"`);
      return replacement;
    } else {
      seenWords.add(firstWord);
      return line;
    }
  });
  
  return result;
}

export async function generateCandidates(inputs: VibeInputs, n: number = 4): Promise<VibeResult> {
  // Use strict lane generation first with validation
  let candidateResults = await generateLaneStrictCandidates(inputs);
  let retryCount = 0;
  let usedCompact = false;
  
  // Validate the results with strict tag coverage
  const candidateLines = candidateResults.map(c => c.line);
  const validation = validateFourLaneOutput(candidateLines, inputs.tags || [], inputs.tone, inputs.category, inputs.subcategory || '');
  
  // If validation fails, retry once
  if (!validation.valid && retryCount === 0) {
    console.warn(`🔍 First attempt failed validation: ${validation.issues.join(', ')}`);
    console.log(`🔄 Retrying strict lane generation...`);
    
    try {
      candidateResults = await generateLaneStrictCandidates(inputs);
      retryCount = 1;
      
      // Validate retry results
      const retryLines = candidateResults.map(c => c.line);
      const retryValidation = validateFourLaneOutput(retryLines, inputs.tags || [], inputs.tone, inputs.category, inputs.subcategory || '');
      
      if (!retryValidation.valid) {
        console.warn(`🔍 Retry also failed validation: ${retryValidation.issues.join(', ')}`);
        console.log(`🔧 Using tag-injected fallback`);
        candidateResults = buildTagInjectedFallbacks(inputs);
        usedCompact = true; // Mark as fallback used
      }
    } catch (error) {
      console.error(`🚨 Retry failed, using tag-injected fallback: ${error}`);
      candidateResults = buildTagInjectedFallbacks(inputs);
      usedCompact = true;
    }
  } else if (!validation.valid) {
    console.warn(`🔧 Using tag-injected fallback after validation failure`);
    candidateResults = buildTagInjectedFallbacks(inputs);
    usedCompact = true;
  }
  
  // If truncated or failed, try compact mode once
  if (candidateResults.length < 4 || candidateResults.some(c => c.blocked)) {
    try {
      console.log('🔄 Retrying with compact prompt builder...');
      candidateResults = await generateMultipleCandidates(inputs, undefined, true);
      retryCount = 1;
      usedCompact = true;
    } catch (retryError) {
      console.log('🚨 Compact retry also failed, proceeding with fallbacks');
    }
  }
  
  // Extract API metadata if available
  const apiMeta = (candidateResults as any)._apiMeta || null;
  
  // Enhanced Universal Contract validation
  const allLines = candidateResults.map(c => c.line);
  const qualityCheck = validateFourLaneOutput(
    allLines, 
    inputs.tags || [], 
    inputs.tone,
    inputs.category,
    inputs.subcategory
  );
  
  // Log quality issues for debugging
  if (!qualityCheck.valid && getRuntimeOverrides().showAdvancedPromptDetails) {
    console.log('🔍 UNIVERSAL CONTRACT VALIDATION ISSUES:');
    qualityCheck.issues.forEach(issue => console.log(`  - ${issue}`));
    console.log('All tags present:', qualityCheck.details.allTagsPresent.missingTags);
    console.log('Tag placements:', qualityCheck.details.tagPlacement.placements);
    console.log('Lengths:', qualityCheck.details.lengthDiversity.lengths);
    console.log('Opening words:', qualityCheck.details.openingVariety.openingWords);
    console.log('Punctuation violations:', qualityCheck.details.punctuationWhitelist.violations);
  }
  
  // Filter out blocked candidates and remove duplicates
  const validCandidates = candidateResults.filter(c => !c.blocked);
  const uniqueValidLines = Array.from(new Set(validCandidates.map(c => c.line)));
  const blockedCount = candidateResults.length - validCandidates.length;
  
  // Count spelling-related blocks
  const spellingFiltered = candidateResults.filter(c => 
    c.blocked && c.reason?.includes('Spelling issues')
  ).length;
  
  let finalCandidates: string[] = [];
  let picked: string = '';
  let usedFallback = false;
  let reason: string | undefined;
  let retryAttempt = 0;
  let originalModel: string | undefined;
  let topUpUsed = false;
  let localPadding: Set<string> = new Set(); // Track local padding lines
  
  // Get the effective config to check if strict mode is enabled
  const config = getEffectiveConfig();
  let modelUsed = apiMeta?.modelUsed || config.generation.model;
  const strictModeEnabled = getRuntimeOverrides().strictModelEnabled ?? true; // Default to true for speed
  
  // Quality retry: if we have < 4 valid lines, spelling issues, and strict mode is disabled
  if (uniqueValidLines.length < 4 && spellingFiltered > 0 && !strictModeEnabled) {
    console.log(`🔄 Quality retry: only ${uniqueValidLines.length} valid lines, ${spellingFiltered} spelling filtered.`);
    
    const userModel = config.generation.model;
    
    // Get fallback chain starting with user's model
    const fallbackChain = getSmartFallbackChain(userModel, 'text');
    const nextModel = fallbackChain[1]; // Get next model after user's choice
    
    if (nextModel && nextModel !== modelUsed) {
      console.log(`🎯 Retrying with next model in chain: ${nextModel}`);
      
      try {
        const retryResults = await generateMultipleCandidates(inputs, nextModel);
        const retryApiMeta = (retryResults as any)._apiMeta || null;
        const retryValidCandidates = retryResults.filter(c => !c.blocked);
        const retryUniqueValidLines = Array.from(new Set(retryValidCandidates.map(c => c.line)));
        
        if (retryUniqueValidLines.length > uniqueValidLines.length) {
          // Use retry results
          finalCandidates = [...retryUniqueValidLines];
          retryAttempt = 1;
          originalModel = modelUsed;
          modelUsed = retryApiMeta?.modelUsed || nextModel;
          reason = `Quality retry with ${MODEL_DISPLAY_NAMES[nextModel] || nextModel} improved results`;
          console.log(`✅ Quality retry successful with ${MODEL_DISPLAY_NAMES[nextModel] || nextModel}`);
        } else {
          // Retry didn't help, use original results
          finalCandidates = [...uniqueValidLines];
          console.log(`🔄 Quality retry didn't improve results, using original`);
        }
      } catch (error) {
        console.error('Quality retry failed:', error);
        finalCandidates = [...uniqueValidLines];
      }
    } else {
      finalCandidates = [...uniqueValidLines];
    }
  } else {
    finalCandidates = [...uniqueValidLines];
  }
  
  // Fast top-up retry if we still don't have 4 unique valid options
  if (finalCandidates.length < 4 && !topUpUsed) {
    console.log(`🔄 Fast top-up: only ${finalCandidates.length} valid lines, attempting quick retry...`);
    
    try {
      const config = getEffectiveConfig();
      const topUpResults = await generateMultipleCandidates(inputs, config.generation.model);
      const topUpValidCandidates = topUpResults.filter(c => !c.blocked);
      const newUniqueLines = topUpValidCandidates
        .map(c => c.line)
        .filter(line => !finalCandidates.includes(line));
      
      if (newUniqueLines.length > 0) {
        finalCandidates.push(...newUniqueLines);
        topUpUsed = true;
        console.log(`✅ Fast top-up added ${newUniqueLines.length} new options`);
      }
    } catch (error) {
      console.warn('Fast top-up failed:', error);
    }
  }
  
  if (finalCandidates.length > 0) {
    // Check if we have any lines that were blocked only for tag coverage
    const tagOnlyBlocked = candidateResults.filter(c => 
      c.blocked && c.reason?.includes('tag coverage')
    );
    
    // If we have tag-only blocked lines, add them too
    if (tagOnlyBlocked.length > 0) {
      const tagBlockedLines = tagOnlyBlocked.map(c => c.line);
      finalCandidates.push(...tagBlockedLines);
    }
    
    // Build candidate metadata for ranking
    const candidateMetadata = finalCandidates.map(line => ({
      line,
      tagged: inputs.tags ? inputs.tags.some(tag => 
        line.toLowerCase().includes(tag.toLowerCase()) ||
        line.toLowerCase().includes(tag.toLowerCase().slice(0, 4))
      ) : false,
      qualityScore: sentenceQualityScore(line, inputs.tone),
      isLocal: localPadding.has(line)
    }));
    
    console.log('🔍 Candidate analysis before ranking:');
    candidateMetadata.forEach(c => {
      console.log(`  "${c.line}" - Quality: ${c.qualityScore}, Tagged: ${c.tagged}, Local: ${c.isLocal}`);
    });
    
    // Sort by: non-local first, then by quality score descending, then tagged first
    candidateMetadata.sort((a, b) => {
      // Local padding goes to bottom
      if (a.isLocal !== b.isLocal) return a.isLocal ? 1 : -1;
      // Within same local status, quality score descending
      if (a.qualityScore !== b.qualityScore) return b.qualityScore - a.qualityScore;
      // Within same quality, tagged first
      if (a.tagged !== b.tagged) return a.tagged ? -1 : 1;
      return 0;
    });
    
    finalCandidates = candidateMetadata.map(c => c.line);
    
    console.log('✅ Final ranking:');
    finalCandidates.forEach((line, index) => {
      const meta = candidateMetadata.find(c => c.line === line);
      console.log(`  ${index + 1}. "${line}" - Quality: ${meta?.qualityScore}, Tagged: ${meta?.tagged}, Local: ${meta?.isLocal}`);
    });
    
    // Ensure we have exactly 4 options - use validated tone-specific phrases
    let paddingAttempts = 0;
    const maxPaddingAttempts = 20; // Prevent infinite loops
    
    while (finalCandidates.length < 4 && paddingAttempts < maxPaddingAttempts) {
      console.log('Padding with local fallback due to filtered candidates');
      const phraseCandidatesList = phraseCandidates(inputs.tone, inputs.tags);
      let nextCandidate = phraseCandidatesList[paddingAttempts % phraseCandidatesList.length];
      paddingAttempts++;
      
      // Validate through same filter as API candidates
      const processedCandidate = postProcessLine(nextCandidate, inputs.tone, inputs.tags || []);
      if (!processedCandidate.blocked && !finalCandidates.includes(processedCandidate.line)) {
        finalCandidates.push(processedCandidate.line);
        localPadding.add(processedCandidate.line); // Track as local padding
        console.log('✅ Padding: Added validated candidate:', processedCandidate.line);
      } else {
        console.log('❌ Padding: Rejected candidate:', nextCandidate, 'blocked:', processedCandidate.blocked);
        // Don't add anything if validation fails - keep trying with next candidate
      }
    }
    
    // If still not enough after all attempts, use validated fallbacks
    while (finalCandidates.length < 4) {
      const fallbackVariants = getFallbackVariants(inputs.tone, inputs.category, inputs.subcategory);
      const nextFallback = fallbackVariants[finalCandidates.length % fallbackVariants.length];
      
      // Validate emergency fallback too
      const processedFallback = postProcessLine(nextFallback, inputs.tone, inputs.tags || []);
      const finalFallback = processedFallback.blocked ? 
        phraseCandidates(inputs.tone, inputs.tags)[finalCandidates.length % 4] : 
        processedFallback.line;
      
      if (!finalCandidates.includes(finalFallback)) {
        finalCandidates.push(finalFallback);
        localPadding.add(finalFallback); // Track as local padding
        console.log('⚡ Emergency fallback added:', finalFallback);
      } else {
        break; // Prevent infinite loop if all fallbacks are already used
      }
    }
    
    // Take only first 4 if we have more
    finalCandidates = finalCandidates.slice(0, 4);
    
    // Apply set-level variety guard to replace repetitive openings
    finalCandidates = applyVarietyGuard(finalCandidates, inputs);
    
    // Re-rank final list by quality with local padding at bottom
    const finalMetadata = finalCandidates.map(line => ({
      line,
      tagged: inputs.tags ? inputs.tags.some(tag => 
        line.toLowerCase().includes(tag.toLowerCase()) ||
        line.toLowerCase().includes(tag.toLowerCase().slice(0, 4))
      ) : false,
      qualityScore: sentenceQualityScore(line, inputs.tone),
      isLocal: localPadding.has(line)
    }));
    
    finalMetadata.sort((a, b) => {
      // Local padding goes to bottom
      if (a.isLocal !== b.isLocal) return a.isLocal ? 1 : -1;
      // Within same local status, quality score descending
      if (a.qualityScore !== b.qualityScore) return b.qualityScore - a.qualityScore;
      // Within same quality, tagged first
      if (a.tagged !== b.tagged) return a.tagged ? -1 : 1;
      return 0;
    });
    
    finalCandidates = finalMetadata.map(c => c.line);
    
    console.log('📊 Final candidate quality scores:');
    finalMetadata.forEach((meta, index) => {
      console.log(`  ${index + 1}. "${meta.line}" - Quality: ${meta.qualityScore}, Tagged: ${meta.tagged}, Local: ${meta.isLocal}`);
    });
    
    // Pick the first (highest quality) one - NO SHUFFLE
    picked = finalCandidates[0];
    usedFallback = localPadding.has(picked);
    if (!reason && tagOnlyBlocked.length > 0) {
      reason = 'Partial tag coverage but good results';
    }
  } else {
    // Check if all were blocked only for tag coverage
    const allTagOnlyBlocked = candidateResults.every(c => 
      c.blocked && c.reason?.includes('tag coverage')
    );
    
    if (allTagOnlyBlocked && candidateResults.length > 0) {
      // Use the model's original lines since they were only blocked for tags
      finalCandidates = candidateResults.map(c => c.line).slice(0, 4);
      // Ensure exactly 4 options
      while (finalCandidates.length < 4) {
        const fallbackVariants = getFallbackVariants(inputs.tone, inputs.category, inputs.subcategory);
        finalCandidates.push(fallbackVariants[finalCandidates.length % fallbackVariants.length]);
      }
      picked = finalCandidates[0];
      usedFallback = false;
      reason = validCandidates.length < candidateResults.length ? 'Used model output with partial tag coverage' : 'Used model output';
    } else {
      // Genuine blocks (banned words, etc.) - use validated tone-specific phrases
      const phraseCandidatesList = phraseCandidates(inputs.tone, inputs.tags);
      // Validate each phrase candidate
      const validatedCandidates = phraseCandidatesList.map(phrase => {
        const processed = postProcessLine(phrase, inputs.tone, inputs.tags || []);
        return processed.blocked ? null : processed.line;
      }).filter(Boolean);
      
      finalCandidates = validatedCandidates.length > 0 ? validatedCandidates : phraseCandidatesList;
      
      // Mark all as local padding
      finalCandidates.forEach(line => localPadding.add(line));
      
      picked = finalCandidates[0];
      usedFallback = true;
      reason = candidateResults.find(c => c.reason)?.reason || 'Local placeholder (content filtered)';
    }
  }
  
    // Save last used model for UI tracking
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('last_text_model', modelUsed);
    }
    
    // Final 4-lane compliance check
    const finalQualityCheck = validateFourLaneOutput(
      finalCandidates, 
      inputs.tags || [], 
      inputs.tone,
      inputs.category,
      inputs.subcategory
    );

    return {
    candidates: finalCandidates,
    picked,
    audit: {
      model: modelUsed,
      modelDisplayName: MODEL_DISPLAY_NAMES[modelUsed] || modelUsed,
      textSpeed: apiMeta?.textSpeed || 'fast',
      usedFallback,
      blockedCount,
      candidateCount: finalCandidates.length,
      reason,
      retryAttempt,
      originalModel,
      originalModelDisplayName: originalModel ? MODEL_DISPLAY_NAMES[originalModel] || originalModel : undefined,
      spellingFiltered,
      topUpUsed
    }
  };
}

export async function generateFinalLine(inputs: VibeInputs): Promise<string> {
  const result = await generateCandidates(inputs, 4);
  return result.picked;
}