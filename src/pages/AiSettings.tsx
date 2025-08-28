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
  const [showLegacyWarning, setShowLegacyWarning] = useState(false);

  useEffect(() => {
    const current = getRuntimeOverrides();
    setOverrides(current);
    
    // Check if user is in legacy mode (non-strict)
    const isLegacyMode = current.strictModelEnabled === false;
    setShowLegacyWarning(isLegacyMode);
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

  const enableStrictMode = () => {
    const newOverrides = { 
      ...overrides, 
      strictModelEnabled: true,
      fastVisualsEnabled: true,
      model: 'gpt-4.1-2025-04-14' // Ensure GPT-4.1 is selected
    };
    setOverrides(newOverrides);
    setRuntimeOverrides(newOverrides);
    setShowLegacyWarning(false);
    setHasChanges(false);
    toast({
      title: "Strict Mode Enabled",
      description: "Now using GPT-4.1 directly without slow retry chains."
    });
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
          {/* Legacy Mode Warning */}
          {showLegacyWarning && (
            <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                  <AlertTriangle className="h-5 w-5" />
                  Legacy Settings Detected
                </CardTitle>
                <CardDescription className="text-orange-600 dark:text-orange-300">
                  You're using legacy mode with slow retry chains. For faster, more reliable results, enable strict mode.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Button onClick={enableStrictMode} className="gap-2">
                    <Settings className="h-4 w-4" />
                    Enable Strict Mode (Recommended)
                  </Button>
                  <p className="text-sm text-orange-600 dark:text-orange-300">
                    Uses GPT-4.1 directly without fallbacks
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
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
                    <p className="text-sm text-muted-foreground">{MODEL_DISPLAY_NAMES[effectiveConfig.generation.model] || effectiveConfig.generation.model}</p>
                  </div>
                  <Badge variant={overrides.model ? "default" : "secondary"}>
                    {overrides.model ? "Override" : "Default"}
                  </Badge>
                </div>
                {/* Model Usage Telemetry */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Model Usage Telemetry</p>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span className="text-xs font-medium">Requested:</span>
                      <Badge variant="outline" className="text-xs">
                        {MODEL_DISPLAY_NAMES[localStorage.getItem('last_requested_model') || effectiveConfig.generation.model] || 'Not set'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span className="text-xs font-medium">Actually Used:</span>
                      <Badge 
                        variant={
                          localStorage.getItem('last_text_model')?.startsWith('fallback') ? "destructive" : 
                          localStorage.getItem('last_text_model') === localStorage.getItem('last_requested_model') ? "default" : "secondary"
                        } 
                        className="text-xs"
                      >
                        {(() => {
                          const lastUsed = localStorage.getItem('last_text_model');
                          if (!lastUsed) return 'Not set';
                          if (lastUsed === 'failed') return 'Failed';
                          if (lastUsed.startsWith('fallback')) return 'Fallback (local presets)';
                          return MODEL_DISPLAY_NAMES[lastUsed] || lastUsed;
                        })()}
                      </Badge>
                    </div>
                  </div>
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
                      <SelectItem key={model.value} value={model.value}>
                        <div>
                          <div className="font-medium">{model.label}</div>
                          {model.isRecommended && (
                            <div className="text-xs text-muted-foreground">Recommended</div>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Strict Model Enforcement</Label>
                  <p className="text-sm text-muted-foreground">
                    Use only your selected model without slow retry chains (recommended)
                  </p>
                </div>
                <Switch
                  checked={overrides.strictModelEnabled ?? true}
                  onCheckedChange={(checked) => {
                    updateOverride('strictModelEnabled', checked);
                    if (!checked) {
                      setShowLegacyWarning(true);
                    } else {
                      setShowLegacyWarning(false);
                    }
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Fast Visuals</Label>
                  <p className="text-sm text-muted-foreground">
                    Use optimized settings for faster visual concept generation
                  </p>
                </div>
                <Switch
                  checked={overrides.fastVisualsEnabled ?? true}
                  onCheckedChange={(checked) => updateOverride('fastVisualsEnabled', checked)}
                />
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
                    Use enhanced prompt engineering for better results (Turbo/V2 only - ignored by V3)
                  </p>
                </div>
                <Switch
                  checked={overrides.magicPromptEnabled ?? true}
                  onCheckedChange={(checked) => updateOverride('magicPromptEnabled', checked)}
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
                  value={overrides.typographyStyle || 'poster'}
                  onValueChange={(value) => updateOverride('typographyStyle', value as 'poster' | 'negative_space' | 'subtle_caption')}
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
                    <SelectItem value="subtle_caption">
                      <div className="space-y-1">
                        <div className="font-medium">Subtle Caption (Small)</div>
                        <div className="text-sm text-muted-foreground">Small, unobtrusive text with flexible placement</div>
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