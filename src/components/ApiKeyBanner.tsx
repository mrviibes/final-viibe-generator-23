import { AlertCircle, Settings } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface ApiKeyBannerProps {
  hasOpenAI: boolean;
  hasIdeogram: boolean;
}

export function ApiKeyBanner({ hasOpenAI, hasIdeogram }: ApiKeyBannerProps) {
  if (hasOpenAI && hasIdeogram) {
    return null;
  }

  const missingKeys = [];
  if (!hasOpenAI) missingKeys.push("OpenAI");
  if (!hasIdeogram) missingKeys.push("Ideogram");

  return (
    <Alert className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        Missing API keys: {missingKeys.join(" and ")}. 
        Edit <code className="px-1 py-0.5 bg-muted rounded text-sm">src/config/secrets.ts</code> to configure your keys.
        <br />
        <span className="text-sm text-muted-foreground mt-1 block">
          See <code>docs/cloudflare-worker-setup.md</code> for complete setup instructions.
        </span>
      </AlertDescription>
    </Alert>
  );
}