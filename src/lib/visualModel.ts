import { openAIService } from './openai';
import { SYSTEM_PROMPTS, buildVisualGeneratorMessages, getStyleKeywords, getEffectiveConfig, isTemperatureSupported, getSmartFallbackChain, MODEL_DISPLAY_NAMES, BACKGROUND_PRESETS, getRuntimeOverrides, getContextualBans } from '../vibe-ai.config';
import { generateHeuristicVisuals } from './visualHeuristics';
import { generateVisualPrompts } from './visualPromptGenerator';

export interface VisualInputs {
  category: string;
  subcategory: string;
  tone: string;
  tags: string[];
  visualStyle?: string;
  finalLine?: string;
  specificEntity?: string; // For personas like "Teresa Giudice"
  subjectOption?: string; // single-person, multiple-people, no-subject
  subjectDescription?: string; // custom description for manual entry
  dimensions?: string; // square, 4:5, 9:16, etc.
  targetSlot?: string; // background-only, subject+background, object, singing
  backgroundPreset?: string; // minimal, urban, nature, etc.
  typographyStyle?: string; // Typography layout style
}

export interface VisualOption {
  subject: string;
  background: string;
  prompt: string;
  slot?: string;
  textAligned?: boolean;
  subcategoryAligned?: boolean;
}

export interface VisualResult {
  options: VisualOption[];
  model: string;
  modelDisplayName?: string;
  errorCode?: 'timeout' | 'unauthorized' | 'network' | 'parse_error' | 'FAST_TIMEOUT' | 'STRICT_MODE_FAILED';
  fallbackReason?: string;
  _debug?: any;
}

const VISUAL_OPTIONS_COUNT = 4;

// No longer enforce specific slots - allow flexible recommendations

// Subcategory anchoring functions
function getSubcategoryAnchors(category: string, subcategory: string): string[] {
  const subcategoryMap: Record<string, string[]> = {
    'basketball': ['basketball', 'court', 'hoop', 'dribble', 'shot', 'arena'],
    'football': ['football', 'field', 'touchdown', 'helmet', 'stadium'],
    'soccer': ['soccer', 'ball', 'goal', 'field', 'kick'],
    'tennis': ['tennis', 'racket', 'court', 'serve', 'net'],
    'baseball': ['baseball', 'bat', 'diamond', 'pitcher', 'home plate'],
    'hockey': ['hockey', 'puck', 'rink', 'stick', 'goal'],
    'golf': ['golf', 'club', 'ball', 'course', 'tee'],
    'volleyball': ['volleyball', 'net', 'spike', 'court', 'serve'],
    'swimming': ['pool', 'lanes', 'swimmer', 'goggles', 'stroke'],
    'running': ['track', 'runner', 'finish line', 'marathon', 'sprint'],
    'birthday': ['cake', 'candles', 'balloons', 'party', 'celebration'],
    'christmas': ['tree', 'presents', 'ornaments', 'lights', 'santa'],
    'wedding': ['rings', 'dress', 'flowers', 'ceremony', 'altar']
  };
  
  return subcategoryMap[subcategory.toLowerCase()] || [];
}

function computeSubcategoryAlignmentScore(option: VisualOption, subcategory: string): number {
  if (!subcategory || subcategory === '-') return 0;
  
  const anchors = getSubcategoryAnchors('', subcategory);
  if (anchors.length === 0) return 0;
  
  const fullText = `${option.subject || ''} ${option.background || ''} ${option.prompt}`.toLowerCase();
  let score = 0;
  
  anchors.forEach(anchor => {
    if (fullText.includes(anchor.toLowerCase())) {
      score += 2;
    }
  });
  
  return score;
}

// Auto-enrichment functions
// Halloween context detection
function isHalloweenContext(inputs: VisualInputs): boolean {
  const halloweenKeywords = ['halloween', 'costume', 'pumpkin', 'spooky', 'witch', 'ghost', 'bats', 'cobweb', 'candy', 'jack-o-lantern', 'trick-or-treat', 'october', 'haunted'];
  
  const checkText = [
    inputs.subcategory?.toLowerCase() || '',
    inputs.finalLine?.toLowerCase() || '',
    ...(inputs.tags?.map(t => t.toLowerCase()) || [])
  ].join(' ');
  
  return halloweenKeywords.some(keyword => checkText.includes(keyword));
}

function autoEnrichInputs(inputs: VisualInputs): VisualInputs {
  const enriched = { ...inputs };
  
  // Derive design cues from context instead of user tags
  const designCues = deriveDesignCues(inputs);
  enriched.tags = [...designCues].slice(0, 8);
  
  // Add typography-aware zone - enforced for all styles
  if (!enriched.tags.some(tag => tag.includes('TEXT_SAFE_ZONE'))) {
    const dynamicZone = inputs.typographyStyle === 'subtle-caption' 
      ? '[TEXT_SAFE_ZONE: corner] [MAX_TEXT_AREA: 5%] [SIZE: small]'
      : inputs.typographyStyle === 'badge-sticker'
      ? '[TEXT_SAFE_ZONE: badge corner] [SIZE: small-medium]'
      : '[TEXT_SAFE_ZONE: natural empty area]';
    
    enriched.tags = [...enriched.tags, dynamicZone].slice(0, 8);
  }
  
  return enriched;
}

function deriveDesignCues(inputs: VisualInputs): string[] {
  const cues: string[] = [];
  
  // 1. Derive from subcategory context (not literal words)
  if (inputs.subcategory && inputs.subcategory !== '-') {
    const subcategoryCues = getSubcategoryDesignCues(inputs.subcategory);
    cues.push(...subcategoryCues);
  }
  
  // 2. Derive from tone atmosphere
  const toneAtmosphere = getToneAtmosphere(inputs.tone);
  cues.push(...toneAtmosphere);
  
  // 3. Extract meaningful visual concepts from text (not proper names)
  if (inputs.finalLine) {
    const visualConcepts = extractVisualConcepts(inputs.finalLine);
    cues.push(...visualConcepts);
  }
  
  // 4. Remove duplicate and filter out proper names/fluff
  return sanitizeDesignCues(cues).slice(0, 6);
}

function getSubcategoryDesignCues(subcategory: string): string[] {
  const cueMap: Record<string, string[]> = {
    'baby shower': ['pastels', 'gentle lighting', 'celebration', 'party setup'],
    'birthday': ['celebration', 'party atmosphere', 'festive'],
    'wedding': ['elegant', 'romantic lighting', 'ceremony'],
    'halloween': ['spooky atmosphere', 'orange lighting', 'autumn'],
    'christmas': ['warm lighting', 'festive', 'cozy'],
    'basketball': ['athletic', 'court setting', 'sports energy'],
    'football': ['stadium atmosphere', 'competitive energy'],
    'default': ['modern', 'clean composition']
  };
  
  return cueMap[subcategory.toLowerCase()] || cueMap['default'];
}

function getToneAtmosphere(tone: string): string[] {
  const atmosphereMap: Record<string, string[]> = {
    'humorous': ['playful mood', 'bright atmosphere'],
    'sentimental': ['warm lighting', 'soft atmosphere'],
    'savage': ['bold contrast', 'dramatic lighting'],
    'nostalgic': ['warm tones', 'vintage atmosphere'],
    'romantic': ['soft lighting', 'intimate setting'],
    'inspirational': ['uplifting atmosphere', 'bright energy'],
    'playful': ['vibrant colors', 'fun atmosphere'],
    'serious': ['professional lighting', 'clean composition']
  };
  
  return atmosphereMap[tone.toLowerCase()] || ['balanced atmosphere'];
}

function extractVisualConcepts(text: string): string[] {
  const lowerText = text.toLowerCase();
  const concepts: string[] = [];
  
  // Extract specific visual themes (not names or adjectives)
  if (lowerText.includes('gay') || lowerText.includes('came out')) {
    concepts.push('pride celebration', 'rainbow accents');
  }
  if (lowerText.includes('drag') || lowerText.includes('queens')) {
    concepts.push('performance stage', 'dramatic makeup');
  }
  if (lowerText.includes('oscar') || lowerText.includes('documentary')) {
    concepts.push('film poster', 'award ceremony');
  }
  if (lowerText.includes('cross') && lowerText.includes('dress')) {
    concepts.push('wardrobe setting', 'mirror scene');
  }
  
  return concepts;
}

