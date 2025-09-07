declare module '*/viibe_ai_engine.mjs' {
  export interface TextLine {
    lane: 'platform' | 'audience' | 'skill' | 'absurdity';
    text: string;
  }

  export interface VisualOption {
    lane: 'objects' | 'group' | 'solo' | 'creative';
    prompt: string;
  }

  export interface VisualResult {
    visualOptions: VisualOption[];
    negativePrompt: string;
  }

  export interface FinalPayload {
    textContent: string;
    textLayoutSpec: any;
    visualStyle: string;
    visualPrompt: string;
    negativePrompt: string;
    dimensions: string;
    contextId: string;
    tone: string;
    tags: string[];
  }

  export const TEXT_MODEL: string;
  export const VIS_MODEL: string;

  export function generateTextOptions(
    openai: any,
    params: {
      category: string;
      subcategory: string;
      tone: string;
      tags?: string[];
    }
  ): Promise<TextLine[]>;

  export function generateVisualOptions(
    openai: any,
    params: {
      category: string;
      subcategory: string;
      tone: string;
      tags?: string[];
    }
  ): Promise<VisualResult>;

  export function composeFinalPayload(params: {
    textContent?: string;
    textLayoutId?: string;
    layoutLibrary?: any;
    visualStyle?: string;
    visualOption?: VisualOption;
    negativePrompt?: string;
    dimensions?: string;
    category: string;
    subcategory: string;
    tone: string;
    tags?: string[];
  }): FinalPayload;
}