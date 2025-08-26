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

export class OpenAIProxyService {
  async hasApiKey(): Promise<boolean> {
    try {
      const response = await supabase.functions.invoke('openai-proxy', {
        body: {
          endpoint: 'https://api.openai.com/v1/models',
          method: 'GET'
        }
      });
      
      return !response.error;
    } catch {
      return false;
    }
  }

  isUsingBackend(): boolean {
    return true;
  }

  async chatJSON(messages: Array<{role: string; content: string}>, options: any = {}): Promise<any> {
    const response = await supabase.functions.invoke('openai-proxy', {
      body: {
        endpoint: 'https://api.openai.com/v1/chat/completions',
        method: 'POST',
        body: {
          model: options.model || 'gpt-4o-mini',
          messages,
          response_format: { type: "json_object" },
          temperature: 0.7,
          max_tokens: options.max_tokens || 2000,
        }
      }
    });

    if (response.error) {
      throw new Error(response.error.message || 'OpenAI API request failed');
    }

    const data = response.data;
    const content = data.choices[0].message.content;
    
    try {
      return JSON.parse(content);
    } catch (e) {
      console.warn('Failed to parse JSON response:', content);
      return { error: 'Invalid JSON response from API' };
    }
  }

  async searchPopCulture(category: string, searchTerm: string): Promise<OpenAISearchResult[]> {
    const messages = [
      {
        role: "system",
        content: `You are a pop culture expert. Generate ${category} related to "${searchTerm}". Return a JSON object with "results" array containing objects with "title" and "description" fields. Limit to 5 results.`
      },
      {
        role: "user", 
        content: `Find popular ${category} related to: ${searchTerm}`
      }
    ];

    const result = await this.chatJSON(messages);
    return result.results || [];
  }

  async generateShortTexts(params: GenerateTextParams): Promise<string[]> {
    const { tone, category, subtopic, pick, tags, characterLimit } = params;
    
    let prompt = `Generate 5 short ${tone} text options`;
    if (category) prompt += ` for ${category}`;
    if (subtopic) prompt += ` about ${subtopic}`;
    if (pick) prompt += ` featuring ${pick}`;
    if (tags?.length) prompt += ` with themes: ${tags.join(', ')}`;
    prompt += `. Each must be under ${characterLimit} characters. Return JSON with "texts" array of strings.`;

    const messages = [
      { role: "system", content: "You are a creative writing assistant specializing in short, engaging content." },
      { role: "user", content: prompt }
    ];

    const result = await this.chatJSON(messages);
    const texts = result.texts || [];
    
    return texts.filter((text: string) => text.length <= characterLimit).slice(0, 5);
  }
}

export const openAIProxyService = new OpenAIProxyService();