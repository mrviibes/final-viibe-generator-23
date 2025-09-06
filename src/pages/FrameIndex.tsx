import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FEATURE_FLAGS } from "@/config/featureFlags";

const frameCategories = [
  { id: "celebrations", name: "Celebrations", description: "Holidays, milestones, special occasions" },
  { id: "sports", name: "Sports", description: "All sports, activities, and competitions" },
  { id: "daily-life", name: "Daily Life", description: "Everyday routines, hobbies, and situations" },
  { id: "vibes-punchlines", name: "Vibes & Punchlines", description: "Moods, self-talk, jokes, and formats" },
  { id: "pop-culture", name: "Pop Culture", description: "Movies, music, celebrities, trends" },
  { id: "random", name: "No Category", description: "Build from scratch" }
];

const frameTones = ["Humorous", "Savage", "Sentimental", "Nostalgic", "Romantic", "Inspirational", "Playful", "Serious"];

const frameVisualStyles = ["Realistic", "Caricature", "Anime", "3D Animated", "Illustrated", "Pop Art"];

export default function FrameIndex() {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedTone, setSelectedTone] = useState<string>("");
  const [selectedVisualStyle, setSelectedVisualStyle] = useState<string>("");
  const [customText, setCustomText] = useState<string>("");
  const { toast } = useToast();

  const handleGenerateClick = () => {
    toast({
      title: "Frame Mode Active",
      description: "AI functionality is disabled. This is a UI frame for development.",
      variant: "default"
    });
  };

  const staticPlaceholderTexts = [
    "Frame mode: Text generation disabled",
    "Static placeholder for development",
    "No AI processing active",
    "UI frame ready for implementation"
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <h1 className="text-xl font-semibold">Vibe Generator - Frame Mode</h1>
          <div className="ml-auto">
            <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300">
              <AlertCircle className="w-3 h-3 mr-1" />
              AI Disabled
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Frame Mode Notice */}
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-800">
                <AlertCircle className="w-5 h-5" />
                Frame Mode Active
              </CardTitle>
              <CardDescription className="text-amber-700">
                All AI functionality has been disabled. This is a static UI frame for development purposes.
                Feature flags: {JSON.stringify(FEATURE_FLAGS, null, 2)}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Input Controls */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Category Selection</CardTitle>
                  <CardDescription>Choose a category (frame mode - static options)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {frameCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div>
                            <div className="font-medium">{category.name}</div>
                            <div className="text-sm text-muted-foreground">{category.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tone & Style</CardTitle>
                  <CardDescription>Select tone and visual style (static options)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Tone</label>
                    <Select value={selectedTone} onValueChange={setSelectedTone}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tone" />
                      </SelectTrigger>
                      <SelectContent>
                        {frameTones.map((tone) => (
                          <SelectItem key={tone} value={tone}>{tone}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Visual Style</label>
                    <Select value={selectedVisualStyle} onValueChange={setSelectedVisualStyle}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select visual style" />
                      </SelectTrigger>
                      <SelectContent>
                        {frameVisualStyles.map((style) => (
                          <SelectItem key={style} value={style}>{style}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Custom Input</CardTitle>
                  <CardDescription>Add custom text (frame mode - non-functional)</CardDescription>
                </CardHeader>
                <CardContent>
                  <Input
                    placeholder="Enter custom text..."
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                  />
                  <div className="mt-4">
                    <Button onClick={handleGenerateClick} className="w-full">
                      Generate (Frame Mode)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Results Panel */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Generated Text</CardTitle>
                  <CardDescription>Static placeholder text (AI disabled)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {staticPlaceholderTexts.map((text, index) => (
                      <div key={index} className="p-3 bg-muted rounded-lg border">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{text}</span>
                          <Badge variant="outline" className="text-xs">
                            Static #{index + 1}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Visual Preview</CardTitle>
                  <CardDescription>Image generation placeholder (AI disabled)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="aspect-square bg-muted rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <div className="w-16 h-16 bg-muted-foreground/10 rounded-full mx-auto flex items-center justify-center">
                        <Download className="w-8 h-8 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm text-muted-foreground">Frame Mode</p>
                      <p className="text-xs text-muted-foreground">Image generation disabled</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Development Info */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-800">Development Information</CardTitle>
              <CardDescription className="text-blue-700">
                This frame shows the UI structure without AI functionality. 
                Ready for implementing new features or replacing AI components.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-blue-700">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Selected Category:</strong> {selectedCategory || "None"}
                </div>
                <div>
                  <strong>Selected Tone:</strong> {selectedTone || "None"}
                </div>
                <div>
                  <strong>Visual Style:</strong> {selectedVisualStyle || "None"}
                </div>
                <div>
                  <strong>Custom Text:</strong> {customText || "None"}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}