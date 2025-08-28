import { openAIService } from './openai';
import { SYSTEM_PROMPTS, buildVisualGeneratorMessages, getStyleKeywords, getEffectiveConfig, isTemperatureSupported, getSmartFallbackChain, MODEL_DISPLAY_NAMES, BACKGROUND_PRESETS, getRuntimeOverrides } from '../vibe-ai.config';

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
  _seasonalBoost?: string; // Internal seasonal enhancement indicator
}

export interface VisualOption {
  subject: string;
  background: string;
  prompt: string;
  slot?: string;
  textAligned?: boolean;
}

export interface VisualResult {
  options: VisualOption[];
  model: string;
  modelDisplayName?: string;
  errorCode?: 'timeout' | 'unauthorized' | 'network' | 'parse_error' | 'FAST_TIMEOUT' | 'STRICT_MODE_FAILED';
  fallbackReason?: string;
  _debug?: any;
  _seasonalBoost?: string; // Seasonal enhancement indicator for UI
}

const VISUAL_OPTIONS_COUNT = 4;

// No longer enforce specific slots - allow flexible recommendations

// Auto-enrichment functions
function autoEnrichInputs(inputs: VisualInputs): VisualInputs {
  const enriched = { ...inputs };
  
  // Seasonal detection and enhancement
  const seasonalBoost = detectSeasonalTheme(inputs);
  if (seasonalBoost.isChristmas) {
    console.log('🎄 Christmas theme detected - applying seasonal boost');
    enriched.tags = [...inputs.tags, ...seasonalBoost.tags].slice(0, 8);
    enriched._seasonalBoost = 'Christmas';
  }
  
  // Auto-extract nouns from finalLine if provided
  if (inputs.finalLine && inputs.tags.length < 5) {
    const extractedNouns = extractNounsFromText(inputs.finalLine);
    enriched.tags = [...enriched.tags, ...extractedNouns].slice(0, 8); // Max 8 tags
  }
  
  // Auto-seed category-specific tags if not provided
  if (inputs.tags.length < 3) {
    const categoryTags = getCategorySpecificTags(inputs.category, inputs.subcategory);
    enriched.tags = [...inputs.tags, ...categoryTags].slice(0, 6);
  }
  
  // Pride/LGBTQ+ theme enhancement
  if (inputs.finalLine) {
    const prideKeywords = ['pride', 'parade', 'rainbow', 'gay', 'lesbian', 'drag', 'queens', 'queer', 'lgbtq'];
    const hasPrideTheme = prideKeywords.some(keyword => 
      inputs.finalLine!.toLowerCase().includes(keyword) || 
      inputs.tone.toLowerCase().includes(keyword)
    );
    
    if (hasPrideTheme) {
      const prideEnhancementTags = ['rainbow', 'parade', 'celebration', 'colorful', 'drag queens', 'fabulous'];
      enriched.tags = [...enriched.tags, ...prideEnhancementTags].slice(0, 8);
    }
  }
  
  return enriched;
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

// Add seasonal detection function
function detectSeasonalTheme(inputs: VisualInputs): { isChristmas: boolean; tags: string[] } {
  const christmasKeywords = ['christmas', 'holiday', 'santa', 'reindeer', 'tree', 'gifts', 'ornament', 'snow', 'winter', 'festive', 'sleigh', 'elf', 'carol', 'wreath', 'mistletoe'];
  const lowerText = [
    inputs.subcategory?.toLowerCase() || '',
    inputs.tone.toLowerCase(),
    inputs.finalLine?.toLowerCase() || '',
    ...inputs.tags.map(tag => tag.toLowerCase())
  ].join(' ');
  
  const isChristmas = christmasKeywords.some(keyword => lowerText.includes(keyword)) || 
                     inputs.subcategory === 'christmas-day' || 
                     inputs.subcategory === 'christmas-eve';
  
  if (isChristmas) {
    return {
      isChristmas: true,
      tags: ['Christmas tree', 'red and green', 'ornaments', 'festive lights', 'holiday spirit', 'winter wonderland']
    };
  }
  
  return { isChristmas: false, tags: [] };
}

// Christmas enhancement enforcement
function enforceChristmasElements(options: VisualOption[], inputs: VisualInputs): VisualOption[] {
  console.log('🎄 Enforcing Christmas elements in visual concepts...');
  
  let christmasEnforcedCount = 0;
  const targetChristmasCount = 3; // At least 3 of 4 should have Christmas elements
  
  const enhancedOptions = options.map((option, index) => {
    const hasChristmasAlready = hasChristmasElements(option);
    
    if (!hasChristmasAlready && christmasEnforcedCount < targetChristmasCount) {
      console.log(`🎄 Adding Christmas elements to concept ${index + 1}`);
      christmasEnforcedCount++;
      
      return {
        ...option,
        subject: addChristmasToSubject(option.subject),
        background: addChristmasToBackground(option.background),
        prompt: addChristmasToPrompt(option.prompt, inputs.tags)
      };
    }
    
    if (hasChristmasAlready) {
      christmasEnforcedCount++;
    }
    
    return option;
  });
  
  console.log(`🎄 Christmas enforcement complete: ${christmasEnforcedCount}/${options.length} concepts have Christmas elements`);
  return enhancedOptions;
}

function hasChristmasElements(option: VisualOption): boolean {
  const christmasKeywords = ['christmas', 'tree', 'ornament', 'festive', 'holiday', 'red and green', 'lights', 'santa', 'winter', 'snow'];
  const fullText = `${option.subject} ${option.background} ${option.prompt}`.toLowerCase();
  return christmasKeywords.some(keyword => fullText.includes(keyword));
}

function addChristmasToSubject(subject: string): string {
  if (!subject || hasChristmasElements({ subject, background: '', prompt: '' })) return subject;
  
  const christmasEnhancements = [
    'with Christmas tree backdrop',
    'featuring festive red and green accents',
    'with holiday ornaments',
    'surrounded by Christmas lights',
    'with winter holiday atmosphere'
  ];
  
  const enhancement = christmasEnhancements[Math.floor(Math.random() * christmasEnhancements.length)];
  return `${subject} ${enhancement}`;
}

function addChristmasToBackground(background: string): string {
  if (!background || hasChristmasElements({ subject: '', background, prompt: '' })) return background;
  
  const christmasBackgrounds = [
    'with Christmas tree and festive lighting',
    'featuring red and green holiday colors',
    'with Christmas ornaments and winter atmosphere',
    'decorated with holiday lights and festive elements',
    'showcasing Christmas spirit and winter wonderland'
  ];
  
  const enhancement = christmasBackgrounds[Math.floor(Math.random() * christmasBackgrounds.length)];
  return `${background} ${enhancement}`;
}

function addChristmasToPrompt(prompt: string, tags: string[]): string {
  if (!prompt || hasChristmasElements({ subject: '', background: '', prompt })) return prompt;
  
  const christmasPromptAdditions = [
    ', Christmas tree visible in background, festive red and green color scheme',
    ', holiday ornaments and Christmas lights creating warm festive atmosphere',
    ', Christmas decorations and winter holiday spirit throughout',
    ', festive Christmas elements with red and green accents and holiday lighting',
    ', Christmas theme with tree, ornaments, and warm holiday atmosphere'
  ];
  
  const addition = christmasPromptAdditions[Math.floor(Math.random() * christmasPromptAdditions.length)];
  
  // Insert before any technical instructions like [TAGS:...]
  const technicalStart = prompt.indexOf('[');
  if (technicalStart !== -1) {
    return prompt.slice(0, technicalStart) + addition + ' ' + prompt.slice(technicalStart);
  } else {
    return prompt + addition;
  }
}

function getCategorySpecificTags(category: string, subcategory: string): string[] {
  const celebrationMap: Record<string, string[]> = {
    'birthday': ['cake', 'candles', 'balloons'],
    'christmas-day': ['Christmas tree', 'red and green', 'ornaments', 'festive lights', 'holiday spirit'],
    'christmas-eve': ['Christmas tree', 'red and green', 'ornaments', 'festive lights', 'holiday spirit'],
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
  
  const validOptions = options.filter(opt => {
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
  
  // Enhanced text-aware fallbacks if finalLine exists
  if (finalLine) {
    const semanticKeywords = getSemanticKeywords(finalLine);
    console.log('🎯 Generating text-aware fallbacks for semantic keywords:', semanticKeywords);
    console.log('📝 Detected LGBTQ+ cues:', finalLine.toLowerCase().match(/(gay|queer|lgbt|lgbtq|pride|came out|coming out|boyfriend|drag)/gi) || 'none');
    console.log('📝 Detected award cues:', finalLine.toLowerCase().match(/(oscar|award|documentary)/gi) || 'none');
    
    const textAwareFallbacks: VisualOption[] = [];
    const lowerFinalLine = finalLine.toLowerCase();
    
    // Documentary/Award theme fallback
    if (lowerFinalLine.includes('oscar') || lowerFinalLine.includes('award') || lowerFinalLine.includes('documentary')) {
      textAwareFallbacks.push({
        subject: "Documentary poster motif with Oscar silhouette and subtle rainbow accents",
        background: "Realistic studio or festival wall with soft vignette and empty central space",
        prompt: `Documentary-style poster concept featuring an Oscar silhouette and subtle rainbow accents, realistic modern composition with clean central negative space for large text [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: auto] [TEXT_HINT: dark text]`,
        textAligned: true
      });
    }
    
    // Enhanced LGBTQ+/Pride theme fallbacks
    const lgbtqPhrases = ['gay', 'queer', 'lgbt', 'lgbtq', 'pride', 'came out', 'coming out', 'boyfriend', 'drag'];
    if (lgbtqPhrases.some(phrase => lowerFinalLine.includes(phrase))) {
      textAwareFallbacks.push({
        subject: "Male couple holding hands with subtle rainbow pride accents",
        background: "Urban setting or park with soft natural lighting and clear text space",
        prompt: `Two men holding hands or embracing, subtle rainbow pride flag accents in background, warm natural lighting, urban or park setting with clear negative space for text [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: auto] [TEXT_HINT: dark text]`,
        textAligned: true
      });
      
      textAwareFallbacks.push({
        subject: "Wardrobe and mirror scene with cross-dressing elements and rainbow accents",
        background: "Clean dressing room with soft lighting, leaving open area for text",
        prompt: `Realistic dressing room scene with tasteful wardrobe cues (heels, blazer-over-dress on hanger, lipstick on vanity), subtle rainbow color accents, uncluttered background with clear negative space for text [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: auto] [TEXT_HINT: dark text]`,
        textAligned: true
      });
    }
    
    // Cross-dressing specific fallback
    if (lowerFinalLine.includes('cross') && !textAwareFallbacks.some(f => f.subject.includes('Wardrobe'))) {
      textAwareFallbacks.push({
        subject: "Elegant wardrobe with mixed clothing styles and mirror reflection",
        background: "Sophisticated dressing room with warm lighting",
        prompt: `Elegant wardrobe with mix of masculine and feminine clothing, mirror with soft reflection, sophisticated dressing room atmosphere, warm lighting with clear text placement area [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: auto] [TEXT_HINT: dark text]`,
        textAligned: true
      });
    }
    
    if (textAwareFallbacks.length > 0) {
      return textAwareFallbacks.concat(getDefaultFallbacks(inputs)).slice(0, 4);
    }
  }
  
  return getDefaultFallbacks(inputs);
}

function getDefaultFallbacks(inputs: VisualInputs): VisualOption[] {
  const { category, subcategory, tone, tags, visualStyle, finalLine, specificEntity, subjectOption, dimensions } = inputs;
  const primaryTags = tags.slice(0, 3).join(', ') || 'dynamic energy';
  const occasion = subcategory || 'general';
  
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
        setTimeout(() => reject(new Error('FAST_TIMEOUT')), 6000); // 6s max
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
          const validatedOptions = validateVisualOptions(visualOptions, enrichedInputs);
          
          // Merge fallbacks if we need more options
          if (validatedOptions.length < n) {
            const fallbacks = getSlotBasedFallbacks(enrichedInputs).slice(0, n - validatedOptions.length);
            validatedOptions.push(...fallbacks);
          }
          
          return {
            options: validatedOptions,
            model: targetModel,
            modelDisplayName: MODEL_DISPLAY_NAMES[targetModel] || targetModel,
            errorCode: undefined,
            _debug: { fastMode: true, responseTime: Date.now() - startTime }
          };
        }
      } catch (fastError) {
        console.log(`⚡ Fast mode failed in ${Date.now() - startTime}ms, using fallbacks`);
        const fallbacks = getSlotBasedFallbacks(enrichedInputs).slice(0, n);
        return {
          options: fallbacks,
          model: targetModel, // Show actual selected model, not "fallback"
          modelDisplayName: MODEL_DISPLAY_NAMES[targetModel] || targetModel,
          errorCode: 'FAST_TIMEOUT',
          fallbackReason: `${MODEL_DISPLAY_NAMES[targetModel] || targetModel} timed out - using local presets`,
          _debug: { fastMode: true, fallbackUsed: true, fallbackReason: 'local fallback' }
        };
      }
    }
    
    console.log('🚀 Starting visual generation with optimized settings...');
    console.log(`🎨 Visual generation using model: ${targetModel}`);
    
    // Use centralized message builder for normal mode
    const messages = buildVisualGeneratorMessages(enrichedInputs);
    
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), strictModelEnabled ? 10000 : 15000);
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
        console.log(`🔒 Strict mode failed with ${MODEL_DISPLAY_NAMES[targetModel] || targetModel}, using fallbacks`);
        const fallbacks = getSlotBasedFallbacks(enrichedInputs).slice(0, n);
        return {
          options: fallbacks,
          model: targetModel, // Show the user's selected model, not "fallback"
          modelDisplayName: MODEL_DISPLAY_NAMES[targetModel] || targetModel,
          errorCode: 'STRICT_MODE_FAILED',
          _debug: { strictMode: true, fallbackUsed: true, failedModel: targetModel }
        };
      }
    } else {
      // Normal mode - still use only the user's selected model (strict mode is now default)
      try {
        result = await Promise.race([
          openAIService.chatJSON(messages, requestOptions),
          timeoutPromise
        ]);
        console.log(`✅ Visual generation successful with ${MODEL_DISPLAY_NAMES[targetModel] || targetModel}`);
      } catch (primaryError) {
        console.log(`❌ Visual generation failed with ${MODEL_DISPLAY_NAMES[targetModel] || targetModel}, using local fallbacks`);
        const fallbacks = getSlotBasedFallbacks(enrichedInputs).slice(0, n);
        return {
          options: fallbacks,
          model: targetModel, // Show the user's selected model
          modelDisplayName: MODEL_DISPLAY_NAMES[targetModel] || targetModel,
          errorCode: primaryError instanceof Error && primaryError.message.includes('TIMEOUT') ? 'timeout' : 'network',
          fallbackReason: `${MODEL_DISPLAY_NAMES[targetModel] || targetModel} failed - using local presets`,
          _debug: { failedModel: targetModel, error: primaryError instanceof Error ? primaryError.message : 'Unknown error' }
        };
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
      }));

    // Apply quality validation to reject vague options
    validOptions = validateVisualOptions(validOptions, enrichedInputs);

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
    
    // Apply Christmas enforcement if seasonal boost is active
    if (enrichedInputs._seasonalBoost === 'Christmas') {
      validOptions = enforceChristmasElements(validOptions, enrichedInputs);
    }

    return {
      options: validOptions,
      model: actualModel,
      modelDisplayName: MODEL_DISPLAY_NAMES[actualModel] || actualModel,
      _seasonalBoost: enrichedInputs._seasonalBoost
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
    const fallbackOptions = getSlotBasedFallbacks(enrichedInputs);
    
    return {
      options: fallbackOptions,
      model: targetModel, // Show the user's selected model that failed
      modelDisplayName: MODEL_DISPLAY_NAMES[targetModel] || targetModel,
      errorCode,
      fallbackReason: `${MODEL_DISPLAY_NAMES[targetModel] || targetModel} failed - using local presets`,
      _seasonalBoost: enrichedInputs._seasonalBoost
    };
  }
}