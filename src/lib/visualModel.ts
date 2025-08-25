import { openAIService } from './openai';

export interface VisualInputs {
  category: string;
  subcategory: string;
  tone: string;
  tags: string[];
  visualStyle?: string;
  finalLine?: string;
  specificEntity?: string; // For personas like "Teresa Giudice"
  subjectOption?: string; // single-person, multiple-people, no-subject
  dimensions?: string; // square, 4:5, 9:16, etc.
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
}

const VISUAL_OPTIONS_COUNT = 4;

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
  return options.filter(option => {
    // Reject options with vague fillers
    if (hasVagueFillers(option.subject) || hasVagueFillers(option.background)) {
      console.warn('🚫 Rejected vague option:', option.subject);
      return false;
    }
    
    // Ensure minimum detail in prompts
    if (option.prompt.length < 100) {
      console.warn('🚫 Rejected short prompt:', option.prompt.substring(0, 50));
      return false;
    }
    
    // Pride/theme relevance check - reject if completely off-topic
    if (inputs.finalLine) {
      const prideKeywords = ['pride', 'parade', 'rainbow', 'gay', 'lesbian', 'drag', 'queens', 'queer', 'lgbtq'];
      const hasPrideTheme = prideKeywords.some(keyword => 
        inputs.finalLine!.toLowerCase().includes(keyword) || 
        inputs.tone.toLowerCase().includes(keyword)
      );
      
      if (hasPrideTheme) {
        const isRelevant = prideKeywords.some(keyword => 
          option.subject.toLowerCase().includes(keyword) ||
          option.background.toLowerCase().includes(keyword) ||
          option.prompt.toLowerCase().includes(keyword) ||
          option.subject.toLowerCase().includes('rainbow') ||
          option.subject.toLowerCase().includes('colorful') ||
          option.background.toLowerCase().includes('celebration')
        );
        
        if (!isRelevant) {
          console.warn('🚫 Rejected off-topic Pride option:', option.subject);
          return false;
        }
      }
    }
    
    return true;
  });
}