function sanitizeDesignCues(cues: string[]): string[] {
  const properNamesPattern = /\b[A-Z][a-z]+\b/; // Basic proper name detection
  const fluffWords = ['amazing', 'great', 'awesome', 'nice', 'good', 'bad', 'beautiful'];
  
  return cues
    .filter(cue => !properNamesPattern.test(cue)) // Remove proper names
    .filter(cue => !fluffWords.some(fluff => cue.toLowerCase().includes(fluff))) // Remove fluff
    .filter((cue, index, self) => self.indexOf(cue) === index); // Remove duplicates
}

function extractNounsFromText(text: string): string[] {
  // Simple noun extraction - filter common words and keep substantive terms
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2);
  
  const commonWords = new Set(['the', 'and', 'but', 'for', 'are', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use']);
  
  return words
    .filter(word => !commonWords.has(word))
    .slice(0, 3); // Max 3 extracted nouns
}

function getCategorySpecificTags(category: string, subcategory: string): string[] {
  const celebrationMap: Record<string, string[]> = {
    'birthday': ['cake', 'candles', 'balloons'],
    'christmas-day': ['tree', 'gifts', 'ornaments'],
    'halloween': ['pumpkin', 'costume', 'spooky'],
    'wedding': ['rings', 'flowers', 'celebration'],
    'default': ['party', 'festive', 'celebration']
  };
  
  const categoryMap: Record<string, string[] | Record<string, string[]>> = {
    'celebrations': celebrationMap,
    'sports': ['athletic', 'competition', 'energy'],
    'daily-life': ['routine', 'casual', 'everyday'],
    'pop-culture': ['trendy', 'iconic', 'reference'],
    'default': ['modern', 'creative']
  };
  
  if (categoryMap[category]) {
    if (typeof categoryMap[category] === 'object' && !Array.isArray(categoryMap[category])) {
      const subMap = categoryMap[category] as Record<string, string[]>;
      return subMap[subcategory] || subMap['default'] || ['modern', 'creative'];
    }
    if (Array.isArray(categoryMap[category])) {
      return categoryMap[category] as string[];
    }
  }
  
  return categoryMap['default'] as string[];
}

// Validation functions
function hasVagueFillers(text: string): boolean {
  const vaguePatterns = [
    /something\s+like/i,
    /\belements?\b/i,
    /\bgeneral\b/i,
    /\bvarious\b/i,
    /\bsome\s+kind/i,
    /\btypes?\s+of/i,
    /\bmight\s+show/i,
    /\bcould\s+include/i
  ];
  
  return vaguePatterns.some(pattern => pattern.test(text));
}

function getSemanticKeywords(text: string): string[] {
  // Map concepts to semantic synonyms for better matching
  const semanticMap: Record<string, string[]> = {
    'gay': ['queer', 'lgbtq', 'homosexual', 'same-sex', 'pride'],
    'came out': ['coming out', 'revealed', 'disclosed'],
    'boyfriend': ['partner', 'male partner', 'husband'],
    'drag': ['queens', 'performers', 'costume', 'fabulous'],
    'rainbow': ['pride flag', 'colorful', 'spectrum'],
    'cross': ['dress', 'dressing', 'wardrobe'],
    'oscar': ['award', 'trophy', 'documentary', 'film'],
    'parade': ['march', 'celebration', 'festival']
  };
  
  const keywords = new Set<string>();
  const lowerText = text.toLowerCase();
  
  // Add direct matches
  const directWords = extractKeywordsFromText(text);
  directWords.forEach(word => keywords.add(word));
  
  // Add semantic matches
  for (const [concept, synonyms] of Object.entries(semanticMap)) {
    if (lowerText.includes(concept)) {
      synonyms.forEach(synonym => keywords.add(synonym));
    }
  }
  
  return Array.from(keywords).slice(0, 12);
}

function extractKeywordsFromText(text: string): string[] {
  // Extract meaningful keywords from the user's text
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2);
  
  const stopWords = new Set(['the', 'and', 'but', 'for', 'are', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use', 'any', 'win', 'best', 'would', 'could']);
  
  return words
    .filter(word => !stopWords.has(word))
    .slice(0, 8); // Extract up to 8 keywords
}

function computeTextAlignmentScore(option: VisualOption, finalLine: string): number {
  if (!finalLine) return 0;
  
  const semanticKeywords = getSemanticKeywords(finalLine);
  const fullText = `${option.subject || ''} ${option.background || ''} ${option.prompt}`.toLowerCase();
  const lowerFinalLine = finalLine.toLowerCase();
  
  let score = 0;
  let reasons = [];
  
  // Check for semantic keyword matches (weighted heavily)
  semanticKeywords.forEach(keyword => {
    if (fullText.includes(keyword.toLowerCase())) {
      score += 3;
      reasons.push(`keyword: ${keyword}`);
    }
  });
  
  // Enhanced LGBTQ+ semantic matching
  const lgbtqPhrases = ['came out', 'coming out', 'gay', 'queer', 'lgbt', 'lgbtq', 'pride', 'boyfriend', 'husband', 'male partner', 'same-sex', 'two men', 'drag', 'drag queens'];
  const lgbtqVisualCues = ['rainbow', 'pride flag', 'two men', 'couple', 'holding hands', 'parade', 'drag', 'fabulous', 'wardrobe', 'mirror', 'makeup'];
  
  if (lgbtqPhrases.some(phrase => lowerFinalLine.includes(phrase))) {
    lgbtqVisualCues.forEach(cue => {
      if (fullText.includes(cue)) {
        score += 4;
        reasons.push(`LGBTQ+ cue: ${cue}`);
      }
    });
  }
  
  // Award/Documentary semantic matching
  if (lowerFinalLine.includes('oscar') || lowerFinalLine.includes('award') || lowerFinalLine.includes('documentary')) {
    const awardCues = ['award', 'trophy', 'poster', 'film', 'documentary', 'oscar', 'silhouette'];
    awardCues.forEach(cue => {
      if (fullText.includes(cue)) {
        score += 3;
        reasons.push(`award cue: ${cue}`);
      }
    });
  }
  
  // Cross-dressing theme enhancement
  if (lowerFinalLine.includes('cross') || lowerFinalLine.includes('dress')) {
    const dressingCues = ['dress', 'wardrobe', 'mirror', 'heels', 'lipstick', 'makeup', 'blazer'];
    dressingCues.forEach(cue => {
      if (fullText.includes(cue)) {
        score += 3;
        reasons.push(`dressing cue: ${cue}`);
      }
    });
  }
  
  // Penalize unrelated gag props
  const gagProps = ['potato', 'chicken', 'rubber', 'banana', 'whoopee', 'gnome'];
  gagProps.forEach(prop => {
    if (fullText.includes(prop) && !lowerFinalLine.includes(prop)) {
      score -= 2;
      reasons.push(`-gag prop: ${prop}`);
    }
  });
  
  console.log(`🎯 Alignment score for "${option.subject?.substring(0, 30)}...": ${score} (${reasons.join(', ')})`);
  return Math.max(0, score);
}

function validateVisualOptions(options: VisualOption[], inputs: VisualInputs): VisualOption[] {
  if (!options || options.length === 0) return [];
  
  // Get contextual bans to filter out opposite meanings
  const contextualBans = getContextualBans(inputs);
  
  // Enhanced validation with subcategory alignment and banned word filtering
  const preprocessed = options.filter(option => {
    if (!option || (!option.subject && !option.background && !option.prompt)) {
      return false;
    }
    
    // Check for banned words that create opposite meanings
    const fullText = `${option.subject || ''} ${option.background || ''} ${option.prompt}`.toLowerCase();
    const containsBannedWord = contextualBans.some(banned => 
      fullText.includes(banned.toLowerCase())
    );
    
    if (containsBannedWord) {
      const foundBan = contextualBans.find(banned => fullText.includes(banned.toLowerCase()));
      console.log(`🚫 Rejecting option with banned word "${foundBan}": ${option.subject?.substring(0, 50)}...`);
      return false;
    }
    
    // Require subcategory alignment for sports and other relevant categories
    if (inputs.subcategory) {
      const subcategoryScore = computeSubcategoryAlignmentScore(option, inputs.subcategory);
      option.subcategoryAligned = subcategoryScore > 0;
      
      // For sports categories, be more strict about domain relevance
      if (inputs.category === 'sports') {
        // For basketball specifically, enforce strict anchoring
        if (inputs.subcategory.toLowerCase() === 'basketball') {
          const anchors = getSubcategoryAnchors('', 'basketball');
          const hasBasketballAnchor = anchors.some(anchor => fullText.includes(anchor.toLowerCase()));
          
          if (!hasBasketballAnchor) {
            console.log(`🏀 Rejecting non-basketball option: ${option.subject?.substring(0, 50)}...`);
            return false;
          }
        }
        
        // For hockey, ensure hockey-specific content
        if (inputs.subcategory.toLowerCase().includes('hockey')) {
          const hockeyAnchors = ['hockey', 'puck', 'stick', 'rink', 'ice'];
          const hasHockeyAnchor = hockeyAnchors.some(anchor => fullText.includes(anchor));
          
          if (!hasHockeyAnchor) {
            console.log(`🏒 Rejecting non-hockey option: ${option.subject?.substring(0, 50)}...`);
            return false;
          }
        }
      }
    }
    
    return true;
  });
  
  // Enhanced validation for subtle-caption - ensure small, corner placement
  let subtleCaptionFiltered = preprocessed;
  if (inputs.typographyStyle === 'subtle-caption') {
    subtleCaptionFiltered = preprocessed.filter(option => {
      const prompt = option.prompt.toLowerCase();
      const background = option.background.toLowerCase();
      const subject = option.subject?.toLowerCase() || '';
      
      // Block options that suggest large, center, or prominent text placement
      const blockedIndicators = [
        'large text', 'big text', 'prominent text', 'bold text', 'massive text',
        'center', 'centered', 'middle', 'main focus', 'dominant', 'primary focus',
        'billboard', 'banner', 'headline', 'title card', 'hero text', 'huge text',
        'covers', 'overlays', 'spans across', 'fills', 'takes up', 'dominates'
      ];
      
      const hasBlockedContent = blockedIndicators.some(indicator => 
        prompt.includes(indicator) || background.includes(indicator) || subject.includes(indicator)
      );
      
      if (hasBlockedContent) {
        console.log(`❌ Filtered large text concept for subtle-caption: ${option.prompt}`);
        return false;
      }
      
      return true;
    });
    
    // If all options were filtered out, create guaranteed small caption fallback
    if (subtleCaptionFiltered.length === 0) {
      console.log('⚠️ All options filtered for subtle-caption, using guaranteed small fallback');
      subtleCaptionFiltered = [{
        subject: 'simple scene with open corner space',
        background: 'clean minimal background with clear corner area', 
        prompt: 'simple composition designed for small corner text, minimal elements, corner text space guaranteed',
        subcategoryAligned: false,
        textAligned: false
      }];
    }
  }
  
  const validOptions = subtleCaptionFiltered.filter(opt => {
    // Reject if prompt is too short or vague
    if (!opt.prompt || opt.prompt.length < 15) {
      console.log(`Rejecting option with short prompt: ${opt.prompt}`);
      return false;
    }
    
    // Check for vague or filler content
    if (hasVagueFillers(opt.prompt)) {
      console.log(`Rejecting option with vague content: ${opt.prompt}`);
      return false;
    }
    
    // Filter out music/singing content unless relevant tags present
    const hasMusicTags = inputs.tags?.some(tag => 
      ['music', 'singing', 'song', 'concert', 'performance', 'karaoke', 'band', 'choir'].includes(tag.toLowerCase())
    ) || false;
    
    if (!hasMusicTags) {
      const musicKeywords = ['singing', 'song', 'music', 'concert', 'performance', 'karaoke', 'band', 'choir', 'microphone', 'stage'];
      const containsMusic = musicKeywords.some(keyword => 
        opt.subject?.toLowerCase().includes(keyword) || 
        opt.background?.toLowerCase().includes(keyword) ||
        opt.prompt.toLowerCase().includes(keyword)
      );
      
      if (containsMusic) {
        console.log(`Rejecting music content without music tags: ${opt.prompt}`);
        return false;
      }
    }
    
    return true;
  });
  
  // Strong deduplication by subject + background combination + prompt start
  const dedupedOptions: VisualOption[] = [];
  const seenCombos = new Set<string>();
  
  for (const opt of validOptions) {
    const dedupeKey = `${opt.subject?.toLowerCase() || ''}-${opt.background?.toLowerCase() || ''}-${opt.prompt.slice(0, 40)}`;
    if (!seenCombos.has(dedupeKey)) {
      seenCombos.add(dedupeKey);
      dedupedOptions.push(opt);
    }
  }
  
  // CRITICAL: Ensure we have exactly 4 valid options by being more lenient if needed
  if (dedupedOptions.length < 4) {
    console.log(`⚠️ Only ${dedupedOptions.length} valid options found, need 4 - loosening validation`);
    
    // Reprocess with looser validation
    const looserOptions = options.filter(option => {
      if (!option || (!option.subject && !option.background && !option.prompt)) {
        return false;
      }
      
      // Still check for banned words (this is critical)
      const fullText = `${option.subject || ''} ${option.background || ''} ${option.prompt}`.toLowerCase();
      const containsBannedWord = contextualBans.some(banned => 
        fullText.includes(banned.toLowerCase())
      );
      
      return !containsBannedWord && !hasVagueFillers(option.prompt);
    });
    
    // Merge with stricter options
    const mergedOptions = [...dedupedOptions];
    for (const opt of looserOptions) {
      if (mergedOptions.length >= 4) break;
      const dedupeKey = `${opt.subject?.toLowerCase() || ''}-${opt.background?.toLowerCase() || ''}-${opt.prompt.slice(0, 40)}`;
      const alreadyExists = mergedOptions.some(existing => 
        `${existing.subject?.toLowerCase() || ''}-${existing.background?.toLowerCase() || ''}-${existing.prompt.slice(0, 40)}` === dedupeKey
      );
      
      if (!alreadyExists) {
        mergedOptions.push(opt);
      }
    }
    
    return mergedOptions.slice(0, 4);
  }
  
  // Compute text alignment scores and reorder
  if (inputs.finalLine) {
    const optionsWithScores = dedupedOptions.map(opt => ({
      option: opt,
      score: computeTextAlignmentScore(opt, inputs.finalLine!)
    }));
    
    console.log('📊 Text alignment scores:', optionsWithScores.map(item => ({
      subject: item.option.subject?.substring(0, 40) + '...',
      score: item.score
    })));
    
    // Sort by score (descending)
    optionsWithScores.sort((a, b) => b.score - a.score);
    
    // Add alignment indicators
    const reorderedOptions = optionsWithScores.map(item => ({
      ...item.option,
      textAligned: item.score >= 3
    }));
    
    return reorderedOptions.slice(0, 4);
  }
  
  return dedupedOptions.slice(0, 4); // Ensure max 4 options
}

function getSlotBasedFallbacks(inputs: VisualInputs): VisualOption[] {
  const { category, subcategory, tone, tags, visualStyle, finalLine, specificEntity, subjectOption, dimensions } = inputs;
  const primaryTags = tags.slice(0, 3).join(', ') || 'dynamic energy';
  const occasion = subcategory || 'general';
  
  // Get contextual bans to avoid opposite meanings in fallbacks
  const contextualBans = getContextualBans(inputs);
  const negativeBans = contextualBans.length > 0 ? `, NO ${contextualBans.join(', ')}` : '';
  
  // Halloween-specific fallbacks when context detected
  if (isHalloweenContext(inputs)) {
    console.log('🎃 Halloween context detected - generating Halloween-themed fallbacks');
    
    const halloweenFallbacks: VisualOption[] = [];
    const lowerFinalLine = finalLine?.toLowerCase() || '';
    
    // Always include a background-only Halloween option
    halloweenFallbacks.push({
      subject: "moody Halloween backdrop with no people",
      background: "moonlit pumpkins, candles, soft fog, subtle cobwebs",
      prompt: `Moody Halloween scene with moonlit pumpkins, flickering candles, soft fog, and subtle cobwebs creating atmospheric lighting - clean negative space in the center for text, no people or faces [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: auto] [NEGATIVE_PROMPT: people, faces, ${contextualBans.join(', ')}] [TEXT_HINT: light text]`,
      textAligned: true
    });
    
    // LGBTQ+ Halloween party scene if relevant
    const lgbtqPhrases = ['gay', 'queer', 'lgbt', 'lgbtq', 'pride', 'came out', 'coming out', 'boyfriend', 'drag'];
    if (lgbtqPhrases.some(phrase => lowerFinalLine.includes(phrase))) {
      halloweenFallbacks.push({
        subject: "male couple in Halloween costumes with subtle rainbow accents",
        background: "house party with pumpkins and warm lights",
        prompt: `Male couple in creative Halloween costumes at a house party, subtle rainbow pride accents mixed with pumpkins and warm Halloween lighting, open lower-third area for text placement [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: lower third] [CONTRAST_PLAN: auto] [NEGATIVE_PROMPT: ${contextualBans.join(', ')}] [TEXT_HINT: light text]`,
        textAligned: true
      });
      
      halloweenFallbacks.push({
        subject: "costume prep scene with wardrobe and Halloween masks",
        background: "dressing room with Halloween makeup and accessories",
        prompt: `Halloween costume preparation at a mirror - makeup, masks, and fabric swatches, tasteful nod to cross-dressing with Halloween theme, side text-safe zone [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: sides] [CONTRAST_PLAN: auto] [NEGATIVE_PROMPT: ${contextualBans.join(', ')}] [TEXT_HINT: dark text]`,
        textAligned: true
      });
    } else {
      // General Halloween couple/party scene
      halloweenFallbacks.push({
        subject: "people in creative Halloween costumes",
        background: "festive Halloween party setting",
        prompt: `Group of people in creative Halloween costumes at a festive party, pumpkins and decorations, warm party lighting with clear text area [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: upper third] [CONTRAST_PLAN: auto] [NEGATIVE_PROMPT: ${contextualBans.join(', ')}] [TEXT_HINT: light text]`,
        textAligned: true
      });
      
      halloweenFallbacks.push({
        subject: "Halloween decorations and costume accessories",
        background: "spooky yet inviting Halloween setup",
        prompt: `Halloween decorations with costume accessories and masks arranged artistically, spooky yet inviting atmosphere, clear negative space for text [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: auto] [NEGATIVE_PROMPT: people, ${contextualBans.join(', ')}] [TEXT_HINT: dark text]`,
        textAligned: true
      });
    }
    
    // "Different but related" non-Halloween option as 4th
    if (lgbtqPhrases.some(phrase => lowerFinalLine.includes(phrase))) {
      halloweenFallbacks.push({
        subject: "documentary-style poster motif with subtle rainbow accent",
        background: "clean professional backdrop",
        prompt: `Documentary-style poster motif with subtle rainbow accent and clean central space, professional modern composition, not Halloween-specific but aligned with pride themes [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: auto] [NEGATIVE_PROMPT: ${contextualBans.join(', ')}] [TEXT_HINT: dark text]`,
        textAligned: true
      });
    } else {
      halloweenFallbacks.push({
        subject: "autumnal scene with warm colors",
        background: "cozy fall setting",
        prompt: `Warm autumnal scene with fall colors and cozy atmosphere, not Halloween-specific but seasonally relevant [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: auto] [NEGATIVE_PROMPT: ${contextualBans.join(', ')}] [TEXT_HINT: dark text]`,
        textAligned: true
      });
    }
    
    return halloweenFallbacks.slice(0, 4);
  }
  
  // Enhanced text-aware fallbacks if finalLine exists
  if (finalLine) {
    const semanticKeywords = getSemanticKeywords(finalLine);
    console.log('🎯 Generating text-aware fallbacks for semantic keywords:', semanticKeywords);
    console.log('📝 Detected LGBTQ+ cues:', finalLine.toLowerCase().match(/(gay|queer|lgbt|lgbtq|pride|came out|coming out|boyfriend|drag)/gi) || 'none');
    console.log('📝 Detected award cues:', finalLine.toLowerCase().match(/(oscar|award|documentary)/gi) || 'none');
    console.log('🚫 Contextual bans applied:', contextualBans);
    
    const textAwareFallbacks: VisualOption[] = [];
    const lowerFinalLine = finalLine.toLowerCase();
    
    // Documentary/Award theme fallback
    if (lowerFinalLine.includes('oscar') || lowerFinalLine.includes('award') || lowerFinalLine.includes('documentary')) {
      textAwareFallbacks.push({
        subject: "Documentary poster motif with Oscar silhouette and subtle rainbow accents",
        background: "Realistic studio or festival wall with soft vignette and empty central space",
        prompt: `Documentary-style poster concept featuring an Oscar silhouette and subtle rainbow accents, realistic modern composition with clean central negative space for large text [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: ${inputs.typographyStyle === 'subtle-caption' ? 'corner small 5%' : 'center 60x35'}] [CONTRAST_PLAN: auto] [NEGATIVE_PROMPT: ${contextualBans.join(', ')}] [TEXT_HINT: dark text]`,
        textAligned: true
      });
    }
    
    // Enhanced LGBTQ+/Pride theme fallbacks
    const lgbtqPhrases = ['gay', 'queer', 'lgbt', 'lgbtq', 'pride', 'came out', 'coming out', 'boyfriend', 'drag'];
    if (lgbtqPhrases.some(phrase => lowerFinalLine.includes(phrase))) {
      textAwareFallbacks.push({
        subject: "Male couple holding hands with subtle rainbow pride accents",
        background: "Urban setting or park with soft natural lighting and clear text space",
        prompt: `Two men holding hands or embracing, subtle rainbow pride flag accents in background, warm natural lighting, urban or park setting with clear negative space for text [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: ${inputs.typographyStyle === 'subtle-caption' ? 'corner small 5%' : 'center 60x35'}] [CONTRAST_PLAN: auto] [NEGATIVE_PROMPT: ${contextualBans.join(', ')}] [TEXT_HINT: dark text]`,
        textAligned: true
      });
      
      textAwareFallbacks.push({
        subject: "Wardrobe and mirror scene with cross-dressing elements and rainbow accents",
        background: "Clean dressing room with soft lighting, leaving open area for text",
        prompt: `Realistic dressing room scene with tasteful wardrobe cues (heels, blazer-over-dress on hanger, lipstick on vanity), subtle rainbow color accents, uncluttered background with clear negative space for text [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: ${inputs.typographyStyle === 'subtle-caption' ? 'corner small 5%' : 'center 60x35'}] [CONTRAST_PLAN: auto] [TEXT_HINT: dark text]`,
        textAligned: true
      });
    }
    
    // Cross-dressing specific fallback
    if (lowerFinalLine.includes('cross') && !textAwareFallbacks.some(f => f.subject.includes('Wardrobe'))) {
      textAwareFallbacks.push({
        subject: "Elegant wardrobe with mixed clothing styles and mirror reflection",
        background: "Sophisticated dressing room with warm lighting",
        prompt: `Elegant wardrobe with mix of masculine and feminine clothing, mirror with soft reflection, sophisticated dressing room atmosphere, warm lighting with clear text placement area [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: ${inputs.typographyStyle === 'subtle-caption' ? 'corner small 5%' : 'center 60x35'}] [CONTRAST_PLAN: auto] [TEXT_HINT: dark text]`,
        textAligned: true
      });
    }
    
    if (textAwareFallbacks.length > 0) {
      return textAwareFallbacks.concat(getDefaultFallbacks(inputs)).slice(0, 4);
    }
  }
  
  return getDefaultFallbacks(inputs);
}

function buildAnchoredVisualFallbacks(inputs: VisualInputs): VisualOption[] {
  const { category, subcategory, tone, tags } = inputs;
  
  // Basketball-specific fallbacks
  if (subcategory.toLowerCase() === 'basketball') {
    return [
      {
        subject: "Basketball player mid-shot with ball in motion",
        background: "Basketball court with hoop and arena lighting",
        prompt: `Dynamic basketball player shooting the ball toward hoop, sports arena with dramatic lighting, ${tone} energy, basketball court setting with clear text space at top [BASKETBALL ANCHORS: player, ball, hoop, court] [TEXT_SAFE_ZONE: upper third] [CONTRAST_PLAN: auto]`,
        subcategoryAligned: true
      },
      {
        subject: "Close-up of basketball and hoop from court level",
        background: "Basketball court with arena stands",
        prompt: `Close-up basketball and hoop from ground perspective, pristine court surface, arena stands in background, ${tone} mood, sports photography [BASKETBALL ANCHORS: basketball, hoop, court] [TEXT_SAFE_ZONE: center] [CONTRAST_PLAN: auto]`,
        subcategoryAligned: true
      },
      {
        subject: "Basketball team celebration after game-winning shot",
        background: "Basketball arena with cheering crowd",
        prompt: `Basketball team players celebrating victory, multiple basketballs visible, arena setting with crowd, ${tone} celebration energy [BASKETBALL ANCHORS: team, arena, basketballs] [TEXT_SAFE_ZONE: sides] [CONTRAST_PLAN: auto]`,
        subcategoryAligned: true
      },
      {
        subject: "Basketball court from above with game elements",
        background: "Arena lighting and court markings",
        prompt: `Basketball court aerial view with game elements, court lines and basketball visible, arena lighting, ${tone} style [BASKETBALL ANCHORS: court, basketball, arena] [TEXT_SAFE_ZONE: corners] [CONTRAST_PLAN: auto]`,
        subcategoryAligned: true
      }
    ];
  }
  
  return [];
}

function getDefaultFallbacks(inputs: VisualInputs): VisualOption[] {
  const { category, subcategory, tone, tags, visualStyle, finalLine, specificEntity, subjectOption, dimensions } = inputs;
  const primaryTags = tags.slice(0, 3).join(', ') || 'dynamic energy';
  const occasion = subcategory || 'general';
  
  // Check for anchored fallbacks first
  const anchoredFallbacks = buildAnchoredVisualFallbacks(inputs);
  if (anchoredFallbacks.length > 0) {
    return anchoredFallbacks;
  }
  
  // Special handling for Ice Hockey with required objects
  if (subcategory === 'Ice Hockey') {
    return [
      {
        subject: "Professional hockey player with stick in action pose",
        background: "ice rink arena with dramatic lighting and crowd in background",
        prompt: `Professional hockey player mid-swing with hockey stick, puck visible in frame, ${tone} energy, ice rink arena with dramatic stadium lighting, cheering crowd in blurred background, action sports photography style, dynamic composition with negative space in upper area for text placement, high contrast lighting`
      },
      {
        subject: "Close-up of hockey stick and puck on ice surface",
        background: "ice rink with goal net and arena lights",
        prompt: `Detailed close-up of professional hockey stick and black puck on pristine ice surface, goal net visible in background, ice rink arena lighting creating dramatic shadows, ${tone} mood, sports equipment photography, clean composition with clear space at top for text, reflective ice surface`
      },
      {
        subject: "Hockey team celebration with sticks raised",
        background: "ice rink with victory lighting and cheering fans",
        prompt: `Hockey team players celebrating victory with sticks raised high, multiple hockey sticks visible, ice rink setting with bright victory lighting, cheering fans in background stands, ${tone} celebration energy, group sports photography, wide shot with space on sides for text placement`
      },
      {
        subject: "Vintage hockey stick and puck with championship trophies",
        background: "classic ice rink with warm nostalgic lighting",
        prompt: `Vintage wooden hockey stick and classic puck displayed with championship trophies, classic ice rink environment with warm nostalgic lighting, ${tone} sentimental mood, still life sports photography, traditional composition with clear background space for text overlay`
      }
    ];
  }
  const entity = specificEntity || 'subject';
  
  // Dynamic synonym pools to avoid repetitive fallbacks
  const energyWords = ['explosive', 'dramatic', 'intense', 'vibrant', 'electrifying', 'captivating'];
  const sceneWords = ['scene', 'environment', 'atmosphere', 'setting', 'backdrop', 'landscape'];
  const randomEnergy = energyWords[Math.floor(Math.random() * energyWords.length)];
  const randomScene = sceneWords[Math.floor(Math.random() * sceneWords.length)];
  
  // Determine if we need people in the image based on tags or context
  const needsPeople = tags.some(tag => 
    tag.toLowerCase().includes('person') || 
    tag.toLowerCase().includes('people') || 
    tag.toLowerCase().includes('man') || 
    tag.toLowerCase().includes('woman') ||
    tag.toLowerCase().includes('group')
  );
  
  const peopleContext = needsPeople ? 
    (tags.find(tag => tag.toLowerCase().includes('group')) ? 'group of people' : 
     tags.find(tag => tag.toLowerCase().includes('woman')) ? 'woman' :
     tags.find(tag => tag.toLowerCase().includes('man')) ? 'man' : 'person') : '';
  
  // Create entity-aware fallbacks
  if (specificEntity && tags.some(tag => tag.toLowerCase().includes('jail'))) {
    return [
      {
        subject: "Prison bars texture overlay",
        background: `Dark jail cell background with dramatic ${tone} lighting`,
        prompt: `Dark jail cell background with prison bars, dramatic ${tone} lighting, no text or typography [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: dark] [NEGATIVE_PROMPT: busy patterns, high-frequency texture, harsh shadows in center] [ASPECTS: 1:1 base, crop-safe 4:5, 9:16] [TEXT_HINT: light text]`
      },
      {
        subject: `${entity}${needsPeople ? ` ${peopleContext}` : ''} silhouette behind bars`,
        background: `Prison setting with atmospheric lighting`,
        prompt: `${entity}${needsPeople ? ` ${peopleContext}` : ''} silhouette behind prison bars positioned on left third, dramatic jail setting, ${tone} mood lighting [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: auto] [NEGATIVE_PROMPT: faces crossing center, busy patterns in center] [ASPECTS: 1:1 base, crop-safe 4:5, 9:16] [TEXT_HINT: light text]`
      },
      {
        subject: "Handcuffs and judge gavel symbols",
        background: `Minimal courtroom or legal backdrop`,
        prompt: `Legal symbols like handcuffs and gavel anchored bottom third, minimal courtroom backdrop, ${tone} style [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: auto] [NEGATIVE_PROMPT: busy patterns, reflective glare in center] [ASPECTS: 1:1 base, crop-safe 4:5, 9:16] [TEXT_HINT: dark text]`
      },
      {
        subject: `${entity}${needsPeople ? ` ${peopleContext}` : ''} iconic moment reimagined`,
        background: `Stylized setting reflecting personality`,
        prompt: `${entity}${needsPeople ? ` ${peopleContext}` : ''} iconic moment with ${tone} interpretation positioned off-center, stylized background reflecting their known traits [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: auto] [NEGATIVE_PROMPT: limbs crossing center, harsh shadows in safe zone] [ASPECTS: 1:1 base, crop-safe 4:5, 9:16] [TEXT_HINT: light text]`
      }
    ];
  }
  
  return [
    {
      subject: `Clean ${tone} background environment`,
      background: `${randomEnergy.charAt(0).toUpperCase() + randomEnergy.slice(1)} ${tone} ${visualStyle || 'modern'} environment showcasing ${primaryTags}`,
      prompt: `${randomEnergy.charAt(0).toUpperCase() + randomEnergy.slice(1)} ${tone} ${visualStyle || 'modern'} environment showcasing ${primaryTags}, clean background with natural negative space for text [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: auto] [NEGATIVE_PROMPT: busy patterns, high-frequency texture, harsh shadows in center] [ASPECTS: 1:1 base, crop-safe 4:5, 9:16] [TEXT_HINT: dark text]`
    },
    {
      subject: `${needsPeople ? `${peopleContext} immersed in ` : ''}Dynamic ${occasion} action scene`,
      background: `${randomEnergy.charAt(0).toUpperCase() + randomEnergy.slice(1)} ${tone} atmosphere with ${primaryTags}${needsPeople ? ' and visible crowd' : ''}`,
      prompt: `${needsPeople ? `${peopleContext} immersed in ` : ''}Dynamic ${occasion} action scene positioned on right third in ${randomEnergy} ${tone} atmosphere with ${primaryTags}${needsPeople ? ', multiple people clearly visible in background' : ''} [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: auto] [NEGATIVE_PROMPT: faces crossing center, busy patterns in center${needsPeople ? ', empty backgrounds' : ''}] [ASPECTS: 1:1 base, crop-safe 4:5, 9:16] [TEXT_HINT: light text]`
    },
    {
      subject: `${randomEnergy.charAt(0).toUpperCase() + randomEnergy.slice(1)} ${occasion} objects and symbols`,
      background: `Bold ${tone} ${randomScene} with ${primaryTags} accents`,
      prompt: `${randomEnergy.charAt(0).toUpperCase() + randomEnergy.slice(1)} ${occasion} objects and symbols anchored bottom third on bold ${tone} ${randomScene} with ${primaryTags} accents [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: auto] [NEGATIVE_PROMPT: reflective glare in center, busy patterns] [ASPECTS: 1:1 base, crop-safe 4:5, 9:16] [TEXT_HINT: dark text]`
    },
    {
      subject: `${needsPeople ? `${peopleContext} in` : 'Creative'} celebration atmosphere`,
      background: `Festive ${tone} environment with ${primaryTags} elements and vibrant colors`,
      prompt: `${needsPeople ? `${peopleContext} in` : 'Creative'} celebration atmosphere positioned off-center with festive ${tone} environment, ${primaryTags} elements, vibrant colors and party elements [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: auto] [NEGATIVE_PROMPT: limbs crossing center, harsh shadows in safe zone] [ASPECTS: 1:1 base, crop-safe 4:5, 9:16] [TEXT_HINT: light text]`
    }
  ];
}

// Text sanitization utility to clean up awkward flow
function sanitizeTags(tags: string[]): string[] {
  const fillerWords = ['just', 'really', 'very', 'like', 'maybe', 'kind of', 'sort of', 'basically', 'actually', 'literally'];
  return tags
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)
    .map(tag => {
      // Remove filler words at start/end
      let cleaned = tag;
      fillerWords.forEach(filler => {
        const regex = new RegExp(`\\b${filler}\\b`, 'gi');
        cleaned = cleaned.replace(regex, '').trim();
      });
      return cleaned;
    })
    .filter(tag => tag.length > 0);
}

// Post-process option text to improve flow and remove tag bleed
function postProcessOption(option: VisualOption): VisualOption {
  if (!option.subject && !option.background) return option;
  
  const processText = (text: string): string => {
    if (!text) return text;
    
    // Remove proper names and adjective bleed first
    let processed = removeNameAndAdjectiveBleed(text);
    
    // Fix common awkward endings
    processed = processed
      .replace(/\bjust\s*$/i, '')
      .replace(/\breally\s*$/i, '') 
      .replace(/\baccents\s*$/i, 'accents throughout')
      .replace(/\belements\s*$/i, 'elements featured')
      .replace(/\bcolors\s*$/i, 'vibrant colors')
      .trim();
    
    // Ensure it doesn't end with incomplete thoughts
    if (processed && !processed.match(/[.!?]$/)) {
      // Add contextual completion based on content
      if (processed.includes('atmosphere')) {
        processed += ' setting';
      } else if (processed.includes('background')) {
        processed += ' scene';
      } else if (processed.includes('elements')) {
        processed += ' featured';
      }
    }
    
    return processed;
  };
  
  return {
    ...option,
    subject: option.subject ? processText(option.subject) : option.subject,
    background: option.background ? processText(option.background) : option.background,
    prompt: option.prompt ? removeNameAndAdjectiveBleed(option.prompt) : option.prompt
  };
}

function removeNameAndAdjectiveBleed(text: string): string {
  // Remove common proper names that bleed through
  const namePatterns = [
    /\bAbby\b/gi,
    /\bJesse\b/gi,
    /\bMary\b/gi,
    /\bJohn\b/gi,
    /\bSarah\b/gi
  ];
  
  // Remove repetitive adjectives that add no visual value
  const fluffAdjectives = [
    /\bamazing\b/gi,
    /\bawesome\b/gi,
    /\bgreat\b/gi,
    /\bnice\b/gi,
    /\bbeautiful\b/gi,
    /\bwonderful\b/gi,
    /\bfantastic\b/gi
  ];
  
  let cleaned = text;
  
  // Remove name patterns
  namePatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  // Remove fluff adjectives
  fluffAdjectives.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  // Clean up extra spaces and normalize
  cleaned = cleaned
    .replace(/\s+/g, ' ')
    .replace(/^\s+|\s+$/g, '')
    .replace(/,\s*,/g, ',') // Remove double commas
    .replace(/,\s*$/, ''); // Remove trailing commas
  
  return cleaned;
}

export async function generateVisualRecommendations(
  inputs: VisualInputs,
  n: number = VISUAL_OPTIONS_COUNT
): Promise<VisualResult> {
  // Auto-enrich inputs before processing
  const enrichedInputs = autoEnrichInputs(inputs);
  const { category, subcategory, tone, tags, visualStyle, finalLine, specificEntity, subjectOption, dimensions } = enrichedInputs;
  
  // Use effective config (respecting user AI settings)
  const effectiveConfig = getEffectiveConfig();
  const { fastVisualsEnabled, strictModelEnabled } = getRuntimeOverrides();
  const targetModel = effectiveConfig.visual_generation.model;
  const targetTemperature = isTemperatureSupported(targetModel) ? effectiveConfig.generation.temperature : undefined;
  
  try {
    const startTime = Date.now();
    
    if (fastVisualsEnabled) {
      console.log('⚡ Fast visuals mode enabled - targeting 3-6s generation...');
      
      // Ultra-compact prompt for fast mode
      const fastPrompt = `${category}>${subcategory}, ${tone}. 4 visual JSON.`;
      const fastMessages = [
        { role: 'system', content: SYSTEM_PROMPTS.visual_generator_fast },
        { role: 'user', content: fastPrompt }
      ];
      
      // Strict timeout for fast mode
      const fastTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('FAST_TIMEOUT')), 8000); // 8s max, aligned with backend timeout
      });
      
      const fastRequestOptions: any = {
        max_completion_tokens: effectiveConfig.visual_generation.max_tokens, // 180 in fast mode
        model: targetModel
      };
      
      // Only add temperature for supported models
      if (isTemperatureSupported(targetModel)) {
        fastRequestOptions.temperature = targetTemperature || 0.7;
      }
      
      try {
        const result = await Promise.race([
          openAIService.chatJSON(fastMessages, fastRequestOptions),
          fastTimeoutPromise
        ]);
        
        console.log(`⚡ Fast visual generation completed in ${Date.now() - startTime}ms`);
        
        if (result?.options && Array.isArray(result.options)) {
          const visualOptions = result.options.slice(0, n);
          const polishedOptions = visualOptions.map(postProcessOption);
          const validatedOptions = validateVisualOptions(polishedOptions, enrichedInputs);
          
          // Merge fallbacks if we need more options
          if (validatedOptions.length < n) {
            const fallbacks = getSlotBasedFallbacks(enrichedInputs).slice(0, n - validatedOptions.length);
            validatedOptions.push(...fallbacks);
          }
          
          return {
            options: validatedOptions,
            model: targetModel,
            errorCode: undefined,
            _debug: { fastMode: true, responseTime: Date.now() - startTime }
          };
        }
      } catch (fastError) {
        console.log(`⚡ Fast mode failed in ${Date.now() - startTime}ms, falling through to normal generation`);
        // Fall through to normal generation instead of returning fallbacks immediately
      }
    }
    
    // Normal generation (either fast mode disabled or fast mode failed)
    console.log('🔄 Starting normal visual generation...');
    console.log(`🎨 Visual generation using model: ${targetModel}`);
    
    // Use centralized message builder for normal mode
    const messages = buildVisualGeneratorMessages(enrichedInputs);
    
    // Increased timeout for normal generation (was 15s, now 20s)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('NORMAL_TIMEOUT')), 20000);
    });

    // Primary attempt - use model from AI settings
    let result;
    const requestOptions: any = {
      max_completion_tokens: effectiveConfig.visual_generation.max_tokens,
      model: targetModel
    };
    
    // Only add temperature for supported models
    if (isTemperatureSupported(targetModel)) {
      requestOptions.temperature = targetTemperature || 0.7;
    }
    
    // Check if strict mode is enabled - only use the user's selected model  
    if (strictModelEnabled) {
      console.log(`🔒 Strict mode enabled - using only selected model: ${MODEL_DISPLAY_NAMES[targetModel] || targetModel}`);
      try {
        result = await Promise.race([
          openAIService.chatJSON(messages, requestOptions),
          timeoutPromise
        ]);
        console.log(`✅ Visual generation successful with ${MODEL_DISPLAY_NAMES[targetModel] || targetModel}`);
      } catch (strictError) {
        // Allow retry chain even in strict mode for timeout/parse errors
        if (strictError instanceof Error && (strictError.message.includes('timeout') || strictError.message.includes('TIMEOUT') || strictError.message.includes('JSON') || strictError.message.includes('parse'))) {
          console.log(`🔒 Strict mode retry due to timeout/parse error...`);
          
          // Get smart fallback chain based on user's selected model
          const fallbackChain = getSmartFallbackChain(targetModel, 'visual');
          const nextModel = fallbackChain[1]; // Get next model after user's choice
          
          console.log(`🔄 Retrying with ${MODEL_DISPLAY_NAMES[nextModel] || nextModel}...`);
          const compactUserPrompt = `${category}>${subcategory}, ${tone}. 4 visual JSON concepts.`;
          
          const compactMessages = [
            { role: 'system', content: SYSTEM_PROMPTS.visual_generator },
            { role: 'user', content: compactUserPrompt }
          ];
          
          const retryTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('RETRY_TIMEOUT')), 8000); // 8s retry
          });
          
          try {
            const retryRequestOptions: any = {
              max_completion_tokens: 450,
              model: nextModel || 'o4-mini-2025-04-16'
            };
            
            if (isTemperatureSupported(nextModel || 'o4-mini-2025-04-16')) {
              retryRequestOptions.temperature = 0.7;
            }
            
            result = await Promise.race([
              openAIService.chatJSON(compactMessages, retryRequestOptions),
              retryTimeoutPromise
            ]);
            console.log(`✅ Strict mode retry successful with ${MODEL_DISPLAY_NAMES[nextModel] || nextModel}`);
          } catch (retryError) {
            console.log(`🔒 Strict mode retry failed, using fallbacks`);
            const fallbacks = getSlotBasedFallbacks(enrichedInputs).slice(0, n);
            return {
              options: fallbacks,
              model: targetModel, // Show user's selected model, not "fallback"
              errorCode: 'STRICT_MODE_FAILED',
              _debug: { strictMode: true, fallbackUsed: true, fallbackReason: 'local fallback after retry failure' }
            };
          }
        } else {
          console.log(`🔒 Strict mode failed, using fallbacks`);
          const fallbacks = getSlotBasedFallbacks(enrichedInputs).slice(0, n);
          return {
            options: fallbacks,
            model: targetModel, // Show user's selected model, not "fallback"
            errorCode: 'STRICT_MODE_FAILED',
            _debug: { strictMode: true, fallbackUsed: true, fallbackReason: 'local fallback' }
          };
        }
      }
    } else {
      // Normal mode with fallback chain
      try {
        result = await Promise.race([
          openAIService.chatJSON(messages, requestOptions),
          timeoutPromise
        ]);
        console.log(`✅ Visual generation successful with ${MODEL_DISPLAY_NAMES[targetModel] || targetModel}`);
      } catch (firstError) {
        // Get smart fallback chain based on user's selected model
        const fallbackChain = getSmartFallbackChain(targetModel, 'visual');
        const nextModel = fallbackChain[1]; // Get next model after user's choice
        
        if (firstError instanceof Error && (firstError.message.includes('JSON') || firstError.message.includes('parse') || firstError.message.includes('TIMEOUT'))) {
          console.log(`🔄 Retrying with ${MODEL_DISPLAY_NAMES[nextModel] || nextModel}...`);
          const compactUserPrompt = `${category}>${subcategory}, ${tone}. 4 visual JSON concepts.`;
          
          const compactMessages = [
            { role: 'system', content: SYSTEM_PROMPTS.visual_generator },
            { role: 'user', content: compactUserPrompt }
          ];
          
          // Use compact timeout for retry
          const retryTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('RETRY_TIMEOUT')), 8000); // 8s retry timeout
          });
          
            try {
              // Use next model in smart fallback chain
              const retryRequestOptions: any = {
                max_completion_tokens: 450,
                model: nextModel || 'o4-mini-2025-04-16' // Fallback to o4-mini if chain exhausted
              };
              
              // Only add temperature for supported models
              if (isTemperatureSupported(nextModel || 'o4-mini-2025-04-16')) {
                retryRequestOptions.temperature = 0.7;
              }
              
              result = await Promise.race([
                openAIService.chatJSON(compactMessages, retryRequestOptions),
                retryTimeoutPromise
              ]);
              console.log(`✅ Visual generation retry successful with ${MODEL_DISPLAY_NAMES[nextModel] || nextModel}`);
            } catch (secondError) {
              // Final attempt with ultra-compact prompt and last fallback model
              const finalModel = fallbackChain[2] || 'o4-mini-2025-04-16';
              if (secondError instanceof Error && secondError.message.includes('RETRY_TIMEOUT')) {
                console.log(`🔄 Final attempt with ${MODEL_DISPLAY_NAMES[finalModel] || finalModel}...`);
                const ultraCompactMessages = [
                  { role: 'system', content: 'Generate 4 visual concepts as JSON array.' },
                  { role: 'user', content: `${tone} ${category} visuals. JSON only.` }
                ];
                
                const finalTimeoutPromise = new Promise((_, reject) => {
                  setTimeout(() => reject(new Error('FINAL_TIMEOUT')), 6000); // 6s final attempt
                });
                
                try {
                  result = await Promise.race([
                    openAIService.chatJSON(ultraCompactMessages, {
                      temperature: 0.7,
                      max_tokens: 300,
                      model: finalModel
                    }),
                    finalTimeoutPromise
                  ]);
                } catch (thirdError) {
                  throw thirdError;
                }
              } else {
                throw secondError;
              }
            }
        } else {
          throw firstError;
        }
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ Visual generation completed in ${duration}ms`);

    // Validate the response structure
    if (!result?.options || !Array.isArray(result.options)) {
      throw new Error('Invalid response format from AI - expected options array');
    }

    let validOptions = result.options
      .filter((opt: any) => opt.background && opt.prompt)
      .map((opt: any) => ({
        subject: opt.subject || "",
        background: opt.background,
        prompt: opt.prompt
      }))
      .map(postProcessOption);

    // Apply quality validation to reject vague options
    validOptions = validateVisualOptions(validOptions, enrichedInputs);

    // Enforce basketball anchoring for basketball subcategory
    if (enrichedInputs.category === 'sports' && enrichedInputs.subcategory?.toLowerCase() === 'basketball') {
      const basketballAnchored = validOptions.filter((opt: any) => opt.subcategoryAligned).length;
      console.log(`🏀 Basketball anchored options: ${basketballAnchored}/${validOptions.length}`);
      
      if (basketballAnchored < 3) {
        console.log('🏀 Enforcing basketball anchoring with fallbacks');
        const basketballFallbacks = buildAnchoredVisualFallbacks(enrichedInputs);
        const needed = 3 - basketballAnchored;
        
        // Prioritize basketball fallbacks over generic ones
        validOptions = [
          ...validOptions.filter((opt: any) => opt.subcategoryAligned),
          ...basketballFallbacks.slice(0, needed),
          ...validOptions.filter((opt: any) => !opt.subcategoryAligned)
        ].slice(0, 4);
      }
    }

    // Enforce Halloween 3-of-4 mix when context detected
    if (isHalloweenContext(enrichedInputs)) {
      console.log('🎃 Enforcing Halloween 3-of-4 mix...');
      
      // Count Halloween-themed options
      const halloweenKeywords = ['halloween', 'pumpkin', 'ghost', 'witch', 'spooky', 'costume', 'candy', 'cobweb', 'bat', 'skull', 'skeleton', 'haunted', 'trick-or-treat', 'jack-o-lantern'];
      const halloweenOptions = validOptions.filter(opt => {
        const fullText = `${opt.subject || ''} ${opt.background || ''} ${opt.prompt}`.toLowerCase();
        return halloweenKeywords.some(keyword => fullText.includes(keyword));
      });
      
      // Count background-only options
      const backgroundOnlyOptions = validOptions.filter(opt => {
        const fullText = `${opt.subject || ''} ${opt.prompt}`.toLowerCase();
        return fullText.includes('no people') || fullText.includes('no faces') || fullText.includes('backdrop') || !opt.subject || opt.subject.toLowerCase().includes('background');
      });
      
      console.log(`🎃 Halloween concepts: ${halloweenOptions.length}/4`);
      console.log(`✅ Background-only present: ${backgroundOnlyOptions.length > 0}`);
      
      // Ensure 3 Halloween options
      if (halloweenOptions.length < 3) {
        console.log('🎃 Adding Halloween fallbacks to meet 3-of-4 requirement');
        const halloweenFallbacks = getSlotBasedFallbacks(enrichedInputs);
        const needed = 3 - halloweenOptions.length;
        
        // Remove weakest non-Halloween options to make room
        const nonHalloween = validOptions.filter(opt => {
          const fullText = `${opt.subject || ''} ${opt.background || ''} ${opt.prompt}`.toLowerCase();
          return !halloweenKeywords.some(keyword => fullText.includes(keyword));
        });
        
        // Keep Halloween options + add Halloween fallbacks + keep one "different but relevant"
        validOptions = [
          ...halloweenOptions,
          ...halloweenFallbacks.slice(0, needed),
          ...nonHalloween.slice(0, 1) // Keep exactly one non-Halloween as "different but relevant"
        ].slice(0, 4);
      }
      
      // Ensure background-only Halloween option is first
      if (backgroundOnlyOptions.length === 0) {
        console.log('🎃 Ensuring background-only Halloween option is first');
        const halloweenFallbacks = getSlotBasedFallbacks(enrichedInputs);
        const backgroundOnlyFallback = halloweenFallbacks[0]; // First fallback is always background-only
        
        validOptions = [
          backgroundOnlyFallback,
          ...validOptions.slice(0, 3) // Keep 3 others
        ];
      } else {
        // Reorder to put background-only first
        const backgroundOnly = backgroundOnlyOptions[0];
        const others = validOptions.filter(opt => opt !== backgroundOnly);
        validOptions = [backgroundOnly, ...others.slice(0, 3)];
      }
      
      console.log(`🎃 Final Halloween mix enforced: ${validOptions.length} options`);
    }

    // Check if we have enough text-aligned options
    const textAlignedCount = validOptions.filter((opt: any) => opt.textAligned).length;
    const needsMinimumAligned = enrichedInputs.finalLine && textAlignedCount < 2;
    
    if (needsMinimumAligned) {
      console.log(`⚠️ Only ${textAlignedCount} text-aligned options, synthesizing fallbacks`);
      const fallbacks = getSlotBasedFallbacks(enrichedInputs);
      const syntheticAligned = fallbacks.filter(opt => opt.textAligned).slice(0, 2 - textAlignedCount);
      
      // Merge: aligned options first, then synthetics, then remaining
      validOptions = [
        ...validOptions.filter((opt: any) => opt.textAligned),
        ...syntheticAligned,
        ...validOptions.filter((opt: any) => !opt.textAligned),
        ...fallbacks.filter(opt => !opt.textAligned)
      ].slice(0, 4);
      
      console.log('🔄 Merged options with synthetic text-aligned fallbacks');
    } else if (validOptions.length < 4) {
      console.warn(`⚠️ Only ${validOptions.length} quality options generated, adding fallbacks`);
      const fallbacks = getSlotBasedFallbacks(enrichedInputs);
      validOptions = [...validOptions, ...fallbacks].slice(0, 4);
    }

    const actualModel = result._apiMeta?.modelUsed || targetModel;
    
    // Save last used model for UI tracking
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('last_visual_model', actualModel);
    }
    
    return {
      options: validOptions,
      model: actualModel,
      modelDisplayName: MODEL_DISPLAY_NAMES[actualModel] || actualModel
    };
  } catch (error) {
    console.error('Error generating visual recommendations:', error);
    
    // Determine specific error type for better user guidance with detailed reasons
    let errorCode: 'timeout' | 'unauthorized' | 'network' | 'parse_error' = 'network';
    let fallbackReason = 'Unknown API error';
    
    if (error instanceof Error) {
      if (error.message.includes('TIMEOUT')) {
        errorCode = 'timeout';
        fallbackReason = 'Primary request timed out (15s)';
        console.warn('⚠️ Visual generation timed out');
      } else if (error.message.includes('RETRY_TIMEOUT')) {
        errorCode = 'timeout';
        fallbackReason = 'Retry request timed out (10s)';
        console.warn('⚠️ Visual generation retry timed out');
      } else if (error.message.includes('FINAL_TIMEOUT')) {
        errorCode = 'timeout';
        fallbackReason = 'All attempts timed out (15s + 10s + 6s)';
        console.warn('⚠️ All visual generation attempts timed out');
      } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
        errorCode = 'unauthorized';
        fallbackReason = 'Invalid OpenAI API key';
        console.warn('⚠️ API key issue detected');
      } else if (error.message.includes('JSON') || error.message.includes('parse') || error.message.includes('truncated') || error.message.includes('No content')) {
        errorCode = 'parse_error';
        fallbackReason = 'Invalid AI response format';
        console.warn('⚠️ Response parsing failed or truncated');
      } else if (error.message.includes('Response truncated')) {
        errorCode = 'timeout';
        fallbackReason = 'Request too long, response truncated';
        console.warn('⚠️ Request was too long');
      }
    }
    
    // Use contextual fallbacks instead of generic ones
    let fallbackOptions = getSlotBasedFallbacks(enrichedInputs);
    
    // Use new four-angle prompt generator for primary fallbacks
    if (fallbackOptions.length < 4) {
      try {
        const promptOptions = generateVisualPrompts({
          category: enrichedInputs.category,
          subcategory: enrichedInputs.subcategory,
          tone: enrichedInputs.tone,
          finalLine: enrichedInputs.finalLine || '',
          visualStyle: enrichedInputs.visualStyle || 'Realistic',
          visualTags: enrichedInputs.tags || []
        });
        
        const neededCount = 4 - fallbackOptions.length;
        const convertedOptions = promptOptions.slice(0, neededCount).map(opt => ({
          subject: opt.subject,
          background: opt.background,
          prompt: opt.prompt,
          textAligned: true
        }));
        
        fallbackOptions.push(...convertedOptions);
        console.log(`🎯 VISUAL AI: Added ${neededCount} four-angle prompt options`);
      } catch (promptError) {
        console.warn('Four-angle prompt generation failed, using heuristic fallback:', promptError);
        
        // Fallback to heuristics if prompt generator fails
        try {
          const heuristicOptions = generateHeuristicVisuals(enrichedInputs);
          const neededCount = 4 - fallbackOptions.length;
          fallbackOptions.push(...heuristicOptions.slice(0, neededCount));
          console.log(`🎯 VISUAL AI: Added ${neededCount} heuristic fallback options`);
        } catch (heuristicError) {
          console.warn('Heuristic fallback generation failed:', heuristicError);
        }
      }
    }
    
    return {
      options: fallbackOptions,
      model: targetModel,
      modelDisplayName: MODEL_DISPLAY_NAMES[targetModel] || 'GPT-4.1',
      errorCode,
      fallbackReason
    };
  }
}