// Type definitions for step2_text_human.mjs
export interface TextLineHuman {
  lane: "platform" | "audience" | "skill" | "absurdity";
  text: string;
}

export interface TextConfigHuman {
  category?: string;
  subcategory?: string;
  tone?: string;
  tags?: string[];
}

export function generateTextOptionsHuman(config: TextConfigHuman): TextLineHuman[];