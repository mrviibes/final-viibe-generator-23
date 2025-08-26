import { supabase } from "@/integrations/supabase/client";

export interface IdeogramGenerateRequest {
  image_request: {
    prompt: string;
    aspect_ratio?: string;
    model?: string;
    magic_prompt_option?: string;
  };
}

export interface IdeogramGenerateResponse {
  created: string;
  data: Array<{
    url: string;
    is_image_safe: boolean;
    prompt: string;
  }>;
}

export class IdeogramAPIError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'IdeogramAPIError';
  }
}

export class IdeogramProxyService {
  async hasApiKey(): Promise<boolean> {
    try {
      // Test with a simple request
      const response = await supabase.functions.invoke('ideogram-proxy', {
        body: {
          endpoint: 'https://api.ideogram.ai/generate',
          method: 'POST',
          body: {
            image_request: {
              prompt: "test",
              model: "V_2"
            }
          }
        }
      });
      
      // Even if the request fails due to prompt issues, if we get a response without auth errors, the key works
      return !response.error || !response.error.message?.includes('API key');
    } catch {
      return false;
    }
  }

  async generateImage(prompt: string, aspectRatio: string = "ASPECT_1_1"): Promise<IdeogramGenerateResponse> {
    const request: IdeogramGenerateRequest = {
      image_request: {
        prompt,
        aspect_ratio: aspectRatio,
        model: "V_2",
        magic_prompt_option: "AUTO"
      }
    };

    console.log('🎨 Generating image via proxy:', { prompt, aspectRatio });

    const response = await supabase.functions.invoke('ideogram-proxy', {
      body: {
        endpoint: 'https://api.ideogram.ai/generate',
        method: 'POST',
        body: request
      }
    });

    if (response.error) {
      console.error('❌ Ideogram proxy error:', response.error);
      throw new IdeogramAPIError(response.error.message || 'Failed to generate image');
    }

    console.log('✅ Image generated successfully via proxy');
    return response.data;
  }
}

export const ideogramProxyService = new IdeogramProxyService();