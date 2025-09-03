import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RotateCcw, Settings, AlertTriangle, ImageIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { 
  getRuntimeOverrides, 
  setRuntimeOverrides, 
  clearRuntimeOverrides,
  AI_CONFIG,
  AVAILABLE_MODELS,
  MODEL_DISPLAY_NAMES,
  type AIRuntimeOverrides
} from "@/vibe-ai.config";

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
      generation: {
        ...AI_CONFIG.generation,
        model: overrides.model ?? AI_CONFIG.generation.model
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

          {/* Model Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Model Configuration</CardTitle>
              <CardDescription>
                Using GPT-4.1 for consistent, reliable text generation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">AI Model</p>
                  <p className="text-sm text-muted-foreground">GPT-4.1 (2025-04-14)</p>
                </div>
                <Badge variant="secondary">Fixed</Badge>
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
                  <Label>Fast visual recommendations</Label>
                  <p className="text-sm text-muted-foreground">
                    Generate visual options faster (3-6s) but with less reliability. Recommended: OFF
                  </p>
                </div>
                <Switch
                  checked={overrides.fastVisualsEnabled ?? false}
                  onCheckedChange={(checked) => updateOverride('fastVisualsEnabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Magic Prompt Enabled</Label>
                  <p className="text-sm text-muted-foreground">
                    Use enhanced prompt engineering for better results (Turbo/V2 only - ignored by V3)
                  </p>
                </div>
                <Switch
                  checked={overrides.magicPromptEnabled ?? true}
                  onCheckedChange={(checked) => updateOverride('magicPromptEnabled', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Show Advanced Prompt Details</Label>
                  <p className="text-sm text-muted-foreground">
                    Show full technical prompts and negative prompt details by default
                  </p>
                </div>
                <Switch
                  checked={overrides.showAdvancedPromptDetails ?? false}
                  onCheckedChange={(checked) => updateOverride('showAdvancedPromptDetails', checked)}
                />
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
                  value={overrides.typographyStyle || 'negative-space'}
                  onValueChange={(value) => updateOverride('typographyStyle', value as 'negative-space' | 'meme-style' | 'lower-third' | 'side-bar' | 'badge-sticker' | 'subtle-caption')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="negative-space">
                      <div className="space-y-1">
                        <div className="font-medium">Negative Space (Default)</div>
                        <div className="text-sm text-muted-foreground">Small text in empty areas</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="meme-style">
                      <div className="space-y-1">
                        <div className="font-medium">Meme Top/Bottom</div>
                        <div className="text-sm text-muted-foreground">Classic meme format with top and bottom text bands</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="lower-third">
                      <div className="space-y-1">
                        <div className="font-medium">Lower Third</div>
                        <div className="text-sm text-muted-foreground">Text banner at bottom</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="side-bar">
                      <div className="space-y-1">
                        <div className="font-medium">Side Panel</div>
                        <div className="text-sm text-muted-foreground">Text in vertical side panel</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="badge-sticker">
                      <div className="space-y-1">
                        <div className="font-medium">Badge/Sticker</div>
                        <div className="text-sm text-muted-foreground">Small corner badge style</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="subtle-caption">
                      <div className="space-y-1">
                        <div className="font-medium">Subtle Caption</div>
                        <div className="text-sm text-muted-foreground">Very small corner text</div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Poster style creates larger, more prominent text like the examples you prefer.
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