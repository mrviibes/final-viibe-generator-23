// Tone Profiles System
// Defines detailed rules and constraints for each tone according to training sheet

export interface ToneProfile {
  traits: string[];
  cues: string[];
  avoid: string[];
  templates: string[];
  scoreThreshold: number;
}

export const TONE_PROFILES: Record<string, ToneProfile> = {
  humorous: {
    traits: ["playful", "light", "punchy"],
    cues: ["wordplay", "mild self-own", "daily life friction", "observational comedy"],
    avoid: ["cruelty", "inside jokes without relevant tags", "offensive humor"],
    templates: [
      "When [situation], I [reaction]",
      "[Activity] is my [description]",
      "Me: [expectation]. Reality: [outcome]",
      "[Thing] said nobody ever"
    ],
    scoreThreshold: 0.75
  },

  savage: {
    traits: ["bold", "sharp", "roast energy", "confident"],
    cues: ["confident jabs", "concise burns", "dominance framing", "direct confrontation"],
    avoid: ["body shaming", "protected class attacks", "harassment", "joke-like patterns"],
    templates: [
      "[Name], your [trait] is [comparison]",
      "Imagine [scenario] and still [outcome]",
      "[Activity] called, they want their [thing] back",
      "Even [reference] couldn't save [target]"
    ],
    scoreThreshold: 0.8
  },

  romantic: {
    traits: ["warm", "sincere", "affectionate", "tender"],
    cues: ["admiration", "closeness", "positive sentiment", "emotional connection"],
    avoid: ["possessive language", "guilt trips", "pressure", "clichés"],
    templates: [
      "You make [activity] feel like [metaphor]",
      "Every [time] with you is [description]",
      "Your [quality] makes me [feeling]",
      "I love how you [action]"
    ],
    scoreThreshold: 0.75
  },

  sarcastic: {
    traits: ["dry", "ironic", "witty", "understated"],
    cues: ["irony", "deadpan delivery", "contradictions", "mock enthusiasm"],
    avoid: ["meanness", "confusion", "overstatement"],
    templates: [
      "Oh great, another [thing]",
      "Because [reason] is exactly what I needed",
      "[Thing]? Never heard of it",
      "Sure, [scenario] makes perfect sense"
    ],
    scoreThreshold: 0.75
  },

  wholesome: {
    traits: ["pure", "positive", "uplifting", "genuine"],
    cues: ["gratitude", "kindness", "support", "celebration"],
    avoid: ["negativity", "sarcasm", "cynicism"],
    templates: [
      "Grateful for [thing] today",
      "[Activity] fills my heart",
      "Celebrating [achievement] with you",
      "Your [quality] brightens [context]"
    ],
    scoreThreshold: 0.75
  },

  flirty: {
    traits: ["playful", "charming", "teasing", "confident"],
    cues: ["subtle compliments", "playful banter", "charm", "confidence"],
    avoid: ["inappropriate content", "pressure", "objectification"],
    templates: [
      "That [thing] looks good on you",
      "Someone's looking [adjective] today",
      "Can't focus with you [action]",
      "Is it hot in here or [reason]?"
    ],
    scoreThreshold: 0.75
  },

  inspirational: {
    traits: ["motivating", "uplifting", "empowering", "positive"],
    cues: ["growth mindset", "perseverance", "achievement", "potential"],
    avoid: ["toxic positivity", "dismissing struggles", "false promises"],
    templates: [
      "Every [challenge] is a [opportunity]",
      "You're [quality] than you realize",
      "[Action] your way to [goal]",
      "Today is perfect for [achievement]"
    ],
    scoreThreshold: 0.75
  },

  edgy: {
    traits: ["bold", "provocative", "unconventional", "boundary-pushing"],
    cues: ["controversy", "rebellion", "alternative perspective", "shock value"],
    avoid: ["offensive content", "hate speech", "genuine harm"],
    templates: [
      "[Conventional thing] is overrated",
      "Plot twist: [unexpected outcome]",
      "Society says [expectation], I say [alternative]",
      "Breaking: [normal thing] causes [exaggerated effect]"
    ],
    scoreThreshold: 0.7
  },

  roast: {
    traits: ["cutting", "direct", "brutal honesty", "comedic timing"],
    cues: ["targeted humor", "exaggeration", "comparison", "timing"],
    avoid: ["personal attacks", "protected characteristics", "genuine cruelty"],
    templates: [
      "[Name]'s [trait] is so [adjective], [comparison]",
      "If [quality] was [measurement], [name] would [outcome]",
      "[Name] thinks [belief], but [reality]",
      "Even [reference] looks at [name] and says [reaction]"
    ],
    scoreThreshold: 0.8
  },

  nostalgic: {
    traits: ["wistful", "reflective", "sentimental", "memory-focused"],
    cues: ["past references", "childhood memories", "simpler times", "evolution"],
    avoid: ["excessive melancholy", "gatekeeping", "ageism"],
    templates: [
      "Remember when [past thing] was [description]?",
      "Back in my day, [scenario]",
      "[Current thing] hits different than [past version]",
      "That [memory] feeling when [trigger]"
    ],
    scoreThreshold: 0.75
  }
};

export function getToneProfile(tone: string): ToneProfile | null {
  return TONE_PROFILES[tone.toLowerCase()] || null;
}

export function getToneTemplates(tone: string): string[] {
  const profile = getToneProfile(tone);
  return profile?.templates || [];
}

export function shouldAvoidPattern(tone: string, text: string): boolean {
  const profile = getToneProfile(tone);
  if (!profile) return false;

  return profile.avoid.some(avoidPattern => 
    text.toLowerCase().includes(avoidPattern.toLowerCase())
  );
}

export function getToneScoreThreshold(tone: string): number {
  const profile = getToneProfile(tone);
  return profile?.scoreThreshold || 0.75;
}