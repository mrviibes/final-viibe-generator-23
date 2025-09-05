import { supabase } from "@/integrations/supabase/client";

interface PopCultureContext {
  subject: string;
  bullets: string[];
  trend_mode: string;
  source?: string;
}

interface GetContextOptions {
  category?: string;
  subcategory?: string;
  tone?: string;
  tags?: string[];
}

const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

function getCacheKey(subject: string, trendMode: string): string {
  return `pop_ctx:${subject.toLowerCase()}:${trendMode}`;
}

function isCacheValid(cachedData: any): boolean {
  if (!cachedData || !cachedData.timestamp) return false;
  return Date.now() - cachedData.timestamp < CACHE_TTL;
}

export async function getPopCultureContext(
  subject: string,
  trendMode: 'recent' | 'evergreen' = 'evergreen',
  options: GetContextOptions = {}
): Promise<PopCultureContext | null> {
  if (!subject?.trim()) {
    console.log('No subject provided for pop culture context');
    return null;
  }

  const cacheKey = getCacheKey(subject, trendMode);
  
  // Check cache first
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsedCache = JSON.parse(cached);
      if (isCacheValid(parsedCache)) {
        console.log(`Using cached context for ${subject}`);
        return parsedCache.data;
      }
    }
  } catch (error) {
    console.log('Cache read error:', error);
  }

  // Fetch fresh context
  try {
    console.log(`Fetching fresh context for ${subject} (${trendMode})`);
    
    const { data, error } = await supabase.functions.invoke('pop-culture-context', {
      body: {
        subject,
        trend_mode: trendMode,
        ...options
      }
    });

    if (error) {
      console.error('Pop culture context fetch error:', error);
      return null;
    }

    if (!data || !data.bullets || data.bullets.length === 0) {
      console.log(`No context bullets found for ${subject}`);
      return null;
    }

    const context: PopCultureContext = {
      subject: data.subject || subject,
      bullets: data.bullets || [],
      trend_mode: data.trend_mode || trendMode,
      source: data.source
    };

    // Cache the result
    try {
      const cacheData = {
        data: context,
        timestamp: Date.now()
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.log('Cache write error:', error);
    }

    console.log(`Fetched ${context.bullets.length} context bullets for ${subject}`);
    return context;

  } catch (error) {
    console.error('Failed to fetch pop culture context:', error);
    return null;
  }
}

// Helper to extract subject from inputs
export function extractSubjectFromInputs(inputs: {
  search_term?: string;
  tags?: string[];
  subcategory?: string;
}): string | null {
  // 1. Prefer search_term if present
  if (inputs.search_term?.trim()) {
    return inputs.search_term.trim();
  }

  // 2. Look for proper name in tags (two capitalized words or single Title-Case name)
  if (inputs.tags) {
    for (const tag of inputs.tags) {
      const trimmed = tag.trim();
      // Check for proper name patterns
      if (/^[A-Z][a-z]+(\s[A-Z][a-z]+)+$/.test(trimmed) || // Multiple words
          /^[A-Z][a-z]{2,}$/.test(trimmed)) { // Single capitalized word (3+ chars)
        return trimmed;
      }
    }
  }

  // 3. Fall back to subcategory if it looks like a name
  if (inputs.subcategory) {
    const subcategory = inputs.subcategory.trim();
    if (/^[A-Z][a-z]+(\s[A-Z][a-z]+)*$/.test(subcategory)) {
      return subcategory;
    }
  }

  return null;
}