import { supabase } from "@/integrations/supabase/client";

export interface PopCultureFact {
  text: string;
  weight: number;
  sources: Array<{ title: string; url: string; site: string }>;
}

export interface PopCultureFactsResult {
  facts: PopCultureFact[];
  entities: string[];
  cached: boolean;
}

interface CacheEntry {
  data: PopCultureFactsResult;
  timestamp: number;
  ttl: number;
}

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

function getCacheKey(category: string, subcategory: string, tags: string[]): string {
  const sortedTags = [...tags].sort().join('|');
  return `pop-culture|${category}|${subcategory}|${sortedTags}`.toLowerCase();
}

function getCachedFacts(cacheKey: string): PopCultureFactsResult | null {
  try {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const entry: CacheEntry = JSON.parse(cached);
    const now = Date.now();
    
    if (now - entry.timestamp > entry.ttl) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return { ...entry.data, cached: true };
  } catch (error) {
    console.warn('Cache read error:', error);
    return null;
  }
}

function setCachedFacts(cacheKey: string, data: PopCultureFactsResult): void {
  try {
    const entry: CacheEntry = {
      data: { ...data, cached: false },
      timestamp: Date.now(),
      ttl: CACHE_TTL
    };
    localStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch (error) {
    console.warn('Cache write error:', error);
  }
}

export async function getPopCultureFacts(
  category: string,
  subcategory: string = '',
  tags: string[] = [],
  searchTerm: string = ''
): Promise<PopCultureFactsResult> {
  // Filter and validate tags
  const validTags = tags.filter(tag => tag && tag.trim().length > 2);
  
  if (validTags.length === 0) {
    return { facts: [], entities: [], cached: false };
  }

  const cacheKey = getCacheKey(category, subcategory, validTags);
  
  // Check cache first
  const cached = getCachedFacts(cacheKey);
  if (cached) {
    console.log('Using cached pop culture facts');
    return cached;
  }

  try {
    console.log('Fetching fresh pop culture facts');
    const { data, error } = await supabase.functions.invoke('pop-culture-facts', {
      body: {
        category,
        subcategory,
        tags: validTags,
        searchTerm
      }
    });

    if (error) {
      console.error('Edge function error:', error);
      return { facts: [], entities: [], cached: false };
    }

    const result: PopCultureFactsResult = {
      facts: data?.facts || [],
      entities: data?.entities || [],
      cached: false
    };

    // Cache the result
    if (result.facts.length > 0) {
      setCachedFacts(cacheKey, result);
    }

    return result;
  } catch (error) {
    console.error('Failed to fetch pop culture facts:', error);
    return { facts: [], entities: [], cached: false };
  }
}

export function clearPopCultureCache(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('pop-culture|')) {
        localStorage.removeItem(key);
      }
    });
    console.log('Pop culture cache cleared');
  } catch (error) {
    console.warn('Failed to clear cache:', error);
  }
}