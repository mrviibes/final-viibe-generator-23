// Main Vibe Maker Engine
// Orchestrates the complete generation process according to training sheet specs

import { validateInputs, ValidatedInputs } from './validation';
import { generateCandidatePool } from './generationEngine';
import { reviseUntilPassing, ScoredCandidate } from './revisionEngine';
import { scoreCandidate } from './scoring';

export interface VibeMakerRequest {
  category: string;
  subcategory: string;
  tone: string;
  text_tags: string[];
  recipient_name?: string;
  relationship?: string;
  language?: string;
}

export interface VibeMakerResponse {
  metadata: {
    category: string;
    subcategory: string;
    tone: string;
    text_tags: string[];
  };
  text_suggestions: string[];
  audit?: {
    totalGenerated: number;
    strategies: string[];
    iterations: number;
    successfulRevisions: number;
    validationErrors?: string[];
    model: string;
  };
}

export interface VibeMakerError {
  error: string;
  code: string;
  details?: any;
}

// Main engine function
export async function generateVibes(request: VibeMakerRequest): Promise<VibeMakerResponse | VibeMakerError> {
  try {
    // Step 1: Validate inputs, normalize casing, trim whitespace
    const validation = validateInputs(request);
    if (!validation.isValid || !validation.normalizedInputs) {
      return {
        error: "Input validation failed",
        code: "VALIDATION_ERROR",
        details: validation.errors
      };
    }

    const inputs = validation.normalizedInputs;

    // Step 2: Build tone profile and tag context (handled in generation engine)
    
    // Step 3: Generate a large candidate pool from category, subcategory, tone, tags
    const generationResult = await generateCandidatePool(inputs);
    
    if (generationResult.candidates.length === 0) {
      return {
        error: "No candidates could be generated",
        code: "GENERATION_FAILED"
      };
    }

    // Step 4: Score for length, tone fit, uniqueness, tag alignment, safety
    // Step 5: Revise and re-score until four pass all checks
    const revisionResult = await reviseUntilPassing(generationResult.candidates, inputs);

    // Step 6: Format output JSON, run a final validator, return
    const finalCandidates = revisionResult.finalCandidates.slice(0, 4);
    
    // Ensure we have exactly 4 candidates (pad with fallbacks if needed)
    const textSuggestions: string[] = [];
    
    for (let i = 0; i < 4; i++) {
      if (i < finalCandidates.length) {
        textSuggestions.push(finalCandidates[i].text);
      } else {
        // Generate simple fallback
        const fallback = generateSimpleFallback(inputs, i);
        textSuggestions.push(fallback);
      }
    }

    // Final validation - ensure all suggestions are valid
    const validatedSuggestions = textSuggestions.map(text => {
      if (!text || text.length === 0) {
        return generateSimpleFallback(inputs, 0);
      }
      if (text.length > 100) {
        return text.slice(0, 100).trim();
      }
      return text;
    });

    // Step 7: Return formatted response
    const response: VibeMakerResponse = {
      metadata: {
        category: inputs.category,
        subcategory: inputs.subcategory,
        tone: inputs.tone,
        text_tags: inputs.text_tags
      },
      text_suggestions: validatedSuggestions,
      audit: {
        totalGenerated: generationResult.totalGenerated,
        strategies: [...generationResult.strategies, ...revisionResult.strategies],
        iterations: revisionResult.totalIterations,
        successfulRevisions: revisionResult.successfulRevisions,
        model: generationResult.model
      }
    };

    return response;

  } catch (error) {
    console.error("Vibe Maker Engine error:", error);
    return {
      error: "Internal generation error",
      code: "INTERNAL_ERROR",
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

// Generate simple fallback when needed
function generateSimpleFallback(inputs: ValidatedInputs, index: number): string {
  const fallbacks: Record<string, string[]> = {
    humorous: [
      "That's funny and you know it",
      "Comedy gold right here", 
      "Making everyone laugh today",
      "Humor level: maximum"
    ],
    savage: [
      "No mercy today",
      "Straight fire right here",
      "Bold moves only", 
      "Zero chill activated"
    ],
    romantic: [
      "You make everything better",
      "Perfect moments like this",
      "Heart full of love",
      "Sweet feelings today"
    ],
    wholesome: [
      "Pure good vibes only",
      "Grateful for moments like this",
      "Positivity in full effect",
      "Wholesome energy activated"
    ]
  };

  const toneFallbacks = fallbacks[inputs.tone] || fallbacks.humorous;
  return toneFallbacks[index % toneFallbacks.length];
}

// Convenience function for backward compatibility
export async function generateSingleLine(inputs: VibeMakerRequest): Promise<string> {
  const result = await generateVibes(inputs);
  
  if ('error' in result) {
    return generateSimpleFallback(inputs as ValidatedInputs, 0);
  }
  
  return result.text_suggestions[0] || generateSimpleFallback(inputs as ValidatedInputs, 0);
}