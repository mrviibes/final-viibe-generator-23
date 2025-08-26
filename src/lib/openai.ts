import { OPENAI_API_KEY } from '@/config/secrets';

interface OpenAISearchResult {
  title: string;
  description: string;
}

interface GenerateTextParams {
  tone: string;
  category: string;
  subtopic: string;
  pick: string;
  tags: string[];
  charLimit: number;
}

class OpenAIService {
  private apiKey: string | null = OPENAI_API_KEY;

  setApiKey(apiKey: string) {
    console.warn('setApiKey ignored - using hardcoded key from config/secrets.ts');
  }

  hasApiKey(): boolean {
    return !!OPENAI_API_KEY;
  }

  async chatJSON<T = any>(
    messages: Array<{ role: string; content: string }>,
    options: {
      model?: string;
      temperature?: number;
      max_tokens?: number;
      response_format?: { type: string };
    } = {}
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error('No OpenAI API key available - check config/secrets.ts');
    }

    const defaultOptions = {
      model: 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: "json_object" }
    };

    const finalOptions = { ...defaultOptions, ...options };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: finalOptions.model,
        messages: messages,
        temperature: finalOptions.temperature,
        max_tokens: finalOptions.max_tokens,
        response_format: finalOptions.response_format
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API Error: ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    return JSON.parse(content);
  }

  async searchPopCulture(category: string, searchTerm: string): Promise<OpenAISearchResult[]> {
    const response = await this.chatJSON<{ results: OpenAISearchResult[] }>([
      { role: 'user', content: `Generate 5 popular ${category} related to "${searchTerm}". Return as JSON with "results" array containing objects with "title" and "description" fields.` }
    ], { model: 'gpt-4o-mini', temperature: 0.3, max_tokens: 800 });

    return response.results || [];
  }

  async generateShortTexts(params: GenerateTextParams): Promise<string[]> {
    const { tone, category, subtopic, pick, tags, charLimit } = params;
    
    const response = await this.chatJSON<string[]>([
      { role: 'user', content: `Generate 8 short ${tone} ${category} texts about "${subtopic}" featuring "${pick}". Each under ${charLimit} chars. Include themes: ${tags.join(', ')}. Return as JSON array of strings.` }
    ], { model: 'gpt-4o-mini', temperature: 0.8, max_tokens: 1000 });

    return Array.isArray(response) ? response.slice(0, 8) : [];
  }
}

export const openAIService = new OpenAIService();
export type { OpenAISearchResult, GenerateTextParams };