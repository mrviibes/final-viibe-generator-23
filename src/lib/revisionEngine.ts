// Revision Engine
// Implements iterative improvement until 4 candidates pass all checks

import { GenerationCandidate } from './generationEngine';
import { ValidatedInputs } from './validation';
import { scoreCandidate, ScoringResult } from './scoring';
import { openAIService } from './openai';
import { normalizeTypography } from './textUtils';

export interface RevisionResult {
  finalCandidates: ScoredCandidate[];
  totalIterations: number;
  successfulRevisions: number;
  strategies: string[];
}

export interface ScoredCandidate extends GenerationCandidate {
  score: ScoringResult;
  iteration: number;
}

const MAX_ITERATIONS = 3;
const TARGET_CANDIDATES = 4;

// Revise a single candidate that failed scoring
async function reviseSingleCandidate(
  candidate: GenerationCandidate,
  inputs: ValidatedInputs,
  failureReasons: string[]
): Promise<string | null> {
  const revisionPrompt = buildRevisionPrompt(candidate.text, inputs, failureReasons);
  
  try {
    const result = await openAIService.chatJSON([
      { role: 'system', content: 'You are an expert text editor. Revise text to fix specific issues while maintaining the original tone and intent.' },
      { role: 'user', content: revisionPrompt }
    ], {
      max_completion_tokens: 100,
      model: 'gpt-5-mini-2025-08-07'
    });

    return result.revised || null;
  } catch (error) {
    console.error("Revision failed:", error);
    return null;
  }
}

// Build revision prompt based on failure reasons
function buildRevisionPrompt(text: string, inputs: ValidatedInputs, reasons: string[]): string {
  let instructions = `Revise this text to fix these issues:\n`;
  
  for (const reason of reasons) {
    if (reason.includes("Too long")) {
      instructions += "- Make it shorter (under 100 characters)\n";
    }
    if (reason.includes("Poor tone fit")) {
      instructions += `- Make it more ${inputs.tone} in tone\n`;
    }
    if (reason.includes("Poor tag alignment")) {
      instructions += `- Better incorporate these concepts: ${inputs.text_tags.join(', ')}\n`;
    }
    if (reason.includes("Too similar")) {
      instructions += "- Make it more unique and distinctive\n";
    }
  }

  instructions += `\nOriginal: "${text}"\n\nRevise to be ${inputs.tone} in tone`;
  if (inputs.recipient_name && inputs.recipient_name !== "-") {
    instructions += ` and target ${inputs.recipient_name}`;
  }
  instructions += `. Return: {"revised":"your revision here"}`;

  return instructions;
}

// Generate additional candidates when we don't have enough passing ones
async function generateAdditionalCandidates(
  inputs: ValidatedInputs,
  existingTexts: string[],
  needed: number
): Promise<GenerationCandidate[]> {
  const prompt = `Generate ${needed} completely new ${inputs.tone} texts under 100 characters.
Make them totally different from these existing options: ${existingTexts.join('; ')}

Category: ${inputs.category} > ${inputs.subcategory}
Tags: ${inputs.text_tags.join(', ')}
${inputs.recipient_name ? `Target: ${inputs.recipient_name}` : ''}

Make each one unique in structure and wording.
Return: {"lines":["text1","text2",...]}`;

  try {
    const result = await openAIService.chatJSON([
      { role: 'system', content: `Generate ${inputs.tone} text that is creative and distinctive.` },
      { role: 'user', content: prompt }
    ], {
      max_completion_tokens: 150,
      model: 'gpt-5-mini-2025-08-07'
    });

    const lines = result.lines || [];
    return lines.map((text: string) => ({
      text: normalizeTypography(text.trim()),
      strategy: 'additional-generation'
    }));
  } catch (error) {
    console.error("Additional generation failed:", error);
    return [];
  }
}

// Main revision engine
export async function reviseUntilPassing(
  initialCandidates: GenerationCandidate[],
  inputs: ValidatedInputs
): Promise<RevisionResult> {
  let currentCandidates = [...initialCandidates];
  let totalIterations = 0;
  let successfulRevisions = 0;
  const strategies = new Set<string>();

  // Track strategies used
  currentCandidates.forEach(c => strategies.add(c.strategy));

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    totalIterations++;
    
    // Score all current candidates
    const scoredCandidates: ScoredCandidate[] = currentCandidates.map(candidate => {
      const otherTexts = currentCandidates
        .filter(c => c.text !== candidate.text)
        .map(c => c.text);
      
      const score = scoreCandidate(candidate.text, otherTexts, inputs.tone, inputs.text_tags);
      
      return {
        ...candidate,
        score,
        iteration
      };
    });

    // Get passing candidates
    const passingCandidates = scoredCandidates.filter(c => c.score.passes);
    
    // If we have enough passing candidates, we're done
    if (passingCandidates.length >= TARGET_CANDIDATES) {
      return {
        finalCandidates: passingCandidates.slice(0, TARGET_CANDIDATES),
        totalIterations,
        successfulRevisions,
        strategies: Array.from(strategies)
      };
    }

    // If this is the last iteration, return what we have
    if (iteration === MAX_ITERATIONS - 1) {
      // If we have some passing, fill with best non-passing
      const allSorted = scoredCandidates.sort((a, b) => b.score.overallScore - a.score.overallScore);
      return {
        finalCandidates: allSorted.slice(0, TARGET_CANDIDATES),
        totalIterations,
        successfulRevisions,
        strategies: Array.from(strategies)
      };
    }

    // Revise failing candidates
    const failingCandidates = scoredCandidates.filter(c => !c.score.passes);
    const revisedCandidates: GenerationCandidate[] = [];

    // Attempt to revise each failing candidate
    for (const failing of failingCandidates.slice(0, 3)) { // Limit revisions per iteration
      const revised = await reviseSingleCandidate(failing, inputs, failing.score.reasons);
      if (revised && revised !== failing.text) {
        revisedCandidates.push({
          text: revised,
          strategy: `revised-${failing.strategy}`,
          metadata: { ...failing.metadata, revisedFrom: failing.text }
        });
        successfulRevisions++;
        strategies.add(`revised-${failing.strategy}`);
      }
    }

    // If we still don't have enough candidates, generate more
    const totalCandidates = passingCandidates.length + revisedCandidates.length;
    if (totalCandidates < TARGET_CANDIDATES) {
      const needed = TARGET_CANDIDATES - totalCandidates;
      const existingTexts = [
        ...passingCandidates.map(c => c.text),
        ...revisedCandidates.map(c => c.text)
      ];
      
      const additional = await generateAdditionalCandidates(inputs, existingTexts, needed);
      revisedCandidates.push(...additional);
      strategies.add('additional-generation');
    }

    // Update candidates for next iteration
    currentCandidates = [
      ...passingCandidates,
      ...revisedCandidates
    ];
  }

  // Fallback (shouldn't reach here due to loop structure, but just in case)
  const finalScored = currentCandidates.map(candidate => ({
    ...candidate,
    score: scoreCandidate(
      candidate.text, 
      currentCandidates.filter(c => c.text !== candidate.text).map(c => c.text),
      inputs.tone, 
      inputs.text_tags
    ),
    iteration: totalIterations
  }));

  return {
    finalCandidates: finalScored.slice(0, TARGET_CANDIDATES),
    totalIterations,
    successfulRevisions,
    strategies: Array.from(strategies)
  };
}