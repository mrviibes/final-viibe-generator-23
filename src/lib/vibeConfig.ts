// Simple vibe and visual preferences for the hardcoded frontend setup

export interface Vibe {
  name: string;
  description: string;
  tone: string;
  tags: string[];
}

export type VibeKey = 'humorous' | 'savage' | 'inspirational' | 'nostalgic' | 'aesthetic';

export const vibeMap: Record<VibeKey, Vibe> = {
  humorous: {
    name: "Humorous",
    description: "Funny and witty content that makes people laugh",
    tone: "humorous",
    tags: ["funny", "witty", "comedy", "laugh"]
  },
  savage: {
    name: "Savage",
    description: "Bold and edgy content with attitude",
    tone: "savage", 
    tags: ["bold", "edgy", "fierce", "attitude"]
  },
  inspirational: {
    name: "Inspirational",
    description: "Uplifting and motivating content",
    tone: "inspirational",
    tags: ["motivation", "positive", "uplift", "inspire"]
  },
  nostalgic: {
    name: "Nostalgic",
    description: "Content that evokes memories and emotions",
    tone: "nostalgic",
    tags: ["memories", "vintage", "throwback", "classic"]
  },
  aesthetic: {
    name: "Aesthetic",
    description: "Visually pleasing and artistic content",
    tone: "aesthetic",
    tags: ["beautiful", "artistic", "visual", "style"]
  }
};

export interface VisualPreference {
  category: string;
  description: string;
}

export const visualPreferences: VisualPreference[] = [
  {
    category: "portraits",
    description: "People and character-focused visuals"
  },
  {
    category: "landscapes", 
    description: "Nature and scenic backgrounds"
  },
  {
    category: "objects",
    description: "Items, products, and symbolic elements"
  },
  {
    category: "abstract",
    description: "Artistic and conceptual designs"
  },
  {
    category: "lifestyle",
    description: "Daily life and social situations"
  },
  {
    category: "events",
    description: "Celebrations and special occasions"
  }
];