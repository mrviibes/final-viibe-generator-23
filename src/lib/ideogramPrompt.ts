import { IdeogramHandoff } from './ideogram';
import { normalizeTypography } from './textUtils';

export function buildIdeogramPrompt(handoff: IdeogramHandoff, cleanBackground: boolean = false): string {
  const parts: string[] = [];
  
  // EXACT TEXT RENDERING (if present)
  if (handoff.key_line && handoff.key_line.trim()) {
    const cleanText = handoff.key_line.replace(/[""]/g, '"').replace(/['']/g, "'").replace(/[—–]/g, '-').trim();
    parts.push(`Render this exact text: "${cleanText}"`);
  }
  
  // OCCASION/CATEGORY
  if (handoff.category && handoff.subcategory_primary) {
    parts.push(`Occasion: ${handoff.category}, ${handoff.subcategory_primary}${handoff.subcategory_secondary ? ` (${handoff.subcategory_secondary})` : ''}.`);
  }
  
  // MAIN SUBJECT
  let subject = handoff.rec_subject;
  if (!subject && handoff.chosen_visual) {
    const visualParts = handoff.chosen_visual.split(' - ');
    subject = visualParts.length >= 2 ? visualParts[0].trim() : handoff.chosen_visual;
  }
  if (subject) {
    parts.push(`Subject: ${subject}.`);
  }
  
  // BACKGROUND WITH ON-THEME ELEMENTS
  let background = handoff.rec_background;
  if (!background && handoff.chosen_visual) {
    const visualParts = handoff.chosen_visual.split(' - ');
    background = visualParts.length >= 2 ? visualParts[1].trim() : `${handoff.category} themed background`;
  }
  if (!background) {
    background = `${handoff.category || 'contextually appropriate'} themed background`;
  }
  if (cleanBackground) {
    background = "clean, minimal background with high contrast for text";
  }
  parts.push(`Background: ${background}.`);
  
  // PEOPLE INCLUSION (when recommended)
  const peopleKeywords = ['friends', 'crowd', 'people', 'group', 'party', 'audience', 'performers', 'celebrating'];
  const needsPeople = peopleKeywords.some(keyword => 
    handoff.chosen_visual?.toLowerCase().includes(keyword) || 
    handoff.rec_subject?.toLowerCase().includes(keyword) ||
    handoff.rec_background?.toLowerCase().includes(keyword)
  );
  
  // Override with explicit people count hint
  if (handoff.people_count_hint === 'single') {
    parts.push("Show exactly ONE person only - no groups, crowds, or multiple people.");
  } else if (handoff.people_count_hint === 'multiple' || needsPeople) {
    parts.push("Include multiple people clearly visible in the scene.");
  }
  
  // COMPOSITION & STYLE
  if (handoff.visual_style) {
    parts.push(`Style: ${handoff.visual_style}.`);
  }
  if (handoff.tone) {
    parts.push(`Tone: ${handoff.tone}.`);
  }
  if (handoff.aspect_ratio) {
    parts.push(`Format: ${handoff.aspect_ratio}.`);
  }
  
  // TEXT PLACEMENT (if present) - Smart overlay approach
  if (handoff.key_line && handoff.key_line.trim()) {
    let textPlacement = "Place text in a slim, translucent lower-third or side ribbon overlay";
    
    // Enhanced placement with background-preserving guidelines
    if (handoff.text_placement_preference === 'bottom') {
      textPlacement = "Place text in a slim translucent banner at the bottom edge, maximum 20% of image height";
    } else if (handoff.text_placement_preference === 'side') {
      textPlacement = "Place text in a vertical translucent ribbon on left or right edge, maximum 25% of image width";
    } else if (handoff.text_placement_preference === 'banner') {
      textPlacement = "Place text in a thin translucent banner overlay, maximum 20% of total image area";
    } else if (needsPeople || handoff.people_count_hint === 'multiple') {
      // For people-heavy scenes, prefer minimal overlay
      textPlacement = "Place text in a minimal translucent lower-third strip, maximum 15% of image height";
    }
    
    // Add strict anti-blocking guidelines
    textPlacement += " with subtle transparency to preserve background visibility";
    
    if (needsPeople || handoff.people_count_hint === 'multiple') {
      textPlacement += " - CRITICAL: never cover faces, heads, or bodies of people";
    } else if (handoff.people_count_hint === 'single') {
      textPlacement += " - never cover the person's face, head, or body";
    } else if (subject) {
      textPlacement += " - never cover the main subject or focal point";
    }
    
    parts.push(textPlacement + ".");
  }
  
  // AVOID LIST - Enhanced to prevent background blocking
  const avoidList = [
    "typos", "misspellings", "extra text", "wrong spelling", 
    "text covering more than 25% of image area",
    "solid text backgrounds that block the scene",
    "opaque speech bubbles", "large text blocks", 
    "text obscuring important visual elements",
    "completely covering the background with text"
  ];
  
  if (handoff.visual_style?.toLowerCase() === 'realistic') {
    avoidList.push("cartoon style", "flat colors");
  }
  if (cleanBackground) {
    avoidList.push("visual clutter", "decorative elements");
  }
  if (handoff.people_count_hint === 'single') {
    avoidList.push("multiple people", "groups", "crowds", "families", "teams");
  } else if (handoff.people_count_hint === 'multiple' || needsPeople) {
    avoidList.push("empty scenes", "isolated backgrounds");
  }
  
  // Add instruction labels to avoid list to prevent them from being drawn
  avoidList.push("instruction labels", "drawing the words 'EXACT TEXT'", "drawing 'Render this exact text'", "showing prompt instructions");
  
  parts.push(`Avoid: ${avoidList.join(', ')}.`);
  
  // Add final instruction to only render the quoted text, not the instruction labels
  if (handoff.key_line && handoff.key_line.trim()) {
    parts.push("Only render the text inside quotes as visible typography - do not draw instruction words.");
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

// Parse direct prompts to extract structured data and apply guardrails
export function parseDirectPrompt(directPrompt: string): { parsedHandoff: Partial<IdeogramHandoff>; additionalNotes: string } {
  const lines = directPrompt.split('.').map(line => line.trim()).filter(line => line.length > 0);
  const parsedHandoff: Partial<IdeogramHandoff> = {};
  const unparsedLines: string[] = [];
  
  for (const line of lines) {
    // Extract exact text
    const exactTextMatch = line.match(/(?:EXACT TEXT|Render this exact text):\s*["']([^"']+)["']/i);
    if (exactTextMatch) {
      parsedHandoff.key_line = exactTextMatch[1];
      continue;
    }
    
    // Extract occasion/category
    const occasionMatch = line.match(/Occasion:\s*([^,]+),\s*([^(]+)(?:\s*\(([^)]+)\))?/i);
    if (occasionMatch) {
      parsedHandoff.category = occasionMatch[1].trim();
      parsedHandoff.subcategory_primary = occasionMatch[2].trim();
      if (occasionMatch[3]) {
        parsedHandoff.subcategory_secondary = occasionMatch[3].trim();
      }
      continue;
    }
    
    // Extract subject
    const subjectMatch = line.match(/Subject:\s*(.+)/i);
    if (subjectMatch) {
      parsedHandoff.rec_subject = subjectMatch[1].trim();
      continue;
    }
    
    // Extract background
    const backgroundMatch = line.match(/Background:\s*(.+)/i);
    if (backgroundMatch) {
      parsedHandoff.rec_background = backgroundMatch[1].trim();
      continue;
    }
    
    // Extract style
    const styleMatch = line.match(/Style:\s*(.+)/i);
    if (styleMatch) {
      parsedHandoff.visual_style = styleMatch[1].trim().toLowerCase();
      continue;
    }
    
    // Extract tone
    const toneMatch = line.match(/Tone:\s*(.+)/i);
    if (toneMatch) {
      parsedHandoff.tone = toneMatch[1].trim().toLowerCase();
      continue;
    }
    
    // Extract format/aspect ratio
    const formatMatch = line.match(/Format:\s*(.+)/i);
    if (formatMatch) {
      parsedHandoff.aspect_ratio = formatMatch[1].trim();
      continue;
    }
    
    // Extract people count hints
    if (line.toLowerCase().includes('include multiple people') || line.toLowerCase().includes('multiple people clearly visible')) {
      parsedHandoff.people_count_hint = 'multiple';
      continue;
    }
    if (line.toLowerCase().includes('exactly one person') || line.toLowerCase().includes('single person')) {
      parsedHandoff.people_count_hint = 'single';
      continue;
    }
    
    // Skip avoid lists and instruction lines
    if (line.toLowerCase().startsWith('avoid:') || 
        line.toLowerCase().includes('place text') || 
        line.toLowerCase().includes('never cover') ||
        line.toLowerCase().includes('only render')) {
      continue;
    }
    
    // Everything else goes to additional notes
    unparsedLines.push(line);
  }
  
  return {
    parsedHandoff,
    additionalNotes: unparsedLines.join('. ').trim()
  };
}