import { supabase } from "@/integrations/supabase/client";
import { buildPopCultureSearchPrompt, buildGenerateTextMessages, getEffectiveConfig, MODEL_DISPLAY_NAMES, getSmartFallbackChain } from "../vibe-ai.config";
import { getPopCultureFacts, type PopCultureFact } from './popCultureRAG';

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
  private lastError: string | null = null;
  private connectionStatus: 'unknown' | 'working' | 'quota-exceeded' | 'auth-failed' | 'network-error' = 'unknown';

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
      model = 'gpt-4.1-2025-04-14'
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

      // Check if response was truncated and retry with higher token limit
      if (finishReason === 'length' && (max_completion_tokens || max_tokens || 150) < 600) {
        console.log('Backend response truncated, retrying with higher token limit...');
        try {
          return await this.callBackendAPI(messages, {
            ...options,
            max_completion_tokens: 600,
            model
          });
        } catch (retryError) {
          console.error('Backend retry with higher tokens failed:', retryError);
          throw new Error('Response truncated - content too long for model');
        }
      }

      // Parse JSON response
      try {
        const parsed = JSON.parse(content);
        console.log('Successfully parsed backend JSON response');
        return parsed;
      } catch (parseError) {
        console.error('JSON parse error from backend:', parseError);
        console.error('Raw content that failed to parse:', content);
        
        // If JSON parsing fails and we have token headroom, retry with higher limit
        const currentTokens = max_completion_tokens || max_tokens || 150;
        if (currentTokens < 600) {
          console.log('Backend JSON parse failed, retrying with higher token limit...');
          try {
            return await this.callBackendAPI(messages, {
              ...options,
              max_completion_tokens: 600,
              model
            });
          } catch (retryError) {
            console.error('Backend retry with higher tokens failed:', retryError);
          }
        }
        
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
      model = 'gpt-4.1-2025-04-14'
    } = options;

    // Use smart fallback chain based on the requested model
    const retryModels = getSmartFallbackChain(model, 'text');
    console.log(`📋 Text generation retry chain: ${retryModels.map(m => MODEL_DISPLAY_NAMES[m] || m).join(' → ')}`);

    let lastError: Error | null = null;
    let retryAttempt = 0;

    for (const tryModel of retryModels) {
      try {
        const result = await this.attemptChatJSON(messages, {
          temperature,
          max_tokens,
          max_completion_tokens,
          model: tryModel
        });
        
        // Add metadata about the API call
        if (result && typeof result === 'object') {
          result._apiMeta = {
            modelUsed: tryModel,
            retryAttempt,
            originalModel: model,
            textSpeed: this.textSpeed
          };
        }
        
        return result;
      } catch (error) {
        console.warn(`Model ${tryModel} failed:`, error);
        lastError = error as Error;
        retryAttempt++;
        
        // Don't retry if it's an auth error
        if (error instanceof Error && error.message.includes('401')) {
          throw error;
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
      model = 'gpt-4.1-2025-04-14'
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

    // Check if response was truncated and retry with higher token limit
    if (finishReason === 'length') {
      console.log('Response truncated, retrying with higher token limit...');
      try {
        return await this.attemptChatJSON(messages, {
          ...options,
          max_completion_tokens: 600,
          model
        });
      } catch (retryError) {
        console.error('Retry with higher tokens failed:', retryError);
        throw new Error('Response truncated - content too long for model');
      }
    }

    // Enhanced JSON parsing with cleanup
    try {
      const parsed = JSON.parse(content);
      console.log('Successfully parsed JSON:', parsed);
      return parsed;
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw content that failed to parse:', content);
      
      // If JSON parsing fails, retry once with higher token limit (might be truncated)
      if (tokenLimit < 600) {
        console.log('JSON parse failed, retrying with higher token limit...');
        try {
          return await this.attemptChatJSON(messages, {
            ...options,
            max_completion_tokens: 600,
            model
          });
        } catch (retryError) {
          console.error('Retry with higher tokens failed:', retryError);
        }
      }
      
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
    // Early return if no search term
    if (!searchTerm || searchTerm.trim().length === 0) {
      return [];
    }

    try {
      console.log('Searching pop culture for:', searchTerm, 'in category:', category);
      
      // Call our new pop-culture-search Edge Function
      const { data, error } = await supabase.functions.invoke('pop-culture-search', {
        body: {
          category,
          searchTerm: searchTerm.trim()
        }
      });

      if (error) {
        console.error('Pop culture search failed:', error);
        throw new Error(error.message);
      }

      // Return the results from our Edge Function
      const results = data?.results || [];
      console.log(`Found ${results.length} search results`);
      
      return results.slice(0, 5);
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
    
    let retrievedFacts: PopCultureFact[] = [];
    
    // For Pop Culture category or when tags are present, try to get facts
    if (category === 'Pop Culture' || (params.tags && params.tags.length > 0)) {
      try {
        const factsResult = await getPopCultureFacts(
          category || 'Pop Culture',
          params.subtopic || '',
          params.tags || [],
          params.pick || ''
        );
        retrievedFacts = factsResult.facts;
        console.log(`Retrieved ${retrievedFacts.length} pop culture facts`);
      } catch (error) {
        console.warn('Failed to retrieve pop culture facts:', error);
      }
    }

    const messages = buildGenerateTextMessages(params, retrievedFacts.length > 0 ? {
      facts: retrievedFacts.map(f => f.text),
      sources: retrievedFacts.flatMap(f => f.sources).slice(0, 3)
    } : undefined);

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
      
      // Clean and apply quality gate
      const cleanedOptions = options.map((option: string) => 
        this.cleanVisibleOption(option.replace(/^["']|["']$/g, '').trim())
      );

      // Filter out low-quality options
      const highQualityOptions: string[] = [];
      const rejectedOptions: string[] = [];
      
      for (const option of cleanedOptions) {
        const { isLowQuality, reason } = this.isLowQualityOption(option, params.tags || []);
        if (isLowQuality) {
          console.log(`🚫 Rejected option: "${option}" - ${reason}`);
          rejectedOptions.push(option);
        } else {
          highQualityOptions.push(option);
        }
      }

      // Remove duplicates
      const uniqueOptions = Array.from(new Set(highQualityOptions.map(opt => opt.toLowerCase())))
        .map(lower => highQualityOptions.find(opt => opt.toLowerCase() === lower)!);

      console.log(`✅ Quality gate: ${uniqueOptions.length}/${cleanedOptions.length} options passed`);

      // Top-up if we need more options
      let finalOptions = uniqueOptions.slice(0, 4);
      if (finalOptions.length < 4 && finalOptions.length > 0) {
        console.log(`🔄 Top-up needed: ${4 - finalOptions.length} more options`);
        
        try {
          const topUpResult = await this.chatJSON([
            { role: 'user', content: `Generate ${4 - finalOptions.length} replacement options obeying the original instructions plus the Quality Rules. 
            Avoid these rejected options: ${rejectedOptions.map(opt => `"${opt}"`).join(', ')}
            Return JSON: {"options":["option1","option2",...]}` }
          ], {
            max_completion_tokens: 200,
            model: targetModel
          });
          
          if (topUpResult.options && Array.isArray(topUpResult.options)) {
            const topUpCleaned = topUpResult.options
              .map((option: string) => this.cleanVisibleOption(option.replace(/^["']|["']$/g, '').trim()))
              .filter((option: string) => !this.isLowQualityOption(option, params.tags || []).isLowQuality)
              .filter((option: string) => !finalOptions.some(existing => existing.toLowerCase() === option.toLowerCase()));
            
            finalOptions = [...finalOptions, ...topUpCleaned].slice(0, 4);
            console.log(`✅ Top-up added ${topUpCleaned.length} options`);
          }
        } catch (error) {
          console.log(`⚠️ Top-up failed:`, error);
        }
      }

      // Enforce character limit
      const processedOptions = finalOptions.map((option: string) => 
        option.length > characterLimit ? option.slice(0, characterLimit) : option
      );

      // Fill with tone-specific fallbacks if still needed
      while (processedOptions.length < 4) {
        const fallbackIndex = processedOptions.length + 1;
        const toneFallback = this.getToneFallback(tone, fallbackIndex);
        processedOptions.push(toneFallback);
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

  // Check if an option is low quality and should be filtered out
  private isLowQualityOption(text: string, tags: string[] = []): { isLowQuality: boolean; reason?: string } {
    const trimmed = text.trim();
    
    // Check word count and length
    const wordCount = trimmed.split(/\s+/).length;
    if (wordCount < 3 || trimmed.length < 12) {
      return { isLowQuality: true, reason: `Too short: ${wordCount} words, ${trimmed.length} chars` };
    }
    
    // Check if it's just a name or tag verbatim
    const tagSet = new Set(tags.map(tag => tag.toLowerCase().trim()));
    if (tagSet.has(trimmed.toLowerCase()) || /^[A-Z][a-z]+$/.test(trimmed)) {
      return { isLowQuality: true, reason: "Name/tag-only output" };
    }
    
    return { isLowQuality: false };
  }

  // Clean visible options by removing emojis/hashtags and collapsing punctuation
  private cleanVisibleOption(text: string): string {
    return text
      // Remove emojis and hashtags
      .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
      .replace(/#\w+/g, '')
      // Preserve %, +, $, en/em dashes but collapse multiple spaces/punctuation
      .replace(/\s+/g, ' ')
      .replace(/([.!?])\1+/g, '$1')
      .trim();
  }

  // Generate tone-specific fallback options
  private getToneFallback(tone: string, index: number): string {
    const fallbacks: Record<string, string[]> = {
      'playful': ['Let\'s have some fun!', 'Ready to play?', 'Time for excitement!', 'Join the fun!'],
      'savage': ['No games here', 'Straight talk only', 'Real talk time', 'Keep it honest'],
      'casual': ['Just keeping it real', 'Simple and easy', 'No fuss here', 'Straightforward vibes'],
      'professional': ['Excellence in every detail', 'Quality you can trust', 'Professional service', 'Your success matters'],
      'urgent': ['Act now!', 'Don\'t wait!', 'Time is running out', 'Immediate action needed']
    };
    
    const toneOptions = fallbacks[tone.toLowerCase()] || ['Great choice ahead', 'Quality option here', 'Excellent selection', 'Perfect fit'];
    return toneOptions[(index - 1) % toneOptions.length];
  }
}

export const openAIService = new OpenAIService();