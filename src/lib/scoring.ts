// Scoring and Constraint System
// Implements uniqueness, tone fit, tag alignment, and safety scoring

export interface ScoringResult {
  lengthScore: number;
  uniquenessScore: number;
  toneFitScore: number;
  tagAlignmentScore: number;
  safetyScore: number;
  overallScore: number;
  passes: boolean;
  reasons: string[];
}

export interface UniquenessMetrics {
  jaccardSimilarity: number;
  bigramOverlap: number;
  editDistanceRatio: number;
}

// Calculate Jaccard similarity on tokens
export function calculateJaccardSimilarity(text1: string, text2: string): number {
  const tokens1 = new Set(text1.toLowerCase().split(/\s+/));
  const tokens2 = new Set(text2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);
  
  return union.size === 0 ? 0 : intersection.size / union.size;
}

// Calculate character bigram overlap
export function calculateBigramOverlap(text1: string, text2: string): number {
  const getBigrams = (text: string): Set<string> => {
    const bigrams = new Set<string>();
    const normalized = text.toLowerCase().replace(/\s+/g, '');
    for (let i = 0; i < normalized.length - 1; i++) {
      bigrams.add(normalized.slice(i, i + 2));
    }
    return bigrams;
  };

  const bigrams1 = getBigrams(text1);
  const bigrams2 = getBigrams(text2);
  
  const intersection = new Set([...bigrams1].filter(x => bigrams2.has(x)));
  const union = new Set([...bigrams1, ...bigrams2]);
  
  return union.size === 0 ? 0 : intersection.size / union.size;
}

