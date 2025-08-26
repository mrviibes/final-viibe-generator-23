import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ExternalLink, Eye, EyeOff, Key } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface KeyManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onKeysUpdated: () => void;
}

export function KeyManagerDialog({ open, onOpenChange, onKeysUpdated }: KeyManagerDialogProps) {
  const [openaiKey, setOpenaiKey] = useState("");
  const [ideogramKey, setIdeogramKey] = useState("");
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showIdeogramKey, setShowIdeogramKey] = useState(false);
  const [errors, setErrors] = useState<{ openai?: string; ideogram?: string }>({});
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      // Load existing keys from localStorage
      const storedOpenaiKey = localStorage.getItem('openai_api_key');
      const storedIdeogramKey = localStorage.getItem('ideogram_api_key');
      
      if (storedOpenaiKey) setOpenaiKey(storedOpenaiKey);
      if (storedIdeogramKey) setIdeogramKey(storedIdeogramKey);
    }
  }, [open]);

  const validateOpenaiKey = (key: string): boolean => {
    return key.startsWith('sk-') && key.length > 20;
  };

  const validateIdeogramKey = (key: string): boolean => {
    return key.length > 10; // Basic validation for Ideogram keys
  };

  const handleSave = () => {
    const newErrors: { openai?: string; ideogram?: string } = {};

    // Validate keys
    if (openaiKey && !validateOpenaiKey(openaiKey)) {
      newErrors.openai = "OpenAI key should start with 'sk-' and be longer than 20 characters";
    }

    if (ideogramKey && !validateIdeogramKey(ideogramKey)) {
      newErrors.ideogram = "Invalid Ideogram API key format";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Save to localStorage
    if (openaiKey.trim()) {
      localStorage.setItem('openai_api_key', openaiKey.trim());
    } else {
      localStorage.removeItem('openai_api_key');
    }

    if (ideogramKey.trim()) {
      localStorage.setItem('ideogram_api_key', ideogramKey.trim());
    } else {
      localStorage.removeItem('ideogram_api_key');
    }

    // Clear form and close
    setErrors({});
    onKeysUpdated();
    onOpenChange(false);
    
    toast({
      title: "API Keys Saved",
      description: "Your API keys have been saved securely in your browser.",
    });
  };

  const handleCancel = () => {
    setOpenaiKey("");
    setIdeogramKey("");
    setErrors({});
    onOpenChange(false);
  };

  const maskKey = (key: string) => {
    if (!key || key.length < 8) return "";
    return `${key.substring(0, 4)}****...${key.substring(key.length - 4)}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Key Manager
          </DialogTitle>
          <DialogDescription>
            Configure your API keys for text and image generation. Keys are stored securely in your browser.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* OpenAI Key Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="openai-key" className="text-sm font-medium">
                OpenAI API Key
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => window.open('https://platform.openai.com/api-keys', '_blank')}
                className="h-6 px-2 text-xs"
              >
                Get Key <ExternalLink className="ml-1 h-3 w-3" />
              </Button>
            </div>
            <div className="relative">
              <Input
                id="openai-key"
                type={showOpenaiKey ? "text" : "password"}
                placeholder="sk-..."
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                className="pr-10 font-mono text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowOpenaiKey(!showOpenaiKey)}
              >
                {showOpenaiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {errors.openai && (
              <p className="text-sm text-destructive">{errors.openai}</p>
            )}
            {openaiKey && !errors.openai && (
              <p className="text-xs text-muted-foreground">Preview: {maskKey(openaiKey)}</p>
            )}
          </div>

          {/* Ideogram Key Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="ideogram-key" className="text-sm font-medium">
                Ideogram API Key
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => window.open('https://ideogram.ai/api', '_blank')}
                className="h-6 px-2 text-xs"
              >
                Get Key <ExternalLink className="ml-1 h-3 w-3" />
              </Button>
            </div>
            <div className="relative">
              <Input
                id="ideogram-key"
                type={showIdeogramKey ? "text" : "password"}
                placeholder="Enter your Ideogram API key"
                value={ideogramKey}
                onChange={(e) => setIdeogramKey(e.target.value)}
                className="pr-10 font-mono text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowIdeogramKey(!showIdeogramKey)}
              >
                {showIdeogramKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {errors.ideogram && (
              <p className="text-sm text-destructive">{errors.ideogram}</p>
            )}
            {ideogramKey && !errors.ideogram && (
              <p className="text-xs text-muted-foreground">Preview: {maskKey(ideogramKey)}</p>
            )}
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Your API keys are stored locally in your browser and never sent to our servers. 
              They are only used to make direct API calls to OpenAI and Ideogram.
            </AlertDescription>
          </Alert>
        </div>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save API Keys
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}