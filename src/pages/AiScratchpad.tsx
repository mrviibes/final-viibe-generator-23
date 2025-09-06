// Viibe Generator - 4-Step Flow Implementation
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Use centralized AI pipeline instead of legacy AI folder
import { generateCandidates } from "@/lib/vibeModel";
import { buildOutput, type VibeInputs, type Category, type Tone, type VibeResult, type OutputSchema } from "@/vibe-ai.config";

// Legacy types for backward compatibility
type TextLine = { lane: string; text: string };
type VisualPrompt = { type: string; prompt: string };
type CategoryContext = { category: string; subcategory: string; entity: string; contextId: string };
type TextConfig = { tone: string; layout: string; textOption: string; tags: string[] };
type VisualConfig = { visualStyle: string; subjectOption: string; visualTags: string[]; dimensions: string };
type FinalPayload = any;

// Constants moved from AI folder
const CATEGORIES = ["Celebrations", "Daily Life", "Sports"];
const SUBCATEGORIES_BY_CATEGORY = {
  "Celebrations": ["Birthday Party", "Wedding", "Anniversary"],
  "Daily Life": ["Work Commute", "Morning Routine", "Weekend Plans"],
  "Sports": ["Hockey", "Soccer", "Basketball"]
};
const TONE_OPTIONS = ["Playful", "Serious", "Humorous", "Sentimental", "Savage"];
const LAYOUT_OPTIONS = ["negativeSpace", "overlay", "minimal"];
const VISUAL_STYLES = ["realistic", "illustration", "abstract"];
const DIMENSION_OPTIONS = ["square", "portrait", "landscape"];

