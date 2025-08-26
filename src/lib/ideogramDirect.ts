import { getIdeogramKey } from "@/config/secrets";

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
  data: Array<{ url: string; is_image_safe: boolean; prompt: string }>;
}

export class IdeogramAPIError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "IdeogramAPIError";
  }
}

class IdeogramDirectService {
  hasApiKey(): boolean {
    const key = getIdeogramKey();
    return !!key;
  }

  async generateImage(prompt: string, aspectRatio: string = "ASPECT_1_1"): Promise<IdeogramGenerateResponse> {
    const key = getIdeogramKey();
    if (!key) throw new IdeogramAPIError("Missing Ideogram API key");

    const body: IdeogramGenerateRequest = {
      image_request: {
        prompt,
        aspect_ratio: aspectRatio,
        model: "V_2",
        magic_prompt_option: "AUTO",
      },
    };

    const resp = await fetch("https://api.ideogram.ai/generate", {
      method: "POST",
      headers: {
        "Api-Key": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new IdeogramAPIError(data?.error?.message || `Ideogram error ${resp.status}`, resp.status);
    }
    return data as IdeogramGenerateResponse;
  }
}

export const ideogramDirectService = new IdeogramDirectService();