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
import { ArrowLeft, RotateCcw, Settings, AlertTriangle, Info, ImageIcon, Key, CheckCircle, XCircle, AlertCircle as AlertCircleIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { openAIService } from "@/lib/openai";
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
  type Tone,
  type ContentFilterStrictness,
  type SensitiveTagHandling
} from "@/vibe-ai.config";
import { clearPopCultureCache } from "@/lib/popCultureRAG";

export default function AiSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [overrides, setOverrides] = useState<AIRuntimeOverrides>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [openaiConnectionStatus, setOpenaiConnectionStatus] = useState<'unknown' | 'working' | 'quota-exceeded' | 'auth-failed' | 'network-error'>('unknown');
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);

  useEffect(() => {
    const current = getRuntimeOverrides();
    // Clean up legacy model/temperature overrides
    const cleanedOverrides = { ...current };
    delete cleanedOverrides.model;
    delete cleanedOverrides.temperature;
    setOverrides(cleanedOverrides);
    
    // Update OpenAI connection status
    setOpenaiConnectionStatus(openAIService.getConnectionStatus());
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

  const getConnectionStatusIcon = () => {
    switch (openaiConnectionStatus) {
      case 'working':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'quota-exceeded':
      case 'auth-failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'network-error':
        return <AlertCircleIcon className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircleIcon className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getConnectionStatusText = () => {
    if (openAIService.isUsingBackend()) {
      return 'Using Supabase backend';
    }
    
    switch (openaiConnectionStatus) {
      case 'working':
        return 'Connected';
      case 'quota-exceeded':
        return 'Quota exceeded - add billing to OpenAI account';
      case 'auth-failed':
        return 'Invalid API key';
      case 'network-error':
        return 'Connection error';
      default:
        return openAIService.hasApiKey() ? 'API key set' : 'No API key';
    }
  };

  const handleClearApiKey = () => {
    openAIService.clearApiKey();
    
    setOpenaiConnectionStatus('unknown');
    toast({
      title: "API Key Cleared",
      description: "Now using Supabase backend for OpenAI requests."
    });
  };

  const handleApiKeySet = (apiKey: string) => {
    openAIService.setApiKey(apiKey);
    setOpenaiConnectionStatus('unknown');
    toast({
      title: "API Key Set",
      description: "OpenAI API key has been configured. Test it by generating content."
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

              <Separator />

              <div className="space-y-2">
                <Label>Content Filter Strictness</Label>
                <Select
                  value={overrides.contentFilterStrictness || 'relaxed'}
                  onValueChange={(value) => updateOverride('contentFilterStrictness', value as ContentFilterStrictness)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strict">
                      <div className="space-y-1">
                        <div className="font-medium">Strict</div>
                        <div className="text-sm text-muted-foreground">Maximum filtering (current behavior)</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="relaxed">
                      <div className="space-y-1">
                        <div className="font-medium">Relaxed (Recommended)</div>
                        <div className="text-sm text-muted-foreground">Balanced approach, fewer false positives</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="off">
                      <div className="space-y-1">
                        <div className="font-medium">Off</div>
                        <div className="text-sm text-muted-foreground">Minimal filtering, rely on model safety</div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Controls how strictly content is filtered. "Relaxed" reduces fallback usage while maintaining safety.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Sensitive Tag Handling</Label>
                <Select
                  value={overrides.sensitiveTagHandling || 'warn-only'}
                  onValueChange={(value) => updateOverride('sensitiveTagHandling', value as SensitiveTagHandling)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto-rewrite">
                      <div className="space-y-1">
                        <div className="font-medium">Auto-rewrite</div>
                        <div className="text-sm text-muted-foreground">Automatically replace sensitive tags</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="warn-only">
                      <div className="space-y-1">
                        <div className="font-medium">Warn Only (Recommended)</div>
                        <div className="text-sm text-muted-foreground">Keep original tags but show warnings</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="off">
                      <div className="space-y-1">
                        <div className="font-medium">Off</div>
                        <div className="text-sm text-muted-foreground">No tag processing</div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  How to handle potentially sensitive tags. "Warn only" preserves your intent while providing feedback.
                </p>
              </div>

            </CardContent>
          </Card>

          {/* Pop Culture Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Pop Culture Intelligence</CardTitle>
              <CardDescription>
                Configure web fact retrieval for pop culture content generation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Use Web Facts for Pop Culture</Label>
                  <p className="text-sm text-muted-foreground">
                    Retrieve real facts from Wikipedia and other sources for pop culture topics
                  </p>
                </div>
                <Switch
                  checked={overrides.popCultureWebFacts !== false}
                  onCheckedChange={(checked) => updateOverride('popCultureWebFacts', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label>Recency Filter</Label>
                <Select
                  value={overrides.popCultureRecency || 'all'}
                  onValueChange={(value) => updateOverride('popCultureRecency', value)}
                  disabled={overrides.popCultureWebFacts === false}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Filter facts based on recency for more current references
                </p>
              </div>

              {overrides.popCultureWebFacts !== false && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-muted">
                  <Info className="h-4 w-4 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Cache Information</p>
                    <p className="text-muted-foreground">
                      Web facts are cached for 24 hours to improve speed. Use the reset button below to clear cache and fetch fresh data.
                    </p>
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                onClick={() => {
                  clearPopCultureCache();
                  toast({
                    title: "Cache Cleared",
                    description: "Pop culture cache has been cleared. Fresh facts will be fetched on next use."
                  });
                }}
                disabled={overrides.popCultureWebFacts === false}
              >
                Clear Pop Culture Cache
              </Button>
            </CardContent>
          </Card>

          {/* OpenAI Connection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                OpenAI Connection
              </CardTitle>
              <CardDescription>
                Manage your OpenAI API connection for text generation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  {getConnectionStatusIcon()}
                  <div>
                    <div className="font-medium">Status</div>
                    <div className="text-sm text-muted-foreground">
                      {getConnectionStatusText()}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!openAIService.isUsingBackend() && (
                    <Button variant="outline" size="sm" onClick={handleClearApiKey}>
                      Clear Key
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setShowApiKeyDialog(true)}>
                    {openAIService.hasApiKey() && !openAIService.isUsingBackend() ? 'Update Key' : 'Set API Key'}
                  </Button>
                </div>
              </div>

              {openaiConnectionStatus === 'quota-exceeded' && (
                <div className="p-3 border border-red-200 bg-red-50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                    <div className="text-sm">
                      <div className="font-medium text-red-800">Quota Exceeded</div>
                      <div className="text-red-700 mt-1">
                        Your OpenAI account has insufficient credits. Add billing to your OpenAI account or use the Supabase backend.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {openaiConnectionStatus === 'auth-failed' && (
                <div className="p-3 border border-red-200 bg-red-50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                    <div className="text-sm">
                      <div className="font-medium text-red-800">Authentication Failed</div>
                      <div className="text-red-700 mt-1">
                        Your API key is invalid. Please check and update your OpenAI API key.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {openAIService.getLastError() && (
                <div className="p-3 border border-yellow-200 bg-yellow-50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircleIcon className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div className="text-sm">
                      <div className="font-medium text-yellow-800">Last Error</div>
                      <div className="text-yellow-700 mt-1 font-mono text-xs">
                        {openAIService.getLastError()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-sm text-muted-foreground">
                By default, this app uses the Supabase backend for OpenAI requests. You can optionally set your own API key to use OpenAI directly.
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

      {/* API Key Dialog */}
      {showApiKeyDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Set OpenAI API Key</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="apikey">API Key</Label>
                <Input
                  id="apikey"
                  type="password"
                  placeholder="sk-..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const apiKey = (e.target as HTMLInputElement).value.trim();
                      if (apiKey) {
                        handleApiKeySet(apiKey);
                        setShowApiKeyDialog(false);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowApiKeyDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  const input = document.getElementById('apikey') as HTMLInputElement;
                  const apiKey = input?.value?.trim();
                  if (apiKey) {
                    handleApiKeySet(apiKey);
                    setShowApiKeyDialog(false);
                    input.value = '';
                  }
                }}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}