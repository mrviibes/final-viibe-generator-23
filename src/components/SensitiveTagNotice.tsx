import { AlertCircle, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getSensitiveTagSuggestions } from "../vibe-ai.config";

interface SensitiveTagNoticeProps {
  tag: string;
  onReplace: (newTag: string) => void;
  onDismiss: () => void;
}

export function SensitiveTagNotice({ tag, onReplace, onDismiss }: SensitiveTagNoticeProps) {
  const suggestions = getSensitiveTagSuggestions(tag);

  return (
    <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
      
      <div className="flex-1 min-w-0">
        <p className="text-xs text-amber-800 dark:text-amber-200">
          <span className="font-medium">Softened for safety:</span> "{tag}"
        </p>
        
        <div className="flex flex-wrap gap-1 mt-1">
          <span className="text-xs text-amber-600 dark:text-amber-400">Try:</span>
          {suggestions.map((suggestion) => (
            <Badge
              key={suggestion}
              variant="outline"
              className="cursor-pointer text-xs px-2 py-0 h-5 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40"
              onClick={() => onReplace(suggestion)}
            >
              {suggestion}
            </Badge>
          ))}
        </div>
      </div>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200"
              onClick={onDismiss}
            >
              <X className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Dismiss notice
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}