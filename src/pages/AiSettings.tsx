import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, RotateCcw, Settings, AlertTriangle, Info, ImageIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { 
  getRuntimeOverrides, 
  setRuntimeOverrides, 
  clearRuntimeOverrides,
  AI_CONFIG,
  AVAILABLE_MODELS,
  MODEL_DISPLAY_NAMES,
  VISUAL_STYLES, 
  TONES,
  isTemperatureSupported,
  type AIRuntimeOverrides,
  type VisualStyle,
  type Tone
} from "@/vibe-ai.config";

export default function AiSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [overrides, setOverrides] = useState<AIRuntimeOverrides>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const current = getRuntimeOverrides();
    // Clean up legacy model/temperature overrides
    const cleanedOverrides = { ...current };
    delete cleanedOverrides.model;
    delete cleanedOverrides.temperature;
    setOverrides(cleanedOverrides);
  }, []);

  const updateOverride = (key: keyof AIRuntimeOverrides, value: any) => {
    const newOverrides = { ...overrides, [key]: value };
    setOverrides(newOverrides);
    setHasChanges(true);
  };

  const saveChanges = () => {
    setRuntimeOverrides(overrides);
    setHasChanges(false);
    toast({
      title: "Settings Saved",
      description: "AI configuration has been updated successfully."
    });
  };

  const resetToDefaults = () => {
    clearRuntimeOverrides();
    setOverrides({});
    setHasChanges(false);
    toast({
      title: "Settings Reset",
      description: "All AI settings have been reset to defaults."
    });
  };

  const discardChanges = () => {
    const current = getRuntimeOverrides();
    setOverrides(current);
    setHasChanges(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Generator
              </Button>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                <h1 className="text-xl font-semibold">AI Settings</h1>
              </div>
            </div>
            
            {hasChanges && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={discardChanges}>
                  Discard
                </Button>
                <Button size="sm" onClick={saveChanges}>
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid gap-6">
          {/* Content Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Content Generation</CardTitle>
              <CardDescription>
                Configure text processing and quality controls.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Spellcheck Enabled</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically check generated text for spelling errors
                  </p>
                </div>
                <Switch
                  checked={overrides.spellcheckEnabled ?? AI_CONFIG.spellcheck.enabled}
                  onCheckedChange={(checked) => updateOverride('spellcheckEnabled', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Clean Background Default</Label>
                  <p className="text-sm text-muted-foreground">
                    Default to clean backgrounds for better text visibility
                  </p>
                </div>
                <Switch
                  checked={overrides.cleanBackgroundDefault ?? false}
                  onCheckedChange={(checked) => updateOverride('cleanBackgroundDefault', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Spelling Guarantee Default</Label>
                  <p className="text-sm text-muted-foreground">
                    Default to guaranteed correct spelling mode
                  </p>
                </div>
                <Switch
                  checked={overrides.spellingGuaranteeDefault ?? false}
                  onCheckedChange={(checked) => updateOverride('spellingGuaranteeDefault', checked)}
                />
              </div>

            </CardContent>
          </Card>

          {/* Default Values */}
          <Card>
            <CardHeader>
              <CardTitle>Default Preferences</CardTitle>
              <CardDescription>
                Set default values for visual style and tone selections.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Default Visual Style</Label>
                <Select
                  value={overrides.defaultVisualStyle || AI_CONFIG.visual_defaults.style}
                  onValueChange={(value) => updateOverride('defaultVisualStyle', value as VisualStyle)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select default style" />
                  </SelectTrigger>
                  <SelectContent>
                    {VISUAL_STYLES.map(style => (
                      <SelectItem key={style.id} value={style.id}>
                        {style.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Default Tone</Label>
                <Select
                  value={overrides.defaultTone || "none"}
                  onValueChange={(value) => updateOverride('defaultTone', value === "none" ? undefined : value as Tone)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No default (user selects)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No default</SelectItem>
                    {TONES.map(tone => (
                      <SelectItem key={tone.id} value={tone.id}>
                        {tone.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Image Generation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Image Generation
              </CardTitle>
              <CardDescription>
                Configure image generation model and typography settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Image Model</Label>
                <Select
                  value={overrides.ideogramModel || 'V_2A_TURBO'}
                  onValueChange={(value) => updateOverride('ideogramModel', value as 'V_2A_TURBO' | 'V_3')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="V_2A_TURBO">
                      <div className="space-y-1">
                        <div className="font-medium">Turbo (Default)</div>
                        <div className="text-sm text-muted-foreground">Fast and reliable</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="V_3">
                      <div className="space-y-1">
                        <div className="font-medium">V3 (Premium)</div>
                        <div className="text-sm text-muted-foreground">Higher quality, auto-fallback to Turbo if unavailable</div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  V3 provides higher quality but may cost more and occasionally fallback to Turbo.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Typography Style</Label>
                <Select
                  value={overrides.typographyStyle || 'poster'}
                  onValueChange={(value) => updateOverride('typographyStyle', value as 'poster' | 'negative_space')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="poster">
                      <div className="space-y-1">
                        <div className="font-medium">Poster (Large Text)</div>
                        <div className="text-sm text-muted-foreground">Bold, centered, dominant text</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="negative_space">
                      <div className="space-y-1">
                        <div className="font-medium">Negative Space</div>
                        <div className="text-sm text-muted-foreground">Text in empty areas</div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Poster style creates larger, more prominent text like the examples you prefer.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="magic-prompt"
                    checked={overrides.enableMagicPrompt !== false}
                    onCheckedChange={(checked) => updateOverride('enableMagicPrompt', checked)}
                  />
                  <Label htmlFor="magic-prompt">Magic Prompt (Ideogram)</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Enhances image prompts with additional details for better visual results.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Reset Settings
              </CardTitle>
              <CardDescription>
                Clear all customizations and return to default AI configuration.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={resetToDefaults}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset to Defaults
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}