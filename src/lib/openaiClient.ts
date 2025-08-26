// Secure OpenAI client that calls server proxy instead of direct API

// Use environment variable for server URL with fallback
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

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
    const response = await fetch(`${SERVER_URL}/api/openai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages, options }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'OpenAI request failed');
    }

    const data = await response.json();
    
    if (data.choices?.[0]?.message?.content) {
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
    // Check if server is available (keys are server-side)
    return true; // Server will handle validation
  }
}

export const openAIClientService = new OpenAIClientService();