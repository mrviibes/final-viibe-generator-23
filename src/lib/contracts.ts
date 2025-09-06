// Universal Contract System - separates content from instructions
// Prevents mega concatenations and enforces clean separation of concerns

export interface TextContract {
  lines: [string, string, string, string]; // Always exactly 4 lines
}

export interface VisualContract {
  lanes: {
    objects: string;    // Lane 1: Objects (no people)
    group: string;      // Lane 2: Group (people visible, candid)
    solo: string;       // Lane 3: Solo (one person + explicit action)
    creative: string;   // Lane 4: Creative (symbolic/graphic arrangement)
  };
}

export interface LayoutSpec {
  zone: string;         // "LEFT PANEL" | "MEME" | etc.
  region: string;       // "x=0% y=0% w=28% h=100%" etc.
  textStyle: string;    // "align=left, valign=center, wrap=balanced"
  style: string;        // "white on dark overlay 35–45% opacity"
  rules: string;        // "do not center; do not place outside REGION"
}

export interface NegativeSpec {
  internal: string[];   // Internal-only bans, never shown to user
  contextual: string[]; // Category-aware negatives
}

export interface UniversalContract {
  TEXT_CONTENT: string;           // Only the final caption/meme line
  TEXT_LAYOUT_SPEC: LayoutSpec;   // Placement rules (zones, x/y/w/h, font)
  IMAGE_PROMPT: string;           // Scene + people/action + style cues
  NEGATIVE_PROMPT?: string[];     // Things to suppress (category-aware)
  telemetry: {
    fallbackUsed: boolean;
    reason?: string;
    retryCount?: number;
    validatorResults?: any;
  };
}

// Builder functions for layout specs
export function buildLayoutSpec(typographyStyle: string): LayoutSpec {
  switch (typographyStyle) {
    case 'side-bar':
      return {
        zone: "LEFT PANEL",
        region: "x=0% y=0% w=28% h=100%",
        textStyle: "align=left, valign=center, wrap=balanced",
        style: "white on dark overlay 35–45% opacity",
        rules: "do not center; do not place outside REGION"
      };
    
    case 'meme-style':
      return {
        zone: "MEME",
        region: "TOP: x=0% y=0% w=100% h=18%, BOTTOM: x=0% y=82% w=100% h=18%",
        textStyle: "align=center, all caps, stroke=2px black",
        style: "white text with black outline",
        rules: "faces keep 6% margin; text must match exactly"
      };
    
    case 'subtle-caption':
      return {
        zone: "CORNER",
        region: "x=75% y=75% w=23% h=23%",
        textStyle: "align=center, small size",
        style: "subtle overlay, minimal intrusion",
        rules: "keep text small and unobtrusive"
      };
    
    case 'badge-sticker':
      return {
        zone: "BADGE",
        region: "x=70% y=10% w=28% h=20%",
        textStyle: "align=center, medium size",
        style: "badge background with border",
        rules: "distinct badge element, not overlay"
      };
    
    default: // negative-space, lower-third
      return {
        zone: "NATURAL",
        region: "x=0% y=70% w=100% h=30%",
        textStyle: "align=center, readable size",
        style: "clean readable text",
        rules: "use natural empty areas in composition"
      };
  }
}

// Universal Contract builder
export function buildUniversalContract(
  textContent: string,
  layoutSpec: LayoutSpec,
  imagePrompt: string,
  negatives?: string[],
  telemetry?: any
): UniversalContract {
  return {
    TEXT_CONTENT: textContent,
    TEXT_LAYOUT_SPEC: layoutSpec,
    IMAGE_PROMPT: imagePrompt,
    NEGATIVE_PROMPT: negatives,
    telemetry: telemetry || { fallbackUsed: false }
  };
}