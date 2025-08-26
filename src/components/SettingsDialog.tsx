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
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showIdeogramKey, setShowIdeogramKey] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    
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
    
    setSaving(false);
    onKeysUpdated();
    onOpenChange(false);
  };

  const handleCancel = () => {
    setOpenaiKey(localStorage.getItem('openai_api_key') || '');
    setIdeogramKey(localStorage.getItem('ideogram_api_key') || '');
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