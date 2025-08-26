// Secure Ideogram client that calls server proxy instead of direct API
import { getServerUrl } from '../config/runtime';

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
      const response = await fetch(`${getServerUrl()}/api/ideogram/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          aspect_ratio: aspectRatio,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new IdeogramAPIError(error.error || 'Ideogram request failed', response.status);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof IdeogramAPIError) {
        throw error;
      }
      throw new IdeogramAPIError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  hasApiKey(): boolean {
    // Check if server is available (keys are server-side)
    return true; // Server will handle validation
  }
}

export const ideogramClientService = new IdeogramClientService();