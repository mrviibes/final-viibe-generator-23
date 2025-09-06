// Text Generation Quality Guards and Lane Logic
// Implements the comprehensive text generation rules for consistent 4-lane output

export interface LaneDefinition {
  name: string;
  description: string;
  keywords: string[];
}

export interface CategoryLanes {
  [category: string]: {
    [subcategory: string]: LaneDefinition[];
  };
}

// Lane families for different categories
export const CATEGORY_LANES: CategoryLanes = {
  'celebrations': {
    'birthday': [
      { 
        name: 'life_choices', 
        description: 'Personal decisions and life path humor/commentary',
        keywords: ['choices', 'decisions', 'path', 'mistakes', 'goals', 'resolutions'] 
      },
      { 
        name: 'age_years', 
        description: 'Age-related observations and milestone commentary',
        keywords: ['years', 'old', 'age', 'getting', 'another', 'candles', 'milestone'] 
      },
      { 
        name: 'cake_food', 
        description: 'Food, cake, and celebration feast themes',
        keywords: ['cake', 'calories', 'eating', 'dessert', 'food', 'sweet', 'frosting'] 
      },
      { 
        name: 'appearance_props', 
        description: 'Visual appearance and party props commentary',
        keywords: ['look', 'appearance', 'balloons', 'decorations', 'party', 'outfit'] 
      }
    ],
    'baby_shower': [
      { 
        name: 'sleep_deprivation', 
        description: 'Sleep schedule and rest disruption themes',
        keywords: ['sleep', 'tired', 'rest', 'awake', 'nap', 'exhausted'] 
      },
      { 
        name: 'preparation_chaos', 
        description: 'Baby preparation and upcoming chaos',
        keywords: ['ready', 'prepare', 'chaos', 'diaper', 'bottles', 'baby-proof'] 
      },
      { 
        name: 'emotional_journey', 
        description: 'Emotional and sentimental aspects',
        keywords: ['love', 'heart', 'feelings', 'miracle', 'precious', 'joy'] 
      },
      { 
        name: 'lifestyle_change', 
        description: 'Life transition and change themes',
        keywords: ['change', 'different', 'new', 'freedom', 'responsibility', 'routine'] 
      }
    ]
  },
  'sports': {
    'hockey': [
      { 
        name: 'Platform/Prop', 
        description: 'Equipment, rink, gear, ice-related jokes',
        keywords: ['stick', 'puck', 'skates', 'ice', 'rink', 'helmet', 'gear'] 
      },
      { 
        name: 'Audience/Reaction', 
        description: 'How fans, crowd, family react to performance',
        keywords: ['fans', 'crowd', 'cheer', 'boo', 'reaction', 'audience'] 
      },
      { 
        name: 'Skill/Ability', 
        description: 'Hockey skills, technique, performance level',
        keywords: ['skill', 'shoot', 'pass', 'skate', 'goal', 'technique'] 
      },
      { 
        name: 'Absurdity/Lifestyle', 
        description: 'Wild comparisons, exaggerated hockey scenarios',
        keywords: ['crazy', 'wild', 'impossible', 'ridiculous', 'extreme'] 
      }
    ]
  },
  'daily_life': {
    'work': [
      { 
        name: 'coffee_fuel', 
        description: 'Coffee dependency and morning routine',
        keywords: ['coffee', 'caffeine', 'morning', 'energy', 'fuel', 'awake'] 
      },
      { 
        name: 'commute_struggle', 
        description: 'Transportation and commute challenges',
        keywords: ['commute', 'traffic', 'train', 'drive', 'late', 'rush'] 
      },
      { 
        name: 'petty_victories', 
        description: 'Small workplace wins and accomplishments',
        keywords: ['win', 'accomplish', 'succeed', 'complete', 'finish', 'achieve'] 
      },
      { 
        name: 'awkward_moments', 
        description: 'Workplace social situations and awkwardness',
        keywords: ['awkward', 'embarrassing', 'social', 'meeting', 'colleague', 'situation'] 
      }
    ]
  }
};

