// Enhanced Generation Engine
// Generates 12-24 candidates using multiple strategies and templates

import { openAIService } from './openai';
import { ValidatedInputs } from './validation';
import { getToneProfile, getToneTemplates } from './toneProfiles';
import { normalizeTypography } from './textUtils';

export interface GenerationCandidate {
  text: string;
  strategy: string;
  metadata?: any;
}

export interface GenerationResult {
  candidates: GenerationCandidate[];
  totalGenerated: number;
  strategies: string[];
  model: string;
  retryAttempt?: number;
}

// Template-based generation
function generateFromTemplates(inputs: ValidatedInputs): string[] {
  const templates = getToneTemplates(inputs.tone);
  const candidates: string[] = [];
  
  for (const template of templates.slice(0, 4)) { // Use first 4 templates
    try {
      let filled = template;
      
      // Simple template filling
      if (inputs.recipient_name && inputs.recipient_name !== "-") {
        filled = filled.replace(/\[Name\]/g, inputs.recipient_name);
        filled = filled.replace(/\[name\]/g, inputs.recipient_name);
      }
      
      // Fill common placeholders based on tags
      const tags = inputs.text_tags;
      if (tags.length > 0) {
        filled = filled.replace(/\[thing\]/g, tags[0] || "thing");
        filled = filled.replace(/\[activity\]/g, tags.find(t => t.includes('ing')) || tags[0] || "activity");
        filled = filled.replace(/\[situation\]/g, tags[0] || "situation");
      }
      
      // Generic replacements
      filled = filled.replace(/\[adjective\]/g, "amazing");
      filled = filled.replace(/\[reaction\]/g, "can't even");
      filled = filled.replace(/\[quality\]/g, "style");
      
      if (filled !== template && filled.length <= 100) {
        candidates.push(filled);
      }
    } catch (error) {
      console.warn("Template filling error:", error);
    }
  }
  
  return candidates;
}

// Free-form AI generation with tone-specific prompts
async function generateFreeForm(inputs: ValidatedInputs, count: number = 8): Promise<string[]> {
  const profile = getToneProfile(inputs.tone);
  const toneContext = profile ? `
Tone traits: ${profile.traits.join(', ')}
Cues to include: ${profile.cues.join(', ')}
Avoid: ${profile.avoid.join(', ')}
` : '';

  const specialInstructions = buildSpecialInstructions(inputs);
  
  const prompt = `Generate ${count} distinct, creative text options under 100 characters each.

Context:
Category: ${inputs.category} > ${inputs.subcategory}
Tone: ${inputs.tone}
Tags: ${inputs.text_tags.join(', ')}
${inputs.recipient_name ? `Target: ${inputs.recipient_name}` : ''}

${toneContext}${specialInstructions}

Requirements:
- Each option must be completely different in structure and wording
- Stay under 100 characters including spaces
- Use plain text, no emojis or quotes
- Use tags as inspiration, not literal lists
- Make each line self-contained and impactful

Return only: {"lines":["option1","option2",...]}`;

  try {
    const result = await openAIService.chatJSON([
      { role: 'system', content: getToneSystemPrompt(inputs.tone) },
      { role: 'user', content: prompt }
    ], {
      max_completion_tokens: 200,
      model: 'gpt-5-mini-2025-08-07'
    });

    return result.lines || [];
  } catch (error) {
    console.error("Free-form generation failed:", error);
    return [];
  }
}

// Targeted generation for specific scenarios
async function generateTargeted(inputs: ValidatedInputs): Promise<string[]> {
  if (!inputs.recipient_name || inputs.recipient_name === "-") {
    return [];
  }

  const isRoast = inputs.tone === 'savage' || inputs.tone === 'roast';
  const prompt = isRoast 
    ? `Generate 4 sharp, clever roasts targeting ${inputs.recipient_name}. Make them cutting but not cruel. Under 100 chars each.`
    : `Generate 4 personalized ${inputs.tone} messages for ${inputs.recipient_name}. Under 100 chars each.`;

  try {
    const result = await openAIService.chatJSON([
      { role: 'system', content: getToneSystemPrompt(inputs.tone) },
      { role: 'user', content: prompt + ' Return: {"lines":["text1","text2","text3","text4"]}' }
    ], {
      max_completion_tokens: 150,
      model: 'gpt-5-mini-2025-08-07'
    });

    return result.lines || [];
  } catch (error) {
    console.error("Targeted generation failed:", error);
    return [];
  }
}

// Tag-focused generation
async function generateTagFocused(inputs: ValidatedInputs): Promise<string[]> {
  if (inputs.text_tags.length === 0) {
    return [];
  }

  const primaryTags = inputs.text_tags.slice(0, 3); // Focus on first 3 tags
  const prompt = `Create 4 ${inputs.tone} texts that cleverly incorporate these concepts: ${primaryTags.join(', ')}. 
Each under 100 chars. Make them witty and ${inputs.tone}.
Return: {"lines":["text1","text2","text3","text4"]}`;

  try {
    const result = await openAIService.chatJSON([
      { role: 'system', content: getToneSystemPrompt(inputs.tone) },
      { role: 'user', content: prompt }
    ], {
      max_completion_tokens: 150,
      model: 'gpt-5-mini-2025-08-07'
    });

    return result.lines || [];
  } catch (error) {
    console.error("Tag-focused generation failed:", error);
    return [];
  }
}

