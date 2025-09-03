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
      // Validate fallback through postProcessLine to ensure no banned patterns
      const processedFallback = postProcessLine(line, inputs.tone, inputs.tags || []);
      const finalLine = processedFallback.blocked ? 
        phraseCandidates(inputs.tone, inputs.tags)[index % 4] : 
        processedFallback.line;
      
      return {
        line: finalLine,
        blocked: true,
        reason: index === 0 ? `Local placeholder (${error instanceof Error ? error.message : 'API failure'})` : 'Local fallback variant'
      };
    });
  }
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
      reason = 'Used model output with partial tag coverage';
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