// Get lane definitions for a category/subcategory
export function getLanesForCategory(category: string, subcategory: string): LaneDefinition[] {
  const categoryKey = category.toLowerCase();
  const subcategoryKey = subcategory.toLowerCase().replace(/\s+/g, '_');
  
  // Try exact match first
  if (CATEGORY_LANES[categoryKey]?.[subcategoryKey]) {
    return CATEGORY_LANES[categoryKey][subcategoryKey];
  }
  
  // Try partial matches for subcategory
  const categoryLanes = CATEGORY_LANES[categoryKey];
  if (categoryLanes) {
    for (const [key, lanes] of Object.entries(categoryLanes)) {
      if (subcategory.toLowerCase().includes(key) || key.includes(subcategory.toLowerCase())) {
        return lanes;
      }
    }
  }
  
  // Default universal lanes based on specification
  return [
    { 
      name: 'Platform/Prop', 
      description: `Tools, equipment, stage, props related to ${subcategory}`,
      keywords: ['tools', 'equipment', 'gear', 'stage', 'props', 'platform'] 
    },
    { 
      name: 'Audience/Reaction', 
      description: `How people respond, audience reactions to ${subcategory}`,
      keywords: ['people', 'audience', 'crowd', 'reaction', 'response', 'watch'] 
    },
    { 
      name: 'Skill/Ability', 
      description: `Competence, technique, style in ${subcategory}`,
      keywords: ['skill', 'ability', 'technique', 'competence', 'style', 'talent'] 
    },
    { 
      name: 'Absurdity/Lifestyle', 
      description: `Wild comparisons, exaggerated scenarios for ${subcategory}`,
      keywords: ['wild', 'crazy', 'ridiculous', 'extreme', 'absurd', 'lifestyle'] 
    }
  ];
}

// Validate tags appear at least once across all lines (flexible approach)
export function validateAllTagsPresent(lines: string[], tags: string[]): {
  valid: boolean;
  issues: string[];
  missingTags: string[][];
} {
  if (!tags || tags.length === 0) {
    return { valid: true, issues: [], missingTags: [] };
  }
  
  const issues: string[] = [];
  const missingTags: string[][] = [];
  
  // Check that each tag appears at least once across all lines
  const allLinesText = lines.join(' ').toLowerCase();
  const globallyMissingTags: string[] = [];
  
  for (const tag of tags) {
    if (!allLinesText.includes(tag.toLowerCase())) {
      globallyMissingTags.push(tag);
    }
  }
  
  // Track per-line missing tags for audit purposes
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    const lineMissing: string[] = [];
    
    for (const tag of tags) {
      if (!line.includes(tag.toLowerCase())) {
        lineMissing.push(tag);
      }
    }
    missingTags.push(lineMissing);
  }
  
  // Only fail if tags are globally missing across all lines
  if (globallyMissingTags.length > 0) {
    issues.push(`Missing tags across all lines: ${globallyMissingTags.join(', ')}`);
  }
  
  return {
    valid: globallyMissingTags.length === 0,
    issues,
    missingTags
  };
}