function getSlotBasedFallbacks(inputs: VisualInputs): VisualOption[] {
  const { category, subcategory, tone, tags, visualStyle, finalLine, specificEntity, subjectOption, dimensions } = inputs;
  const primaryTags = tags.slice(0, 3).join(', ') || 'dynamic energy';
  const occasion = subcategory || 'general';
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
        slot: "background-only",
        subject: "Prison bars texture overlay",
        background: `Dark jail cell background with dramatic ${tone} lighting`,
        prompt: `Dark jail cell background with prison bars, dramatic ${tone} lighting, no text or typography [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: dark] [NEGATIVE_PROMPT: busy patterns, high-frequency texture, harsh shadows in center] [ASPECTS: 1:1 base, crop-safe 4:5, 9:16] [TEXT_HINT: light text]`
      },
      {
        slot: "subject+background",
        subject: `${entity}${needsPeople ? ` ${peopleContext}` : ''} silhouette behind bars`,
        background: `Prison setting with atmospheric lighting`,
        prompt: `${entity}${needsPeople ? ` ${peopleContext}` : ''} silhouette behind prison bars positioned on left third, dramatic jail setting, ${tone} mood lighting [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: auto] [NEGATIVE_PROMPT: faces crossing center, busy patterns in center] [ASPECTS: 1:1 base, crop-safe 4:5, 9:16] [TEXT_HINT: light text]`
      },
      {
        slot: "object",
        subject: "Handcuffs and judge gavel symbols",
        background: `Minimal courtroom or legal backdrop`,
        prompt: `Legal symbols like handcuffs and gavel anchored bottom third, minimal courtroom backdrop, ${tone} style [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: auto] [NEGATIVE_PROMPT: busy patterns, reflective glare in center] [ASPECTS: 1:1 base, crop-safe 4:5, 9:16] [TEXT_HINT: dark text]`
      },
      {
        slot: "tone-twist",
        subject: `${entity}${needsPeople ? ` ${peopleContext}` : ''} iconic moment reimagined`,
        background: `Stylized setting reflecting personality`,
        prompt: `${entity}${needsPeople ? ` ${peopleContext}` : ''} iconic moment with ${tone} interpretation positioned off-center, stylized background reflecting their known traits [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: auto] [NEGATIVE_PROMPT: limbs crossing center, harsh shadows in safe zone] [ASPECTS: 1:1 base, crop-safe 4:5, 9:16] [TEXT_HINT: light text]`
      }
    ];
  }
  
  return [
    {
      slot: "background-only",
      subject: `${randomEnergy.charAt(0).toUpperCase() + randomEnergy.slice(1)} ${tone} ${randomScene}`,
      background: `${randomEnergy.charAt(0).toUpperCase() + randomEnergy.slice(1)} ${tone} ${visualStyle || 'modern'} environment showcasing ${primaryTags}`,
      prompt: `${randomEnergy.charAt(0).toUpperCase() + randomEnergy.slice(1)} ${tone} ${visualStyle || 'modern'} environment showcasing ${primaryTags}, ${randomEnergy} composition without text or typography [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: auto] [NEGATIVE_PROMPT: busy patterns, high-frequency texture, harsh shadows in center] [ASPECTS: 1:1 base, crop-safe 4:5, 9:16] [TEXT_HINT: dark text]`
    },
    {
      slot: "subject+background", 
      subject: `${needsPeople ? `${peopleContext} immersed in ` : ''}${randomEnergy.charAt(0).toUpperCase() + randomEnergy.slice(1)} ${occasion} moment`,
      background: `${randomEnergy.charAt(0).toUpperCase() + randomEnergy.slice(1)} ${tone} atmosphere with ${primaryTags}${needsPeople ? ' and visible crowd' : ''}`,
      prompt: `${needsPeople ? `${peopleContext} immersed in ` : ''}${randomEnergy.charAt(0).toUpperCase() + randomEnergy.slice(1)} ${occasion} moment positioned on right third in ${randomEnergy} ${tone} atmosphere with ${primaryTags}${needsPeople ? ', multiple people clearly visible in background' : ''} [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: auto] [NEGATIVE_PROMPT: faces crossing center, busy patterns in center${needsPeople ? ', empty backgrounds' : ''}] [ASPECTS: 1:1 base, crop-safe 4:5, 9:16] [TEXT_HINT: light text]`
    },
    {
      slot: "object",
      subject: `${randomEnergy.charAt(0).toUpperCase() + randomEnergy.slice(1)} ${occasion} symbols and elements`,
      background: `Bold ${tone} ${randomScene} with ${primaryTags} accents`,
      prompt: `${randomEnergy.charAt(0).toUpperCase() + randomEnergy.slice(1)} ${occasion} symbols and elements anchored bottom third on bold ${tone} ${randomScene} with ${primaryTags} accents [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: auto] [NEGATIVE_PROMPT: reflective glare in center, busy patterns] [ASPECTS: 1:1 base, crop-safe 4:5, 9:16] [TEXT_HINT: dark text]`
    },
    {
      slot: "singing",
      subject: "Solo person singing or performing",
      background: `Concert or performance stage with ${tone} lighting, ${primaryTags} elements, and visible audience`,
      prompt: `One person singing or performing positioned off-center on concert stage with ${tone} lighting, ${primaryTags} elements, audience clearly visible in background [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: auto] [NEGATIVE_PROMPT: limbs crossing center, harsh shadows in safe zone, multiple performers, groups] [ASPECTS: 1:1 base, crop-safe 4:5, 9:16] [TEXT_HINT: light text]`
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
  
const systemPrompt = `Generate 4 visual concepts for graphics that MUST align with the provided text and tone. Be concise.

RULES:
- Return ONLY valid JSON - no markdown, no extra text
- Each prompt: 40-60 words maximum
- 4 slots: "background-only", "subject+background", "object", "singing"
- CRITICAL: Visual concepts MUST relate to the provided text/joke content and tone
- For Pride themes: Include rainbow, drag queens, parades, celebrations, fabulous elements
- For jokes: Match the humor and subject matter exactly
- SINGING SLOT: Always show ONE solo person singing/performing (not groups or crowds)
- SINGLE-PERSON PRIORITY: At least one concept must feature a single individual as the main subject

Format:
{
  "options": [
    {
      "slot": "background-only",
      "subject": "brief description",
      "background": "brief description", 
      "prompt": "concise prompt (40-60 words)"
    }
  ]
}`;

function getStyleKeywords(visualStyle?: string): string {
  const styles: Record<string, string> = {
    'realistic': 'photographic, detailed, natural lighting',
    'illustrated': 'clean illustration, vibrant colors', 
    '3d-animated': 'clean 3D animation, smooth surfaces',
    'minimalist': 'simple, clean, minimal design'
  };
  return styles[visualStyle || '3d-animated'] || 'modern visual style';
}

  const userPrompt = `${category}>${subcategory}, ${tone}, ${visualStyle || '3d-animated'}
Tags: ${tags.slice(0, 4).join(', ')}
${finalLine ? `JOKE/TEXT: "${finalLine}" - VISUAL CONCEPTS MUST MATCH THIS CONTENT AND TONE` : ''}

IMPORTANT: Visual concepts must directly relate to the joke/text content above. For Pride themes, include rainbow colors, drag queens, parades, celebration elements.

4 concepts. Each 40-60 words. Include [TAGS: ${tags.slice(0, 3).join(', ')}] [TEXT_SAFE_ZONE: center 60x35]

JSON only.`;

  try {
    const startTime = Date.now();
    console.log('🚀 Starting visual generation with optimized settings...');
    
    // Create a timeout promise with reduced timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 18000);
    });

    // Primary attempt with gpt-4o-mini for reliable JSON
    let result;
    try {
        result = await Promise.race([
          openAIService.chatJSON([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ], {
            temperature: 0.7,
            max_tokens: 600,
            model: 'gpt-4o-mini'
          }),
          timeoutPromise
        ]);
    } catch (firstError) {
      // Retry with shorter prompt on failure
      if (firstError instanceof Error && (firstError.message.includes('JSON') || firstError.message.includes('parse') || firstError.message.includes('TIMEOUT'))) {
        console.log('🔄 Retrying with compact prompt...');
        const compactUserPrompt = `${category}>${subcategory}, ${tone}. 4 visual JSON concepts.`;
        
        result = await Promise.race([
          openAIService.chatJSON([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: compactUserPrompt }
          ], {
            temperature: 0.6,
            max_tokens: 600,
            model: 'gpt-4o-mini'
          }),
          timeoutPromise
        ]);
      } else {
        throw firstError;
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ Visual generation completed in ${duration}ms`);

    // Validate the response structure and slots
    if (!result?.options || !Array.isArray(result.options) || result.options.length !== 4) {
      throw new Error('Invalid response format from AI - expected exactly 4 options');
    }

    const expectedSlots = ['background-only', 'subject+background', 'object', 'singing'];
    let validOptions = result.options
      .filter((opt: any) => opt.subject && opt.background && opt.prompt && opt.slot)
      .map((opt: any, index: number) => ({
        ...opt,
        slot: opt.slot || expectedSlots[index] // Ensure slot is present
      }));

    // Apply quality validation to reject vague options
    validOptions = validateVisualOptions(validOptions, enrichedInputs);

    // Ensure at least one single-person option exists
    const hasSinglePersonOption = validOptions.some(opt => 
      opt.slot === 'singing' || 
      (opt.subject.toLowerCase().includes('person ') && !opt.subject.toLowerCase().includes('people'))
    );

    if (!hasSinglePersonOption && validOptions.length > 0) {
      // Convert a group option to single-person if no solo option exists
      const groupOptionIndex = validOptions.findIndex(opt => 
        opt.subject.toLowerCase().includes('people') || 
        opt.subject.toLowerCase().includes('group') ||
        opt.subject.toLowerCase().includes('crowd')
      );
      
      if (groupOptionIndex !== -1) {
        validOptions[groupOptionIndex] = {
          ...validOptions[groupOptionIndex],
          subject: validOptions[groupOptionIndex].subject.replace(/people|group|crowd/gi, 'person'),
          prompt: validOptions[groupOptionIndex].prompt.replace(/people|group|crowd/gi, 'person').replace(/multiple/gi, 'single')
        };
      }
    }

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
    
    // Determine specific error type for better user guidance
    let errorCode: 'timeout' | 'unauthorized' | 'network' | 'parse_error' = 'network';
    
    if (error instanceof Error) {
      if (error.message === 'TIMEOUT') {
        errorCode = 'timeout';
        console.warn('⚠️ Visual generation timed out after 18s');
      } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
        errorCode = 'unauthorized';
        console.warn('⚠️ API key issue detected');
      } else if (error.message.includes('JSON') || error.message.includes('parse') || error.message.includes('truncated') || error.message.includes('No content')) {
        errorCode = 'parse_error';
        console.warn('⚠️ Response parsing failed or truncated');
      }
    }
    
    // Use contextual fallbacks instead of generic ones
    const fallbackOptions = getSlotBasedFallbacks(enrichedInputs);

    return {
      options: fallbackOptions,
      model: 'fallback',
      errorCode
    };
  }
}