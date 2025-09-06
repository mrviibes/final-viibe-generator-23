// Stubbed vibe model - returns static responses when AI is disabled
export interface VibeInputs {
  category?: string;
  subcategory?: string;
  tone?: string;
  tags?: string[];
  search_term?: string;
  recipient_name?: string;
  relationship?: string;
}

export interface VibeCandidate {
  line: string;
  blocked: boolean;
  reason?: string;
}

export interface VibeResult {
  candidates: string[];
  picked: string;
  audit: {
    model: string;
    modelDisplayName?: string;
    textSpeed?: string;
    usedFallback: boolean;
    blockedCount: number;
    candidateCount: number;
    reason?: string;
    retryAttempt?: number;
    originalModel?: string;
    originalModelDisplayName?: string;
    spellingFiltered?: number;
    topUpUsed?: boolean;
  };
}

export async function generateCandidates(inputs: VibeInputs): Promise<VibeResult> {
  // Return static response
  return {
    candidates: [
      "Frame mode: AI text generation disabled",
      "Static placeholder for " + (inputs.tone || "default") + " tone",
      "No AI processing active",
      "Frame interface ready for development"
    ],
    picked: "Frame mode: AI text generation disabled",
    audit: {
      model: "STUB_MODE",
      modelDisplayName: "Stub Mode",
      textSpeed: "instant",
      usedFallback: false,
      blockedCount: 0,
      candidateCount: 4,
      reason: "AI disabled - using static responses"
    }
  };
}

export function generateLaneStrictCandidates(inputs: VibeInputs): VibeCandidate[] {
  // Return static candidates
  return [
    { line: "Frame mode: Lane 1 placeholder", blocked: false },
    { line: "Frame mode: Lane 2 placeholder", blocked: false },
    { line: "Frame mode: Lane 3 placeholder", blocked: false },
    { line: "Frame mode: Lane 4 placeholder", blocked: false }
  ];
}