import { openAIService } from './openai';
import { SYSTEM_PROMPTS, buildVisualGeneratorMessages, getStyleKeywords, getEffectiveConfig, isTemperatureSupported, BACKGROUND_PRESETS } from '../vibe-ai.config';

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
}

export interface VisualOption {
  subject: string;
  background: string;
  prompt: string;
  slot?: string;
}

export interface VisualResult {
  options: VisualOption[];
  model: string;
  errorCode?: 'timeout' | 'unauthorized' | 'network' | 'parse_error';
  fallbackReason?: string;
}

const VISUAL_OPTIONS_COUNT = 4;

// No longer enforce specific slots - allow flexible recommendations

// Auto-enrichment functions
function autoEnrichInputs(inputs: VisualInputs): VisualInputs {
  const enriched = { ...inputs };
  
  // Auto-extract nouns from finalLine if provided
  if (inputs.finalLine && inputs.tags.length < 5) {
    const extractedNouns = extractNounsFromText(inputs.finalLine);
    enriched.tags = [...inputs.tags, ...extractedNouns].slice(0, 8); // Max 8 tags
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
  
  return dedupedOptions.slice(0, 4); // Ensure max 4 options
}

function getSlotBasedFallbacks(inputs: VisualInputs): VisualOption[] {
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
  
    // Use centralized message builder
    const messages = buildVisualGeneratorMessages(enrichedInputs);

  try {
    const startTime = Date.now();
    console.log('🚀 Starting visual generation with optimized settings...');
    
    // Use effective config (respecting user AI settings)
    const effectiveConfig = getEffectiveConfig();
    const targetModel = effectiveConfig.visual_generation.model;
    const targetTemperature = isTemperatureSupported(targetModel) ? effectiveConfig.generation.temperature : undefined;
    
    console.log(`🎨 Visual generation using model: ${targetModel}`);
    
    // Create a timeout promise with increased primary timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 15000); // Increased to 15s
    });

    // Primary attempt - use model from AI settings
    let result;
    const requestOptions: any = {
      max_completion_tokens: 450, // Reduced tokens for faster generation
      model: targetModel // Use model from AI settings
    };
    
    // Only add temperature for supported models
    if (isTemperatureSupported(targetModel)) {
      requestOptions.temperature = targetTemperature || 0.7;
    }
    
    try {
        result = await Promise.race([
          openAIService.chatJSON(messages, requestOptions),
          timeoutPromise
        ]);
    } catch (firstError) {
      // Retry with compact prompt on gpt-4o-mini for any JSON/timeout error
      if (firstError instanceof Error && (firstError.message.includes('JSON') || firstError.message.includes('parse') || firstError.message.includes('TIMEOUT'))) {
        console.log('🔄 Retrying with compact prompt on gpt-4o-mini...');
        const compactUserPrompt = `${category}>${subcategory}, ${tone}. 4 visual JSON concepts.`;
        
        const compactMessages = [
          { role: 'system', content: SYSTEM_PROMPTS.visual_generator },
          { role: 'user', content: compactUserPrompt }
        ];
        
        // Use compact timeout for retry
        const retryTimeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('RETRY_TIMEOUT')), 10000); // Increased to 10s
        });
        
        try {
          result = await Promise.race([
            openAIService.chatJSON(compactMessages, {
              temperature: 0.7,
              max_tokens: 450,
              model: 'gpt-4o-mini'
            }),
            retryTimeoutPromise
          ]);
        } catch (secondError) {
          // Third attempt with ultra-compact prompt
          if (secondError instanceof Error && secondError.message.includes('RETRY_TIMEOUT')) {
            console.log('🔄 Final attempt with ultra-compact prompt...');
            const ultraCompactMessages = [
              { role: 'system', content: 'Generate 4 visual concepts as JSON array.' },
              { role: 'user', content: `${tone} ${category} visuals. JSON only.` }
            ];
            
            const finalTimeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('FINAL_TIMEOUT')), 6000); // 6s final attempt
            });
            
            result = await Promise.race([
              openAIService.chatJSON(ultraCompactMessages, {
                temperature: 0.7,
                max_tokens: 300,
                model: 'gpt-4o-mini'
              }),
              finalTimeoutPromise
            ]);
          } else {
            throw secondError;
          }
        }
      } else {
        throw firstError;
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

    // If we rejected too many options, fill with high-quality fallbacks
    if (validOptions.length < 4) {
      console.warn(`⚠️ Only ${validOptions.length} quality options generated, adding fallbacks`);
      const fallbacks = getSlotBasedFallbacks(enrichedInputs);
      validOptions = [...validOptions, ...fallbacks].slice(0, 4);
    }

    return {
      options: validOptions,
      model: result._apiMeta?.modelUsed || 'gpt-4o-mini'
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
      model: 'fallback-gpt-4o-mini',
      errorCode,
      fallbackReason
    };
  }
}