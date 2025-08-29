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
  type VibeInputs,
  type VibeCandidate,
  type VibeResult
} from '../vibe-ai.config';

// Re-export types for backward compatibility
export type { VibeCandidate, VibeResult } from '../vibe-ai.config';

// Interfaces now imported from centralized config

function getFallbackVariants(tone: string, category: string, subcategory: string): string[] {
  const baseFallback = TONE_FALLBACKS[tone.toLowerCase()] || TONE_FALLBACKS.humorous;
  
  // Create 4 distinct variations based on tone and context
  const variations = [
    baseFallback,
    `${baseFallback} today`,
    `${baseFallback} vibes`,
    `${baseFallback} energy`
  ];
  
  return variations;
}

function getContextualFallbacks(tone: string, category: string, subcategory: string): string[] {
  const contextualOptions: Record<string, Record<string, string[]>> = {
    humorous: {
      work: ["Monday mood activated", "Coffee required for operation", "Workplace comedy in progress", "Professional chaos mode"],
      birthday: ["Another year of awesome", "Cake is calling my name", "Birthday vibes activated", "Celebrating life goals"],
      party: ["Party mode: ON", "Let's make some memories", "Good vibes only tonight", "Ready to celebrate"],
      food: ["Foodie adventures await", "Taste buds in paradise", "Culinary exploration time", "Hungry for greatness"],
      default: ["Life's too short for boring", "Making memories one laugh at a time", "Comedy gold in progress", "Bringing the fun energy"]
    },
    savage: {
      work: ["Boss mode activated", "Excellence is not negotiable", "Crushing goals daily", "Success is the only option"],
      birthday: ["Leveling up like a legend", "Another year stronger", "Born to stand out", "Unstoppable since birth"],
      party: ["Bringing the main character energy", "Setting the standard tonight", "Unforgettable vibes incoming", "Making this legendary"],
      food: ["Only the finest will do", "Elevating my taste standards", "Quality over everything", "Sophisticated palate activated"],
      default: ["Built different, stay pressed", "Main character energy always", "Excellence is my baseline", "Setting standards daily"]
    },
    random: {
      work: ["Plot twist: actually productive today", "Chaos coordinator reporting for duty", "Making sense optional", "Professional randomness activated"],
      birthday: ["Aging like fine chaos", "Birthday plot twist incoming", "Celebrating my beautiful disaster", "Another year of unpredictability"],
      party: ["Bringing the weird energy", "Spontaneous fun generator", "Chaos coordinator at your service", "Making tonight unforgettable"],
      food: ["Culinary adventure mode activated", "Taste testing life's surprises", "Food journey gets interesting", "Flavor discovery mission"],
      default: ["Embracing the beautiful chaos", "Plot twist specialist", "Making ordinary extraordinary", "Keeping life interesting"]
    }
  };

  const toneOptions = contextualOptions[tone.toLowerCase()] || contextualOptions.humorous;
  const categoryOptions = toneOptions[category.toLowerCase()] || toneOptions.default;
  
  return categoryOptions;
}

// Post-processing now handled by centralized config

