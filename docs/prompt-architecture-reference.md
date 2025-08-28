# Vibe Maker Prompt Architecture Reference

## Overview
This document contains all prompt structures, interfaces, and processing logic for the Vibe Maker application's text and image generation systems.

## 1. Text Generation (Vibe) System

### 1.1 Core System Prompt
```
You are the Vibe Maker writer. Produce a single line under 100 characters based on user choices. Follow the tone guide. Use tags as hints, not as a list. Be witty or sincere as required, never cruel. No emojis. No hashtags. No quotation marks. No newlines. No profanity or slurs. No hate or harassment. No sexual content about minors. No doxxing or personal data. Output JSON only in this exact shape: {"line":"..."} Nothing else.
```

### 1.2 Input Interface
```typescript
interface VibeInputs {
  category: string;           // Main category
  subcategory: string;        // Specific subcategory
  tone: string;              // Tone (humorous, savage, etc.)
  tags?: string[];           // Optional content hints
  recipient_name?: string;   // Optional recipient
  relationship?: string;     // Optional relationship context
  language?: string;         // Language preference (default: English)
}
```

### 1.3 Developer Prompt Template
```
Context
Category: {{category}} > {{subcategory}}
Tone: {{tone}}
Recipient: {{recipient_name | "-"}}
Relationship: {{relationship | "-"}}
Language: {{language | "English"}}
Tags: {{tags_csv}}
HardLimit: 100 characters

Instructions
Write ONE original line for the subcategory above in the selected tone. Stay under 100 characters including spaces. Use plain text. No emojis, hashtags, quotes, or newlines. Use tags as content hints. Do not list the tags. If any tag is unsafe, ignore it and continue. Return JSON only.
```

### 1.4 Special Instructions Logic
- **Movie/Pop Culture + Quotes**: Reference iconic characters, themes, or memorable elements
- **Personal Roast + Recipient**: Incorporate recipient name naturally while maintaining tone

### 1.5 Few-Shot Examples
```json
Birthday, Savage: {"line":"30 already? Sprint to the cake for once, Alex."}
Birthday, Humorous: {"line":"Happy birthday, Alex. Your warranty expired years ago."}
Birthday, Playful: {"line":"Happy birthday, Alex. Cake speedrun starts now."}
Birthday, Sentimental: {"line":"Happy birthday, Alex. Grateful for every laugh this year."}
Sports, Humorous: {"line":"Congrats on the W. Your victory lap was longer than cardio day."}
Daily life, Serious: {"line":"Proud of your grind. Small steps, better habits, steady wins."}
```

### 1.6 Post-Processing Rules
- Parse JSON response
- Trim whitespace
- Hard limit: 100 characters
- Filter banned patterns: emojis, hashtags, quotes, newlines
- Filter banned words: profanity, insults
- Apply fallback if filtered or empty

### 1.7 Fallback Messages by Tone
```javascript
{
  humorous: "Short and witty like you asked",
  savage: "Bold and direct as requested", 
  sentimental: "Heartfelt message coming right up",
  nostalgic: "Memory lane vibes activated",
  romantic: "Sweet words in progress",
  inspirational: "Motivational mode engaged",
  playful: "Fun and light as ordered",
  serious: "Thoughtful message loading"
}
```

## 2. Image Generation (Ideogram) System

### 2.1 Ideogram Handoff Interface
```typescript
interface IdeogramHandoff {
  // Core fields (legacy compatibility)
  style: string;                    // visual_style
  occasion: string;                 // subcategory_primary  
  tone: string;                     // tone
  key_line: string;                 // final_line
  design_notes: string;             // Enhanced with chosen visual and tags
  reference_tags: string;           // tags_csv

  // Extended fields
  category: string;
  subcategory_primary: string;
  subcategory_secondary?: string;   // Only for pop-culture
  visual_style: string;
  aspect_ratio: string;
  text_tags_csv: string;
  visual_tags_csv: string;
  ai_text_assist_used: boolean;
  ai_visual_assist_used: boolean;
  chosen_visual?: string;
  rec_subject?: string;             // AI-recommended subject
  rec_background?: string;          // AI-recommended background
}
```

