// Validation functions for AI-generated content

export interface TextLine {
  lane: 'platform' | 'audience' | 'skill' | 'absurdity';
  text: string;
}

export interface VisualPrompt {
  lane: 'objects' | 'group' | 'solo' | 'creative';
  text: string;
}

/**
 * Validate text lines response from AI
 */
export function validateTextLines(
  response: any,
  requiredTags: string[]
): { valid: boolean; lines?: TextLine[]; error?: string } {
  try {
    if (!response || !response.lines || !Array.isArray(response.lines)) {
      return { valid: false, error: 'Invalid response format' };
    }

    const lines = response.lines as TextLine[];
    if (lines.length !== 4) {
      return { valid: false, error: 'Must have exactly 4 lines' };
    }

    const expectedLanes = ['platform', 'audience', 'skill', 'absurdity'];
    const foundLanes = lines.map(l => l.lane);
    
    for (const lane of expectedLanes) {
      if (!foundLanes.includes(lane as any)) {
        return { valid: false, error: `Missing lane: ${lane}` };
      }
    }

    // Check tag requirements
    for (const line of lines) {
      if (!line.text || line.text.length > 100) {
        return { valid: false, error: `Line too long: ${line.lane}` };
      }

      // Check all tags present
      for (const tag of requiredTags) {
        if (!line.text.toLowerCase().includes(tag.toLowerCase())) {
          return { valid: false, error: `Missing tag "${tag}" in ${line.lane}` };
        }
      }

      // Check forbidden punctuation
      if (line.text.includes('--') || line.text.includes('—')) {
        return { valid: false, error: `Forbidden punctuation in ${line.lane}` };
      }
    }

    return { valid: true, lines };
  } catch (error) {
    return { valid: false, error: 'Validation error' };
  }
}

/**
 * Validate visual prompts response from AI
 */
export function validateVisualPrompts(
  response: any,
  requiredTags: string[]
): { valid: boolean; prompts?: VisualPrompt[]; error?: string } {
  try {
    if (!response || !response.prompts || !Array.isArray(response.prompts)) {
      return { valid: false, error: 'Invalid response format' };
    }

    const prompts = response.prompts as VisualPrompt[];
    if (prompts.length !== 4) {
      return { valid: false, error: 'Must have exactly 4 prompts' };
    }

    const expectedLanes = ['objects', 'group', 'solo', 'creative'];
    const foundLanes = prompts.map(p => p.lane);
    
    for (const lane of expectedLanes) {
      if (!foundLanes.includes(lane as any)) {
        return { valid: false, error: `Missing lane: ${lane}` };
      }
    }

    for (const prompt of prompts) {
      if (!prompt.text || prompt.text.length > 300) {
        return { valid: false, error: `Prompt too long: ${prompt.lane}` };
      }

      // Check all tags present
      for (const tag of requiredTags) {
        if (!prompt.text.toLowerCase().includes(tag.toLowerCase())) {
          return { valid: false, error: `Missing tag "${tag}" in ${prompt.lane}` };
        }
      }

      // Lane-specific validation
      const text = prompt.text.toLowerCase();
      
      if (prompt.lane === 'objects' && (text.includes('person') || text.includes('people') || text.includes('man') || text.includes('woman'))) {
        return { valid: false, error: 'Objects lane cannot contain people' };
      }

      if (prompt.lane === 'group' && !text.includes('people') && !text.includes('group')) {
        return { valid: false, error: 'Group lane must mention multiple people' };
      }

      if (prompt.lane === 'creative' && !text.includes('symbolic') && !text.includes('abstract')) {
        return { valid: false, error: 'Creative lane must be symbolic or abstract' };
      }
    }

    return { valid: true, prompts };
  } catch (error) {
    return { valid: false, error: 'Validation error' };
  }
}

/**
 * Build deterministic fallback text lines
 */
export function buildTextFallback(
  category: string,
  subcategory: string,
  tone: string,
  tags: string[]
): TextLine[] {
  const tagStr = tags.join(', ');
  
  return [
    {
      lane: 'platform',
      text: `${category} ${subcategory} with ${tagStr}`
    },
    {
      lane: 'audience', 
      text: `For ${tagStr} enthusiasts everywhere`
    },
    {
      lane: 'skill',
      text: `Master the art of ${tagStr} in ${subcategory}`
    },
    {
      lane: 'absurdity',
      text: `When ${tagStr} meets ${subcategory} magic happens`
    }
  ];
}

/**
 * Build deterministic fallback visual prompts
 */
export function buildVisualFallback(
  category: string,
  subcategory: string,
  tags: string[]
): VisualPrompt[] {
  const tagStr = tags.join(', ');
  
  return [
    {
      lane: 'objects',
      text: `${tagStr} items arranged for ${subcategory}, clean composition`
    },
    {
      lane: 'group',
      text: `Group of people enjoying ${subcategory} with ${tagStr} elements`
    },
    {
      lane: 'solo',
      text: `Person celebrating ${subcategory} surrounded by ${tagStr} decorations`
    },
    {
      lane: 'creative',
      text: `Abstract symbolic representation of ${tagStr} and ${subcategory} energy`
    }
  ];
}