async function generateMultipleCandidates(inputs: VibeInputs, overrideModel?: string): Promise<VibeCandidate[]> {
  try {
    // Use effective config with runtime overrides
    const config = getEffectiveConfig();
    const targetModel = overrideModel || config.generation.model;
    
    console.log(`🚀 Text generation starting with user-selected model: ${targetModel}`);
    
    // Use centralized message builder
    const messages = buildVibeGeneratorMessages(inputs);
    
    const result = await openAIService.chatJSON(messages, {
      max_tokens: config.generation.max_tokens,
      temperature: config.generation.temperature,
      model: targetModel
    });
    
    // Store the API metadata for later use
    const apiMeta = result._apiMeta;
    
    // Extract lines from JSON response - try multiple possible shapes
    let lines = result.lines || result.options || result.generated_phrases || [];
    
    if (!Array.isArray(lines) || lines.length === 0) {
      console.log('🔄 Primary JSON shape failed, trying backup prompt...');
      
      // Retry with simpler backup prompt
      const backupMessages = [
        { role: 'system', content: 'You are a helpful text generator. Always respond with valid JSON in the format: {"lines": ["text1", "text2", "text3", "text4"]}' },
        { role: 'user', content: `Generate 4 different ${inputs.tone} text variations for ${inputs.category}${inputs.subcategory ? ` (${inputs.subcategory})` : ''}. Keep each under 100 characters.` }
      ];
      
      try {
        const backupResult = await openAIService.chatJSON(backupMessages, {
          max_tokens: config.generation.max_tokens,
          temperature: config.generation.temperature,
          model: targetModel
        });
        
        lines = backupResult.lines || backupResult.options || backupResult.generated_phrases || [];
        
        if (Array.isArray(lines) && lines.length > 0) {
          console.log('✅ Backup prompt succeeded');
          // Mark this as backup usage in the metadata
          if (backupResult._apiMeta) {
            backupResult._apiMeta.usedBackupPrompt = true;
          } else {
            (lines as any)._apiMeta = { usedBackupPrompt: true };
          }
        } else {
          throw new Error('Backup prompt also failed - no valid lines');
        }
      } catch (backupError) {
        console.error('Backup prompt failed:', backupError);
        throw new Error('Both primary and backup generation failed');
      }
    }
    
    // Check if this is knock-knock format
    const isKnockKnock = inputs.subcategory?.toLowerCase().includes("knock");
    const postProcessOptions = isKnockKnock ? 
      { allowNewlines: true, format: 'knockknock' as const, exactWordingTags: inputs.exactWordingTags } : 
      { exactWordingTags: inputs.exactWordingTags };
    
    // Post-process each line with tag validation
    const candidates = lines.map((line: string) => postProcessLine(line, inputs.tone, inputs.tags, postProcessOptions));
    
    // Add API metadata to candidates for later extraction
    if (apiMeta && candidates.length > 0) {
      (candidates as any)._apiMeta = apiMeta;
    }
    
    // Check if backup prompt was used and add to metadata
    const usedBackupPrompt = (lines as any)._apiMeta?.usedBackupPrompt || result._apiMeta?.usedBackupPrompt;
    if (usedBackupPrompt && candidates.length > 0) {
      (candidates as any)._apiMeta = { ...(candidates as any)._apiMeta, usedBackupPrompt: true };
    }
    
    return candidates;
  } catch (error) {
    console.error('Failed to generate multiple candidates:', error);
    // Return contextual fallbacks based on tone and category
    const contextualFallbacks = getContextualFallbacks(inputs.tone, inputs.category, inputs.subcategory);
    return contextualFallbacks.map((line, index) => ({
      line,
      blocked: true,
      reason: index === 0 ? `API Error: ${error instanceof Error ? error.message : 'Unknown error'}` : 'Contextual fallback'
    }));
  }
}