// Helper functions
function buildSpecialInstructions(inputs: ValidatedInputs): string {
  let instructions = "";
  
  const isMovie = inputs.category === "pop-culture" && inputs.subcategory === "movies";
  const hasQuotes = inputs.text_tags.some(tag => tag.toLowerCase().includes("quote"));
  const hasPersonalRoast = inputs.text_tags.some(tag => 
    tag.toLowerCase().includes("roast") || 
    tag.toLowerCase().includes("making fun")
  );

  if (isMovie && hasQuotes) {
    instructions += "\n• Reference movie themes, characters, or memorable elements naturally";
  }
  
  if (hasPersonalRoast && inputs.recipient_name) {
    instructions += `\n• Target ${inputs.recipient_name} specifically with playful roasting`;
  }
  
  if (inputs.tone === 'savage' && inputs.recipient_name) {
    instructions += `\n• CRITICAL: Every line must specifically mention ${inputs.recipient_name} by name`;
  }

  return instructions;
}

function getToneSystemPrompt(tone: string): string {
  const systemPrompts: Record<string, string> = {
    humorous: "Generate witty, playful text that's light and punchy. Focus on wordplay and observational humor.",
    savage: "Generate sharp, cutting roasts that are bold and direct. No joke-like patterns, make them brutal but not cruel.",
    romantic: "Generate warm, affectionate text that's sincere and tender. Focus on positive emotions.",
    sarcastic: "Generate dry, ironic text with subtle wit. Use understated sarcasm, not meanness.",
    wholesome: "Generate pure, uplifting text that's positive and genuine. Focus on gratitude and kindness.",
    flirty: "Generate playful, charming text with subtle confidence. Keep it tasteful and fun.",
    inspirational: "Generate motivating, empowering text that uplifts and encourages. Focus on potential.",
    edgy: "Generate bold, provocative text that pushes boundaries safely. Be unconventional but not offensive.",
    roast: "Generate comedic roasts with perfect timing. Be cutting but entertaining, not genuinely hurtful.",
    nostalgic: "Generate reflective, memory-focused text that's wistful but not melancholy."
  };

  return systemPrompts[tone] || "Generate creative, engaging text that matches the specified tone.";
}

// Post-process generated text
function postProcessCandidate(text: string): string {
  let cleaned = text.trim();
  
  // Remove quotes that AI might add
  cleaned = cleaned.replace(/^["']|["']$/g, '');
  
  // Apply text normalization
  cleaned = normalizeTypography(cleaned);
  
  // Remove emojis and other unwanted patterns
  cleaned = cleaned.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu, '');
  cleaned = cleaned.replace(/#\w+/g, ''); // Remove hashtags
  cleaned = cleaned.replace(/\n|\r/g, ' '); // Remove newlines
  
  // Clean up spacing
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // Truncate if too long
  if (cleaned.length > 100) {
    cleaned = cleaned.slice(0, 100).trim();
  }
  
  return cleaned;
}

// Main generation engine
export async function generateCandidatePool(inputs: ValidatedInputs): Promise<GenerationResult> {
  const strategies: string[] = [];
  const allCandidates: GenerationCandidate[] = [];

  try {
    // 1. Template-based generation (4 candidates)
    const templateCandidates = generateFromTemplates(inputs);
    templateCandidates.forEach(text => {
      allCandidates.push({
        text: postProcessCandidate(text),
        strategy: 'template'
      });
    });
    if (templateCandidates.length > 0) strategies.push('template');

    // 2. Free-form AI generation (8 candidates)
    const freeFormCandidates = await generateFreeForm(inputs, 8);
    freeFormCandidates.forEach(text => {
      allCandidates.push({
        text: postProcessCandidate(text),
        strategy: 'freeform'
      });
    });
    if (freeFormCandidates.length > 0) strategies.push('freeform');

    // 3. Targeted generation (4 candidates, if recipient specified)
    if (inputs.recipient_name && inputs.recipient_name !== "-") {
      const targetedCandidates = await generateTargeted(inputs);
      targetedCandidates.forEach(text => {
        allCandidates.push({
          text: postProcessCandidate(text),
          strategy: 'targeted'
        });
      });
      if (targetedCandidates.length > 0) strategies.push('targeted');
    }

    // 4. Tag-focused generation (4 candidates)
    const tagFocusedCandidates = await generateTagFocused(inputs);
    tagFocusedCandidates.forEach(text => {
      allCandidates.push({
        text: postProcessCandidate(text),
        strategy: 'tag-focused'
      });
    });
    if (tagFocusedCandidates.length > 0) strategies.push('tag-focused');

    // Remove empty or duplicate candidates
    const validCandidates = allCandidates
      .filter(c => c.text && c.text.length > 0)
      .filter((candidate, index, array) => 
        array.findIndex(c => c.text === candidate.text) === index
      );

    return {
      candidates: validCandidates,
      totalGenerated: validCandidates.length,
      strategies,
      model: 'gpt-5-mini-2025-08-07'
    };

  } catch (error) {
    console.error("Generation engine error:", error);
    
    // Fallback to template-only generation
    const fallbackCandidates = generateFromTemplates(inputs);
    return {
      candidates: fallbackCandidates.map(text => ({
        text: postProcessCandidate(text),
        strategy: 'fallback-template'
      })),
      totalGenerated: fallbackCandidates.length,
      strategies: ['fallback-template'],
      model: 'template-fallback',
      retryAttempt: 1
    };
  }
}