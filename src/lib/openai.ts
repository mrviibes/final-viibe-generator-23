import { supabase } from "@/integrations/supabase/client";

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

export class OpenAIService {
  hasApiKey(): boolean {
    return true; // Always true since keys are stored server-side
  }

  async chatJSON(messages: Array<{role: string; content: string}>, options: any = {}): Promise<any> {
    try {
      const requestOptions = {
        ...options,
        response_format: { type: "json_object" }
      };

      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: { messages, options: requestOptions }
      });

      if (error) {
        console.error('Supabase edge function error:', error);
        throw new Error(error.message || 'Failed to call OpenAI via edge function');
      }

      if (!data) {
        throw new Error('No data received from edge function');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      try {
        return JSON.parse(content);
      } catch (parseError) {
        // Try to clean and parse again
        const cleanedContent = content
          .replace(/```json\s*|\s*```/g, '')
          .replace(/^[^{]*/, '')
          .replace(/[^}]*$/, '')
          .trim();
        
        try {
          return JSON.parse(cleanedContent);
        } catch {
          throw new Error(`Invalid JSON response from OpenAI`);
        }
      }
    } catch (error) {
      console.error('OpenAI chatJSON error:', error);
      throw error instanceof Error ? error : new Error('Unknown error occurred');
    }
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
        max_tokens: 500,
        model: 'gpt-4o-mini'
      });

      const suggestions = result?.suggestions || [];
      const validSuggestions = suggestions.filter((item: any) => 
        item && typeof item.title === 'string' && typeof item.description === 'string' &&
        item.title.trim() && item.description.trim()
      );

      while (validSuggestions.length < 5) {
        validSuggestions.push({
          title: `${category} suggestion ${validSuggestions.length + 1}`,
          description: `Popular ${category.toLowerCase()} related to ${searchTerm}`
        });
      }

      return validSuggestions.slice(0, 5);
    } catch (error) {
      console.error('Pop culture search failed:', error);
      
      return [
        { title: "Popular Option", description: "Trending content related to your search" },
        { title: "Classic Choice", description: "Timeless option that's always relevant" }
      ];
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
        max_tokens: 300,
        model: 'gpt-4o-mini'
      });

      const options = result?.options || [];
      
      const processedOptions = options.map((option: string) => {
        const cleaned = option.replace(/^["']|["']$/g, '').trim();
        return cleaned.length > characterLimit ? cleaned.slice(0, characterLimit) : cleaned;
      }).slice(0, 4);

      while (processedOptions.length < 4) {
        processedOptions.push(`${tone} text option ${processedOptions.length + 1}`);
      }

      return processedOptions;
      
    } catch (error) {
      console.error('OpenAI text generation error:', error);
      
      return [
        `${tone} text for ${category || 'your content'}`,
        `Creative ${tone.toLowerCase()} option`,
        `Engaging ${tone.toLowerCase()} text`,
        `${tone} content idea`
      ].map(option => 
        option.length > characterLimit ? option.slice(0, characterLimit) : option
      );
    }
  }
}

export const openAIService = new OpenAIService();