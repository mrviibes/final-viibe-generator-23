import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RotateCcw, Settings, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { 
  getRuntimeOverrides, 
  setRuntimeOverrides, 
  clearRuntimeOverrides,
  AI_CONFIG,
  type AIRuntimeOverrides,
  type VisualStyle,
  type Tone
} from "@/vibe-ai.config";

const AVAILABLE_MODELS = [
  { id: "gpt-5-2025-08-07", name: "GPT-5 (Flagship)", description: "Best performance" },
  { id: "gpt-5-mini-2025-08-07", name: "GPT-5 Mini", description: "Faster, cost-efficient" },
  { id: "gpt-4.1-2025-04-14", name: "GPT-4.1 (Default)", description: "Reliable results" },
  { id: "o4-mini-2025-04-16", name: "O4 Mini", description: "Fast reasoning" }
];

const VISUAL_STYLES = [
  { id: "Realistic", name: "Realistic" },
  { id: "Caricature", name: "Caricature" },
  { id: "Anime", name: "Anime" },
  { id: "3D Animated", name: "3D Animated" },
  { id: "Illustrated", name: "Illustrated" },
  { id: "Pop Art", name: "Pop Art" }
];

const TONES = [
  { id: "Humorous", name: "Humorous" },
  { id: "Savage", name: "Savage" },
  { id: "Sentimental", name: "Sentimental" },
  { id: "Nostalgic", name: "Nostalgic" },
  { id: "Romantic", name: "Romantic" },
  { id: "Inspirational", name: "Inspirational" },
  { id: "Playful", name: "Playful" },
  { id: "Serious", name: "Serious" }
];

export default function AiSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [overrides, setOverrides] = useState<AIRuntimeOverrides>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const current = getRuntimeOverrides();
    setOverrides(current);
  }, []);

  // Get effective configuration with runtime overrides applied
  const getEffectiveConfig = () => {
    return {
      ...AI_CONFIG,
      spellcheck: {
        ...AI_CONFIG.spellcheck,
        enabled: overrides.spellcheckEnabled ?? AI_CONFIG.spellcheck.enabled
      },
      visual_defaults: {
        ...AI_CONFIG.visual_defaults,
        style: overrides.defaultVisualStyle ?? AI_CONFIG.visual_defaults.style
      },
      generation: {
        ...AI_CONFIG.generation,
        model: overrides.model ?? AI_CONFIG.generation.model,
        temperature: overrides.temperature ?? AI_CONFIG.generation.temperature
      }
    };
  };

  const effectiveConfig = getEffectiveConfig();

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
          {/* Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuration Overview
              </CardTitle>
              <CardDescription>
                Customize AI behavior and defaults. Changes are applied immediately to new generations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Current Version</p>
                    <p className="text-sm text-muted-foreground">AI Config {AI_CONFIG.version}</p>
                  </div>
                  <Badge variant="secondary">{AI_CONFIG.version}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Active Model</p>
                    <p className="text-sm text-muted-foreground">{effectiveConfig.generation.model}</p>
                  </div>
                  <Badge variant={overrides.model ? "default" : "secondary"}>
                    {overrides.model ? "Override" : "Default"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Model Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Model Configuration</CardTitle>
              <CardDescription>
                Control which AI model and parameters are used for text generation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="model">AI Model</Label>
                <Select
                  value={overrides.model || AI_CONFIG.generation.model}
                  onValueChange={(value) => updateOverride('model', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_MODELS.map(model => (
                      <SelectItem key={model.id} value={model.id}>
                        <div>
                          <div className="font-medium">{model.name}</div>
                          <div className="text-xs text-muted-foreground">{model.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="temperature">Temperature: {overrides.temperature ?? AI_CONFIG.generation.temperature}</Label>
                <Input
                  id="temperature"
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={overrides.temperature ?? AI_CONFIG.generation.temperature}
                  onChange={(e) => updateOverride('temperature', parseFloat(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Higher values = more creative, lower values = more focused
                </p>
              </div>
            </CardContent>
          </Card>

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

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Magic Prompt Enabled</Label>
                  <p className="text-sm text-muted-foreground">
                    Use enhanced prompt engineering for better results
                  </p>
                </div>
                <Switch
                  checked={overrides.magicPromptEnabled ?? true}
                  onCheckedChange={(checked) => updateOverride('magicPromptEnabled', checked)}
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