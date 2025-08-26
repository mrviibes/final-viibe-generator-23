import { getOpenAIKey } from "@/config/secrets";

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

class OpenAIDirectService {
  hasApiKey(): boolean {
    const key = getOpenAIKey();
    return !!(key && key.startsWith("sk-"));
  }

  isUsingBackend(): boolean {
    return false;
  }

  async chatJSON(messages: Array<{role: string; content: string}>, options: any = {}): Promise<any> {
    const key = getOpenAIKey();
    if (!key) throw new Error("Missing OpenAI API key");

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options.model || "gpt-4o-mini",
        messages,
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: options.max_tokens || 2000,
      }),
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(data?.error?.message || `OpenAI error ${resp.status}`);
    }

    const content = data?.choices?.[0]?.message?.content ?? "{}";
    try {
      return JSON.parse(content);
    } catch {
      return { raw: content };
    }
  }

  async searchPopCulture(category: string, searchTerm: string): Promise<OpenAISearchResult[]> {
    const messages = [
      {
        role: "system",
        content: `You are a pop culture expert. Generate ${category} related to "${searchTerm}". Return a JSON object with "results" array containing objects with "title" and "description" fields. Limit to 5 results.`
      },
      { role: "user", content: `Find popular ${category} related to: ${searchTerm}` }
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
    if (tags?.length) prompt += ` with themes: ${tags.join(", ")}`;
    prompt += `. Each must be under ${characterLimit} characters. Return JSON with "texts" array of strings.`;

    const messages = [
      { role: "system", content: "You are a creative writing assistant specializing in short, engaging content." },
      { role: "user", content: prompt },
    ];
    const result = await this.chatJSON(messages);
    const texts = result.texts || [];
    return texts.filter((t: string) => t.length <= characterLimit).slice(0, 5);
  }
}

export const openAIDirectService = new OpenAIDirectService();