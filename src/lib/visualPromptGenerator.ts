// TypeScript adapter for the new visualPromptGenerator.js
// Maps existing interface to the new cleaner implementation

// @ts-ignore
import generateVisualPromptsJS from './visualPromptGenerator.js';

interface VisualPromptInputs {
  category: string;
  subcategory: string;
  tone: string;
  finalLine: string;
  visualStyle: string;
  visualTags: string[];
}

interface VisualPromptOption {
  subject: string;
  background: string;
  prompt: string;
  role: string; // literal, context, tone, creative
}

export function generateVisualPrompts(inputs: VisualPromptInputs): VisualPromptOption[] {
  // Call the new JS generator with mapped parameters
  const jsResults = generateVisualPromptsJS({
    category: inputs.category,
    subcategory: inputs.subcategory,
    tone: inputs.tone,
    text: inputs.finalLine,
    style: inputs.visualStyle,
    tags: inputs.visualTags
  });

  // Map the JS output back to the expected TypeScript interface
  const roles = ['literal', 'context', 'mood', 'creative'];
  
  return jsResults.map((result, index) => ({
    subject: `${inputs.subcategory} scene`,
    background: `${inputs.tone} atmosphere`,
    prompt: result.textPrompt,
    role: roles[index] || 'creative'
  }));
}