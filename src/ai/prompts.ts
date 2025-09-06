// New AI prompt building system - isolated from legacy code

export interface AiInputs {
  category: string;
  subcategory: string;
  tone: string;
  tags?: string[];
  visualStyle?: string;
  visualTags?: string[];
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Build messages for generating text lines/phrases
 */
export function buildTextLinesMessages(inputs: AiInputs): ChatMessage[] {
  const systemPrompt = `You must return ONLY valid JSON: {"lines":[{"lane":"platform","text":"..."},{"lane":"audience","text":"..."},{"lane":"skill","text":"..."},{"lane":"absurdity","text":"..."}]}

LANES (4 distinct approaches):
- Platform (~50 chars): Reference context/setting
- Audience (~70 chars): Who this resonates with  
- Skill (~90 chars): Highlight abilities/actions
- Absurdity (≤100 chars): Unexpected twist

TONE: ${inputs.tone}
${getToneInstructions(inputs.tone)}

RULES:
- ALL tags MUST appear in EVERY line: ${inputs.tags?.join(', ') || 'none'}
- Only commas, periods, colons (NO em-dash or --)
- Output strictly valid JSON only`;

  const userPrompt = `Category: ${inputs.category}
Subcategory: ${inputs.subcategory}
Tone: ${inputs.tone}
Tags: ${inputs.tags?.join(', ') || 'none'}`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
}

/**
 * Build messages for generating visual prompts
 */
export function buildVisualMessages(inputs: AiInputs): ChatMessage[] {
  const systemPrompt = `You must return ONLY valid JSON: {"prompts":[{"lane":"objects","text":"..."},{"lane":"group","text":"..."},{"lane":"solo","text":"..."},{"lane":"creative","text":"..."}]}

LANES (4 distinct visuals):
- Objects: Props/environment only (NO people)
- Group: Multiple people with candid gestures  
- Solo: One person doing specific action (verb required)
- Creative: Symbolic/abstract composition

RULES:
- ALL tags in every lane: ${inputs.visualTags?.join(', ') || 'none'}
- Objects: NO people words
- Group: Multiple people mentioned
- Solo: One person + action verb
- Creative: Must say "symbolic" or "abstract"
- ≤300 chars each
- NO style words (${inputs.visualStyle})
- Output strictly valid JSON only`;

  const userPrompt = `Category: ${inputs.category}
Subcategory: ${inputs.subcategory}
Visual tags: ${inputs.visualTags?.join(', ') || 'none'}`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
}

/**
 * Generic JSON message builder
 */
export function buildGenericJSONMessages(
  systemPrompt: string,
  userPrompt: string
): ChatMessage[] {
  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
}

// Helper function for tone instructions
function getToneInstructions(tone: string): string {
  const instructions = {
    "Humorous": "Use light puns and exaggeration. Keep it fun and accessible.",
    "Savage": "Bold wit and roasts. Push boundaries but stay clever.",
    "Sentimental": "Heartfelt and warm. Focus on emotional connections.",
    "Nostalgic": "Wistful, retro callbacks. Reference past eras fondly.",
    "Romantic": "Affectionate and dreamy. Focus on love and connection.",
    "Inspirational": "Uplifting and motivational. Encourage and empower.",
    "Playful": "Cheeky and mischievous. Light teasing and fun.",
    "Serious": "Factual and respectful. Maintain dignity and accuracy."
  };
  return instructions[tone] || "Maintain appropriate tone for the context.";
}