### 2.2 Ideogram Prompt Structure
The `buildIdeogramPrompt()` function constructs prompts in this order:

1. **EXACT TEXT** (if present): `"${cleanText}"`
2. **OCCASION/CATEGORY**: `${category}, ${subcategory_primary}`  
3. **MAIN SUBJECT**: From `rec_subject` or `chosen_visual`
4. **BACKGROUND**: From `rec_background` or contextual default
5. **PEOPLE INCLUSION**: Auto-detected from keywords
6. **COMPOSITION & STYLE**: `visual_style`, `tone`, `aspect_ratio`
7. **TEXT PLACEMENT**: Positioning instructions
8. **AVOID LIST**: Dynamic based on style and requirements

### 2.3 Aspect Ratio Mapping
```javascript
{
  'Portrait': 'ASPECT_9_16',
  'Landscape': 'ASPECT_16_9', 
  'Square': 'ASPECT_1_1',
  'Tall': 'ASPECT_10_16',
  'Wide': 'ASPECT_16_10'
}
```

### 2.4 Style Type Mapping
```javascript
{
  'realistic': 'REALISTIC',
  'cartoon': 'ANIME',
  'design': 'DESIGN',
  '3d': 'RENDER_3D',
  'general': 'GENERAL'
}
```

## 3. Visual Concept Generation System

### 3.1 Visual Inputs Interface
```typescript
interface VisualInputs {
  category: string;
  subcategory: string;
  tone: string;
  finalLine: string;
  tags: string[];
  visualStyle?: string;
}
```

### 3.2 Visual Option Structure
```typescript
interface VisualOption {
  subject: string;      // Main visual subject
  background: string;   // Background description
  prompt: string;       // Combined prompt for generation
  slot: string;         // Framework slot (background-only, subject+background, object, tone-twist)
}
```

### 3.3 4-Slot Framework
- **background-only**: Text-friendly background design
- **subject+background**: Central subject with complementary environment
- **object**: Key objects/symbols with minimal backdrop  
- **tone-twist**: Creative interpretation emphasizing the specified tone

### 3.4 Visual Generation Prompt Template
```
Generate 4 distinct visual concepts for: {{category}} > {{subcategory}}
Tone: {{tone}}
Text: "{{finalLine}}"
Style: {{visualStyle}}
Tags: {{tags}}

Create exactly 4 options using this framework:
1. background-only: Text-friendly background design
2. subject+background: Central subject with complementary environment
3. object: Key objects/symbols with minimal backdrop
4. tone-twist: Creative interpretation emphasizing tone

For each concept, provide:
- subject: Main visual element
- background: Environmental context
- prompt: Combined description for image generation

Use at least 2 tags per concept. Ensure variety and creativity.
Return valid JSON array of 4 objects.
```

## 4. API Integration Points

### 4.1 OpenAI Chat Completion
- **Endpoint**: `/chat/completions`
- **Model**: `gpt-4o-mini` (legacy) or newer models
- **Parameters**: 
  - `temperature`: 0.8-1.0
  - `max_tokens`: 60 for text, 500 for visuals
  - `response_format`: `{"type": "json_object"}`

### 4.2 Ideogram Generation
- **Endpoint**: Custom Supabase Edge Function
- **Parameters**:
  - `prompt`: Generated from `buildIdeogramPrompt()`
  - `aspect_ratio`: Mapped from UI selection
  - `model`: `V_2A_TURBO` or `V_3`
  - `style_type`: Mapped from visual style

## 5. Error Handling & Fallbacks

