import { IdeogramHandoff } from './ideogram';
import { normalizeTypography } from './textUtils';

export function buildIdeogramPrompt(handoff: IdeogramHandoff, cleanBackground: boolean = false): string {
  const parts: string[] = [];
  
  // EXACT TEXT RENDERING (if present)
  if (handoff.key_line && handoff.key_line.trim()) {
    const cleanText = handoff.key_line.replace(/[""]/g, '"').replace(/['']/g, "'").replace(/[—–]/g, '-').trim();
    parts.push(`EXACT TEXT: "${cleanText}"`);
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
  if (needsPeople) {
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
  
  // TEXT PLACEMENT (if present)
  if (handoff.key_line && handoff.key_line.trim()) {
    if (needsPeople) {
      parts.push("Place text in empty space, margins, or banner areas - avoid covering faces or blocking people.");
    } else {
      parts.push("Place text clearly visible in available space, not blocking main subject.");
    }
  }
  
  // AVOID LIST
  const avoidList = ["typos", "misspellings", "extra text", "wrong spelling"];
  if (handoff.visual_style?.toLowerCase() === 'realistic') {
    avoidList.push("cartoon style", "flat colors");
  }
  if (cleanBackground) {
    avoidList.push("visual clutter", "decorative elements");
  }
  if (needsPeople) {
    avoidList.push("empty scenes", "isolated backgrounds");
  }
  parts.push(`Avoid: ${avoidList.join(', ')}.`);
  
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