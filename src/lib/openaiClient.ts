// Secure OpenAI client using Supabase Edge Functions
import { supabase } from "@/integrations/supabase/client";

export interface OpenAISearchResult {
  title: string;
  description: string;
}

export interface GenerateTextParams {
  tone?: string;
  category?: string;
  subtopic?: string;
  pick?: string;
  tags?: string[];
  characterLimit?: number;
}

class OpenAIClientService {
  async chatJSON(messages: Array<{role: string; content: string}>, options: any = {}): Promise<any> {
    const { data, error } = await supabase.functions.invoke('openai-chat', {
      body: { messages, options },
    });

    if (error) {
      console.error('OpenAI service error:', error);
      throw new Error(error.message || 'OpenAI request failed');
    }
    
    if (data?.choices?.[0]?.message?.content) {
      try {
        return JSON.parse(data.choices[0].message.content);
      } catch (e) {
        console.error('Failed to parse OpenAI response as JSON:', data.choices[0].message.content);
        throw new Error('Invalid JSON response from OpenAI');
      }
    }
    
    throw new Error('No response from OpenAI');
  }

  async searchPopCulture(category: string, searchTerm: string): Promise<OpenAISearchResult[]> {
    const messages = [
      {
        role: "system",
        content: `You are a pop culture expert. Return search results as a JSON array of objects with "title" and "description" fields. Focus on ${category} related to "${searchTerm}".`
      },
      {
        role: "user", 
        content: `Find 5 popular ${category} items related to "${searchTerm}". Return as JSON array with title and description fields.`
      }
    ];

    const result = await this.chatJSON(messages);
    return Array.isArray(result) ? result : [];
  }

  async generateShortTexts(params: GenerateTextParams): Promise<string[]> {
    const { tone, category, subtopic, pick, tags, characterLimit } = params;
    
    const prompt = `Generate 5 short ${tone || 'engaging'} text snippets about ${category}${subtopic ? ` - ${subtopic}` : ''}${pick ? ` featuring ${pick}` : ''}${tags?.length ? ` with themes: ${tags.join(', ')}` : ''}. ${characterLimit ? `Keep each under ${characterLimit} characters.` : 'Keep them concise.'} Return as JSON array of strings.`;

    const messages = [
      {
        role: "system",
        content: "You are a creative writing assistant. Return responses as JSON arrays of strings."
      },
      {
        role: "user",
        content: prompt
      }
    ];

    const result = await this.chatJSON(messages);
    return Array.isArray(result) ? result : [];
  }

  hasApiKey(): boolean {
    // Keys are managed in Supabase Edge Functions
    return true;
  }
}

export const openAIClientService = new OpenAIClientService();