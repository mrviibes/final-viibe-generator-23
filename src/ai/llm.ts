// New LLM client - isolated from legacy code
import { supabase } from "@/integrations/supabase/client";
import type { ChatMessage } from "./prompts";

export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
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
    model: 'gpt-5-2025-08-07',
    maxTokens: 1000
  };

  /**
   * Send chat messages and get raw text response
   */
  async chat(
    messages: ChatMessage[],
    options: LLMOptions = {}
  ): Promise<LLMResponse<string>> {
    try {
      const mergedOptions = { ...this.defaultOptions, ...options };
      
      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: {
          messages,
          options: {
            model: mergedOptions.model,
            max_completion_tokens: mergedOptions.maxTokens,
            // Note: temperature not supported for GPT-5 models
            ...(mergedOptions.model?.includes('gpt-4') && mergedOptions.temperature !== undefined
              ? { temperature: mergedOptions.temperature }
              : {})
          }
        }
      });

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
    const response = await this.chat(messages, options);
    
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