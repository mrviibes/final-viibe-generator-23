import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Zap, RotateCcw, Type, AlertTriangle, ExternalLink } from "lucide-react";
import { IdeogramAPIError } from "@/lib/ideogramApi";

interface IdeogramErrorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  error: IdeogramAPIError;
  onRetryWithTurbo?: () => void;
  onShowExactTextOverlay?: () => void;
  onRegularRetry?: () => void;
}

export function IdeogramErrorDialog({
  open,
  onOpenChange,
  error,
  onRetryWithTurbo,
  onShowExactTextOverlay,
  onRegularRetry
}: IdeogramErrorDialogProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetryWithTurbo = async () => {
    if (!onRetryWithTurbo) return;
    setIsRetrying(true);
    try {
      await onRetryWithTurbo();
      onOpenChange(false);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleShowOverlay = () => {
    if (onShowExactTextOverlay) {
      onShowExactTextOverlay();
      onOpenChange(false);
    }
  };

  const handleRegularRetry = async () => {
    if (!onRegularRetry) return;
    setIsRetrying(true);
    try {
      await onRegularRetry();
      onOpenChange(false);
    } finally {
      setIsRetrying(false);
    }
  };

  const getErrorTypeDisplay = () => {
    switch (error.errorType) {
      case 'MISSING_BACKEND_KEY':
        return { color: 'destructive', text: 'Backend Configuration' };
      case 'INVALID_API_KEY':
        return { color: 'destructive', text: 'Authentication Error' };
      case 'RATE_LIMIT':
        return { color: 'secondary', text: 'Rate Limited' };
      case 'V3_UNAVAILABLE':
        return { color: 'secondary', text: 'V3 Unavailable' };
      case 'CONTENT_POLICY':
        return { color: 'destructive', text: 'Content Policy' };
      case 'SERVICE_UNAVAILABLE':
        return { color: 'secondary', text: 'Service Down' };
      default:
        return { color: 'destructive', text: 'Error' };
    }
  };

  const errorDisplay = getErrorTypeDisplay();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Generation Failed
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Badge variant={errorDisplay.color as any} className="text-xs">
              {errorDisplay.text}
            </Badge>
            {error.status && (
              <Badge variant="outline" className="text-xs">
                {error.status}
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertDescription>
              {error.message}
            </AlertDescription>
          </Alert>

          {/* Quick action buttons based on error type */}
          <div className="space-y-2">
            {error.shouldShowExactTextOverlay && (
              <Button
                onClick={handleShowOverlay}
                className="w-full gap-2"
                variant="default"
              >
                <Type className="h-4 w-4" />
                Use Caption Overlay
              </Button>
            )}

            {error.shouldRetryWithTurbo && (
              <Button
                onClick={handleRetryWithTurbo}
                disabled={isRetrying}
                className="w-full gap-2"
                variant="secondary"
              >
                <Zap className="h-4 w-4" />
                {isRetrying ? "Retrying..." : 
                 error.errorType === 'V3_UNAVAILABLE' ? "Retry with Turbo Model" : "Retry with Turbo"}
              </Button>
            )}

            {error.errorType === 'MISSING_BACKEND_KEY' && (
              <Button
                onClick={() => {
                  onOpenChange(false);
                  // Dispatch custom event to open the API key dialog
                  const event = new CustomEvent('showIdeogramKeyDialog');
                  window.dispatchEvent(event);
                }}
                className="w-full gap-2"
                variant="default"
              >
                <ExternalLink className="h-4 w-4" />
                Set Frontend API Key
              </Button>
            )}

            {error.errorType === 'INVALID_API_KEY' && (
              <Button
                onClick={() => {
                  onOpenChange(false);
                  // The user will need to navigate to settings manually
                }}
                className="w-full gap-2"
                variant="outline"
              >
                <ExternalLink className="h-4 w-4" />
                Go to Settings
              </Button>
            )}

            {!error.shouldRetryWithTurbo && !error.shouldShowExactTextOverlay && (
              <Button
                onClick={handleRegularRetry}
                disabled={isRetrying}
                className="w-full gap-2"
                variant="secondary"
              >
                <RotateCcw className="h-4 w-4" />
                {isRetrying ? "Retrying..." : "Try Again"}
              </Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}