import { openAIService } from '@/lib/openai';

// Compatibility wrapper to adapt viibe_ai_engine's OpenAI calls to our existing service
export class OpenAICompat {
  chat = {
    completions: {
      create: async (options: {
        model: string;
        response_format?: { type: string };
        max_completion_tokens?: number;
        messages: Array<{ role: string; content: string }>;
      }) => {
        // Map the engine's call to our existing openAIService
        const result = await openAIService.chatJSON(options.messages, {
          model: options.model,
          max_completion_tokens: options.max_completion_tokens,
        });
        
        // Return in the format the engine expects
        return {
          choices: [{
            message: {
              content: typeof result === 'string' ? result : JSON.stringify(result)
            }
          }]
        };
      }
    }
  };
}

export const openaiCompat = new OpenAICompat();