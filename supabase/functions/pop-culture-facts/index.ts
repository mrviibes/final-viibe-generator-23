import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PopCultureFact {
  text: string;
  weight: number;
  sources: Array<{ title: string; url: string; site: string }>;
}

interface PopCultureResponse {
  facts: PopCultureFact[];
  entities: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category, subcategory, tags, searchTerm } = await req.json();
    console.log('Pop culture search:', { category, subcategory, tags, searchTerm });

    const facts: PopCultureFact[] = [];
    const entities: string[] = [];

    // Search Wikipedia for each tag
    for (const tag of tags || []) {
      if (!tag || tag.length < 3) continue;
      
      try {
        // Wikipedia search API
        const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(tag)}`;
        const wikiResponse = await fetch(searchUrl);
        
        if (wikiResponse.ok) {
          const wikiData = await wikiResponse.json();
          if (wikiData.extract && wikiData.extract.length > 20) {
            // Extract key facts from the summary
            const sentences = wikiData.extract.split('. ').slice(0, 3);
            for (const sentence of sentences) {
              if (sentence.length > 30 && sentence.length < 160) {
                facts.push({
                  text: sentence.trim() + (sentence.endsWith('.') ? '' : '.'),
                  weight: 0.8,
                  sources: [{
                    title: wikiData.title || tag,
                    url: wikiData.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(tag)}`,
                    site: 'Wikipedia'
                  }]
                });
              }
            }
            entities.push(tag);
          }
        }
      } catch (error) {
        console.log(`Wikipedia search failed for ${tag}:`, error.message);
      }

      // For TV shows, try TVMaze API
      if (subcategory?.toLowerCase().includes('tv') || subcategory?.toLowerCase().includes('show')) {
        try {
          const tvMazeUrl = `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(tag)}`;
          const tvResponse = await fetch(tvMazeUrl);
          
          if (tvResponse.ok) {
            const tvData = await tvResponse.json();
            if (tvData.length > 0 && tvData[0].show) {
              const show = tvData[0].show;
              if (show.summary) {
                // Clean HTML tags and extract facts
                const cleanSummary = show.summary.replace(/<[^>]*>/g, '');
                const sentences = cleanSummary.split('. ').slice(0, 2);
                for (const sentence of sentences) {
                  if (sentence.length > 30 && sentence.length < 160) {
                    facts.push({
                      text: sentence.trim() + (sentence.endsWith('.') ? '' : '.'),
                      weight: 0.7,
                      sources: [{
                        title: show.name,
                        url: show.url || show.officialSite || `https://www.tvmaze.com/shows/${show.id}`,
                        site: 'TVMaze'
                      }]
                    });
                  }
                }
              }
            }
          }
        } catch (error) {
          console.log(`TVMaze search failed for ${tag}:`, error.message);
        }
      }
    }

    // Sort by weight and deduplicate
    const uniqueFacts = facts
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 10)
      .filter((fact, index, arr) => 
        arr.findIndex(f => f.text.toLowerCase() === fact.text.toLowerCase()) === index
      );

    const response: PopCultureResponse = {
      facts: uniqueFacts,
      entities: [...new Set(entities)]
    };

    console.log(`Found ${uniqueFacts.length} facts for pop culture search`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in pop-culture-facts function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      facts: [],
      entities: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});