export default function AiScratchpad() {
  const [currentStep, setCurrentStep] = useState(1);
  
  // Step 1 State
  const [categoryContext, setCategoryContext] = useState<CategoryContext>({
    category: "Celebrations",
    subcategory: "Birthday Party",
    entity: "",
    contextId: "celebrations.birthdayparty"
  });
  
  // Step 2 State
  const [textConfig, setTextConfig] = useState<TextConfig>({
    tone: "Playful",
    layout: "negativeSpace",
    textOption: 'ai',
    tags: ["fun", "party"]
  });
  
  // Step 3 State
  const [visualConfig, setVisualConfig] = useState<VisualConfig>({
    visualStyle: "realistic",
    subjectOption: 'ai',
    visualTags: ["colorful", "festive"],
    dimensions: "square"
  });
  
  // Step 4 State
  const [finalPayload, setFinalPayload] = useState<FinalPayload | null>(null);
  
  // Results State
  const [textResults, setTextResults] = useState<TextLine[]>([]);
  const [visualResults, setVisualResults] = useState<VisualPrompt[]>([]);
  
  // Loading State
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [isLoadingVisual, setIsLoadingVisual] = useState(false);
  
  // Error State
  const [textError, setTextError] = useState<string | null>(null);
  const [visualError, setVisualError] = useState<string | null>(null);
  
  // Fallback State
  const [usedFallback, setUsedFallback] = useState({ text: false, visual: false });

  // Text Generation Function (using centralized pipeline)
  const generateTextLines = async () => {
    setIsLoadingText(true);
    setTextError(null);
    setUsedFallback(prev => ({ ...prev, text: false }));
    
    try {
      const vibeInputs: VibeInputs = {
        category: categoryContext.category as Category,
        subcategory: categoryContext.subcategory,
        tone: textConfig.tone as Tone,
        tags: textConfig.tags
      };
      
      console.log('Generating text with centralized pipeline:', vibeInputs);
      
      const result = await generateCandidates(vibeInputs);
      
      if (result && result.candidates) {
        const textLines: TextLine[] = result.candidates.map((line: string, index: number) => ({
          lane: ['platform', 'audience', 'skill', 'absurdity'][index] || 'unknown',
          text: line
        }));
        setTextResults(textLines);
        console.log('Text generation successful:', textLines);
      } else {
        throw new Error('No valid lines generated');
      }
    } catch (err) {
      console.error('Text generation error:', err);
      setTextError(err instanceof Error ? err.message : 'Unknown error');
      // Create fallback lines
      const fallbackLines: TextLine[] = [
        { lane: 'platform', text: `${textConfig.tags.join(', ')} creates moments worth remembering.` },
        { lane: 'audience', text: `${textConfig.tags.join(', ')} brings people together in unexpected ways.` },
        { lane: 'skill', text: `${textConfig.tags.join(', ')} requires patience, practice, and a sense of humor.` },
        { lane: 'absurdity', text: `${textConfig.tags.join(', ')} makes the ordinary feel extraordinary.` }
      ];
      setTextResults(fallbackLines);
      setUsedFallback(prev => ({ ...prev, text: true }));
    } finally {
      setIsLoadingText(false);
    }
  };

  // Visual Generation Function (using centralized pipeline)
  const generateVisualPrompts = async () => {
    setIsLoadingVisual(true);
    setVisualError(null);
    setUsedFallback(prev => ({ ...prev, visual: false }));
    
    try {
      const vibeInputs: VibeInputs = {
        category: categoryContext.category as Category,
        subcategory: categoryContext.subcategory,
        tone: textConfig.tone as Tone,
        tags: visualConfig.visualTags
      };
      
      console.log('Generating visual with centralized pipeline:', vibeInputs);
      
      const output = buildOutput(vibeInputs);
      
      if (output && output.generated_image_prompts && output.generated_image_prompts.length > 0) {
        const visualPrompts: VisualPrompt[] = output.generated_image_prompts.map((prompt, index) => ({
          type: index === 0 ? 'primary' : 'secondary',
          prompt: prompt.prompt
        }));
        setVisualResults(visualPrompts);
        console.log('Visual generation successful:', visualPrompts);
      } else {
        throw new Error('No valid visual prompt generated');
      }
    } catch (err) {
      console.error('Visual generation error:', err);
      setVisualError(err instanceof Error ? err.message : 'Unknown error');
      // Create fallback visual prompts
      const fallbackVisuals: VisualPrompt[] = [
        { type: 'fallback', prompt: `A ${visualConfig.visualStyle} ${categoryContext.category.toLowerCase()} scene with ${visualConfig.visualTags.join(', ')} elements` }
      ];
      setVisualResults(fallbackVisuals);
      setUsedFallback(prev => ({ ...prev, visual: true }));
    } finally {
      setIsLoadingVisual(false);
    }
  };

  // Build Final Payload
  const buildFinalPayload = () => {
    const payload: FinalPayload = {
      context: categoryContext,
      textConfig,
      visualConfig,
      results: {
        text: textResults,
        visual: visualResults
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        usedFallback
      }
    };
    setFinalPayload(payload);
  };

  const updateContextId = (category: string, subcategory: string) => {
    return `${category.toLowerCase().replace(/\s+/g, '')}.${subcategory.toLowerCase().replace(/\s+/g, '')}`;
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-center mb-2">AI Scratchpad</h1>
        <p className="text-muted-foreground text-center">
          4-Step Viibe Generation Pipeline
        </p>
      </div>

      <Tabs value={currentStep.toString()} onValueChange={(value) => setCurrentStep(parseInt(value))}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="1">1. Context</TabsTrigger>
          <TabsTrigger value="2">2. Text</TabsTrigger>
          <TabsTrigger value="3">3. Visual</TabsTrigger>
          <TabsTrigger value="4">4. Output</TabsTrigger>
        </TabsList>

        {/* Step 1: Category Context */}
        <TabsContent value="1" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Define Category Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select 
                  value={categoryContext.category} 
                  onValueChange={(value) => {
                    const newContextId = updateContextId(value, categoryContext.subcategory);
                    setCategoryContext(prev => ({ ...prev, category: value, contextId: newContextId }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Subcategory</label>
                <Select 
                  value={categoryContext.subcategory} 
                  onValueChange={(value) => {
                    const newContextId = updateContextId(categoryContext.category, value);
                    setCategoryContext(prev => ({ ...prev, subcategory: value, contextId: newContextId }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(SUBCATEGORIES_BY_CATEGORY[categoryContext.category as keyof typeof SUBCATEGORIES_BY_CATEGORY] || []).map(subcat => (
                      <SelectItem key={subcat} value={subcat}>{subcat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Entity (Optional)</label>
                <Input 
                  value={categoryContext.entity} 
                  onChange={(e) => setCategoryContext(prev => ({ ...prev, entity: e.target.value }))}
                  placeholder="Specific entity or person"
                />
              </div>

              <div className="p-3 bg-muted rounded">
                <p className="text-sm"><strong>Context ID:</strong> {categoryContext.contextId}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 2: Text Configuration */}
        <TabsContent value="2" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Configure Text Generation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Tone</label>
                <Select 
                  value={textConfig.tone} 
                  onValueChange={(value) => setTextConfig(prev => ({ ...prev, tone: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONE_OPTIONS.map(tone => (
                      <SelectItem key={tone} value={tone}>{tone}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Layout</label>
                <Select 
                  value={textConfig.layout} 
                  onValueChange={(value) => setTextConfig(prev => ({ ...prev, layout: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LAYOUT_OPTIONS.map(layout => (
                      <SelectItem key={layout} value={layout}>{layout}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {textConfig.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="cursor-pointer" 
                      onClick={() => setTextConfig(prev => ({ ...prev, tags: prev.tags.filter((_, i) => i !== index) }))}>
                      {tag} ×
                    </Badge>
                  ))}
                </div>
                <Input 
                  placeholder="Add tag and press Enter"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      setTextConfig(prev => ({ ...prev, tags: [...prev.tags, e.currentTarget.value.trim()] }));
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>

              <Button onClick={generateTextLines} disabled={isLoadingText} className="w-full">
                {isLoadingText ? 'Generating...' : 'Generate Text Lines'}
              </Button>

              {textError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded">
                  <p className="text-destructive text-sm">{textError}</p>
                </div>
              )}

              {usedFallback.text && (
                <div className="p-3 bg-yellow-100 border border-yellow-300 rounded">
                  <p className="text-yellow-800 text-sm">⚠️ Using fallback text (AI generation failed)</p>
                </div>
              )}

              {textResults.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Generated Text Lines</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {textResults.map((line, index) => (
                        <div key={index} className="p-2 bg-muted rounded">
                          <div className="text-xs text-muted-foreground mb-1">{line.lane}</div>
                          <div className="text-sm">{line.text}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 3: Visual Configuration */}
        <TabsContent value="3" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Step 3: Configure Visual Generation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Visual Style</label>
                <Select 
                  value={visualConfig.visualStyle} 
                  onValueChange={(value) => setVisualConfig(prev => ({ ...prev, visualStyle: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VISUAL_STYLES.map(style => (
                      <SelectItem key={style} value={style}>{style}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Dimensions</label>
                <Select 
                  value={visualConfig.dimensions} 
                  onValueChange={(value) => setVisualConfig(prev => ({ ...prev, dimensions: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIMENSION_OPTIONS.map(dim => (
                      <SelectItem key={dim} value={dim}>{dim}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Visual Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {visualConfig.visualTags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="cursor-pointer" 
                      onClick={() => setVisualConfig(prev => ({ ...prev, visualTags: prev.visualTags.filter((_, i) => i !== index) }))}>
                      {tag} ×
                    </Badge>
                  ))}
                </div>
                <Input 
                  placeholder="Add visual tag and press Enter"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      setVisualConfig(prev => ({ ...prev, visualTags: [...prev.visualTags, e.currentTarget.value.trim()] }));
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>

              <Button onClick={generateVisualPrompts} disabled={isLoadingVisual} className="w-full">
                {isLoadingVisual ? 'Generating...' : 'Generate Visual Prompts'}
              </Button>

              {visualError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded">
                  <p className="text-destructive text-sm">{visualError}</p>
                </div>
              )}

              {usedFallback.visual && (
                <div className="p-3 bg-yellow-100 border border-yellow-300 rounded">
                  <p className="text-yellow-800 text-sm">⚠️ Using fallback visual (AI generation failed)</p>
                </div>
              )}

              {visualResults.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Generated Visual Prompts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {visualResults.map((prompt, index) => (
                        <div key={index} className="p-2 bg-muted rounded">
                          <div className="text-xs text-muted-foreground mb-1">{prompt.type}</div>
                          <div className="text-sm">{prompt.prompt}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 4: Final Output */}
        <TabsContent value="4" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Step 4: Final Payload</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={buildFinalPayload} className="w-full" 
                disabled={textResults.length === 0 && visualResults.length === 0}>
                Build Final Payload
              </Button>

              {finalPayload && (
                <div className="space-y-4">
                  <Separator />
                  <div>
                    <h3 className="text-lg font-medium mb-2">Generated Payload</h3>
                    <pre className="bg-muted p-4 rounded text-xs overflow-auto max-h-96">
                      {JSON.stringify(finalPayload, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}