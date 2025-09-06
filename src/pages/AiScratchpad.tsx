// AI Development Scratchpad - for testing new AI system
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { llmClient } from "@/ai/llm";
import { buildTextLinesMessages, buildVisualMessages, type AiInputs } from "@/ai/prompts";

export default function AiScratchpad() {
  const [inputs, setInputs] = useState<AiInputs>({
    category: "Celebrations",
    subcategory: "Birthday Party",
    tone: "Playful",
    tags: ["fun", "party"],
    visualStyle: "Realistic",
    visualTags: ["colorful", "festive"]
  });
  
  const [textResults, setTextResults] = useState<string[]>([]);
  const [visualResults, setVisualResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const handleInputChange = (field: keyof AiInputs, value: string) => {
    setInputs(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTagsChange = (field: 'tags' | 'visualTags', value: string) => {
    const tags = value.split(',').map(t => t.trim()).filter(Boolean);
    setInputs(prev => ({
      ...prev,
      [field]: tags
    }));
  };

  const generateTextLines = async () => {
    setLoading(true);
    setError("");
    
    try {
      const messages = buildTextLinesMessages(inputs);
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
      const messages = buildVisualMessages(inputs);
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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">AI Development Scratchpad</h1>
          <p className="text-muted-foreground">
            Test the new AI system - isolated from legacy code
          </p>
        </div>

        {/* Input Controls */}
        <Card>
          <CardHeader>
            <CardTitle>AI Inputs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Category</label>
                <Input
                  value={inputs.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  placeholder="e.g., Celebrations"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Subcategory</label>
                <Input
                  value={inputs.subcategory}
                  onChange={(e) => handleInputChange('subcategory', e.target.value)}
                  placeholder="e.g., Birthday Party"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Tone</label>
                <Input
                  value={inputs.tone}
                  onChange={(e) => handleInputChange('tone', e.target.value)}
                  placeholder="e.g., Playful"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Visual Style</label>
                <Input
                  value={inputs.visualStyle || ""}
                  onChange={(e) => handleInputChange('visualStyle', e.target.value)}
                  placeholder="e.g., Realistic"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Tags (comma separated)</label>
                <Input
                  value={inputs.tags?.join(', ') || ""}
                  onChange={(e) => handleTagsChange('tags', e.target.value)}
                  placeholder="e.g., fun, party, celebration"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Visual Tags (comma separated)</label>
                <Input
                  value={inputs.visualTags?.join(', ') || ""}
                  onChange={(e) => handleTagsChange('visualTags', e.target.value)}
                  placeholder="e.g., colorful, festive, bright"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <Button 
            onClick={generateTextLines}
            disabled={loading}
            size="lg"
          >
            {loading ? "Generating..." : "Generate Text Lines"}
          </Button>
          <Button 
            onClick={generateVisualPrompts}
            disabled={loading}
            variant="outline"
            size="lg"
          >
            {loading ? "Generating..." : "Generate Visual Prompts"}
          </Button>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Text Results */}
          <Card>
            <CardHeader>
              <CardTitle>Generated Text Lines</CardTitle>
            </CardHeader>
            <CardContent>
              {textResults.length > 0 ? (
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
              ) : (
                <p className="text-muted-foreground">No text lines generated yet</p>
              )}
            </CardContent>
          </Card>

          {/* Visual Results */}
          <Card>
            <CardHeader>
              <CardTitle>Generated Visual Prompts</CardTitle>
            </CardHeader>
            <CardContent>
              {visualResults.length > 0 ? (
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
              ) : (
                <p className="text-muted-foreground">No visual prompts generated yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}