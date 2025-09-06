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
  const { category, subcategory, tone, tags = [] } = inputs;
  
  const systemPrompt = `You are a creative text generator that creates short, catchy phrases for ${category} events.
Focus on ${tone} tone and ${subcategory} context.
Generate exactly 4 unique, creative lines that are:
- Short and memorable (2-8 words)
- Appropriate for ${tone} tone
- Relevant to ${subcategory}
- Engaging and fun

Return ONLY a JSON array of 4 strings, nothing else.`;

  const userPrompt = `Generate 4 creative text lines for:
Category: ${category}
Subcategory: ${subcategory}
Tone: ${tone}
${tags.length > 0 ? `Tags: ${tags.join(', ')}` : ''}

Return as JSON array of strings.`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
}

/**
 * Build messages for generating visual prompts
 */
export function buildVisualMessages(inputs: AiInputs): ChatMessage[] {
  const { category, subcategory, tone, visualStyle = 'Realistic', visualTags = [] } = inputs;
  
  const systemPrompt = `You are a visual prompt generator for image generation.
Create detailed, specific prompts for ${visualStyle} style images.
Focus on ${tone} mood and ${subcategory} themes.

Generate exactly 4 unique visual prompts that are:
- Detailed and specific
- Appropriate for ${visualStyle} style
- Capturing ${tone} mood
- Relevant to ${subcategory}

Return ONLY a JSON array of 4 prompt strings, nothing else.`;

  const userPrompt = `Generate 4 visual prompts for:
Category: ${category}
Subcategory: ${subcategory}
Tone: ${tone}
Style: ${visualStyle}
${visualTags.length > 0 ? `Visual Tags: ${visualTags.join(', ')}` : ''}

Return as JSON array of prompt strings.`;

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