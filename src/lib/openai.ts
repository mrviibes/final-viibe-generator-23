import { supabase } from "@/integrations/supabase/client";
import { buildPopCultureSearchPrompt, buildGenerateTextMessages, getEffectiveConfig, MODEL_DISPLAY_NAMES, getSmartFallbackChain, getRuntimeOverrides } from "../vibe-ai.config";

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
  private apiKey: string | null = null;
  private useBackendAPI: boolean = true; // Use Supabase backend by default
  private textSpeed: 'fast' | 'creative' = 'fast'; // Locked to fast

  constructor() {
    // Still support localStorage for fallback, but prefer backend
    this.apiKey = localStorage.getItem('openai_api_key');
    // Always use fast mode - ignore localStorage
    this.textSpeed = 'fast';
  }

  setApiKey(key: string) {
    this.apiKey = key;
    localStorage.setItem('openai_api_key', key);
    this.useBackendAPI = false; // Switch to frontend mode when key is set
  }

  hasApiKey(): boolean {
    return this.useBackendAPI || !!this.apiKey;
  }

  getApiKey(): string | null {
    return this.apiKey;
  }

  clearApiKey() {
    this.apiKey = null;
    localStorage.removeItem('openai_api_key');
    this.useBackendAPI = true; // Go back to backend mode
  }

  isUsingBackend(): boolean {
    return this.useBackendAPI;
  }

  setTextSpeed(speed: 'fast' | 'creative') {
    // Always locked to fast - ignore any changes
    this.textSpeed = 'fast';
  }

  getTextSpeed(): 'fast' | 'creative' {
    return 'fast'; // Always return fast
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
      
      // Fallback to frontend if backend fails
      if (this.apiKey) {
        console.log('Falling back to frontend API...');
        this.useBackendAPI = false;
        const result = await this.chatJSON(messages, options);
        this.useBackendAPI = true; // Reset for next call
        return result;
      }
      
      throw error;
    }
  }

  async chatJSON(messages: Array<{role: string; content: string}>, options: {
    temperature?: number;
    max_tokens?: number;
    max_completion_tokens?: number;
    model?: string;
  } = {}): Promise<any> {
    // Use backend API if available, fallback to frontend
    if (this.useBackendAPI) {
      return this.callBackendAPI(messages, options);
    }
    
    if (!this.apiKey) {
      throw new Error('OpenAI API key not set');
    }

    const {
      temperature = 0.8,
      max_tokens = 2500,
      max_completion_tokens,
      model = 'gpt-5-mini-2025-08-07'
    } = options;

    // Check if user wants strict mode (no fallbacks)
    const overrides = getRuntimeOverrides();
    const isStrictMode = overrides.strictModel === true;
    const shouldUseMyKey = overrides.apiSource === 'my_key';
    
    // Use smart fallback chain based on the requested model, but respect strict mode
    const retryModels = isStrictMode ? [model] : getSmartFallbackChain(model, 'text');
    console.log(`📋 Text generation ${isStrictMode ? '(strict mode)' : ''} retry chain: ${retryModels.map(m => MODEL_DISPLAY_NAMES[m] || m).join(' → ')}`);
    
    // Force backend/frontend based on user preference
    if (shouldUseMyKey && !this.apiKey) {
      throw new Error('My OpenAI key selected but no API key provided. Please add your API key in settings.');
    }

    let lastError: Error | null = null;
    let retryAttempt = 0;

    for (const tryModel of retryModels) {
      console.log(`🎯 Attempting text generation with ${MODEL_DISPLAY_NAMES[tryModel] || tryModel} (attempt ${retryAttempt + 1}/${retryModels.length})`);
      
      try {
        // For my_key mode, always use frontend; for server mode, always use backend
        const result = shouldUseMyKey 
          ? await this.attemptChatJSON(messages, { temperature, max_tokens, max_completion_tokens, model: tryModel })
          : await this.callBackendAPI(messages, { temperature, max_tokens, max_completion_tokens, model: tryModel });
        
        // Store API metadata including the actual model used and fallback reason
        const fallbackReason = retryAttempt > 0 
          ? (shouldUseMyKey ? 'API key lacks model access' : 'Server retry') 
          : undefined;
        
        if (result && typeof result === 'object') {
          result._apiMeta = {
            modelUsed: tryModel,
            textSpeed: this.textSpeed,
            retryAttempt,
            originalModel: model !== tryModel ? model : undefined,
            fallbackReason,
            apiSource: shouldUseMyKey ? 'my_key' : 'server',
            strictMode: isStrictMode
          };
        }
        
        console.log(`✅ Text generation successful with ${MODEL_DISPLAY_NAMES[tryModel] || tryModel}${fallbackReason ? ` (${fallbackReason})` : ''}`);
        return result;
      } catch (error) {
        console.error(`❌ Text generation failed with ${MODEL_DISPLAY_NAMES[tryModel] || tryModel}:`, error);
        lastError = error as Error;
        retryAttempt++;
        
        // Don't retry if it's an auth error
        if (error instanceof Error && error.message.includes('401')) {
          throw error;
        }
        
        // If in strict mode, don't retry with other models
        if (isStrictMode) {
          console.log(`🚫 Strict mode enabled - not falling back to other models`);
          break;
        }
      }
    }

    throw lastError || new Error('All model attempts failed');
  }

  private async attemptChatJSON(messages: Array<{role: string; content: string}>, options: {
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

    const isGPT5Model = model?.startsWith('gpt-5');
    const isO3Model = model?.startsWith('o3');
    const isGPT41OrO4 = model?.startsWith('gpt-4.1') || model?.startsWith('o4');
    const isOlderGPT4 = model?.includes('gpt-4o') && !model?.includes('gpt-4.1');
    
    const tokenLimit = max_completion_tokens || max_tokens;
    
    // Use appropriate token parameter based on model
    let tokenParameter = 'max_tokens';
    if (isGPT5Model || isGPT41OrO4 || isO3Model) {
      tokenParameter = 'max_completion_tokens';
    }

    // Build request body
    const requestBody: any = {
      model,
      messages,
      [tokenParameter]: tokenLimit
    };

    // Always add response_format for JSON
    requestBody.response_format = { type: "json_object" };
    
    // Only older GPT-4o models support temperature (gpt-4o, gpt-4o-mini)
    // GPT-5, GPT-4.1, O3, and O4 models don't support temperature
    if (isOlderGPT4) {
      requestBody.temperature = temperature;
    }

    console.log(`Attempting API call with model: ${model}, tokens: ${tokenLimit}`);

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API request failed');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const finishReason = data.choices?.[0]?.finish_reason;
    
    console.log(`API Response Debug - Model: ${model}, Finish Reason: ${finishReason}, Content Length: ${content?.length || 0}`);
    console.log(`Raw content preview: ${content?.substring(0, 200) || 'NO CONTENT'}`);
    
    if (!content || content.trim() === '') {
      if (finishReason === 'length') {
        throw new Error('Response truncated - prompt too long. Try shorter input.');
      }
      throw new Error(`No content received from OpenAI (finish_reason: ${finishReason})`);
    }

    // Enhanced JSON parsing with cleanup
    try {
      const parsed = JSON.parse(content);
      console.log('Successfully parsed JSON:', parsed);
      return parsed;
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw content that failed to parse:', content);
      
      // Clean content by removing common wrapping patterns
      let cleanedContent = content
        .replace(/```json\s*|\s*```/g, '') // Remove code fences
        .replace(/^[^{]*/, '') // Remove text before first {
        .replace(/[^}]*$/, '') // Remove text after last }
        .trim();
      
      // Try parsing cleaned content
      try {
        const parsed = JSON.parse(cleanedContent);
        console.log('Successfully parsed cleaned JSON:', parsed);
        return parsed;
      } catch (cleanError) {
        // Final attempt: extract largest JSON block
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const extracted = JSON.parse(jsonMatch[0]);
            console.log('Successfully extracted JSON from response:', extracted);
            return extracted;
          } catch (e) {
            console.error('Failed to parse extracted JSON:', e);
          }
        }
      }
      
      throw new Error(`Invalid JSON response from OpenAI (model: ${model})`);
    }
  }

  async searchPopCulture(category: string, searchTerm: string): Promise<OpenAISearchResult[]> {
    const prompt = buildPopCultureSearchPrompt(category, searchTerm);

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
    const { tone, category, characterLimit } = params;
    const messages = buildGenerateTextMessages(params);

    try {
      // Use effective config to get the model from AI settings
      const effectiveConfig = getEffectiveConfig();
      const targetModel = effectiveConfig.generation.model;
      
      console.log(`🚀 Text generation using model from AI settings: ${MODEL_DISPLAY_NAMES[targetModel] || targetModel}`);
      
      const result = await this.chatJSON(messages, {
        max_completion_tokens: this.textSpeed === 'fast' ? 200 : 300,
        model: targetModel
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