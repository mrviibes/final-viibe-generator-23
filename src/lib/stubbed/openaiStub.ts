// Stubbed OpenAI service - returns static responses when AI is disabled
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

  setApiKey(key: string) {
    this.apiKey = key;
  }

  hasApiKey(): boolean {
    return true; // Always return true in stub mode
  }

  getApiKey(): string | null {
    return this.apiKey;
  }

  clearApiKey() {
    this.apiKey = null;
  }

  isUsingBackend(): boolean {
    return false; // Stub mode
  }

  setTextSpeed(speed: 'fast' | 'creative') {
    // No-op in stub mode
  }

  getTextSpeed(): 'fast' | 'creative' {
    return 'fast';
  }

  async chatJSON(messages: Array<{role: string; content: string}>, options: any = {}): Promise<any> {
    // Return static JSON response
    return {
      lines: [
        "Frame mode: AI disabled",
        "Static placeholder text",
        "No AI generation active",
        "Frame interface ready"
      ]
    };
  }

  async searchPopCulture(category: string, searchTerm: string): Promise<OpenAISearchResult[]> {
    // Return static pop culture results
    return [
      { title: "Frame Mode Item 1", description: "Static placeholder for " + category },
      { title: "Frame Mode Item 2", description: "No AI search active" },
      { title: "Frame Mode Item 3", description: "Stubbed response" },
      { title: "Frame Mode Item 4", description: "AI disabled" },
      { title: "Frame Mode Item 5", description: "Frame interface ready" }
    ];
  }

  async generateText(params: GenerateTextParams): Promise<string[]> {
    // Return static text suggestions
    return [
      "Frame mode active",
      "AI text generation disabled",
      "Static placeholder text",
      "No AI processing"
    ];
  }
}

export const openAIService = new OpenAIService();