import { HARDCODED_API_KEYS, hasHardcodedOpenAIKey } from "@/config/secrets";

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

export class OpenAIService {
  private apiKey: string | null = null;

  constructor() {
    this.apiKey = localStorage.getItem('openai_api_key');
  }

  setApiKey(key: string) {
    this.apiKey = key;
    localStorage.setItem('openai_api_key', key);
  }

  hasApiKey(): boolean {
    return Boolean(this.apiKey || localStorage.getItem('openai_api_key') || hasHardcodedOpenAIKey());
  }

  private getApiKey(): string | null {
    return this.apiKey || localStorage.getItem('openai_api_key') || HARDCODED_API_KEYS.OPENAI_API_KEY || null;
  }

  async chatJSON(messages: Array<{role: string; content: string}>, options: any = {}): Promise<any> {
    const apiKey = this.getApiKey();
    
    if (!apiKey) {
      throw new Error('OpenAI API key is required. Please set your API key.');
    }

    // Direct OpenAI API call with multiple model fallbacks
    const models = ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'];
    let lastError: Error | null = null;

    for (const model of models) {
      try {
        const result = await this.attemptChatJSON(messages, { ...options, model });
        return result;
      } catch (error) {
        console.warn(`Model ${model} failed:`, error);
        lastError = error as Error;
        
        // Don't retry if it's an auth error
        if (error instanceof Error && error.message.includes('401')) {
          throw error;
        }
      }
    }

    throw lastError || new Error('All model attempts failed');
  }

  private async attemptChatJSON(messages: Array<{role: string; content: string}>, options: any): Promise<any> {
    const {
      temperature = 0.8,
      max_tokens = 2500,
      model = 'gpt-4o-mini'
    } = options;

    const requestBody = {
      model,
      messages,
      max_tokens,
      temperature,
      response_format: { type: "json_object" }
    };

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getApiKey()}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API request failed');
    }

    const data = await response.json();
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