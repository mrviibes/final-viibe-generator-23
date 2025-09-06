// New LLM client - isolated from legacy code
import { supabase } from "@/integrations/supabase/client";
import type { ChatMessage } from "./prompts";

export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  responseFormat?: 'json' | 'text';
}

export interface LLMResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  raw?: string;
}

/**
 * Simple LLM client that uses Supabase edge function
 */
export class LLMClient {
  private defaultOptions: LLMOptions = {
    model: 'gpt-4.1-mini-2025-04-14', // Fast, reliable model for JSON
    maxTokens: 500,
    timeout: 15000, // 15 second timeout
    responseFormat: 'text'
  };

  /**
   * Send chat messages and get raw text response
   */
  async chat(
    messages: ChatMessage[],
    options: LLMOptions = {}
  ): Promise<LLMResponse<string>> {
    const controller = new AbortController();
    const mergedOptions = { ...this.defaultOptions, ...options };
    
    // Set timeout
    const timeoutId = setTimeout(() => controller.abort(), mergedOptions.timeout || 15000);
    
    try {
      const requestBody: any = {
        messages,
        options: {
          model: mergedOptions.model,
          max_completion_tokens: mergedOptions.maxTokens,
          // Add response format for JSON mode
          ...(mergedOptions.responseFormat === 'json' ? { response_format: { type: 'json_object' } } : {}),
          // Temperature support for GPT-4 models only
          ...(mergedOptions.model?.includes('gpt-4') && mergedOptions.temperature !== undefined
            ? { temperature: mergedOptions.temperature }
            : {})
        }
      };
      
      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: requestBody
      });

      clearTimeout(timeoutId);
      
      if (error) {
        console.error('LLM Error:', error);
        return { success: false, error: error.message || 'Unknown error' };
      }

      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        return { success: false, error: 'No content in response' };
      }

      return { success: true, data: content, raw: content };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        return { success: false, error: 'Request timeout (15s limit)' };
      }
      
      console.error('LLM Client Error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Send chat messages and parse JSON response
   */
  async chatJSON<T = any>(
    messages: ChatMessage[],
    options: LLMOptions = {}
  ): Promise<LLMResponse<T>> {
    // Force JSON response format and appropriate model
    const jsonOptions = {
      ...options,
      responseFormat: 'json' as const,
      model: options.model || 'gpt-4.1-mini-2025-04-14',
      temperature: 0.8 // Use temperature for consistent creative output
    };
    
    const response = await this.chat(messages, jsonOptions);
    
    if (!response.success || !response.data) {
      return response as LLMResponse<T>;
    }

    try {
      // Try to extract JSON from the response
      const text = response.data.trim();
      let jsonStr = text;
      
      // If wrapped in code blocks, extract the JSON
      if (text.startsWith('```json') && text.endsWith('```')) {
        jsonStr = text.slice(7, -3).trim();
      } else if (text.startsWith('```') && text.endsWith('```')) {
        jsonStr = text.slice(3, -3).trim();
      }
      
      const parsed = JSON.parse(jsonStr);
      return { success: true, data: parsed, raw: response.data };
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError, 'Raw response:', response.data);
      return { 
        success: false, 
        error: `Failed to parse JSON: ${parseError}`,
        raw: response.data
      };
    }
  }
}

// Export singleton instance
export const llmClient = new LLMClient();