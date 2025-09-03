import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchResult {
  title: string;
  description: string;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category, searchTerm } = await req.json();
    console.log('Pop culture search request:', { category, searchTerm });

    const results: SearchResult[] = [];

    if (!searchTerm || searchTerm.length < 2) {
      return new Response(JSON.stringify({ results: [], total: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Search Wikipedia
    try {
      const wikiSearchUrl = `https://en.wikipedia.org/api/rest_v1/page/search/${encodeURIComponent(searchTerm)}?limit=5`;
      const wikiResponse = await fetch(wikiSearchUrl);
      
      if (wikiResponse.ok) {
        const wikiData = await wikiResponse.json();
        if (wikiData.pages) {
          for (const page of wikiData.pages.slice(0, 3)) {
            results.push({
              title: page.title,
              description: page.description || page.excerpt || `Wikipedia article about ${page.title}`
            });
          }
        }
      }
    } catch (error) {
      console.log('Wikipedia search failed:', error.message);
    }

    // For movies, search iTunes API
    if (category?.toLowerCase().includes('movie') || category?.toLowerCase().includes('film')) {
      try {
        const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=movie&limit=3`;
        const itunesResponse = await fetch(itunesUrl);
        
        if (itunesResponse.ok) {
          const itunesData = await itunesResponse.json();
          if (itunesData.results) {
            for (const movie of itunesData.results.slice(0, 2)) {
              results.push({
                title: movie.trackName || movie.collectionName,
                description: `${movie.primaryGenreName || 'Movie'} from ${new Date(movie.releaseDate).getFullYear()}`
              });
            }
          }
        }
      } catch (error) {
        console.log('iTunes movie search failed:', error.message);
      }
    }

    // For TV shows, search TVMaze
    if (category?.toLowerCase().includes('tv') || category?.toLowerCase().includes('show') || category?.toLowerCase().includes('series')) {
      try {
        const tvMazeUrl = `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(searchTerm)}`;
        const tvResponse = await fetch(tvMazeUrl);
        
        if (tvResponse.ok) {
          const tvData = await tvResponse.json();
          for (const item of tvData.slice(0, 2)) {
            if (item.show) {
              const show = item.show;
              results.push({
                title: show.name,
                description: `${show.type || 'TV Show'}${show.genres?.length ? ` • ${show.genres.slice(0, 2).join(', ')}` : ''}`
              });
            }
          }
        }
      } catch (error) {
        console.log('TVMaze search failed:', error.message);
      }
    }

    // For music, search iTunes music
    if (category?.toLowerCase().includes('music') || category?.toLowerCase().includes('song') || category?.toLowerCase().includes('artist')) {
      try {
        const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=song&limit=3`;
        const itunesResponse = await fetch(itunesUrl);
        
        if (itunesResponse.ok) {
          const itunesData = await itunesResponse.json();
          if (itunesData.results) {
            for (const track of itunesData.results.slice(0, 2)) {
              results.push({
                title: `${track.trackName} by ${track.artistName}`,
                description: `${track.primaryGenreName || 'Music'} • ${track.collectionName || 'Single'}`
              });
            }
          }
        }
      } catch (error) {
        console.log('iTunes music search failed:', error.message);
      }
    }

    // For books, search Google Books API
    if (category?.toLowerCase().includes('book') || category?.toLowerCase().includes('literature')) {
      try {
        const booksUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchTerm)}&maxResults=3`;
        const booksResponse = await fetch(booksUrl);
        
        if (booksResponse.ok) {
          const booksData = await booksResponse.json();
          if (booksData.items) {
            for (const book of booksData.items.slice(0, 2)) {
              const volumeInfo = book.volumeInfo;
              results.push({
                title: volumeInfo.title,
                description: `Book by ${volumeInfo.authors?.join(', ') || 'Unknown Author'}${volumeInfo.publishedDate ? ` • ${volumeInfo.publishedDate.split('-')[0]}` : ''}`
              });
            }
          }
        }
      } catch (error) {
        console.log('Google Books search failed:', error.message);
      }
    }

    // Remove duplicates based on title similarity
    const uniqueResults = results.filter((result, index, arr) => 
      arr.findIndex(r => r.title.toLowerCase() === result.title.toLowerCase()) === index
    ).slice(0, 8);

    const response: SearchResponse = {
      results: uniqueResults,
      total: uniqueResults.length
    };

    console.log(`Found ${uniqueResults.length} search results for "${searchTerm}"`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in pop-culture-search function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      results: [],
      total: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});