import { HelpCircle, RefreshCw, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface FallbackTooltipProps {
  reason?: string;
  onRegenerate?: () => void;
  onAlludeMode?: () => void;
  onPrideMode?: () => void;
  onSkipTags?: () => void;
  isGenerating?: boolean;
  sanitizedTags?: Array<{ original: string; replacement: string; reason: string; }>;
}

export function FallbackTooltip({ 
  reason = "content-filter", 
  onRegenerate, 
  onAlludeMode,
  onPrideMode,
  onSkipTags,
  isGenerating = false,
  sanitizedTags = []
}: FallbackTooltipProps) {
  const getReasonText = () => {
    switch (reason) {
      case "content-filter":
        return "Some tags triggered content filters, so generic fallbacks were used instead of AI-generated content.";
      case "timeout":
        return "AI generation timed out, so fallback options were used to avoid delays.";
      case "api-error":
        return "AI service is temporarily unavailable, so pre-made fallbacks were used.";
      case "insufficient-candidates":
        return "AI couldn't generate enough unique options, so some fallbacks were added.";
      default:
        return "AI generation encountered issues, so fallback content was used.";
    }
  };

  const getQuickFixes = () => {
    const hasSanitizedTags = sanitizedTags.length > 0;
    
    switch (reason) {
      case "content-filter":
        const fixes = [
          { label: "Try Allude Mode", action: onAlludeMode, icon: Shield, description: "Generate subtler variations" },
          { label: "Regenerate", action: onRegenerate, icon: RefreshCw, description: "Try again with different AI approach" }
        ];
        
        if (hasSanitizedTags) {
          fixes.unshift(
            { label: "Pride-Positive Style", action: onPrideMode, icon: Shield, description: "Generate with celebratory pride tone" },
            { label: "Skip Sensitive Tags", action: onSkipTags, icon: RefreshCw, description: "Generate without flagged tags" }
          );
        }
        
        return fixes;
      case "timeout":
      case "api-error":
        return [
          { label: "Regenerate", action: onRegenerate, icon: RefreshCw, description: "Retry with fresh AI request" }
        ];
      default:
        return [
          { label: "Regenerate", action: onRegenerate, icon: RefreshCw, description: "Try generating again" }
        ];
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" className="h-4 w-4 p-0 hover:bg-transparent">
            <HelpCircle className="h-3 w-3 text-muted-foreground hover:text-foreground transition-colors" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs p-4">
          <div className="space-y-3">
            <div>
              <p className="font-medium text-sm">Why fallback was used:</p>
              <p className="text-xs text-muted-foreground mt-1">{getReasonText()}</p>
            </div>
            
            {sanitizedTags.length > 0 && (
              <div>
                <p className="font-medium text-sm">Sanitized tags:</p>
                <div className="space-y-1 mt-1">
                  {sanitizedTags.map((tag, index) => (
                    <div key={index} className="text-xs">
                      <span className="text-muted-foreground">"{tag.original}"</span>
                      <span className="mx-1">→</span>
                      <span className="font-medium">"{tag.replacement}"</span>
                      <p className="text-muted-foreground italic">{tag.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <p className="font-medium text-sm">Quick fixes:</p>
              {getQuickFixes().map((fix, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={fix.action}
                  disabled={isGenerating}
                  className="w-full justify-start h-8 text-xs"
                >
                  <fix.icon className="h-3 w-3 mr-2" />
                  {fix.label}
                </Button>
              ))}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}