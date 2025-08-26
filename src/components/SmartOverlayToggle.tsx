import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SmartOverlayToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  shouldRecommend?: boolean;
}

export function SmartOverlayToggle({ enabled, onChange, shouldRecommend }: SmartOverlayToggleProps) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-background/50">
      <div className="flex items-center gap-2">
        <Label htmlFor="smart-overlay" className="text-sm font-medium">
          Smart text overlay {shouldRecommend && "(recommended)"}
        </Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs text-xs">
                Renders background only, then adds text overlay in-app for precise placement without blocking subjects
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Switch
        id="smart-overlay"
        checked={enabled}
        onCheckedChange={onChange}
      />
    </div>
  );
}