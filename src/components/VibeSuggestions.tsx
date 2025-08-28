// Vibe Suggestions Component
// Displays 4 text suggestions according to training sheet format

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export interface VibeSuggestionsProps {
  suggestions: string[];
  metadata: {
    category: string;
    subcategory: string;
    tone: string;
    text_tags: string[];
  };
  onRegenerate?: () => void;
  isLoading?: boolean;
}

export function VibeSuggestions({ 
  suggestions, 
  metadata, 
  onRegenerate,
  isLoading = false 
}: VibeSuggestionsProps) {
  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`Option ${index + 1} copied to clipboard!`);
    } catch (error) {
      console.error("Failed to copy text:", error);
      toast.error("Failed to copy text");
    }
  };

  const displaySuggestions = suggestions.slice(0, 4); // Ensure exactly 4 suggestions

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Text Suggestions</CardTitle>
          {onRegenerate && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRegenerate}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Regenerate
            </Button>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary" className="text-xs">
            {metadata.category} • {metadata.subcategory}
          </Badge>
          <Badge variant="outline" className="text-xs capitalize">
            {metadata.tone}
          </Badge>
          {metadata.text_tags.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {metadata.text_tags.length} tag{metadata.text_tags.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {displaySuggestions.map((suggestion, index) => (
          <div 
            key={index}
            className="group relative p-4 rounded-lg border border-border bg-card hover:bg-accent/5 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="text-sm text-muted-foreground mb-1">
                  Option {index + 1}
                </div>
                <div className="text-base leading-relaxed">
                  {suggestion}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {suggestion.length} characters
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(suggestion, index)}
                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                title="Copy to clipboard"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {metadata.text_tags.length > 0 && (
          <div className="pt-3 border-t border-border">
            <div className="text-xs text-muted-foreground mb-2">Tags used:</div>
            <div className="flex flex-wrap gap-1">
              {metadata.text_tags.map((tag, index) => (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className="text-xs px-2 py-0.5"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}