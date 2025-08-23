import { IdeogramHandoff } from './ideogram';
import { normalizeTypography } from './textUtils';

export function buildIdeogramPrompt(handoff: IdeogramHandoff, cleanBackground: boolean = false): string {
  const parts: string[] = [];
  
  // Put the exact text as the VERY FIRST sentence to ensure it renders
  if (handoff.key_line && handoff.key_line.trim()) {
    const normalizedText = normalizeTypography(handoff.key_line);
    const sanitizedText = normalizedText.replace(/"/g, '\\"');
    parts.push(`EXACT_TEXT (VERBATIM): "${sanitizedText}"`);
    parts.push("Render this text EXACTLY as written, character-for-character, with no spelling changes, no extra words, no missing words.");
    parts.push("Use only standard ASCII punctuation (straight quotes, regular apostrophes, hyphens). Maintain exact case and spacing.");
    parts.push("If you cannot render the text exactly as specified, leave the text area completely blank rather than adding incorrect text.");
    
    if (cleanBackground) {
      parts.push("Style and display this text clearly legible but not oversized; don't cover the canvas; keep text area ≤ 40% of image, maintain generous margins; integrate with the scene on a clean, minimal, high-contrast background with clear center area for text.");
    } else {
      parts.push("Style and display this text clearly legible but not oversized; don't cover the canvas; keep text area ≤ 40% of image, maintain generous margins; integrate with the scene on a realistic background.");
    }
  } else {
    // For images without text, focus on visual elements only
    parts.push("Create a visual composition without any text or typography overlays.");
  }

  // Extract and handle subject from various sources
  let subject = handoff.rec_subject;
  if (!subject && handoff.chosen_visual) {
    // Try to split "subject - background" format
    const parts_visual = handoff.chosen_visual.split(' - ');
    if (parts_visual.length >= 2) {
      subject = parts_visual[0].trim();
    }
  }

  // Include subject in the scene description if available
  if (subject && subject.trim()) {
    parts.push(`The main subject should feature ${subject}.`);
  }
  
  // This content is for [CATEGORY], specifically [SUBCATEGORY][ (SECOND SUBCATEGORY if Pop Culture) ].
  let contentLine = `This content is for ${handoff.category}, specifically ${handoff.subcategory_primary}`;
  if (handoff.category === 'pop-culture' && handoff.subcategory_secondary) {
    contentLine += ` (${handoff.subcategory_secondary})`;
  }
  contentLine += '.';
  parts.push(contentLine);
  
  // The overall tone is [TONE].
  if (handoff.tone) {
    parts.push(`The overall tone is ${handoff.tone}.`);
  }
  
  // Apply these text tags as guides: [TEXT TAGS].
  const textTags = handoff.text_tags_csv && handoff.text_tags_csv !== "None" ? handoff.text_tags_csv : "none";
  parts.push(`Apply these text tags as guides: ${textTags}.`);
  
  // Render the scene in [VISUAL LOOK] style.
  if (handoff.visual_style) {
    if (handoff.visual_style.toLowerCase() === 'realistic') {
      parts.push(`Render the scene in ${handoff.visual_style} style with photorealistic lighting, real-world textures; camera depth of field; natural colors.`);
    } else {
      parts.push(`Render the scene in ${handoff.visual_style} style.`);
    }
  }
  
  // Include these visual tags: [VISUAL TAGS].
  if (handoff.visual_tags_csv) {
    parts.push(`Include these visual tags: ${handoff.visual_tags_csv}.`);
  }
  
  // Background should be [AI GENERATED BACKGROUND].
  let background = handoff.rec_background;
  if (!background && handoff.chosen_visual) {
    // Try to extract background from "subject - background" format
    const parts_visual = handoff.chosen_visual.split(' - ');
    background = parts_visual.length >= 2 ? parts_visual[1].trim() : handoff.chosen_visual;
  }
  if (!background) {
    background = "a clean, contextually appropriate background";
  }
  if (cleanBackground) {
    background = "a clean, minimal, high-contrast background with no visual clutter, no decorative elements, no patterns, and a clear center area";
  }
  parts.push(`Background should be ${background}.`);
  
  // Output format should use aspect ratio [ASPECT RATIO].
  if (handoff.aspect_ratio) {
    parts.push(`Output format should use aspect ratio ${handoff.aspect_ratio}.`);
  }
  
  // Only add text visibility instructions if there's actual text content
  if (handoff.key_line && handoff.key_line.trim()) {
    parts.push("CRITICAL: Only render the EXACT_TEXT specified above. Do not add any additional text, words, letters, captions, labels, or written content beyond what is explicitly provided.");
    parts.push("Ensure the text is clearly visible, balanced with the artwork, and styled to fit the chosen tone and tags.");
    const baseNegatives = "No typos, no misspellings, no ligatures, no altered punctuation, no text variations, no unwanted glyphs, no pseudo-letters, no additional captions, no lists, no bullet points, no fine print, no lorem ipsum, no fake Latin text, no paragraphs, no icons that look like letters.";
    
    if (handoff.visual_style?.toLowerCase() === 'realistic') {
      parts.push(`NEGATIVE PROMPTS: ${baseNegatives} No cartoon, no illustration, no vector art, no cel-shading, no flat colors.`);
    } else if (cleanBackground) {
      parts.push(`NEGATIVE PROMPTS: ${baseNegatives} No UI elements, no symbols, no decorative text elements, no watermarks, no logos.`);
    } else {
      parts.push(`NEGATIVE PROMPTS: ${baseNegatives}`);
    }
  } else {
    parts.push("Focus on creating a balanced visual composition that fits the chosen tone and tags.");
    parts.push("NEGATIVE PROMPTS: No text, no typography, no words, no letters, no characters, no glyphs, no symbols overlaid on the image.");
  }
  
  return parts.join(' ');
}

export function getAspectRatioForIdeogram(aspectRatio: string): 'ASPECT_10_16' | 'ASPECT_16_10' | 'ASPECT_9_16' | 'ASPECT_16_9' | 'ASPECT_3_2' | 'ASPECT_2_3' | 'ASPECT_4_3' | 'ASPECT_3_4' | 'ASPECT_1_1' | 'ASPECT_1_3' | 'ASPECT_3_1' {
  const ratioMap: Record<string, 'ASPECT_10_16' | 'ASPECT_16_10' | 'ASPECT_9_16' | 'ASPECT_16_9' | 'ASPECT_3_2' | 'ASPECT_2_3' | 'ASPECT_4_3' | 'ASPECT_3_4' | 'ASPECT_1_1' | 'ASPECT_1_3' | 'ASPECT_3_1'> = {
    'Portrait': 'ASPECT_9_16',
    'Landscape': 'ASPECT_16_9',
    'Square': 'ASPECT_1_1',
    'Tall': 'ASPECT_10_16',
    'Wide': 'ASPECT_16_10'
  };
  
  return ratioMap[aspectRatio] || 'ASPECT_16_9';
}

export function getStyleTypeForIdeogram(visualStyle: string): 'AUTO' | 'GENERAL' | 'REALISTIC' | 'DESIGN' | 'RENDER_3D' | 'ANIME' {
  const styleMap: Record<string, 'AUTO' | 'GENERAL' | 'REALISTIC' | 'DESIGN' | 'RENDER_3D' | 'ANIME'> = {
    'realistic': 'REALISTIC',
    'cartoon': 'ANIME',
    'design': 'DESIGN',
    '3d': 'RENDER_3D',
    'general': 'GENERAL'
  };
  
  return styleMap[visualStyle?.toLowerCase()] || 'AUTO';
}