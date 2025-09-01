export function normalizeTypography(text: string): string {
  return text
    // Convert curly quotes to straight quotes
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    // Convert em/en dashes to regular hyphens
    .replace(/[—–]/g, '-')
    // Normalize ellipsis
    .replace(/…/g, '...')
    // Remove any trailing/leading whitespace
    .trim();
}

export function suggestContractions(text: string): string {
  return applyIdiomsAndContractions(text);
}

export function applyIdiomsAndContractions(text: string): string {
  return text
    // Fix common hyphenated compounds
    .replace(/\bas-been\b/gi, 'has-been')
    .replace(/\ball-time\b/gi, 'all-time')
    .replace(/\bwell-known\b/gi, 'well-known')
    .replace(/\bhand-made\b/gi, 'handmade')
    .replace(/\bon-line\b/gi, 'online')
    .replace(/\boff-line\b/gi, 'offline')
    .replace(/\bre-do\b/gi, 'redo')
    .replace(/\bre-make\b/gi, 'remake')
    .replace(/\bto-do\b/gi, 'to-do')
    .replace(/\bup-to-date\b/gi, 'up-to-date')
    .replace(/\bstate-of-the-art\b/gi, 'state-of-the-art')
    .replace(/\bself-made\b/gi, 'self-made')
    .replace(/\bworld-class\b/gi, 'world-class')
    
    // Fix common missing apostrophes in contractions
    .replace(/\byoud\b/gi, "you'd")
    .replace(/\byoure\b/gi, "you're")
    .replace(/\byoull\b/gi, "you'll")
    .replace(/\byouve\b/gi, "you've")
    .replace(/\btheyre\b/gi, "they're")
    .replace(/\btheyll\b/gi, "they'll")
    .replace(/\btheyve\b/gi, "they've")
    .replace(/\bwere\b/gi, "we're")
    .replace(/\bwell\b/gi, "we'll")
    .replace(/\bweve\b/gi, "we've")
    .replace(/\bits\b/gi, "it's")
    .replace(/\bim\b/gi, "I'm")
    .replace(/\bive\b/gi, "I've")
    .replace(/\bill\b/gi, "I'll")
    .replace(/\bid\b/gi, "I'd")
    .replace(/\bwont\b/gi, "won't")
    .replace(/\bcant\b/gi, "can't")
    .replace(/\bdont\b/gi, "don't")
    .replace(/\bdidnt\b/gi, "didn't")
    .replace(/\bwasnt\b/gi, "wasn't")
    .replace(/\bwerent\b/gi, "weren't")
    .replace(/\bisnt\b/gi, "isn't")
    .replace(/\barent\b/gi, "aren't")
    .replace(/\bhasnt\b/gi, "hasn't")
    .replace(/\bhavent\b/gi, "haven't")
    .replace(/\bhadnt\b/gi, "hadn't")
    .replace(/\bshouldnt\b/gi, "shouldn't")
    .replace(/\bwouldnt\b/gi, "wouldn't")
    .replace(/\bcouldnt\b/gi, "couldn't")
    
    // Fix common idiom errors
    .replace(/\bfor all intensive purposes\b/gi, 'for all intents and purposes')
    .replace(/\bcould care less\b/gi, 'couldn\'t care less')
    .replace(/\bone in the same\b/gi, 'one and the same')
    .replace(/\bmake due\b/gi, 'make do')
    .replace(/\bnip it in the butt\b/gi, 'nip it in the bud')
    .replace(/\bI could of\b/gi, 'I could have')
    .replace(/\bshould of\b/gi, 'should have')
    .replace(/\bwould of\b/gi, 'would have')
    .replace(/\bmight of\b/gi, 'might have');
}

