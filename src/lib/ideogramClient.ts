// Secure Ideogram client using Supabase Edge Functions
import { supabase } from "@/integrations/supabase/client";

export interface IdeogramGenerateRequest {
  prompt: string;
  aspect_ratio?: string;
}

export interface IdeogramGenerateResponse {
  created: string;
  data: Array<{
    url: string;
    is_image_safe: boolean;
    prompt: string;
    resolution: string;
    seed: number;
  }>;
}

export class IdeogramAPIError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'IdeogramAPIError';
  }
}

class IdeogramClientService {
  async generateImage(prompt: string, aspectRatio: string = "ASPECT_1_1"): Promise<IdeogramGenerateResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('ideogram-generate', {
        body: {
          prompt,
          aspect_ratio: aspectRatio,
        },
      });

      if (error) {
        console.error('Ideogram service error:', error);
        throw new IdeogramAPIError(error.message || 'Ideogram request failed');
      }

      return data;
    } catch (error) {
      if (error instanceof IdeogramAPIError) {
        throw error;
      }
      throw new IdeogramAPIError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  hasApiKey(): boolean {
    // Keys are managed in Supabase Edge Functions
    return true;
  }
}

export const ideogramClientService = new IdeogramClientService();