### 5.1 Text Generation Fallbacks
- Invalid JSON: Use tone-specific fallback
- Over character limit: Truncate to 100 chars
- Banned content: Filter and regenerate or use fallback
- API failure: Use predetermined fallback by tone

### 5.2 Visual Generation Fallbacks
- API timeout: Use slot-based contextual fallbacks
- Invalid response: Generate 4 concepts using category/tone/tags
- Empty results: Provide generic concepts based on framework

### 5.3 Ideogram Generation Fallbacks
- V_3 model failure: Retry with V_2A_TURBO
- Rate limiting: Return error with retry suggestion
- Invalid handoff: Use minimal prompt with key elements

## 6. File Locations

- **Text Generation**: `src/lib/vibeModel.ts`
- **Text Prompts**: `src/lib/vibeManual.ts`
- **Visual Generation**: `src/lib/visualModel.ts`
- **Ideogram Prompts**: `src/lib/ideogramPrompt.ts`
- **Ideogram Interface**: `src/lib/ideogram.ts`
- **OpenAI Client**: `src/lib/openai.ts`
- **Edge Functions**: `supabase/functions/`
- **Manual/Documentation**: `docs/vibe-maker-manual.md`

## 7. Configuration Constants

### 7.1 Banned Patterns
```javascript
[
  /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu, // emojis
  /#\w+/g,     // hashtags
  /["'""`]/g,   // quotes
  /\n|\r/g      // newlines
]
```

### 7.2 Banned Words
```javascript
['shit', 'fuck', 'damn', 'bitch', 'ass', 'hell', 'stupid', 'idiot', 'moron', 'loser', 'ugly', 'fat']
```

### 7.3 Category Taxonomy
- **celebrations**: birthdays, anniversaries, weddings, holidays, graduations, new baby, promotions
- **sports**: choose sport name, teams, positions, playoffs, friendly rivalries only
- **daily life**: gym, school, work, hobbies, pets, coffee, chores
- **vibes and punchlines**: dad jokes, one liners, comebacks, knock knock, puns, daily mood
- **pop culture**: movies, TV, music, games, trends, safe public figures only
- **no category**: freeform

### 7.4 Tone Matrix
- **Humorous**: Light gag or wordplay. No insults.
- **Savage**: Bold roast. Punch up. No profanity. No identity jokes.
- **Sentimental**: Warm, sincere, simple. No sarcasm.
- **Nostalgic**: Friendly past memory nod. Keep it specific and gentle.
- **Romantic**: Affectionate, clean language, no crude lines.
- **Inspirational**: Energetic encouragement. Avoid cliché phrases.
- **Playful**: Mischief and fun. No meanness.
- **Serious**: Respectful, factual, no jokes.

## 8. Runtime Configuration

The application supports runtime configuration overrides via the AI Settings page (`/ai-settings`):

### 8.1 Available Overrides
- **Model Selection**: Choose between GPT-5, GPT-4.1, and other available models
- **Temperature Control**: Adjust creativity vs focus (0.0-2.0) 
- **Content Settings**: Toggle spellcheck, clean backgrounds, spelling guarantee
- **Default Preferences**: Set default visual styles and tones
- **Magic Prompt**: Enable enhanced prompt engineering

### 8.2 Implementation
```typescript
// Get current config with overrides applied
const config = getEffectiveConfig();

// Set runtime overrides
setRuntimeOverrides({ model: 'gpt-5-2025-08-07', temperature: 0.8 });

// Clear all overrides
clearRuntimeOverrides();
```

Runtime overrides are stored in localStorage and take precedence over default configuration values.

## 9. File Locations

- Main config: `src/vibe-ai.config.ts`
- AI Settings UI: `src/pages/AiSettings.tsx`
- Text generation: `src/lib/vibeModel.ts`
- Image generation: `src/lib/ideogramPrompt.ts`
- Visual concepts: `src/lib/visualModel.ts`
- Legacy compatibility: `src/lib/vibeManual.ts`