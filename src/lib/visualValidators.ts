// Visual Validators - category anchors, domain guards, lane integrity

import { VisualOption } from './visualModel';

// Category anchor requirements
export const CATEGORY_ANCHORS: Record<string, Record<string, string[]>> = {
  'Sports': {
    'basketball': ['basketball', 'court', 'hoop', 'dribble', 'shot', 'arena', 'players', 'practice'],
    'hockey': ['hockey', 'ice', 'rink', 'stick', 'puck', 'goal', 'skates', 'helmet'],
    'football': ['football', 'field', 'helmet', 'stadium', 'players', 'practice', 'turf'],
    'soccer': ['soccer', 'ball', 'goal', 'field', 'players', 'practice', 'pitch'],
    'baseball': ['baseball', 'bat', 'glove', 'diamond', 'players', 'practice', 'pitcher'],
    'tennis': ['tennis', 'racket', 'court', 'net', 'serve', 'practice'],
    'golf': ['golf', 'club', 'course', 'tee', 'fairway', 'practice'],
    'volleyball': ['volleyball', 'net', 'court', 'spike', 'practice'],
    'swimming': ['swimming', 'pool', 'lanes', 'stroke', 'goggles', 'practice'],
    'running': ['running', 'track', 'finish', 'sprint', 'marathon', 'practice']
  },
  'Celebrations': {
    'birthday': ['cake', 'candles', 'balloons', 'party', 'celebration', 'gifts', 'confetti'],
    'christmas': ['tree', 'presents', 'ornaments', 'lights', 'santa', 'holiday'],
    'wedding': ['rings', 'dress', 'flowers', 'ceremony', 'altar', 'celebration'],
    'halloween': ['pumpkin', 'costume', 'spooky', 'trick-or-treat', 'decorations'],
    'graduation': ['cap', 'gown', 'diploma', 'ceremony', 'celebration']
  },
  'Daily Life': {
    'work': ['laptop', 'desk', 'office', 'meeting', 'computer', 'workplace'],
    'office': ['laptop', 'desk', 'coffee', 'mug', 'computer', 'workplace']
  }
};

// Domain contamination guards
export const DOMAIN_GUARDS: Record<string, { blocked: string[]; required?: string[] }> = {
  'Sports': {
    blocked: ['laptop', 'desk', 'coffee mug', 'office', 'computer', 'meeting room', 'workplace', 'cubicle'],
    required: ['athletic', 'sport', 'game', 'practice', 'team', 'player']
  },
  'Daily Life': {
    blocked: ['sports equipment', 'hockey stick', 'basketball', 'football', 'soccer ball', 'arena', 'stadium'],
    required: ['work', 'office', 'daily', 'routine']
  },
  'Celebrations': {
    blocked: ['office', 'work', 'sports equipment', 'athletic'],
    required: ['celebration', 'party', 'festive', 'occasion']
  }
};

// Validate category anchors are present
export function validateCategoryAnchors(
  category: string, 
  subcategory: string, 
  prompt: string
): { valid: boolean; issues: string[]; score: number } {
  const issues: string[] = [];
  let score = 0;
  
  const categoryAnchors = CATEGORY_ANCHORS[category];
  if (!categoryAnchors) {
    return { valid: true, issues: [], score: 0 }; // No anchors defined
  }
  
  const subcategoryAnchors = categoryAnchors[subcategory.toLowerCase()];
  if (!subcategoryAnchors) {
    return { valid: true, issues: [], score: 0 }; // No anchors for subcategory
  }
  
  const lowerPrompt = prompt.toLowerCase();
  let foundAnchors = 0;
  
  for (const anchor of subcategoryAnchors) {
    if (lowerPrompt.includes(anchor.toLowerCase())) {
      foundAnchors++;
      score += 2;
    }
  }
  
  if (foundAnchors === 0) {
    issues.push(`Missing ${category}/${subcategory} anchors: expected one of [${subcategoryAnchors.join(', ')}]`);
    return { valid: false, issues, score: 0 };
  }
  
  return { valid: true, issues: [], score };
}

// Domain guard - block wrong-domain visuals
export function domainGuard(
  category: string, 
  prompt: string
): { valid: boolean; issues: string[]; suggestedNegatives: string[] } {
  const issues: string[] = [];
  const suggestedNegatives: string[] = [];
  
  const guard = DOMAIN_GUARDS[category];
  if (!guard) {
    return { valid: true, issues: [], suggestedNegatives: [] }; // No guard defined
  }
  
  const lowerPrompt = prompt.toLowerCase();
  
  // Check for blocked terms
  for (const blocked of guard.blocked) {
    if (lowerPrompt.includes(blocked.toLowerCase())) {
      issues.push(`Contains wrong-domain term "${blocked}" for category ${category}`);
      suggestedNegatives.push(blocked);
    }
  }
  
  // Check for required terms (if specified)
  if (guard.required) {
    const hasRequired = guard.required.some(req => 
      lowerPrompt.includes(req.toLowerCase())
    );
    if (!hasRequired) {
      issues.push(`Missing required ${category} terms: ${guard.required.join(', ')}`);
    }
  }
  
  return { 
    valid: issues.length === 0, 
    issues, 
    suggestedNegatives 
  };
}