// Calculate edit distance ratio
export function calculateEditDistanceRatio(text1: string, text2: string): number {
  const levenshteinDistance = (a: string, b: string): number => {
    const matrix = [];
    const n = a.length;
    const m = b.length;

    for (let i = 0; i <= n; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= m; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        if (a.charAt(i - 1) === b.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[n][m];
  };

  const distance = levenshteinDistance(text1.toLowerCase(), text2.toLowerCase());
  const maxLength = Math.max(text1.length, text2.length);
  
  return maxLength === 0 ? 0 : distance / maxLength;
}

// Check uniqueness against other candidates
export function checkUniqueness(candidate: string, otherCandidates: string[]): UniquenessMetrics {
  let maxJaccard = 0;
  let maxBigram = 0;
  let maxEditRatio = 0;

  for (const other of otherCandidates) {
    if (other === candidate) continue;
    
    const jaccard = calculateJaccardSimilarity(candidate, other);
    const bigram = calculateBigramOverlap(candidate, other);
    const editRatio = calculateEditDistanceRatio(candidate, other);
    
    maxJaccard = Math.max(maxJaccard, jaccard);
    maxBigram = Math.max(maxBigram, bigram);
    maxEditRatio = Math.max(maxEditRatio, editRatio);
  }

  return {
    jaccardSimilarity: maxJaccard,
    bigramOverlap: maxBigram,
    editDistanceRatio: maxEditRatio
  };
}

// Basic tone scoring based on keywords and patterns
export function scoreToneFit(text: string, tone: string): number {
  const toneKeywords: Record<string, string[]> = {
    humorous: ["funny", "laugh", "joke", "haha", "lol", "hilarious", "comedy"],
    savage: ["roast", "burn", "destroy", "savage", "brutal", "ruthless"],
    romantic: ["love", "heart", "sweet", "beautiful", "gorgeous", "amazing"],
    sarcastic: ["yeah right", "sure", "great", "perfect", "exactly", "totally"],
    wholesome: ["grateful", "blessed", "pure", "sweet", "positive", "lovely"],
    flirty: ["cute", "hot", "sexy", "gorgeous", "charming", "attractive"],
    inspirational: ["achieve", "dream", "inspire", "motivate", "believe", "grow"],
    edgy: ["rebel", "different", "unconventional", "bold", "alternative"],
    roast: ["burn", "destroy", "savage", "brutal", "rekt", "owned"],
    nostalgic: ["remember", "back", "old", "childhood", "past", "used to"]
  };

  const keywords = toneKeywords[tone.toLowerCase()] || [];
  const textLower = text.toLowerCase();
  
  let keywordMatches = 0;
  for (const keyword of keywords) {
    if (textLower.includes(keyword)) {
      keywordMatches++;
    }
  }

  // Base score from keyword density
  let score = Math.min(keywordMatches / 3, 0.6); // Up to 60% from keywords
  
  // Tone-specific pattern bonuses
  switch (tone.toLowerCase()) {
    case 'savage':
    case 'roast':
      // Bonus for direct, cutting language
      if (/\b(you|your)\b/i.test(text)) score += 0.2;
      if (/[.!]{1,2}$/.test(text)) score += 0.1;
      break;
      
    case 'humorous':
      // Bonus for wordplay, setup-punchline structure
      if (/\b(like|than)\b/i.test(text)) score += 0.1;
      if (/[\?!]/.test(text)) score += 0.1;
      break;
      
    case 'romantic':
      // Bonus for emotional, personal language
      if (/\b(you|me|us|we)\b/i.test(text)) score += 0.2;
      if (/\b(always|forever|never)\b/i.test(text)) score += 0.1;
      break;
  }

  return Math.min(score, 1.0);
}

// Score tag alignment
export function scoreTagAlignment(text: string, tags: string[]): number {
  if (tags.length === 0) return 1.0;
  
  const textLower = text.toLowerCase();
  let alignmentScore = 0;
  
  for (const tag of tags) {
    const tagLower = tag.toLowerCase();
    
    // Direct mention
    if (textLower.includes(tagLower)) {
      alignmentScore += 1.0;
      continue;
    }
    
    // Partial match (for longer tags)
    if (tagLower.length > 4) {
      const partial = tagLower.slice(0, -2);
      if (textLower.includes(partial)) {
        alignmentScore += 0.5;
        continue;
      }
    }
    
    // Synonym/related term matching
    const synonymMap: Record<string, string[]> = {
      work: ["job", "career", "office", "workplace"],
      birthday: ["bday", "born", "celebration"],
      party: ["celebration", "bash", "gathering"],
      movie: ["film", "cinema"],
      music: ["song", "album", "band"]
    };
    
    const synonyms = synonymMap[tagLower] || [];
    if (synonyms.some(syn => textLower.includes(syn))) {
      alignmentScore += 0.7;
    }
  }
  
  return Math.min(alignmentScore / tags.length, 1.0);
}

// Basic safety scoring
export function scoreSafety(text: string): number {
  const unsafePatterns = [
    /\b(kill|die|suicide|harm|hurt)\b/i,
    /\b(hate|racism|sexist)\b/i,
    /\b(fuck|shit|damn|bitch)\b/i,
    /\b(stupid|idiot|moron|loser)\b/i
  ];
  
  for (const pattern of unsafePatterns) {
    if (pattern.test(text)) {
      return 0.0; // Hard fail on unsafe content
    }
  }
  
  return 1.0; // Pass if no unsafe patterns found
}

// Comprehensive scoring function
export function scoreCandidate(
  candidate: string, 
  otherCandidates: string[], 
  tone: string, 
  tags: string[]
): ScoringResult {
  const reasons: string[] = [];
  
  // 1. Length score (≤ 100 characters)
  const lengthScore = candidate.length <= 100 ? 1.0 : 0.0;
  if (candidate.length > 100) {
    reasons.push(`Too long: ${candidate.length} characters`);
  }
  
  // 2. Uniqueness score
  const uniqueness = checkUniqueness(candidate, otherCandidates);
  const uniquenessScore = (
    (uniqueness.jaccardSimilarity < 0.6 ? 1.0 : 0.0) +
    (uniqueness.bigramOverlap < 0.7 ? 1.0 : 0.0) +
    (uniqueness.editDistanceRatio < 0.8 ? 1.0 : 0.0)
  ) / 3;
  
  if (uniquenessScore < 1.0) {
    reasons.push(`Too similar to other candidates`);
  }
  
  // 3. Tone fit score
  const toneFitScore = scoreToneFit(candidate, tone);
  if (toneFitScore < 0.75) {
    reasons.push(`Poor tone fit: ${toneFitScore.toFixed(2)}`);
  }
  
  // 4. Tag alignment score
  const tagAlignmentScore = scoreTagAlignment(candidate, tags);
  if (tagAlignmentScore < 0.5 && tags.length > 0) {
    reasons.push(`Poor tag alignment: ${tagAlignmentScore.toFixed(2)}`);
  }
  
  // 5. Safety score
  const safetyScore = scoreSafety(candidate);
  if (safetyScore < 1.0) {
    reasons.push(`Safety violation detected`);
  }
  
  // Overall score (weighted average)
  const overallScore = (
    lengthScore * 0.3 +
    uniquenessScore * 0.2 +
    toneFitScore * 0.3 +
    tagAlignmentScore * 0.1 +
    safetyScore * 0.1
  );
  
  // Pass criteria: all critical scores must pass
  const passes = lengthScore === 1.0 && 
                 uniquenessScore >= 0.8 && 
                 toneFitScore >= 0.75 && 
                 safetyScore === 1.0;
  
  return {
    lengthScore,
    uniquenessScore, 
    toneFitScore,
    tagAlignmentScore,
    safetyScore,
    overallScore,
    passes,
    reasons
  };
}