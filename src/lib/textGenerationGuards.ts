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
        name: 'rivalry_competition', 
        description: 'Team rivalry and competitive spirit',
        keywords: ['rival', 'opponent', 'team', 'compete', 'win', 'defeat'] 
      },
      { 
        name: 'clutch_moments', 
        description: 'High-pressure game situations',
        keywords: ['clutch', 'pressure', 'overtime', 'crucial', 'moment', 'decisive'] 
      },
      { 
        name: 'superstition_ritual', 
        description: 'Sports superstitions and rituals',
        keywords: ['lucky', 'ritual', 'tradition', 'superstition', 'habit', 'routine'] 
      },
      { 
        name: 'player_banter', 
        description: 'Player personality and locker room banter',
        keywords: ['player', 'attitude', 'trash-talk', 'style', 'swagger', 'confidence'] 
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
  
  // Default generic lanes based on category
  return [
    { 
      name: 'experience_focus', 
      description: `${subcategory} experience and participation`,
      keywords: ['experience', 'participate', 'engage', 'involved'] 
    },
    { 
      name: 'emotion_focus', 
      description: `Emotional response and feelings about ${subcategory}`,
      keywords: ['feel', 'emotion', 'reaction', 'response'] 
    },
    { 
      name: 'action_focus', 
      description: `Active participation and doing in ${subcategory}`,
      keywords: ['do', 'action', 'perform', 'execute'] 
    },
    { 
      name: 'outcome_focus', 
      description: `Results and consequences of ${subcategory}`,
      keywords: ['result', 'outcome', 'consequence', 'effect'] 
    }
  ];
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
        if (tagPos < lineLength * 0.2) {
          placement = 'leading';
        } else if (tagPos > lineLength * 0.8) {
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
  
  // Check for variety in placements
  const uniquePlacements = new Set(placements.filter(p => p !== 'none'));
  if (uniquePlacements.size < 2 && lines.length >= 3) {
    issues.push('Insufficient tag placement variety (need at least 2 different positions)');
  }
  
  return {
    valid: issues.length === 0,
    issues,
    placements
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

// Comprehensive quality check for 4-lane generation
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
    tagPlacement: ReturnType<typeof validateTagPlacement>;
    lengthDiversity: ReturnType<typeof validateLengthDiversity>;
    openingVariety: ReturnType<typeof validateOpeningWordVariety>;
  };
} {
  const tagPlacement = validateTagPlacement(lines, tags);
  const lengthDiversity = validateLengthDiversity(lines);
  const openingVariety = validateOpeningWordVariety(lines);
  
  const allIssues = [
    ...tagPlacement.issues,
    ...lengthDiversity.issues,
    ...openingVariety.issues
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
      tagPlacement,
      lengthDiversity,
      openingVariety
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