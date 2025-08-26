import { AlertCircle, Settings } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface ApiKeyBannerProps {
  hasOpenAI: boolean;
  hasIdeogram: boolean;
  onSettingsClick: () => void;
}

export function ApiKeyBanner({ hasOpenAI, hasIdeogram, onSettingsClick }: ApiKeyBannerProps) {
  if (hasOpenAI && hasIdeogram) {
    return null;
  }

  const missingKeys = [];
  if (!hasOpenAI) missingKeys.push("OpenAI");
  if (!hasIdeogram) missingKeys.push("Ideogram");

  return (
    <Alert className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>
          Missing API keys: {missingKeys.join(" and ")}. Set them up to unlock full functionality.
        </span>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onSettingsClick}
          className="ml-4"
        >
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </AlertDescription>
    </Alert>
  );
}