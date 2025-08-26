import { supabase } from "@/integrations/supabase/client";

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export interface OpenAISearchResult {
  title: string;
  description: string;
}

export interface GenerateTextParams {
  tone: string;
  category?: string;
  subtopic?: string;
  pick?: string;
  tags?: string[];
  characterLimit: number;
}

// Helper to safely parse JSON arrays from API responses
function safeParseArray(content: string): OpenAISearchResult[] {
  try {
    // Remove any markdown code blocks
    const cleanContent = content.replace(/```json\s*|\s*```/g, '').trim();
    const parsed = JSON.parse(cleanContent);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Failed to parse OpenAI response:', error);
    return [];
  }
}

export class OpenAIService {
  constructor() {
    // Backend-only mode: Log startup verification
    console.info("OpenAI Service: Using Supabase backend for all API calls");
  }

  hasApiKey(): boolean {
    return true; // Always available via Supabase backend
  }

  isUsingBackend(): boolean {
    return true; // Always using backend
  }

  private async callBackendAPI(messages: Array<{role: string; content: string}>, options: {
    temperature?: number;
    max_tokens?: number;
    max_completion_tokens?: number;
    model?: string;
  }): Promise<any> {
    const {
      temperature = 0.8,
      max_tokens = 2500,
      max_completion_tokens,
      model = 'gpt-5-mini-2025-08-07'
    } = options;

    console.log(`Calling OpenAI backend API - Model: ${model}, Messages: ${messages.length}`);

    try {
      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: {
          messages,
          options: {
            temperature,
            max_tokens,
            max_completion_tokens,
            model,
            response_format: { type: "json_object" } // Always use JSON format
          }
        }
      });

