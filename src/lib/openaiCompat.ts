import { openAIService } from "./openai";

/**
 * OpenAI-compatible client that adapts our existing openAIService
 * to work with the viibe AI engine's expected interface
 */
export class OpenAICompat {
  public chat = {
    completions: {
      create: async (params: any) => {
        // Convert parameters to our openAI service format
        const { model, response_format, max_completion_tokens, temperature, messages } = params;
        
        // Build options object
        const options: any = {
          model,
          max_completion_tokens
        };
        
        // Only add temperature for supported models
        if (temperature !== undefined && model?.includes('gpt-4')) {
          options.temperature = temperature;
        }
        
        // Add response format for JSON mode
        if (response_format?.type === 'json_object') {
          options.response_format = { type: 'json_object' };
        }

        try {
          const result = await openAIService.chatJSON(messages, options);
          
          // Convert response to OpenAI format
          return {
            choices: [{
              message: {
                content: typeof result === 'string' ? result : JSON.stringify(result)
              }
            }]
          };
        } catch (error) {
          console.error('OpenAI Compat Error:', error);
          throw error;
        }
      }
    }
  };
}

// Export singleton instance
export const openaiCompat = new OpenAICompat();