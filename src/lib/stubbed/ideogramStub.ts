// Stubbed Ideogram API - returns static responses when AI is disabled
export interface ProxySettings {
  type: 'direct' | 'cors-anywhere' | 'proxy-cors-sh' | 'allorigins' | 'thingproxy';
  apiKey?: string;
}

export interface IdeogramGenerateRequest {
  prompt: string;
  aspect_ratio: string;
  model: string;
  magic_prompt_option: string;
  seed?: number;
  style_type?: string;
  count?: number;
}

export interface IdeogramGenerateResponse {
  created: string;
  data: Array<{
    prompt: string;
    resolution: string;
    url: string;
    is_image_safe: boolean;
  }>;
  _fallback_note?: string;
  endpoint_used?: string;
  model_used?: string;
}

export class IdeogramAPIError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'IdeogramAPIError';
  }
}

export function setIdeogramApiKey(key: string) {
  // No-op in stub mode
}

export function getIdeogramApiKey(): string | null {
  return "stub-mode";
}

export function clearIdeogramApiKey() {
  // No-op in stub mode
}

export function hasIdeogramApiKey(): boolean {
  return true; // Always return true in stub mode
}

export function isUsingBackend(): boolean {
  return false; // Stub mode
}

export function setProxySettings(settings: ProxySettings) {
  // No-op in stub mode
}

export function getProxySettings(): ProxySettings {
  return { type: 'direct' };
}

export async function testProxyConnection(proxyType: ProxySettings['type']): Promise<boolean> {
  return true; // Always return true in stub mode
}

export async function findBestProxy(): Promise<ProxySettings['type']> {
  return 'direct';
}

export async function generateIdeogramImage(request: IdeogramGenerateRequest): Promise<IdeogramGenerateResponse> {
  // Return static placeholder response
  return {
    created: new Date().toISOString(),
    data: [{
      prompt: "Frame mode: Image generation disabled",
      resolution: "1024x1024",
      url: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAyNCIgaGVpZ2h0PSIxMDI0IiB2aWV3Qm94PSIwIDAgMTAyNCAxMDI0IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iMTAyNCIgaGVpZ2h0PSIxMDI0IiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjUxMiIgeT0iNTEyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCIgZmlsbD0iIzZCNzI4MCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iNDgiPkZyYW1lIE1vZGU8L3RleHQ+Cjx0ZXh0IHg9IjUxMiIgeT0iNTcwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCIgZmlsbD0iIzlDQTNBRiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiPkFJIERpc2FibGVkPC90ZXh0Pgo8L3N2Zz4K",
      is_image_safe: true
    }],
    model_used: "STUB_MODE",
    endpoint_used: "stub"
  };
}