// Enhanced spell checking with improved allowlist and grammar validation
export function advancedSpellCheck(text: string): { issues: string[], score: number } {
  // Extended allowlist for proper nouns and common terms
  const allowlist = [
    'Pop', 'Art', 'Anime', '3D', 'Birthday', 'Billy', 'Madison',
    'Okanagan', 'Kelowna', 'NonStop', 'Disposal', 'AI', 'OK', 'LOL',
    'YOLO', 'DIY', 'FAQ', 'CEO', 'NYC', 'LA', 'UK', 'US', 'USA',
    'WiFi', 'iPhone', 'iPad', 'McDonald', 'Netflix', 'YouTube', 'Google',
    'Facebook', 'Instagram', 'TikTok', 'Twitter', 'LinkedIn', 'Pinterest'
  ];
  
  const tokens = text.split(/[^A-Za-z0-9']/).filter(Boolean);
  const issues: string[] = [];
  let totalWords = 0;
  let problematicWords = 0;
  
  for (const token of tokens) {
    const looksLikeWord = /[A-Za-z]{2,}/.test(token);
    if (!looksLikeWord) continue;
    
    totalWords++;
    
    // Check allowlist first
    if (allowlist.includes(token)) continue;
    
    // Basic patterns for valid words
    const isValidPattern = 
      /^[A-Za-z][a-z]+$/.test(token) || // Normal words
      /^[A-Z]+$/.test(token) || // Acronyms
      /^[A-Z][a-z]+[A-Z][a-z]*$/.test(token) || // CamelCase
      /^[a-z]+'[a-z]+$/.test(token) || // Contractions
      /^[A-Z][a-z]*'[a-z]+$/.test(token); // Capitalized contractions
    
    if (!isValidPattern) {
      issues.push(`Spelling: "${token}"`);
      problematicWords++;
    }
  }
  
  const score = totalWords > 0 ? (totalWords - problematicWords) / totalWords : 1;
  return { issues, score };
}

// Grammar validation for basic sentence structure
export function validateGrammar(text: string): { issues: string[], hasBasicStructure: boolean } {
  const issues: string[] = [];
  
  // Check for basic verb presence (simplified)
  const commonVerbs = /\b(is|are|was|were|have|has|had|do|does|did|will|would|can|could|should|may|might|am|be|being|been|get|got|go|went|come|came|see|saw|make|made|take|took|give|gave|know|knew|think|thought|feel|felt|look|looked|want|wanted|need|needed|like|liked|love|loved|hate|hated|try|tried|work|worked|play|played|say|said|tell|told|ask|asked|help|helped|find|found|show|showed|use|used|keep|kept|let|lets|put|puts|turn|turned|start|started|stop|stopped|run|ran|walk|walked|eat|ate|drink|drank|sleep|slept|live|lived|die|died)\b/i;
  
  const hasVerb = commonVerbs.test(text);
  
  // Check for broken bigrams (common nonsensical word pairs)
  const brokenBigrams = [
    /\bthe the\b/gi,
    /\band and\b/gi,
    /\bto to\b/gi,
    /\ba a\b/gi,
    /\bin in\b/gi,
    /\bon on\b/gi,
    /\bat at\b/gi,
    /\bits its\b/gi,
    /\bthis this\b/gi,
    /\bthat that\b/gi,
    /\bwith with\b/gi,
    /\bfor for\b/gi
  ];
  
  for (const pattern of brokenBigrams) {
    if (pattern.test(text)) {
      issues.push('Repeated words detected');
      break;
    }
  }
  
  // Check for adjacent duplicate words (but allow some exceptions)
  const words = text.toLowerCase().split(/\s+/);
  for (let i = 0; i < words.length - 1; i++) {
    if (words[i] === words[i + 1] && words[i].length > 2) {
      // Allow some intentional duplicates
      const allowedDuplicates = ['ha', 'ho', 'la', 'na', 'oh', 'so', 'no', 'go'];
      if (!allowedDuplicates.includes(words[i])) {
        issues.push(`Adjacent duplicate: "${words[i]}"`);
      }
    }
  }
  
  const hasBasicStructure = hasVerb && text.length > 5;
  
  if (!hasBasicStructure) {
    issues.push('Missing basic sentence structure');
  }
  
  return { issues, hasBasicStructure };
}

// Enhanced similarity check for text comparison
export function isTextMisspelled(originalText: string, renderedText: string): boolean {
  const normalized1 = normalizeTypography(originalText.toLowerCase().trim());
  const normalized2 = normalizeTypography(renderedText.toLowerCase().trim());
  
  // Simple similarity check - if they're very different, likely misspelled
  const similarity = calculateSimilarity(normalized1, normalized2);
  return similarity < 0.8; // 80% similarity threshold
}

// Safety check for derogatory content
export function containsDerogatory(text: string): boolean {
  const derogatory = [
    'stupid', 'idiot', 'moron', 'loser', 'ugly', 'fat', 'dumb', 'worthless',
    'pathetic', 'disgusting', 'gross', 'nasty', 'awful', 'terrible',
    'horrible', 'hate', 'sucks', 'worst', 'lame', 'boring'
  ];
  
  const lowerText = text.toLowerCase();
  return derogatory.some(word => new RegExp(`\\b${word}\\b`).test(lowerText));
}

function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator  // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}