// Lane integrity validation
export function laneIntegrity(
  lane: string, 
  prompt: string
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const lowerPrompt = prompt.toLowerCase();
  
  switch (lane.toLowerCase()) {
    case 'objects':
      // Objects lane should have NO people
      const peopleTerms = ['person', 'people', 'man', 'woman', 'child', 'someone', 'figure', 'character'];
      for (const term of peopleTerms) {
        if (lowerPrompt.includes(term)) {
          issues.push(`Objects lane contains people term: "${term}"`);
        }
      }
      break;
      
    case 'group':
      // Group lane should include people and group indicators
      const groupTerms = ['people', 'group', 'friends', 'team', 'crowd', 'gathering'];
      const hasPeople = groupTerms.some(term => lowerPrompt.includes(term));
      if (!hasPeople) {
        issues.push('Group lane missing people/group indicators');
      }
      break;
      
    case 'solo':
      // Solo lane must include a person AND an action verb
      const personTerms = ['person', 'man', 'woman', 'player', 'someone'];
      const actionVerbs = ['holding', 'throwing', 'kicking', 'running', 'jumping', 'sitting', 'standing', 'playing', 'dribbling', 'serving', 'swinging', 'diving', 'blowing', 'tossing', 'adjusting', 'typing'];
      
      const hasPerson = personTerms.some(term => lowerPrompt.includes(term));
      const hasAction = actionVerbs.some(verb => lowerPrompt.includes(verb));
      
      if (!hasPerson) {
        issues.push('Solo lane missing person indicator');
      }
      if (!hasAction) {
        issues.push('Solo lane missing action verb');
      }
      break;
      
    case 'creative':
      // Creative lane should be symbolic/abstract
      const creativeTerms = ['symbolic', 'arrangement', 'composition', 'abstract', 'artistic', 'graphic'];
      const hasCreative = creativeTerms.some(term => lowerPrompt.includes(term));
      if (!hasCreative) {
        issues.push('Creative lane missing artistic/symbolic indicators');
      }
      break;
  }
  
  return { valid: issues.length === 0, issues };
}

// Strip bracket tokens from prompts
export function stripBrackets(prompt: string): string {
  return prompt
    .replace(/\[NEGATIVE_PROMPT:[^\]]*\]/gi, '')
    .replace(/\[TAGS:[^\]]*\]/gi, '')
    .replace(/\[TEXT_SAFE_ZONE:[^\]]*\]/gi, '')
    .replace(/\[CONTRAST_PLAN:[^\]]*\]/gi, '')
    .replace(/\[ASPECTS:[^\]]*\]/gi, '')
    .replace(/\[TEXT_HINT:[^\]]*\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Comprehensive visual validation
export function validateVisualOption(
  option: VisualOption,
  category: string,
  subcategory: string,
  lane?: string
): { 
  valid: boolean; 
  issues: string[]; 
  processedOption: VisualOption;
  suggestedNegatives: string[];
} {
  const issues: string[] = [];
  const suggestedNegatives: string[] = [];
  
  // Strip brackets from all fields
  const processedOption: VisualOption = {
    ...option,
    subject: stripBrackets(option.subject || ''),
    background: stripBrackets(option.background || ''),
    prompt: stripBrackets(option.prompt || '')
  };
  
  // Clamp to 130 chars
  if (processedOption.prompt.length > 130) {
    processedOption.prompt = processedOption.prompt.substring(0, 130).trim() + '…';
  }
  
  const fullText = `${processedOption.subject} ${processedOption.background} ${processedOption.prompt}`.toLowerCase();
  
  // Category anchor validation
  const anchorResult = validateCategoryAnchors(category, subcategory, fullText);
  if (!anchorResult.valid) {
    issues.push(...anchorResult.issues);
  }
  
  // Domain guard validation
  const domainResult = domainGuard(category, fullText);
  if (!domainResult.valid) {
    issues.push(...domainResult.issues);
    suggestedNegatives.push(...domainResult.suggestedNegatives);
  }
  
  // Lane integrity validation (if lane specified)
  if (lane) {
    const laneResult = laneIntegrity(lane, fullText);
    if (!laneResult.valid) {
      issues.push(...laneResult.issues);
    }
  }
  
  return {
    valid: issues.length === 0,
    issues,
    processedOption,
    suggestedNegatives
  };
}