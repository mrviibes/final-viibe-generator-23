import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onKeysUpdated: () => void;
}

export function SettingsDialog({ open, onOpenChange, onKeysUpdated }: SettingsDialogProps) {
  const [openaiKey, setOpenaiKey] = useState(localStorage.getItem('openai_api_key') || '');
  const [ideogramKey, setIdeogramKey] = useState(localStorage.getItem('ideogram_api_key') || '');
  const [ideogramProxyUrl, setIdeogramProxyUrl] = useState(localStorage.getItem('ideogram_proxy_url') || '');
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showIdeogramKey, setShowIdeogramKey] = useState(false);
  const [saving, setSaving] = useState(false);

  const validateOpenAIKey = (key: string): boolean => {
    return key.trim().startsWith('sk-') && key.trim().length > 20;
  };

  const validateIdeogramKey = (key: string): boolean => {
    return key.trim().length > 10; // Basic length check
  };

  const handleSave = async () => {
    setSaving(true);
    
    // Validate keys before saving
    const trimmedOpenAIKey = openaiKey.trim();
    const trimmedIdeogramKey = ideogramKey.trim();
    const trimmedProxyUrl = ideogramProxyUrl.trim();
    
    if (trimmedOpenAIKey && !validateOpenAIKey(trimmedOpenAIKey)) {
      setSaving(false);
      alert('OpenAI API key should start with "sk-" and be at least 20 characters long');
      return;
    }
    
    if (trimmedIdeogramKey && !validateIdeogramKey(trimmedIdeogramKey)) {
      setSaving(false);
      alert('Ideogram API key should be at least 10 characters long');
      return;
    }
    
    // Save to localStorage
    if (trimmedOpenAIKey) {
      localStorage.setItem('openai_api_key', trimmedOpenAIKey);
    } else {
      localStorage.removeItem('openai_api_key');
    }
    
    if (trimmedIdeogramKey) {
      localStorage.setItem('ideogram_api_key', trimmedIdeogramKey);
    } else {
      localStorage.removeItem('ideogram_api_key');
    }
    
    if (trimmedProxyUrl) {
      localStorage.setItem('ideogram_proxy_url', trimmedProxyUrl);
    } else {
      localStorage.removeItem('ideogram_proxy_url');
    }
    
    setSaving(false);
    onKeysUpdated();
    onOpenChange(false);
  };

  const handleCancel = () => {
    setOpenaiKey(localStorage.getItem('openai_api_key') || '');
    setIdeogramKey(localStorage.getItem('ideogram_api_key') || '');
    setIdeogramProxyUrl(localStorage.getItem('ideogram_proxy_url') || '');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>API Settings</DialogTitle>
          <DialogDescription>
            Configure your API keys for OpenAI and Ideogram services.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="openai-key">OpenAI API Key</Label>
            <div className="relative">
              <Input
                id="openai-key"
                type={showOpenaiKey ? "text" : "password"}
                placeholder="sk-proj-..."
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
          </div>
          
          <div className="grid gap-2">
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
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="ideogram-proxy">Ideogram Proxy URL (Optional)</Label>
            <Input
              id="ideogram-proxy"
              type="text"
              placeholder="https://your-proxy.workers.dev"
              value={ideogramProxyUrl}
              onChange={(e) => setIdeogramProxyUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Deploy a CORS proxy to bypass browser restrictions. Leave empty for direct API calls.
            </p>
          </div>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Keys are stored locally in your browser. Get your keys from{" "}
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">
                OpenAI
              </a>{" "}
              and{" "}
              <a href="https://ideogram.ai/api" target="_blank" rel="noopener noreferrer" className="underline">
                Ideogram
              </a>. If Ideogram fails with CORS errors, deploy a proxy using{" "}
              <a href="https://workers.cloudflare.com" target="_blank" rel="noopener noreferrer" className="underline">
                Cloudflare Workers
              </a>.
            </AlertDescription>
          </Alert>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}