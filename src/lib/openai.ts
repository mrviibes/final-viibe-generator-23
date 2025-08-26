import { getOpenAIKey } from "@/config/secrets";
import { hasOpenAIKey, checkRateLimit } from "@/lib/keyManager";
import { toast } from "@/hooks/use-toast";

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
    console.info("OpenAI Service: Using direct API calls with hardcoded key");
  }

  hasApiKey(): boolean {
    return hasOpenAIKey();
  }

  isUsingBackend(): boolean {
    return false;
  }

  private async callDirectAPI(messages: Array<{role: string; content: string}>, options: {
    temperature?: number;
    max_tokens?: number;
    max_completion_tokens?: number;
    model?: string;
  } = {}): Promise<any> {
    if (!checkRateLimit('openai')) {
      toast({
        title: "Rate limit",
        description: "Please wait 3 seconds between requests",
        variant: "destructive"
      });
      throw new Error("Rate limited - please wait");
    }

    const apiKey = getOpenAIKey();
    
    if (!apiKey || apiKey.includes("YOUR_REAL_OPENAI_KEY_HERE")) {
      toast({
        title: "API Key needed",
        description: "Please paste your OpenAI API key in src/config/secrets.ts",
        variant: "destructive"
      });
      throw new Error("OpenAI API key not configured");
    }
    const requestBody = {
      model: options.model || 'gpt-4o-mini',
      messages,
      temperature: options.temperature ?? 0.7,
      max_completion_tokens: options.max_completion_tokens || options.max_tokens || 4000,
    };

    console.log(`Calling OpenAI API directly - Model: ${requestBody.model}`);
    
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getOpenAIKey()}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', response.status, errorData);
      throw new Error(`OpenAI API error: ${response.status} ${errorData}`);
    }

    const data = await response.json();
    console.log(`OpenAI API success - Model: ${requestBody.model}`);
    return data;
  }

  async chatJSON(messages: Array<{role: string; content: string}>, options: {
    temperature?: number;
    max_tokens?: number;
    max_completion_tokens?: number;
    model?: string;
  } = {}): Promise<any> {
    try {
      const data = await this.callDirectAPI(messages, options);
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      // Try to parse as JSON
      try {
        return JSON.parse(content);
      } catch {
        // If it's not valid JSON, return the raw content
        return content;
      }
    } catch (error) {
      console.error('OpenAI API call failed:', error);
      throw error;
    }
  }

  async searchPopCulture(category: string, searchTerm: string): Promise<OpenAISearchResult[]> {
    const prompt = `You are a pop culture expert. Generate 8 creative suggestions for ${category} related to "${searchTerm}". 

Return ONLY a JSON array of objects with "title" and "description" fields. No other text.

Example format:
[
  {"title": "Example Title", "description": "Brief description"},
  {"title": "Another Title", "description": "Another description"}
]`;

    try {
      const messages = [
        { role: 'user', content: prompt }
      ];

      const data = await this.callDirectAPI(messages, {
        temperature: 0.8,
        max_completion_tokens: 1500,
        model: 'gpt-4o-mini'
      });

      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      return safeParseArray(content);
    } catch (error) {
      console.error('Error searching pop culture:', error);
      return [];
    }
  }

  async generateShortTexts(params: GenerateTextParams): Promise<string[]> {
    const { tone, category, subtopic, pick, tags, characterLimit } = params;
    
    let prompt = `Generate 8 different short text options with these requirements:
- Tone: ${tone}
- Character limit: ${characterLimit} characters max (INCLUDING spaces)
- Each text should be unique and creative`;

    if (category) prompt += `\n- Category: ${category}`;
    if (subtopic) prompt += `\n- Subtopic: ${subtopic}`;
    if (pick) prompt += `\n- Context: ${pick}`;
    if (tags && tags.length > 0) prompt += `\n- Include themes: ${tags.join(', ')}`;

    prompt += `\n\nReturn ONLY a JSON array of strings. No other text. Each string must be under ${characterLimit} characters.

Example format:
["Text option 1", "Text option 2", "Text option 3"]`;

    try {
      const messages = [
        { role: 'user', content: prompt }
      ];

      const data = await this.callDirectAPI(messages, {
        temperature: 0.9,
        max_completion_tokens: 2000,
        model: 'gpt-4o-mini'
      });

      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      try {
        const cleanContent = content.replace(/```json\s*|\s*```/g, '').trim();
        const parsed = JSON.parse(cleanContent);
        return Array.isArray(parsed) ? parsed.filter(text => 
          typeof text === 'string' && text.length <= characterLimit
        ) : [];
      } catch (error) {
        console.warn('Failed to parse OpenAI response:', error);
        return [];
      }
    } catch (error) {
      console.error('Error generating short texts:', error);
      return [];
    }
  }
}

export const openAIService = new OpenAIService();