import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Info, Copy, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MovieSceneHelperProps {
  isVisible: boolean;
  onSceneData: (data: {
    exactQuote: string;
    sceneDescription: string;
    useExactMode: boolean;
  }) => void;
}

export function MovieSceneHelper({ isVisible, onSceneData }: MovieSceneHelperProps) {
  const [movieTitle, setMovieTitle] = useState("");
  const [exactQuote, setExactQuote] = useState("");
  const [sceneDescription, setSceneDescription] = useState("");
  const [useExactMode, setUseExactMode] = useState(true);
  const [isGenerated, setIsGenerated] = useState(false);
  const { toast } = useToast();

  const handleMovieChange = (title: string) => {
    setMovieTitle(title);
    if (title.toLowerCase().includes("billy madison") && exactQuote.includes("chlorophyll")) {
      setSceneDescription("Billy Madison classroom scene, Adam Sandler at desk, students and teacher in background, academic setting with chalkboard");
    }
  };

  const handleQuoteChange = (quote: string) => {
    setExactQuote(quote);
    
    // Auto-generate scene descriptions for popular movie quotes
    if (quote.toLowerCase().includes("chlorophyll") && quote.toLowerCase().includes("glorifil")) {
      setSceneDescription("Billy Madison classroom scene, Adam Sandler at desk, students and teacher in background, academic setting with chalkboard");
      setMovieTitle("Billy Madison");
    } else if (quote.toLowerCase().includes("nobody puts baby in a corner")) {
      setSceneDescription("Dirty Dancing final dance scene, Patrick Swayze standing confidently, crowded dance floor, dramatic lighting");
      setMovieTitle("Dirty Dancing");
    } else if (quote.toLowerCase().includes("you can't handle the truth")) {
      setSceneDescription("A Few Good Men courtroom scene, Jack Nicholson at witness stand, dramatic courtroom setting, intense atmosphere");
      setMovieTitle("A Few Good Men");
    } else if (quote.toLowerCase().includes("i'll be back")) {
      setSceneDescription("Terminator police station scene, Arnold Schwarzenegger in leather jacket and sunglasses, dark urban setting");
      setMovieTitle("The Terminator");
    } else if (quote.toLowerCase().includes("frankly my dear")) {
      setSceneDescription("Gone with the Wind mansion scene, Clark Gable in suit, Vivien Leigh in period dress, grand staircase background");
      setMovieTitle("Gone with the Wind");
    }
  };

  const generateScenePrompt = () => {
    if (!exactQuote.trim()) {
      toast({
        title: "Quote Required",
        description: "Please enter the exact quote from the movie scene",
        variant: "destructive",
      });
      return;
    }

    const sceneData = {
      exactQuote: exactQuote.trim(),
      sceneDescription: sceneDescription.trim() || `${movieTitle} scene with the quote "${exactQuote}"`,
      useExactMode,
    };

    onSceneData(sceneData);
    setIsGenerated(true);
    
    toast({
      title: "Scene Data Generated",
      description: "Your movie scene settings have been applied to the generator",
    });
  };

  const copyQuote = async () => {
    try {
      await navigator.clipboard.writeText(exactQuote);
      toast({
        title: "Copied!",
        description: "Quote copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  if (!isVisible) return null;

  return (
    <Card className="w-full max-w-2xl mx-auto border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          🎬 Movie Scene Helper
          {isGenerated && <CheckCircle2 className="h-5 w-5 text-green-500" />}
        </CardTitle>
        <CardDescription>
          Recreate iconic movie scenes with exact quotes and detailed descriptions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Movie Title */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Movie Title (Optional)</label>
          <Input
            value={movieTitle}
            onChange={(e) => handleMovieChange(e.target.value)}
            placeholder="e.g., Billy Madison, The Terminator, Dirty Dancing"
            className="bg-background/50"
          />
        </div>

        {/* Exact Quote */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Exact Quote from Scene *</label>
          <div className="relative">
            <Textarea
              value={exactQuote}
              onChange={(e) => handleQuoteChange(e.target.value)}
              placeholder="e.g., Chlorophyll? More like glorifil!"
              className="bg-background/50 min-h-[80px] pr-12"
              maxLength={200}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={copyQuote}
              className="absolute top-2 right-2 h-8 w-8 p-0"
              disabled={!exactQuote.trim()}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">{exactQuote.length}/200 characters</div>
        </div>

        {/* Scene Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Scene Description</label>
          <Textarea
            value={sceneDescription}
            onChange={(e) => setSceneDescription(e.target.value)}
            placeholder="Describe the visual setting, characters, and background details"
            className="bg-background/50 min-h-[100px]"
            maxLength={300}
          />
          <div className="text-xs text-muted-foreground">{sceneDescription.length}/300 characters</div>
        </div>

        {/* Exact Scene Mode Toggle */}
        <div className="flex items-center justify-between p-4 bg-background/30 rounded-lg border">
          <div className="flex items-center gap-3">
            <Switch
              id="exact-scene-mode"
              checked={useExactMode}
              onCheckedChange={setUseExactMode}
            />
            <label htmlFor="exact-scene-mode" className="text-sm font-medium cursor-pointer">
              Exact Scene Recreation
            </label>
            <div className="group relative">
              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help" />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-popover text-popover-foreground text-xs rounded-lg shadow-lg border opacity-0 group-hover:opacity-100 transition-opacity z-50">
                <p className="font-medium mb-1">Exact Scene Recreation:</p>
                <p>Creates images that closely match the original movie scene composition and details</p>
              </div>
            </div>
          </div>
          <Badge variant={useExactMode ? "default" : "secondary"}>
            {useExactMode ? "Precise" : "Inspired"}
          </Badge>
        </div>

        {/* Popular Examples */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Popular Movie Quote Examples:</label>
          <div className="grid grid-cols-1 gap-2">
            {[
              { quote: "Chlorophyll? More like glorifil!", movie: "Billy Madison" },
              { quote: "Nobody puts Baby in a corner", movie: "Dirty Dancing" },
              { quote: "You can't handle the truth!", movie: "A Few Good Men" },
              { quote: "I'll be back", movie: "The Terminator" },
            ].map((example, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="justify-start text-left h-auto p-2"
                onClick={() => {
                  setExactQuote(example.quote);
                  handleQuoteChange(example.quote);
                }}
              >
                <div>
                  <div className="font-medium">"{example.quote}"</div>
                  <div className="text-xs text-muted-foreground">from {example.movie}</div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={generateScenePrompt}
          className="w-full"
          size="lg"
          disabled={!exactQuote.trim()}
        >
          {isGenerated ? "Update Scene Settings" : "Apply Movie Scene Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}