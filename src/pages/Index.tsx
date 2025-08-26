import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Download, RefreshCw, Lightbulb, Sparkles, CheckCircle, XCircle } from "lucide-react";
import { vibeMap, visualPreferences, type VibeKey } from "@/lib/vibeConfig";
import { openAIService } from "@/lib/openai";
import { generateIdeogramImage, IdeogramAPIError } from "@/lib/ideogramApi";
// Helper functions inline
const getIdeogramPrompt = (text: string, vibe: VibeKey | null): string => {
  const basePrompt = text.trim();
  
  if (!vibe) {
    return basePrompt;
  }
  
  const vibeEnhancement: Record<VibeKey, string> = {
    humorous: "in a funny, comedic style with bright colors",
    savage: "in a bold, edgy style with dramatic lighting", 
    inspirational: "in an uplifting, motivational style with warm lighting",
    nostalgic: "in a vintage, retro style with soft, nostalgic tones",
    aesthetic: "in a beautiful, artistic style with perfect composition"
  };
  
  return `${basePrompt} ${vibeEnhancement[vibe]}`;
};

const capitalizeFirstLetter = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

interface SelectionCardProps {
  title: string;
  description: string;
  isSelected: boolean;
  onClick: () => void;
  className?: string;
}

const SelectionCard = ({ title, description, isSelected, onClick, className }: SelectionCardProps) => (
  <Card 
    className={`cursor-pointer transition-colors ${
      isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-secondary/50'
    } ${className}`}
    onClick={onClick}
  >
    <CardContent className="p-4">
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

const StepIndicator = ({ currentStep }: { currentStep: number }) => (
  <div className="flex justify-center items-center gap-2 mb-8">
    {[1, 2, 3, 4, 5].map((step) => (
      <div
        key={step}
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          currentStep === step
            ? 'bg-primary text-primary-foreground'
            : currentStep > step
            ? 'bg-primary/20 text-primary'
            : 'bg-muted text-muted-foreground'
        }`}
      >
        {step}
      </div>
    ))}
  </div>
);

const Index = () => {
  // Core app state
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedVibe, setSelectedVibe] = useState<VibeKey | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState<string | null>(null);
  const [selectedPick, setSelectedPick] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [generatedTexts, setGeneratedTexts] = useState<string[]>([]);
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [isGeneratingTexts, setIsGeneratingTexts] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // API test states
  const [apiTestResults, setApiTestResults] = useState<{
    openai: 'idle' | 'testing' | 'success' | 'error';
    ideogram: 'idle' | 'testing' | 'success' | 'error';
  }>({ openai: 'idle', ideogram: 'idle' });

  useEffect(() => {
    if (selectedVibe && selectedCategory && !selectedSubtopic) {
      loadSubtopics();
    }
  }, [selectedVibe, selectedCategory]);

  useEffect(() => {
    if (selectedVibe && selectedCategory && selectedSubtopic && !selectedPick) {
      loadPicks();
    }
  }, [selectedVibe, selectedCategory, selectedSubtopic]);

  const loadSubtopics = async () => {
    if (!selectedVibe || !selectedCategory) return;
    
    setIsLoadingSuggestions(true);
    try {
      const results = await openAIService.searchPopCulture(selectedCategory, selectedVibe);
      setSuggestions(results);
    } catch (error) {
      console.error('Failed to load subtopics:', error);
      toast.error("Failed to load suggestions. Please try again.");
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const loadPicks = async () => {
    if (!selectedVibe || !selectedCategory || !selectedSubtopic) return;
    
    setIsLoadingSuggestions(true);
    try {
      const results = await openAIService.searchPopCulture(selectedCategory, selectedSubtopic);
      setSuggestions(results);
    } catch (error) {
      console.error('Failed to load picks:', error);
      toast.error("Failed to load suggestions. Please try again.");
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const testOpenAI = async () => {
    setApiTestResults(prev => ({ ...prev, openai: 'testing' }));
    try {
      await openAIService.chatJSON([{ role: 'user', content: 'Say "test successful"' }], { 
        model: 'gpt-4o-mini', 
        max_tokens: 10 
      });
      setApiTestResults(prev => ({ ...prev, openai: 'success' }));
      toast.success("OpenAI API test successful!");
    } catch (error) {
      setApiTestResults(prev => ({ ...prev, openai: 'error' }));
      toast.error(`OpenAI API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testIdeogram = async () => {
    setApiTestResults(prev => ({ ...prev, ideogram: 'testing' }));
    try {
      await generateIdeogramImage({
        image_request: {
          model: "V_2_TURBO",
          prompt: "test image",
          aspect_ratio: "ASPECT_1_1",
          magic_prompt_option: "AUTO"
        }
      });
      setApiTestResults(prev => ({ ...prev, ideogram: 'success' }));
      toast.success("Ideogram API test successful!");
    } catch (error) {
      setApiTestResults(prev => ({ ...prev, ideogram: 'error' }));
      toast.error(`Ideogram API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const generateImage = async () => {
    if (!openAIService.hasApiKey()) {
      toast.error("OpenAI API key not configured - check config/secrets.ts");
      return;
    }

    if (!selectedText && !customPrompt.trim()) {
      toast.error("Please select a generated text or enter a custom prompt");
      return;
    }

    setIsGenerating(true);
    try {
      const finalPrompt = selectedText || customPrompt;
      const ideogramPrompt = getIdeogramPrompt(finalPrompt, selectedVibe);
      
      console.log('Generating image with prompt:', ideogramPrompt);

      const result = await generateIdeogramImage({
        image_request: {
          model: "V_2_TURBO",
          prompt: ideogramPrompt,
          aspect_ratio: "ASPECT_1_1",
          magic_prompt_option: "AUTO"
        }
      });

      setGeneratedImage(result.url);
      toast.success("Image generated successfully!");
    } catch (error) {
      console.error('Image generation failed:', error);
      
      if (error instanceof IdeogramAPIError) {
        toast.error(`Ideogram API Error: ${error.message}`);
      } else {
        toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const generateTexts = async () => {
    if (!selectedVibe || !selectedCategory || !selectedSubtopic || !selectedPick) {
      toast.error("Please complete all selections first");
      return;
    }

    setIsGeneratingTexts(true);
    try {
      const vibe = vibeMap[selectedVibe];
      const texts = await openAIService.generateShortTexts({
        tone: vibe.tone,
        category: selectedCategory,
        subtopic: selectedSubtopic,
        pick: selectedPick,
        tags: vibe.tags,
        charLimit: 280
      });

      setGeneratedTexts(texts);
      toast.success(`Generated ${texts.length} texts!`);
    } catch (error) {
      console.error('Text generation failed:', error);
      toast.error(`Failed to generate texts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingTexts(false);
    }
  };

  const handleNext = () => {
    setCurrentStep(prev => Math.min(prev + 1, 5));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const resetAll = () => {
    setCurrentStep(1);
    setSelectedVibe(null);
    setSelectedCategory(null);
    setSelectedSubtopic(null);
    setSelectedPick(null);
    setCustomPrompt("");
    setSuggestions([]);
    setGeneratedTexts([]);
    setSelectedText(null);
    setGeneratedImage(null);
  };

  const downloadImage = () => {
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = 'vibe-maker-image.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <div className="container mx-auto p-6 space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-2">Vibe Maker</h1>
          <p className="text-muted-foreground">Create stunning visuals with AI</p>
          <div className="flex justify-center gap-2 mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={testOpenAI}
              disabled={apiTestResults.openai === 'testing'}
              className="text-xs"
            >
              {apiTestResults.openai === 'testing' ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : apiTestResults.openai === 'success' ? (
                <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
              ) : apiTestResults.openai === 'error' ? (
                <XCircle className="h-3 w-3 mr-1 text-red-500" />
              ) : (
                <Sparkles className="h-3 w-3 mr-1" />
              )}
              Test OpenAI
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={testIdeogram}
              disabled={apiTestResults.ideogram === 'testing'}
              className="text-xs"
            >
              {apiTestResults.ideogram === 'testing' ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : apiTestResults.ideogram === 'success' ? (
                <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
              ) : apiTestResults.ideogram === 'error' ? (
                <XCircle className="h-3 w-3 mr-1 text-red-500" />
              ) : (
                <Sparkles className="h-3 w-3 mr-1" />
              )}
              Test Ideogram
            </Button>
          </div>
        </div>

        <StepIndicator currentStep={currentStep} />

        {/* Step 1: Choose Vibe */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Choose Your Vibe
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(vibeMap).map(([key, vibe]) => (
                  <SelectionCard
                    key={key}
                    title={vibe.name}
                    description={vibe.description}
                    isSelected={selectedVibe === key}
                    onClick={() => setSelectedVibe(key as VibeKey)}
                  />
                ))}
              </div>
              {selectedVibe && (
                <div className="mt-6 flex justify-between">
                  <Button variant="outline" onClick={resetAll}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                  <Button onClick={handleNext}>
                    Next Step
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Choose Category */}
        {currentStep === 2 && selectedVibe && (
          <Card>
            <CardHeader>
              <CardTitle>Choose Category</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{vibeMap[selectedVibe].name}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {visualPreferences.map((pref) => (
                  <SelectionCard
                    key={pref.category}
                    title={capitalizeFirstLetter(pref.category)}
                    description={pref.description}
                    isSelected={selectedCategory === pref.category}
                    onClick={() => setSelectedCategory(pref.category)}
                  />
                ))}
              </div>
              {selectedCategory && (
                <div className="mt-6 flex justify-between">
                  <Button variant="outline" onClick={handleBack}>
                    Back
                  </Button>
                  <Button onClick={handleNext}>
                    Next Step
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Choose Subtopic */}
        {currentStep === 3 && selectedCategory && (
          <Card>
            <CardHeader>
              <CardTitle>Choose Subtopic</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{vibeMap[selectedVibe!].name}</Badge>
                <Badge variant="outline">{capitalizeFirstLetter(selectedCategory)}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingSuggestions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading suggestions...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {suggestions.map((suggestion, index) => (
                    <SelectionCard
                      key={index}
                      title={suggestion.title}
                      description={suggestion.description}
                      isSelected={selectedSubtopic === suggestion.title}
                      onClick={() => setSelectedSubtopic(suggestion.title)}
                    />
                  ))}
                </div>
              )}
              {selectedSubtopic && (
                <div className="mt-6 flex justify-between">
                  <Button variant="outline" onClick={handleBack}>
                    Back
                  </Button>
                  <Button onClick={handleNext}>
                    Next Step
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 4: Choose Pick */}
        {currentStep === 4 && selectedSubtopic && (
          <Card>
            <CardHeader>
              <CardTitle>Choose Your Pick</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">{vibeMap[selectedVibe!].name}</Badge>
                <Badge variant="outline">{capitalizeFirstLetter(selectedCategory!)}</Badge>
                <Badge variant="outline">{selectedSubtopic}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingSuggestions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading suggestions...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {suggestions.map((suggestion, index) => (
                    <SelectionCard
                      key={index}
                      title={suggestion.title}
                      description={suggestion.description}
                      isSelected={selectedPick === suggestion.title}
                      onClick={() => setSelectedPick(suggestion.title)}
                    />
                  ))}
                </div>
              )}
              {selectedPick && (
                <div className="mt-6 flex justify-between">
                  <Button variant="outline" onClick={handleBack}>
                    Back
                  </Button>
                  <Button onClick={handleNext}>
                    Next Step
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 5: Generate Texts & Image */}
        {currentStep === 5 && selectedPick && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Generate Content
                </CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">{vibeMap[selectedVibe!].name}</Badge>
                  <Badge variant="outline">{capitalizeFirstLetter(selectedCategory!)}</Badge>
                  <Badge variant="outline">{selectedSubtopic}</Badge>
                  <Badge variant="outline">{selectedPick}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={generateTexts} 
                  disabled={isGeneratingTexts}
                  className="w-full"
                >
                  {isGeneratingTexts ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating Texts...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Texts
                    </>
                  )}
                </Button>

                {generatedTexts.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold">Generated Texts:</h3>
                    <div className="grid gap-3">
                      {generatedTexts.map((text, index) => (
                        <Card 
                          key={index} 
                          className={`cursor-pointer transition-colors ${
                            selectedText === text ? 'ring-2 ring-primary' : 'hover:bg-secondary/50'
                          }`}
                          onClick={() => setSelectedText(text)}
                        >
                          <CardContent className="p-3">
                            <p className="text-sm">{text}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <h3 className="font-semibold">Or use custom prompt:</h3>
                  <Textarea
                    placeholder="Enter your custom prompt here..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>

                <Button 
                  onClick={generateImage} 
                  disabled={isGenerating || (!selectedText && !customPrompt.trim())}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating Image...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Image
                    </>
                  )}
                </Button>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={handleBack}>
                    Back
                  </Button>
                  <Button variant="outline" onClick={resetAll}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Start Over
                  </Button>
                </div>
              </CardContent>
            </Card>

            {generatedImage && (
              <Card>
                <CardHeader>
                  <CardTitle>Generated Image</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <img 
                      src={generatedImage} 
                      alt="Generated content" 
                      className="w-full rounded-lg shadow-lg"
                    />
                    <Button onClick={downloadImage} className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Download Image
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;