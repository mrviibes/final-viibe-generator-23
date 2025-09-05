import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContextRequest {
  subject: string;
  category?: string;
  subcategory?: string;
  tone?: string;
  tags?: string[];
  trend_mode?: 'recent' | 'evergreen';
}

interface ContextResponse {
  subject: string;
  bullets: string[];
  trend_mode: string;
  source: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, trend_mode = 'evergreen' }: ContextRequest = await req.json();
    
    if (!subject) {
      throw new Error('Subject is required');
    }

    console.log(`Fetching context for: ${subject}, mode: ${trend_mode}`);
    
    const bullets: string[] = [];
    const sources: string[] = [];

    // 1. Wikipedia summary
    try {
      const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(subject)}`;
      const wikiResponse = await fetch(wikiUrl);
      
      if (wikiResponse.ok) {
        const wikiData = await wikiResponse.json();
        if (wikiData.extract) {
          // Clean and shorten extract
          const extract = wikiData.extract
            .replace(/\([^)]*\)/g, '') // Remove parentheses
            .split('.')[0] + '.'; // First sentence only
          bullets.push(extract);
          sources.push('wikipedia');
        }
      }
    } catch (error) {
      console.log('Wikipedia fetch failed:', error.message);
    }

    // 2. Google News RSS (simplified - using news.google.com RSS)
    try {
      const timeFilter = trend_mode === 'recent' ? 'when:90d' : 'when:5y';
      const newsQuery = encodeURIComponent(`${subject} ${timeFilter}`);
      const newsUrl = `https://news.google.com/rss/search?q=${newsQuery}&hl=en-US&gl=US&ceid=US:en`;
      
      const newsResponse = await fetch(newsUrl);
      if (newsResponse.ok) {
        const newsText = await newsResponse.text();
        
        // Simple RSS parsing - extract titles
        const titleMatches = newsText.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g);
        if (titleMatches && titleMatches.length > 1) {
          // Skip first match (usually the feed title)
          const headlines = titleMatches.slice(1, 4).map(match => {
            const title = match.replace(/<title><!\[CDATA\[/, '').replace(/\]\]><\/title>/, '');
            return `News: ${title}`;
          });
          bullets.push(...headlines);
          sources.push('news');
        }
      }
    } catch (error) {
      console.log('News fetch failed:', error.message);
    }

    // 3. Reddit search (using Reddit JSON API)
    try {
      const redditQuery = encodeURIComponent(subject);
      const subreddits = ['popculture', 'OutOfTheLoop', 'all'];
      
      for (const sub of subreddits.slice(0, 2)) { // Limit to 2 subreddits
        try {
          const redditUrl = `https://www.reddit.com/r/${sub}/search.json?q=${redditQuery}&sort=top&limit=3`;
          const redditResponse = await fetch(redditUrl, {
            headers: { 'User-Agent': 'PopCultureBot/1.0' }
          });
          
          if (redditResponse.ok) {
            const redditData = await redditResponse.json();
            if (redditData.data?.children) {
              const posts = redditData.data.children
                .filter((post: any) => post.data.title && post.data.score > 10)
                .slice(0, 2)
                .map((post: any) => `Reddit: ${post.data.title}`);
              bullets.push(...posts);
              if (posts.length > 0) sources.push('reddit');
            }
          }
        } catch (subError) {
          console.log(`Reddit ${sub} fetch failed:`, subError.message);
        }
      }
    } catch (error) {
      console.log('Reddit fetch failed:', error.message);
    }

    // Clean and deduplicate bullets
    const cleanBullets = bullets
      .filter((bullet, index, arr) => {
        // Remove duplicates based on similarity
        const normalized = bullet.toLowerCase().replace(/[^a-z0-9\s]/g, '');
        return !arr.slice(0, index).some(prev => {
          const prevNormalized = prev.toLowerCase().replace(/[^a-z0-9\s]/g, '');
          return normalized.includes(prevNormalized) || prevNormalized.includes(normalized);
        });
      })
      .slice(0, 6) // Max 6 bullets
      .map(bullet => {
        // Neutralize wording and add year context where possible
        return bullet
          .replace(/\b(is|was|will be)\b/g, 'reported as')
          .replace(/\b(says|said|claims|claimed)\b/g, 'reported')
          .replace(/\b(definitely|certainly|obviously)\b/g, 'reportedly');
      });

    const response: ContextResponse = {
      subject,
      bullets: cleanBullets,
      trend_mode,
      source: sources.join('+') || 'none'
    };

    console.log(`Context fetched: ${cleanBullets.length} bullets from ${sources.join('+')}`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in pop-culture-context function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      subject: '',
      bullets: [],
      trend_mode: 'evergreen',
      source: 'error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});