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
  getRuntimeOverrides,
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

// Post-processing now handled by centralized config

async function generateMultipleCandidates(inputs: VibeInputs, overrideModel?: string): Promise<VibeCandidate[]> {
  try {
    // Use effective config with runtime overrides
    const config = getEffectiveConfig();
    const targetModel = overrideModel || config.generation.model;
    
    console.log(`🚀 Text generation starting with user-selected model: ${targetModel}`);
    
    // Use centralized message builder
    const messages = buildVibeGeneratorMessages(inputs);
    
    // Use fast token budget (120) for all models in fast mode
    const maxTokens = 120;
    
    const result = await openAIService.chatJSON(messages, {
      max_completion_tokens: maxTokens,
      temperature: config.generation.temperature,
      model: targetModel
    });
    
    // Store the API metadata for later use
    const apiMeta = result._apiMeta;
    
    // Extract lines from JSON response - be tolerant of different formats
    const lines = result.lines || result.options || result.candidates || result.texts || [];
    if (!Array.isArray(lines) || lines.length === 0) {
      console.error('API format mismatch - no valid lines array found in:', result);
      throw new Error('Local placeholder (API format mismatch)');
    }
    
    // Check if this is knock-knock format
    const isKnockKnock = inputs.subcategory?.toLowerCase().includes("knock");
    const postProcessOptions = isKnockKnock ? { allowNewlines: true, format: 'knockknock' as const } : undefined;
    
    // Post-process each line with tag validation
    const candidates = lines.map((line: string) => postProcessLine(line, inputs.tone, inputs.tags, postProcessOptions));
    
    // Add API metadata to candidates for later extraction
    if (apiMeta && candidates.length > 0) {
      (candidates as any)._apiMeta = apiMeta;
    }
    
    return candidates;
  } catch (error) {
    console.error('Failed to generate multiple candidates:', error);
    // Blend first tag into fallback variants if available
    const fallbackVariants = getFallbackVariants(inputs.tone, inputs.category, inputs.subcategory);
    const firstTag = inputs.tags && inputs.tags.length > 0 ? inputs.tags[0] : null;
    
    return fallbackVariants.map((line, index) => {
      let finalLine = line;
      // Blend first tag into the first two fallbacks
      if (firstTag && index < 2) {
        finalLine = `${line} ${firstTag}`;
      }
      return {
        line: finalLine,
        blocked: true,
        reason: index === 0 ? `Local placeholder (${error instanceof Error ? error.message : 'API failure'})` : 'Local fallback variant'
      };
    });
  }
}

// Helper function to generate tone-specific phrase candidates
function phraseCandidates(tone: string, tags?: string[]): string[] {
  // Include up to first two tags to help with validation
  const tagSuffix = tags && tags.length > 0 ? ` ${tags.slice(0, 2).join(' ')}` : '';
  
  const toneMap: Record<string, string[]> = {
    humorous: ['Hilarious vibes only', 'Comedy gold incoming', 'Laugh track ready', 'Funny bone activated'],
    sarcastic: ['Oh, absolutely perfect', 'Well, this is fantastic', 'Clearly the best choice', 'Obviously brilliant'],
    savage: ['No mercy shown', 'Brutally honest moment', 'Pure intensity', 'Maximum effort'],
    witty: ['Clever comeback ready', 'Sharp wit engaged', 'Smartly crafted', 'Intelligence on display'],
    playful: ['Fun times ahead', 'Playful energy activated', 'Good vibes flowing', 'Cheerful moment incoming'],
    romantic: ['Love in the air', 'Heart eyes activated', 'Romance mode on', 'Sweetness overload'],
    motivational: ['Success mindset engaged', 'Determination activated', 'Victory mode on', 'Champions only'],
    nostalgic: ['Memory lane vibes', 'Throwback feels', 'Classic moment', 'Vintage energy'],
    mysterious: ['Secrets revealed slowly', 'Mystery mode activated', 'Enigma engaged', 'Curiosity sparked'],
    confident: ['Boss energy activated', 'Confidence on full', 'Self-assured vibes', 'Power mode engaged']
  };
  
  const basePhrases = toneMap[tone.toLowerCase()] || toneMap.humorous;
  return basePhrases.map(phrase => `${phrase}${tagSuffix}`);
}

export async function generateCandidates(inputs: VibeInputs, n: number = 4): Promise<VibeResult> {
  const candidateResults = await generateMultipleCandidates(inputs);
  
  // Extract API metadata if available
  const apiMeta = (candidateResults as any)._apiMeta || null;
  
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
    
    // Re-rank to prioritize tag inclusion - ensure at least 2 of 4 include tags
    if (inputs.tags && inputs.tags.length > 0) {
      const taggedCandidates: string[] = [];
      const untaggedCandidates: string[] = [];
      
      finalCandidates.forEach(candidate => {
        const hasTag = inputs.tags!.some(tag => 
          candidate.toLowerCase().includes(tag.toLowerCase()) ||
          // Check for close paraphrases
          candidate.toLowerCase().includes(tag.toLowerCase().slice(0, 4))
        );
        if (hasTag) {
          taggedCandidates.push(candidate);
        } else {
          untaggedCandidates.push(candidate);
        }
      });
      
      // Ensure we have at least 2 tagged options out of 4
      finalCandidates = [...taggedCandidates.slice(0, 2), ...untaggedCandidates.slice(0, 2)];
    }
    
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
        console.log('✅ Padding: Added validated candidate:', processedCandidate.line);
      } else {
        console.log('❌ Padding: Rejected candidate:', nextCandidate, 'blocked:', processedCandidate.blocked);
        // Don't add anything if validation fails - keep trying with next candidate
      }
    }
    
    // If still not enough after all attempts, use basic fallbacks
    while (finalCandidates.length < 4) {
      const fallbackVariants = getFallbackVariants(inputs.tone, inputs.category, inputs.subcategory);
      const nextFallback = fallbackVariants[finalCandidates.length % fallbackVariants.length];
      if (!finalCandidates.includes(nextFallback)) {
        finalCandidates.push(nextFallback);
        console.log('⚡ Emergency fallback added:', nextFallback);
      } else {
        break; // Prevent infinite loop if all fallbacks are already used
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
      reason = 'Used model output with partial tag coverage';
    } else {
      // Genuine blocks (banned words, etc.) - use tone-specific phrases instead of generic fallbacks
      const phraseCandidatesList = phraseCandidates(inputs.tone, inputs.tags);
      finalCandidates = phraseCandidatesList;
      
      picked = finalCandidates[0];
      usedFallback = true;
      reason = candidateResults.find(c => c.reason)?.reason || 'Local placeholder (content filtered)';
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
      topUpUsed
    }
  };
}

export async function generateFinalLine(inputs: VibeInputs): Promise<string> {
  const result = await generateCandidates(inputs, 4);
  return result.picked;
}