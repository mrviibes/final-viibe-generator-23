// Stubbed visual model - returns static responses when AI is disabled
export interface VisualInputs {
  category?: string;
  subcategory?: string;
  tone?: string;
  tags?: string[];
  visual_style?: string;
  aspect_ratio?: any;
}

export interface VisualOption {
  title: string;
  description: string;
  reasoning: string;
  prompt: string;
}

export interface VisualRecommendation {
  options: VisualOption[];
  audit: {
    model: string;
    modelDisplayName?: string;
    usedFallback: boolean;
    reason?: string;
  };
}

export async function generateVisualRecommendations(inputs: VisualInputs): Promise<VisualRecommendation> {
  // Return static visual options
  return {
    options: [
      {
        title: "Frame Mode Placeholder 1",
        description: "Static visual concept placeholder",
        reasoning: "AI disabled - using frame mode",
        prompt: "Frame mode: Visual generation disabled"
      },
      {
        title: "Frame Mode Placeholder 2", 
        description: "Another static visual concept",
        reasoning: "No AI processing active",
        prompt: "Frame mode: Static placeholder image"
      },
      {
        title: "Frame Mode Placeholder 3",
        description: "Third visual concept placeholder",
        reasoning: "Frame interface ready",
        prompt: "Frame mode: Development placeholder"
      },
      {
        title: "Frame Mode Placeholder 4",
        description: "Final visual concept placeholder", 
        reasoning: "AI functionality disabled",
        prompt: "Frame mode: No visual AI active"
      }
    ],
    audit: {
      model: "STUB_MODE",
      modelDisplayName: "Stub Mode",
      usedFallback: false,
      reason: "AI disabled - using static responses"
    }
  };
}