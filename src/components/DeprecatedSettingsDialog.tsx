// This component is deprecated - API keys are now managed server-side
// Keeping file for reference, but functionality is moved to server deployment

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface DeprecatedSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeprecatedSettingsDialog({ open, onOpenChange }: DeprecatedSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>API Configuration Moved</DialogTitle>
          <DialogDescription>
            API keys are now managed securely on the server side.
          </DialogDescription>
        </DialogHeader>
        
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p><strong>Security Update:</strong> API keys are no longer stored in the browser.</p>
              <p>To configure your keys:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Deploy the server from <code>server/</code> folder</li>
                <li>Set <code>OPENAI_API_KEY</code> and <code>IDEOGRAM_API_KEY</code> environment variables</li>
                <li>Set <code>VITE_SERVER_URL</code> to your deployed server URL</li>
              </ol>
              <p className="text-xs text-muted-foreground mt-2">
                See <code>server/DEPLOYMENT.md</code> for detailed instructions.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      </DialogContent>
    </Dialog>
  );
}
