import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, ExternalLink } from "lucide-react";
import { openAIService } from "@/lib/openai";
import { getIdeogramApiKey, setIdeogramApiKey, removeIdeogramApiKey } from "@/lib/ideogramApi";

interface ApiKeyManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onKeysSet?: () => void;
}

export function ApiKeyManager({ open, onOpenChange, onKeysSet }: ApiKeyManagerProps) {
  const [openaiKey, setOpenaiKey] = useState(openAIService.getApiKey() || "");
  const [ideogramKey, setIdeogramKey] = useState(getIdeogramApiKey() || "");
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showIdeogramKey, setShowIdeogramKey] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Save OpenAI key if provided
      if (openaiKey.trim()) {
        openAIService.setApiKey(openaiKey.trim());
      } else {
        openAIService.removeApiKey();
      }

      // Save Ideogram key if provided
      if (ideogramKey.trim()) {
        setIdeogramApiKey(ideogramKey.trim());
      } else {
        removeIdeogramApiKey();
      }

      onKeysSet?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setOpenaiKey(openAIService.getApiKey() || "");
    setIdeogramKey(getIdeogramApiKey() || "");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>API Keys Setup</DialogTitle>
          <DialogDescription>
            Enter your API keys to enable AI text generation and image creation. These are stored locally in your browser.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* OpenAI API Key */}
          <div className="space-y-2">
            <Label htmlFor="openai-key">OpenAI API Key</Label>
            <div className="relative">
              <Input
                id="openai-key"
                type={showOpenaiKey ? "text" : "password"}
                placeholder="sk-..."
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowOpenaiKey(!showOpenaiKey)}
              >
                {showOpenaiKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Required for AI text generation and suggestions
            </p>
          </div>

          {/* Ideogram API Key */}
          <div className="space-y-2">
            <Label htmlFor="ideogram-key">Ideogram API Key</Label>
            <div className="relative">
              <Input
                id="ideogram-key"
                type={showIdeogramKey ? "text" : "password"}
                placeholder="Enter your Ideogram API key"
                value={ideogramKey}
                onChange={(e) => setIdeogramKey(e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowIdeogramKey(!showIdeogramKey)}
              >
                {showIdeogramKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Required for AI image generation
            </p>
          </div>

          <Alert>
            <AlertDescription>
              Get your API keys from:
              <br />
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                OpenAI Platform <ExternalLink className="h-3 w-3" />
              </a>
              <br />
              <a
                href="https://platform.ideogram.ai/manage/api"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Ideogram Platform <ExternalLink className="h-3 w-3" />
              </a>
            </AlertDescription>
          </Alert>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Keys"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}