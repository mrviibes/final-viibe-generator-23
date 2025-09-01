import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Info, Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ConciseModeOptions } from "@/lib/ideogramPrompt";

interface ConciseModePanelProps {
  conciseModeOptions: ConciseModeOptions;
  onOptionsChange: (options: ConciseModeOptions) => void;
  onQuickGenerate?: (mode: 'ultra-short' | 'short' | 'short-locked') => void;
  className?: string;
}

export function ConciseModePanel({ 
  conciseModeOptions, 
  onOptionsChange, 
  onQuickGenerate,
  className 
}: ConciseModePanelProps) {
  const handleToggleConcise = (enabled: boolean) => {
    onOptionsChange({
      ...conciseModeOptions,
      enabled
    });
  };

  const handleTextZoneChange = (zone: ConciseModeOptions['textZone']) => {
    onOptionsChange({
      ...conciseModeOptions,
      textZone: zone
    });
  };

  const handleStrongerLockChange = (strongerSubjectLock: boolean) => {
    onOptionsChange({
      ...conciseModeOptions,
      strongerSubjectLock
    });
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4" />
          Concise Mode
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs max-w-xs">
                Subject-first prompting for better text generation. Reduces prompt complexity 
                to focus the AI on key subjects and proper text placement.
              </p>
            </TooltipContent>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Enable Concise Mode</label>
          <Switch
            checked={conciseModeOptions.enabled}
            onCheckedChange={handleToggleConcise}
          />
        </div>

        {conciseModeOptions.enabled && (
          <>
            {/* Text Zone Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Text Zone</label>
              <Select 
                value={conciseModeOptions.textZone || 'NATURAL'} 
                onValueChange={handleTextZoneChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select text placement zone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NATURAL">Natural negative space</SelectItem>
                  <SelectItem value="TOP">Top zone</SelectItem>
                  <SelectItem value="BOTTOM">Bottom zone</SelectItem>
                  <SelectItem value="LEFT">Left zone</SelectItem>
                  <SelectItem value="RIGHT">Right zone</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Stronger Subject Lock Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <label className="text-sm font-medium">Stronger Subject Lock</label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-xs">
                      Adds "(main focus)" to the subject to ensure the AI prioritizes 
                      the key subject elements in the generated image.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Switch
                checked={conciseModeOptions.strongerSubjectLock || false}
                onCheckedChange={handleStrongerLockChange}
              />
            </div>

            {/* Quick Generate Buttons */}
            {onQuickGenerate && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Quick Regenerate</label>
                <div className="grid gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onQuickGenerate('ultra-short')}
                    className="text-xs justify-start"
                  >
                    🚀 Ultra-Short: "MVP trophy on bench"
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onQuickGenerate('short')}
                    className="text-xs justify-start"
                  >
                    ⚡ Short: MVP trophy on bench, gym setting
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onQuickGenerate('short-locked')}
                    className="text-xs justify-start"
                  >
                    🔒 Short + Lock: MVP trophy (main focus), gym setting
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}