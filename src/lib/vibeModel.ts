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
import { 
  validateFourLaneOutput,
  getLanesForCategory,
  validateTagPlacement,
  validateLengthDiversity,
  validateOpeningWordVariety
} from './textGenerationGuards';

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
  

export async function generateCandidates(inputs: VibeInputs, n: number = 4): Promise<VibeResult> {
  const candidateResults = await generateMultipleCandidates(inputs);
  
  // Extract API metadata if available
  const apiMeta = (candidateResults as any)._apiMeta || null;
  
  // Enhanced 4-lane validation
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
    console.log('🔍 4-LANE QUALITY ISSUES:');
    qualityCheck.issues.forEach(issue => console.log(`  - ${issue}`));
    console.log('Tag placements:', qualityCheck.details.tagPlacement.placements);
    console.log('Lengths:', qualityCheck.details.lengthDiversity.lengths);
    console.log('Opening words:', qualityCheck.details.openingVariety.openingWords);
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

}

export async function generateFinalLine(inputs: VibeInputs): Promise<string> {
  const result = await generateCandidates(inputs, 4);
  return result.picked;
}