// Check for tag placement variety across 4 options
export function validateTagPlacement(lines: string[], tags: string[]): {
  valid: boolean;
  issues: string[];
  placements: string[];
} {
  if (!tags || tags.length === 0) {
    return { valid: true, issues: [], placements: [] };
  }
  
  const placements: string[] = [];
  const issues: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let placement = 'none';
    
    // Check where first tag appears
    for (const tag of tags) {
      const tagPos = line.toLowerCase().indexOf(tag.toLowerCase());
      if (tagPos !== -1) {
        const lineLength = line.length;
        if (tagPos < lineLength * 0.3) {
          placement = 'leading';
        } else if (tagPos > lineLength * 0.7) {
          placement = 'closing';
        } else {
          placement = 'middle';
        }
        break;
      }
    }
    
    placements.push(placement);
    
    if (placement === 'none') {
      issues.push(`Line ${i + 1}: No tags found`);
    }
  }
  
  // Stronger variety check - no two lines should use same placement pattern
  const placementCounts = placements.reduce((acc, p) => {
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const duplicatePlacements = Object.entries(placementCounts)
    .filter(([placement, count]) => placement !== 'none' && count > 1)
    .map(([placement]) => placement);
  
  if (duplicatePlacements.length > 0) {
    issues.push(`Duplicate tag placements: ${duplicatePlacements.join(', ')} (need varied placement patterns)`);
  }
  
  return {
    valid: issues.length === 0,
    issues,
    placements
  };
}

// Validate punctuation whitelist (Universal Contract Rule 6)
export function validatePunctuationWhitelist(lines: string[]): {
  valid: boolean;
  issues: string[];
  violations: string[];
} {
  const allowedPunctuation = /^[a-zA-Z0-9\s,.:'()!?-]+$/;
  const bannedPatterns = [
    /—/g, // em-dash
    /--/g, // double dash
    /"/g, // quotes
    /'/g, // fancy quotes
    /'/g, // fancy quotes
    /"/g, // fancy quotes
    /"/g  // fancy quotes
  ];
  
  const issues: string[] = [];
  const violations: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    for (const pattern of bannedPatterns) {
      if (pattern.test(line)) {
        const matches = line.match(pattern) || [];
        issues.push(`Line ${i + 1}: Contains banned punctuation: ${matches.join(', ')}`);
        violations.push(line);
        break;
      }
    }
  }
  
  return {
    valid: issues.length === 0,
    issues,
    violations
  };
}

// Check for length diversity according to requirements
export function validateLengthDiversity(lines: string[]): {
  valid: boolean;
  issues: string[];
  lengths: number[];
} {
  const lengths = lines.map(line => line.length);
  const issues: string[] = [];
  
  // Expected ranges: [55-65, 70-85, 70-85, 95-100]
  const expectedRanges = [
    { min: 55, max: 65, label: 'short' },
    { min: 70, max: 85, label: 'medium' },
    { min: 70, max: 85, label: 'medium' },
    { min: 95, max: 100, label: 'long' }
  ];
  
  // Check if we have at least one short, two medium-range, and approach long
  const hasShort = lengths.some(len => len <= 65);
  const mediumCount = lengths.filter(len => len >= 70 && len <= 85).length;
  const hasLong = lengths.some(len => len >= 90);
  
  if (!hasShort) {
    issues.push('Missing short option (55-65 chars)');
  }
  if (mediumCount < 1) {
    issues.push('Need at least 1 medium-length option (70-85 chars)');
  }
  if (!hasLong && lines.length === 4) {
    issues.push('Missing long option (90-100 chars)');
  }
  
  // Check hard limit
  const overLimit = lengths.filter(len => len > 100);
  if (overLimit.length > 0) {
    issues.push(`${overLimit.length} options exceed 100 character limit`);
  }
  
  return {
    valid: issues.length === 0,
    issues,
    lengths
  };
}

// Check for variety in opening words
export function validateOpeningWordVariety(lines: string[]): {
  valid: boolean;
  issues: string[];
  openingWords: string[];
} {
  const openingWords = lines.map(line => {
    const firstWord = line.trim().split(/\s+/)[0];
    return firstWord.toLowerCase().replace(/[^a-z]/g, '');
  });
  
  const duplicates = openingWords.filter((word, index) => 
    openingWords.indexOf(word) !== index
  );
  
  const uniqueDuplicates = [...new Set(duplicates)];
  
  return {
    valid: uniqueDuplicates.length === 0,
    issues: uniqueDuplicates.length > 0 ? 
      [`Repeated opening words: ${uniqueDuplicates.join(', ')}`] : [],
    openingWords
  };
}

// Strict tag coverage validator
export function validateStrictTagCoverage(lines: string[], tags: string[]): { 
  valid: boolean; 
  coverage: number; 
  details: string[];
} {
  if (!tags || tags.length === 0) {
    return { valid: true, coverage: 100, details: ['No tags to validate'] };
  }

  let totalPossible = lines.length * tags.length; // Every tag in every line
  let actualMatches = 0;
  const details: string[] = [];

  lines.forEach((line, lineIndex) => {
    const lineLower = line.toLowerCase();
    const lineMatches: string[] = [];
    const lineMisses: string[] = [];
    
    tags.forEach(tag => {
      const tagLower = tag.toLowerCase();
      if (lineLower.includes(tagLower)) {
        actualMatches++;
        lineMatches.push(tag);
      } else {
        lineMisses.push(tag);
      }
    });
    
    details.push(`Line ${lineIndex + 1}: Has [${lineMatches.join(', ')}] Missing [${lineMisses.join(', ')}]`);
  });

  const coverage = Math.round((actualMatches / totalPossible) * 100);
  const valid = coverage === 100; // Strict: must be 100%

  return {
    valid,
    coverage,
    details: [
      `Coverage: ${actualMatches}/${totalPossible} (${coverage}%)`,
      ...details
    ]
  };
}

// Comprehensive quality check for 4-lane generation (Universal Contract)
export function validateFourLaneOutput(
  lines: string[], 
  tags: string[], 
  tone: string,
  category: string,
  subcategory: string
): {
  valid: boolean;
  issues: string[];
  details: {
    allTagsPresent: ReturnType<typeof validateAllTagsPresent>;
    tagPlacement: ReturnType<typeof validateTagPlacement>;
    lengthDiversity: ReturnType<typeof validateLengthDiversity>;
    openingVariety: ReturnType<typeof validateOpeningWordVariety>;
    punctuationWhitelist: ReturnType<typeof validatePunctuationWhitelist>;
  };
} {
  const allTagsPresent = validateAllTagsPresent(lines, tags);
  const tagPlacement = validateTagPlacement(lines, tags);
  const lengthDiversity = validateLengthDiversity(lines);
  const openingVariety = validateOpeningWordVariety(lines);
  const punctuationWhitelist = validatePunctuationWhitelist(lines);
  
  const allIssues = [
    ...allTagsPresent.issues,
    ...tagPlacement.issues,
    ...lengthDiversity.issues,
    ...openingVariety.issues,
    ...punctuationWhitelist.issues
  ];
  
  // Additional tone consistency check
  const expectedToneKeywords = getToneKeywords(tone);
  const toneConsistency = lines.every(line => 
    expectedToneKeywords.some(keyword => 
      line.toLowerCase().includes(keyword) || 
      hasTonatStructure(line, tone)
    )
  );
  
  if (!toneConsistency && tone !== 'Humorous') {
    allIssues.push(`Some lines don't match ${tone} tone consistently`);
  }
  
  return {
    valid: allIssues.length === 0,
    issues: allIssues,
    details: {
      allTagsPresent,
      tagPlacement,
      lengthDiversity,
      openingVariety,
      punctuationWhitelist
    }
  };
}

// Get tone-specific keywords for validation
function getToneKeywords(tone: string): string[] {
  const toneKeywords: Record<string, string[]> = {
    'Savage': ['brutal', 'harsh', 'real', 'truth', 'call out', 'expose', 'destroy'],
    'Sentimental': ['heart', 'feel', 'emotion', 'love', 'care', 'meaningful', 'special'],
    'Romantic': ['love', 'heart', 'romantic', 'sweet', 'passion', 'romance', 'tender'],
    'Inspirational': ['inspire', 'motivate', 'achieve', 'dream', 'succeed', 'believe', 'strength'],
    'Nostalgic': ['remember', 'past', 'old', 'memories', 'back', 'vintage', 'classic'],
    'Playful': ['fun', 'play', 'silly', 'amusing', 'entertaining', 'lighthearted', 'cheerful'],
    'Serious': ['professional', 'business', 'formal', 'important', 'strategic', 'focused']
  };
  
  return toneKeywords[tone] || [];
}

// Check if line has appropriate structure for tone
function hasTonatStructure(line: string, tone: string): boolean {
  const lowerLine = line.toLowerCase();
  
  switch (tone) {
    case 'Savage':
      // Should be direct and cutting
      return /\b(you|your|never|always|still|can't|won't|failed)\b/.test(lowerLine);
    
    case 'Sentimental':
      // Should have emotional language
      return /\b(beautiful|precious|meaningful|grateful|blessed|heart|soul)\b/.test(lowerLine);
    
    case 'Humorous':
      // More flexible, can be various structures
      return true;
    
    default:
      return true;
  }
}