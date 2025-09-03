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

// Helper function to add timeout to fetch requests
async function timedFetch(url: string, timeout = 2000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
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

    const categoryLower = category?.toLowerCase() || '';

    // Category-specific searches only - no Wikipedia for all categories
    if (categoryLower.includes('celebrities') || categoryLower.includes('celebrity') || categoryLower.includes('actor') || categoryLower.includes('actress')) {
      // Search TVMaze for actors
      try {
        const tvMazeUrl = `https://api.tvmaze.com/search/people?q=${encodeURIComponent(searchTerm)}`;
        const tvResponse = await timedFetch(tvMazeUrl);
        
        if (tvResponse.ok) {
          const tvData = await tvResponse.json();
          for (const item of tvData.slice(0, 3)) {
            if (item.person) {
              const person = item.person;
              results.push({
                title: person.name,
                description: `Actor/Actress${person.birthday ? ` • Born ${person.birthday}` : ''}${person.country ? ` • ${person.country.name}` : ''}`
              });
            }
          }
        }
      } catch (error) {
        console.log('TVMaze people search failed:', error.message);
      }

      // Search iTunes for musicians
      try {
        const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=musicArtist&limit=3`;
        const itunesResponse = await timedFetch(itunesUrl);
        
        if (itunesResponse.ok) {
          const itunesData = await itunesResponse.json();
          if (itunesData.results) {
            for (const artist of itunesData.results) {
              results.push({
                title: artist.artistName,
                description: `Musical Artist • ${artist.primaryGenreName || 'Music'}`
              });
            }
          }
        }
      } catch (error) {
        console.log('iTunes artist search failed:', error.message);
      }
    }

    // For movies, search iTunes API only
    else if (categoryLower.includes('movie') || categoryLower.includes('film')) {
      try {
        const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=movie&limit=6`;
        const itunesResponse = await timedFetch(itunesUrl);
        
        if (itunesResponse.ok) {
          const itunesData = await itunesResponse.json();
          if (itunesData.results) {
            for (const movie of itunesData.results) {
              results.push({
                title: movie.trackName || movie.collectionName,
                description: `Movie${movie.releaseDate ? ` • ${new Date(movie.releaseDate).getFullYear()}` : ''}${movie.primaryGenreName ? ` • ${movie.primaryGenreName}` : ''}`
              });
            }
          }
        }
      } catch (error) {
        console.log('iTunes movie search failed:', error.message);
      }
    }

    // For TV shows, search TVMaze only
    else if (categoryLower.includes('tv') || categoryLower.includes('show') || categoryLower.includes('series')) {
      try {
        const tvMazeUrl = `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(searchTerm)}`;
        const tvResponse = await timedFetch(tvMazeUrl);
        
        if (tvResponse.ok) {
          const tvData = await tvResponse.json();
          for (const item of tvData.slice(0, 6)) {
            if (item.show) {
              const show = item.show;
              results.push({
                title: show.name,
                description: `TV Show${show.premiered ? ` • ${new Date(show.premiered).getFullYear()}` : ''}${show.genres && show.genres.length > 0 ? ` • ${show.genres[0]}` : ''}`
              });
            }
          }
        }
      } catch (error) {
        console.log('TVMaze search failed:', error.message);
      }
    }

    // For music, search iTunes music only
    else if (categoryLower.includes('music') || categoryLower.includes('song') || categoryLower.includes('artist') || categoryLower.includes('band')) {
      try {
        const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=musicArtist&limit=6`;
        const itunesResponse = await timedFetch(itunesUrl);
        
        if (itunesResponse.ok) {
          const itunesData = await itunesResponse.json();
          if (itunesData.results) {
            for (const artist of itunesData.results) {
              results.push({
                title: artist.artistName,
                description: `Musical Artist • ${artist.primaryGenreName || 'Music'}`
              });
            }
          }
        }
      } catch (error) {
        console.log('iTunes music search failed:', error.message);
      }
    }

    // For books, search Google Books API only
    else if (categoryLower.includes('book') || categoryLower.includes('literature')) {
      try {
        const booksUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchTerm)}&maxResults=6`;
        const booksResponse = await timedFetch(booksUrl);
        
        if (booksResponse.ok) {
          const booksData = await booksResponse.json();
          if (booksData.items) {
            for (const book of booksData.items) {
              const volumeInfo = book.volumeInfo;
              results.push({
                title: volumeInfo.title,
                description: `Book${volumeInfo.authors ? ` • by ${volumeInfo.authors[0]}` : ''}${volumeInfo.publishedDate ? ` • ${volumeInfo.publishedDate.split('-')[0]}` : ''}`
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
    );

    // Limit to 6 total results for faster loading
    const limitedResults = uniqueResults.slice(0, 6);

    const response: SearchResponse = {
      results: limitedResults,
      total: limitedResults.length
    };

    console.log(`Found ${limitedResults.length} search results for "${searchTerm}" in category "${category}"`);

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