      if (error) {
        console.error('Backend API error:', error);
        throw new Error(`Backend API error: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data received from backend API');
      }

      const content = data.choices?.[0]?.message?.content;
      const finishReason = data.choices?.[0]?.finish_reason;
      
      console.log(`Backend API Response - Model: ${model}, Finish Reason: ${finishReason}, Content Length: ${content?.length || 0}`);
      
      if (!content || content.trim() === '') {
        if (finishReason === 'length') {
          throw new Error('Response truncated - prompt too long. Try shorter input.');
        }
        throw new Error(`No content received from backend API (finish_reason: ${finishReason})`);
      }

      // Parse JSON response
      try {
        const parsed = JSON.parse(content);
        console.log('Successfully parsed backend JSON response');
        return parsed;
      } catch (parseError) {
        console.error('JSON parse error from backend:', parseError);
        console.error('Raw content that failed to parse:', content);
        
        // Clean content by removing common wrapping patterns
        let cleanedContent = content
          .replace(/```json\s*|\s*```/g, '') // Remove code fences
          .replace(/^[^{]*/, '') // Remove text before first {
          .replace(/[^}]*$/, '') // Remove text after last }
          .trim();
        
        try {
          const parsed = JSON.parse(cleanedContent);
          console.log('Successfully parsed cleaned backend JSON:', parsed);
          return parsed;
        } catch (cleanError) {
          // Final attempt: extract largest JSON block
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const extracted = JSON.parse(jsonMatch[0]);
              console.log('Successfully extracted JSON from backend response:', extracted);
              return extracted;
            } catch (e) {
              console.error('Failed to parse extracted JSON:', e);
            }
          }
        }
        
        throw new Error(`Invalid JSON response from backend API (model: ${model})`);
      }

    } catch (error) {
      console.error('Backend API call failed:', error);
      
      throw error;
    }
  }

  async chatJSON(messages: Array<{role: string; content: string}>, options: {
    temperature?: number;
    max_tokens?: number;
    max_completion_tokens?: number;
    model?: string;
  } = {}): Promise<any> {
    // Backend-only mode: always use Supabase backend
    return this.callBackendAPI(messages, options);
  }


  async searchPopCulture(category: string, searchTerm: string): Promise<OpenAISearchResult[]> {
    const prompt = `Generate exactly 5 creative and relevant ${category.toLowerCase()} suggestions related to "${searchTerm}". Focus on popular, well-known entries that would be engaging for users. Keep descriptions concise (1-2 sentences).

Return as a JSON object with this exact format:
{
  "suggestions": [
    {"title": "Suggestion Title", "description": "Brief description"}
  ]
}`;

    try {
      const result = await this.chatJSON([
        { role: 'user', content: prompt }
      ], {
        max_completion_tokens: 500,
        model: 'gpt-4.1-2025-04-14' // More reliable model
      });

      // Post-process to ensure we have exactly 5 valid items
      const suggestions = result?.suggestions || [];
      const validSuggestions = suggestions.filter((item: any) => 
        item && typeof item.title === 'string' && typeof item.description === 'string' &&
        item.title.trim() && item.description.trim()
      );

      // If we don't have enough valid suggestions, pad with generic ones
      while (validSuggestions.length < 5) {
        validSuggestions.push({
          title: `${category} suggestion ${validSuggestions.length + 1}`,
          description: `Popular ${category.toLowerCase()} related to ${searchTerm}`
        });
      }

      return validSuggestions.slice(0, 5);
    } catch (error) {
      console.error('Pop culture search failed:', error);
      
      // Return fallback suggestions based on category
      const fallbacks: Record<string, OpenAISearchResult[]> = {
        movies: [
          { title: "Popular Action Movie", description: "High-energy blockbuster with thrilling sequences" },
          { title: "Acclaimed Drama", description: "Award-winning dramatic performance" }
        ],
        music: [
          { title: "Chart-topping Hit", description: "Current popular song everyone's talking about" },
          { title: "Classic Rock Anthem", description: "Timeless rock song that never gets old" }
        ],
        default: [
          { title: "Trending Topic", description: "Popular culture reference everyone knows" },
          { title: "Cultural Icon", description: "Widely recognized cultural phenomenon" }
        ]
      };
      
      return fallbacks[category.toLowerCase()] || fallbacks.default;
    }
  }

  async generateShortTexts(params: GenerateTextParams): Promise<string[]> {
    const { tone, category, subtopic, pick, tags = [], characterLimit } = params;
    
    let contextParts = [];
    if (category) contextParts.push(`Category: ${category}`);
    if (subtopic) contextParts.push(`Topic: ${subtopic}`);
    if (pick) contextParts.push(`Specific focus: ${pick}`);
    
    const context = contextParts.join(', ');
    
    let prompt = `Generate exactly 4 short ${tone.toLowerCase()} text options for: ${context}.`;
    
    if (tags.length > 0) {
      prompt += ` IMPORTANT: Each option MUST include ALL of these exact words/tags: ${tags.join(', ')}.`;
    }
    
    prompt += ` Each option must be ${characterLimit} characters or fewer. Be creative and engaging.

Return as a JSON object with this exact format:
{
  "options": ["text option 1", "text option 2", "text option 3", "text option 4"]
}`;

    try {
      const result = await this.chatJSON([
        { role: 'user', content: prompt }
      ], {
        max_completion_tokens: 300, // Reduced to prevent reasoning overruns
        model: 'gpt-5-mini-2025-08-07'
      });

      const options = result?.options || [];
      
      // Enforce character limit and ensure exactly 4 options
      const processedOptions = options.map((option: string) => {
        const cleaned = option.replace(/^["']|["']$/g, '').trim();
        return cleaned.length > characterLimit ? cleaned.slice(0, characterLimit) : cleaned;
      }).slice(0, 4);

      // If we don't have 4 options, pad with generic ones
      while (processedOptions.length < 4) {
        processedOptions.push(`${tone} text option ${processedOptions.length + 1}`);
      }

      return processedOptions;
      
    } catch (error) {
      console.error('OpenAI text generation error:', error);
      
      // Return fallback options
      const fallbackOptions = [
        `${tone} text for ${category || 'your content'}`,
        `Creative ${tone.toLowerCase()} option`,
        `Engaging ${tone.toLowerCase()} text`,
        `${tone} content idea`
      ];
      
      return fallbackOptions.map(option => 
        option.length > characterLimit ? option.slice(0, characterLimit) : option
      );
    }
  }
}

export const openAIService = new OpenAIService();