export async function generateCandidates(inputs: VibeInputs, n: number = 4): Promise<VibeResult> {
  let candidateResults = await generateMultipleCandidates(inputs);
  
  // Extract API metadata if available
  let apiMeta = (candidateResults as any)._apiMeta || null;
  
  // Check if all candidates are blocked for meta tag issues (not content tags)
  const allBlockedForTags = candidateResults.every(c => 
    c.blocked && c.reason?.includes('meta tag verbatim')
  );
  
  // If all blocked for meta tags, try anti-echo retry
  if (allBlockedForTags && inputs.tags && inputs.tags.length > 0) {
    console.log('🔁 Anti-echo retry: All candidates blocked for meta tags');
    
    // Create modified inputs with explicit tag ban
    const antiEchoInputs = {
      ...inputs,
      tags: [...(inputs.tags || []), `ANTI_ECHO_${Date.now()}`] // Add unique marker
    };
    
    // Build special anti-echo messages
    const config = getEffectiveConfig();
    const bannedTags = inputs.tags.join('", "');
    const antiEchoMessages = [
      { 
        role: 'system', 
        content: `Generate witty text. CRITICAL: NEVER use these exact words: "${bannedTags}". Use synonyms and creative alternatives instead. JSON array only.`
      },
      { 
        role: 'user', 
        content: `Generate 6 options under 100 chars for ${inputs.tone} ${inputs.category}${inputs.subcategory ? ` > ${inputs.subcategory}` : ''}.
        
BANNED WORDS (do not use): "${bannedTags}"
${inputs.exactWordingTags && inputs.exactWordingTags.length > 0 ? `Required phrases: ${inputs.exactWordingTags.join(', ')}` : ''}

Use the spirit and meaning of the banned words without saying them directly.
Return: {"lines":["option1","option2","option3","option4","option5","option6"]}`
      }
    ];
    
    try {
      const antiEchoResult = await openAIService.chatJSON(antiEchoMessages, {
        max_tokens: config.generation.max_tokens,
        temperature: config.generation.temperature,
        model: config.generation.model
      });
      
      const antiEchoLines = antiEchoResult.lines || [];
      if (Array.isArray(antiEchoLines) && antiEchoLines.length > 0) {
        // Process anti-echo results with relaxed tag checking
        const antiEchoCandidates = antiEchoLines.map((line: string) => 
          postProcessLine(line, inputs.tone, [], { exactWordingTags: inputs.exactWordingTags })
        );
        
        const validAntiEcho = antiEchoCandidates.filter(c => !c.blocked);
        if (validAntiEcho.length > 0) {
          console.log('✅ Anti-echo retry succeeded');
          candidateResults = antiEchoCandidates;
          apiMeta = { ...apiMeta, usedAntiEcho: true };
        }
      }
    } catch (error) {
      console.error('Anti-echo retry failed:', error);
    }
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
  let modelUsed = apiMeta?.modelUsed || 'gpt-4.1-2025-04-14';
  let usedBackupPrompt = apiMeta?.usedBackupPrompt || false;
  let usedAntiEcho = apiMeta?.usedAntiEcho || false;
  
  // Quality retry: if we have < 4 valid lines and spelling issues, try with next model in chain
  if (uniqueValidLines.length < 4 && spellingFiltered > 0) {
    console.log(`🔄 Quality retry: only ${uniqueValidLines.length} valid lines, ${spellingFiltered} spelling filtered.`);
    
    // Get the effective config to know user's preferred model
    const config = getEffectiveConfig();
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
    
    // Ensure we have exactly 4 options by adding contextual fallbacks if needed
    while (finalCandidates.length < 4) {
      const contextualFallbacks = getContextualFallbacks(inputs.tone, inputs.category, inputs.subcategory);
      const fallbackIndex = (finalCandidates.length - (uniqueValidLines.length)) % contextualFallbacks.length;
      const nextFallback = contextualFallbacks[fallbackIndex];
      if (!finalCandidates.includes(nextFallback)) {
        finalCandidates.push(nextFallback);
      } else {
        finalCandidates.push(`${nextFallback} today`);
      }
    }
    
    // Take only first 4 if we have more
    finalCandidates = finalCandidates.slice(0, 4);
    
    // Shuffle the array to avoid always showing short ones first
    for (let i = finalCandidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [finalCandidates[i], finalCandidates[j]] = [finalCandidates[j], finalCandidates[i]];
    }
    
    // Pick the first one after shuffling
    picked = finalCandidates[0];
    usedFallback = false;
    if (!reason && tagOnlyBlocked.length > 0) {
      reason = 'Used lines with partial tag coverage';
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
        const contextualFallbacks = getContextualFallbacks(inputs.tone, inputs.category, inputs.subcategory);
        finalCandidates.push(contextualFallbacks[finalCandidates.length % contextualFallbacks.length]);
      }
      picked = finalCandidates[0];
      usedFallback = false;
      reason = 'Used model output with partial tag coverage';
    } else {
      // Genuine blocks (banned words, etc.) - use contextual fallbacks
      finalCandidates = getContextualFallbacks(inputs.tone, inputs.category, inputs.subcategory);
      picked = finalCandidates[0];
      usedFallback = true;
      reason = candidateResults.find(c => c.reason)?.reason || 'All candidates blocked';
    }
  }
  
    // Save last used model for UI tracking
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('last_text_model', modelUsed);
    }
    
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
      usedBackupPrompt,
      usedAntiEcho
    }
  };
}

export async function generateFinalLine(inputs: VibeInputs): Promise<string> {
  const result = await generateCandidates(inputs, 4);
  return result.picked;
}