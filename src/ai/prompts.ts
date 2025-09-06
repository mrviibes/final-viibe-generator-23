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
  const systemPrompt = `You are a witty content generator that creates 4 distinct one-liners following specific lanes.

LANES STRUCTURE:
- Platform (~50 chars): Reference the context/setting
- Audience (~70 chars): Speak to who this resonates with  
- Skill (~90 chars): Highlight abilities or actions
- Absurdity (≤100 chars): Push boundaries with unexpected twists

TONE: ${inputs.tone}
${getToneInstructions(inputs.tone)}

RULES:
- All tags must appear in EVERY line: ${inputs.tags?.join(', ') || 'none'}
- Use only commas, periods, colons (NO em-dash or --)
- Each lane must be unique in approach
- Return array of 4 strings: [platform, audience, skill, absurdity]`;

  const userPrompt = `Generate 4 one-liners for: ${inputs.category} → ${inputs.subcategory}

Tags to include: ${inputs.tags?.join(', ') || 'none'}
Tone: ${inputs.tone}

Return as JSON array of 4 strings following the lane structure.`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
}

/**
 * Build messages for generating visual prompts
 */
export function buildVisualMessages(inputs: AiInputs): ChatMessage[] {
  const systemPrompt = `You are a visual prompt generator that creates 4 distinct image prompts following specific lanes.

LANES STRUCTURE:
- Objects: Props/environment only (NO people)
- Group: Multiple people with candid gestures  
- Solo: One person doing a specific action (verb required)
- Creative: Symbolic/abstract composition

RULES:
- All tags must appear in every lane: ${inputs.visualTags?.join(', ') || 'none'}
- Objects lane: NO people words allowed
- Group lane: Must mention multiple people
- Solo lane: Must include one person + action verb
- Creative lane: Must say "symbolic" or "abstract"
- Keep prompts ≤300 chars each
- Do NOT include style words (${inputs.visualStyle}, etc.)
- Return array of 4 strings: [objects, group, solo, creative]`;

  const userPrompt = `Generate 4 visual prompts for: ${inputs.category} → ${inputs.subcategory}

Visual tags: ${inputs.visualTags?.join(', ') || 'none'}
Style: ${inputs.visualStyle} (don't include in prompts)

Return as JSON array of 4 strings following the lane structure.`;

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