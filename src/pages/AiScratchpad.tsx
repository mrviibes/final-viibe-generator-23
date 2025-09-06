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
import { llmClient } from "@/ai/llm";
import { buildTextLinesMessages, buildVisualMessages } from "@/ai/prompts";
import { 
  CATEGORIES, SUBCATEGORIES_BY_CATEGORY, TONE_OPTIONS, 
  LAYOUT_OPTIONS, VISUAL_STYLES, DIMENSION_OPTIONS,
  updateContextId, LAYOUT_SPECS, getCategoryNegativePrompt,
  type CategoryContext, type TextConfig, type VisualConfig, type FinalPayload 
} from "@/ai/viibeSpec";

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
  
  // Results
  const [textResults, setTextResults] = useState<string[]>([]);
  const [visualResults, setVisualResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const generateTextLines = async () => {
    setLoading(true);
    setError("");
    
    try {
      // Build AI input from current state
      const aiInputs = {
        category: categoryContext.category,
        subcategory: categoryContext.subcategory,
        tone: textConfig.tone,
        tags: textConfig.tags,
        visualStyle: visualConfig.visualStyle,
        visualTags: visualConfig.visualTags
      };
      
      const messages = buildTextLinesMessages(aiInputs);
      const response = await llmClient.chatJSON<string[]>(messages);
      
      if (response.success && response.data) {
        setTextResults(response.data);
      } else {
        setError(response.error || "Failed to generate text lines");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const generateVisualPrompts = async () => {
    setLoading(true);
    setError("");
    
    try {
      // Build AI input from current state
      const aiInputs = {
        category: categoryContext.category,
        subcategory: categoryContext.subcategory,
        tone: textConfig.tone,
        tags: textConfig.tags,
        visualStyle: visualConfig.visualStyle,
        visualTags: visualConfig.visualTags
      };
      
      const messages = buildVisualMessages(aiInputs);
      const response = await llmClient.chatJSON<string[]>(messages);
      
      if (response.success && response.data) {
        setVisualResults(response.data);
      } else {
        setError(response.error || "Failed to generate visual prompts");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const buildFinalPayload = () => {
    const negativePrompt = getCategoryNegativePrompt(categoryContext.category);
    const layoutSpec = LAYOUT_SPECS[textConfig.layout];
    
    const payload: FinalPayload = {
      textContent: textConfig.textOption === 'manual' ? textConfig.manualText : textResults[0],
      textLayoutSpec: layoutSpec,
      visualStyle: visualConfig.visualStyle,
      visualPrompt: visualResults[0],
      negativePrompt,
      dimensions: visualConfig.dimensions,
      contextId: categoryContext.contextId,
      tone: textConfig.tone,
      tags: [...textConfig.tags, ...visualConfig.visualTags]
    };
    setFinalPayload(payload);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Viibe Generator</h1>
          <p className="text-muted-foreground">
            4-Step AI Flow: Context → Text → Visuals → Render
          </p>
        </div>

        {/* Step Progress */}
        <div className="flex justify-center">
          <Tabs value={currentStep.toString()} onValueChange={(v) => setCurrentStep(parseInt(v))}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="1">1. Context</TabsTrigger>
              <TabsTrigger value="2">2. Text</TabsTrigger>
              <TabsTrigger value="3">3. Visuals</TabsTrigger>
              <TabsTrigger value="4">4. Render</TabsTrigger>
            </TabsList>

            {/* Step 1: Category Context */}
            <TabsContent value="1" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Step 1: Category Context</CardTitle>
                  <p className="text-sm text-muted-foreground">What is this vibe about?</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Category</label>
                      <Select
                        value={categoryContext.category}
                        onValueChange={(value) => {
                          const newContextId = updateContextId(value, categoryContext.subcategory, categoryContext.entity);
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
                          const newContextId = updateContextId(categoryContext.category, value, categoryContext.entity);
                          setCategoryContext(prev => ({ ...prev, subcategory: value, contextId: newContextId }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SUBCATEGORIES_BY_CATEGORY[categoryContext.category]?.map(sub => (
                            <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Entity (optional)</label>
                    <Input
                      value={categoryContext.entity || ""}
                      onChange={(e) => {
                        const newContextId = updateContextId(categoryContext.category, categoryContext.subcategory, e.target.value);
                        setCategoryContext(prev => ({ ...prev, entity: e.target.value, contextId: newContextId }));
                      }}
                      placeholder="e.g., Adam Levine, Jesse"
                    />
                  </div>
                  <div>
                    <Badge variant="outline">Context ID: {categoryContext.contextId}</Badge>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Step 2: Text Configuration */}
            <TabsContent value="2" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Step 2: Text Configuration</CardTitle>
                  <p className="text-sm text-muted-foreground">Style, layout, and content</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium">Tone</label>
                      <Select value={textConfig.tone} onValueChange={(value) => setTextConfig(prev => ({ ...prev, tone: value }))}>
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
                      <Select value={textConfig.layout} onValueChange={(value) => setTextConfig(prev => ({ ...prev, layout: value }))}>
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
                      <label className="text-sm font-medium">Text Option</label>
                      <Select value={textConfig.textOption} onValueChange={(value: 'ai' | 'manual' | 'none') => setTextConfig(prev => ({ ...prev, textOption: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ai">AI Assist</SelectItem>
                          <SelectItem value="manual">Write Myself</SelectItem>
                          <SelectItem value="none">No Text</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Tags (comma separated)</label>
                    <Input
                      value={textConfig.tags.join(', ')}
                      onChange={(e) => {
                        const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                        setTextConfig(prev => ({ ...prev, tags }));
                      }}
                      placeholder="e.g., fun, party, celebration"
                    />
                  </div>
                  {textConfig.textOption === 'manual' && (
                    <div>
                      <label className="text-sm font-medium">Manual Text</label>
                      <Textarea
                        value={textConfig.manualText || ""}
                        onChange={(e) => setTextConfig(prev => ({ ...prev, manualText: e.target.value }))}
                        placeholder="Enter your text..."
                      />
                    </div>
                  )}
                  {textConfig.textOption === 'ai' && (
                    <Button onClick={generateTextLines} disabled={loading}>
                      {loading ? "Generating..." : "Generate Text Lines"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Step 3: Visual Configuration */}
            <TabsContent value="3" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Step 3: Visual Configuration</CardTitle>
                  <p className="text-sm text-muted-foreground">Style, subject, and dimensions</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium">Visual Style</label>
                      <Select value={visualConfig.visualStyle} onValueChange={(value) => setVisualConfig(prev => ({ ...prev, visualStyle: value }))}>
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
                      <label className="text-sm font-medium">Subject Option</label>
                      <Select value={visualConfig.subjectOption} onValueChange={(value: 'ai' | 'upload' | 'none') => setVisualConfig(prev => ({ ...prev, subjectOption: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ai">AI Assist</SelectItem>
                          <SelectItem value="upload">Upload Own</SelectItem>
                          <SelectItem value="none">None</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Dimensions</label>
                      <Select value={visualConfig.dimensions} onValueChange={(value) => setVisualConfig(prev => ({ ...prev, dimensions: value }))}>
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
                  </div>
                  <div>
                    <label className="text-sm font-medium">Visual Tags (comma separated)</label>
                    <Input
                      value={visualConfig.visualTags.join(', ')}
                      onChange={(e) => {
                        const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                        setVisualConfig(prev => ({ ...prev, visualTags: tags }));
                      }}
                      placeholder="e.g., colorful, festive, bright"
                    />
                  </div>
                  {visualConfig.subjectOption === 'ai' && (
                    <Button onClick={generateVisualPrompts} disabled={loading}>
                      {loading ? "Generating..." : "Generate Visual Prompts"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Step 4: Final Render */}
            <TabsContent value="4" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Step 4: Final Render</CardTitle>
                  <p className="text-sm text-muted-foreground">Merge and generate final image</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button onClick={buildFinalPayload} size="lg">
                    Build Final Payload
                  </Button>
                  {finalPayload && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Final Payload:</h4>
                      <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto">
                        {JSON.stringify(finalPayload, null, 2)}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {(textResults.length > 0 || visualResults.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Text Results */}
            {textResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Generated Text Lines</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {textResults.map((line, index) => (
                      <div key={index} className="p-3 bg-muted rounded-lg">
                        <Badge variant="outline" className="mr-2">
                          {index + 1}
                        </Badge>
                        {line}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Visual Results */}
            {visualResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Generated Visual Prompts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {visualResults.map((prompt, index) => (
                      <div key={index} className="p-3 bg-muted rounded-lg">
                        <Badge variant="outline" className="mr-2 mb-2">
                          {index + 1}
                        </Badge>
                        <p className="text-sm">{prompt}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}