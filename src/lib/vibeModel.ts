import { openAIService } from './openai';
import { 
  postProcessLine,
  TONE_FALLBACKS,
  AI_CONFIG,
  SYSTEM_PROMPTS,
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

async function generateMultipleCandidates(inputs: VibeInputs): Promise<VibeCandidate[]> {
  try {
    const systemPromptUpdated = SYSTEM_PROMPTS.vibe_generator;

    // Enhanced instructions for movie/pop culture + quotes
    const isMovie = inputs.category === "Pop Culture" && inputs.subcategory?.toLowerCase().includes("movie");
    const hasQuotes = inputs.tags?.some(tag => tag.toLowerCase().includes("quote")) || false;
    const hasPersonalRoast = inputs.tags?.some(tag => tag.toLowerCase().includes("making fun") || tag.toLowerCase().includes("bald") || tag.toLowerCase().includes("roast")) || false;

    let specialInstructions = "";
    if (isMovie && hasQuotes) {
      specialInstructions = "\n• When creating content about a specific movie with quote tags, reference the movie's iconic characters, themes, or memorable elements\n• Make it sound like it could be dialogue or a reference from that movie's universe";
    }
    if (hasPersonalRoast && inputs.recipient_name && inputs.recipient_name !== "-") {
      specialInstructions += `\n• Incorporate ${inputs.recipient_name} naturally into the content while maintaining the roasting tone`;
    }
    
    // Add stronger recipient targeting for any tone when recipient is specified
    if (inputs.recipient_name && inputs.recipient_name !== "-" && inputs.tone === "Savage") {
      specialInstructions += `\n• CRITICAL: Every line must specifically target ${inputs.recipient_name} by name - make fun of them directly, not generic content`;
    }

    const tagRequirement = inputs.tags && inputs.tags.length > 0 
      ? `\n• Aim to include or reference these tags naturally (paraphrasing is fine): ${inputs.tags.join(', ')}`
      : '';

    const corePrompt = `Generate 6 concise options under 100 chars each for:
Category: ${inputs.category} > ${inputs.subcategory}
Tone: ${inputs.tone}
Tags: ${inputs.tags?.join(', ') || 'none'}
${inputs.recipient_name && inputs.recipient_name !== "-" ? `Target: ${inputs.recipient_name}` : ''}

${tagRequirement}${specialInstructions}

Return only: {"lines":["option1","option2","option3","option4","option5","option6"]}`;

    const systemMessage = inputs.tone === 'Savage' 
      ? 'Generate short, savage roasts/burns. Make them cutting and direct, NOT joke-like. JSON array only.'
      : 'Generate short, witty text. JSON array only. No explanations.';
    
    const messages = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: corePrompt }
    ];
    
    const result = await openAIService.chatJSON(messages, {
      max_tokens: AI_CONFIG.generation.max_tokens,
      temperature: AI_CONFIG.generation.temperature,
      model: AI_CONFIG.generation.model
    });
    
    // Store the API metadata for later use
    const apiMeta = result._apiMeta;
    
    // Extract lines from JSON response
    const lines = result.lines || [];
    if (!Array.isArray(lines) || lines.length === 0) {
      throw new Error('Invalid response format - no lines array');
    }
    
    // Post-process each line with tag validation
    const candidates = lines.map((line: string) => postProcessLine(line, inputs.tone, inputs.tags));
    
    // Add API metadata to candidates for later extraction
    if (apiMeta && candidates.length > 0) {
      (candidates as any)._apiMeta = apiMeta;
    }
    
    return candidates;
  } catch (error) {
    console.error('Failed to generate multiple candidates:', error);
    // Return fallback variants instead of duplicates
    const fallbackVariants = getFallbackVariants(inputs.tone, inputs.category, inputs.subcategory);
    return fallbackVariants.map((line, index) => ({
      line,
      blocked: true,
      reason: index === 0 ? `API Error: ${error instanceof Error ? error.message : 'Unknown error'}` : 'Fallback variant'
    }));
  }
}

export async function generateCandidates(inputs: VibeInputs, n: number = 4): Promise<VibeResult> {
  const candidateResults = await generateMultipleCandidates(inputs);
  
  // Extract API metadata if available
  const apiMeta = (candidateResults as any)._apiMeta || null;
  
  // Filter out blocked candidates and remove duplicates
  const validCandidates = candidateResults.filter(c => !c.blocked);
  const uniqueValidLines = Array.from(new Set(validCandidates.map(c => c.line)));
  const blockedCount = candidateResults.length - validCandidates.length;
  
  let finalCandidates: string[] = [];
  let picked: string = '';
  let usedFallback = false;
  let reason: string | undefined;
  
  if (uniqueValidLines.length > 0) {
    // Use only the actual valid lines generated by the model
    finalCandidates = [...uniqueValidLines];
    
    // Check if we have any lines that were blocked only for tag coverage
    const tagOnlyBlocked = candidateResults.filter(c => 
      c.blocked && c.reason?.includes('tag coverage')
    );
    
    // If we have tag-only blocked lines, add them too
    if (tagOnlyBlocked.length > 0) {
      const tagBlockedLines = tagOnlyBlocked.map(c => c.line);
      finalCandidates.push(...tagBlockedLines);
    }
    
    // Ensure we have exactly 4 options by adding fallbacks if needed
    while (finalCandidates.length < 4) {
      const fallbackVariants = getFallbackVariants(inputs.tone, inputs.category, inputs.subcategory);
      const nextFallback = fallbackVariants[finalCandidates.length % fallbackVariants.length];
      if (!finalCandidates.includes(nextFallback)) {
        finalCandidates.push(nextFallback);
      } else {
        finalCandidates.push(`${nextFallback} ${finalCandidates.length}`);
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
    reason = tagOnlyBlocked.length > 0 ? 'Used lines with partial tag coverage' : undefined;
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
      // Genuine blocks (banned words, etc.) - use tone-based fallbacks
      finalCandidates = getFallbackVariants(inputs.tone, inputs.category, inputs.subcategory);
      picked = finalCandidates[0];
      usedFallback = true;
      reason = candidateResults.find(c => c.reason)?.reason || 'All candidates blocked';
    }
  }
  
    return {
    candidates: finalCandidates,
    picked,
    audit: {
      model: apiMeta?.modelUsed || 'gpt-4o-mini',
      textSpeed: apiMeta?.textSpeed || 'fast',
      usedFallback,
      blockedCount,
      candidateCount: finalCandidates.length,
      reason,
      retryAttempt: apiMeta?.retryAttempt || 0,
      originalModel: apiMeta?.originalModel
    }
  };
}

export async function generateFinalLine(inputs: VibeInputs): Promise<string> {
  const result = await generateCandidates(inputs, 4);
  return result.picked;
}