import { useState } from 'react';
import { AlertTriangle, X, RefreshCw, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { detectExactTextRequest, normalizeTypography, isTextMisspelled } from '@/lib/textUtils';

interface IdeogramSpellingOverlayProps {
  originalPrompt: string;
  generatedImageUrl?: string;
  onRegenerate: () => void;
  onDismiss: () => void;
  modelUsed: string;
  showSpellingGuarantee?: boolean;
  isV3Unavailable?: boolean;
  onUseExactTextOverlay?: () => void;
}

export function IdeogramSpellingOverlay({
  originalPrompt,
  generatedImageUrl,
  onRegenerate,
  onDismiss,
  modelUsed,
  showSpellingGuarantee = false,
  isV3Unavailable = false,
  onUseExactTextOverlay
}: IdeogramSpellingOverlayProps) {
  const [dismissed, setDismissed] = useState(false);
  
  if (dismissed) return null;

  const { isExactText, extractedText } = detectExactTextRequest(originalPrompt);
  
  // Only show for exact text requests, when spelling guarantee is enabled, or when V3 is unavailable
  if (!isExactText && !showSpellingGuarantee && !isV3Unavailable) return null;

  const isV2Fallback = modelUsed.includes('V_2A_TURBO') || modelUsed.includes('fallback');
  
  const handleDismiss = () => {
    setDismissed(true);
    onDismiss();
  };

  return (
    <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          
          <div className="flex-1 space-y-2">
            {isV2Fallback ? (
              <div>
                <h4 className="font-medium text-amber-800 dark:text-amber-200">
                  Text Quality Notice
                </h4>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  V3 model temporarily unavailable. Using V2A_TURBO may affect text rendering quality.
                  {isExactText && (
                    <span className="block mt-1">
                      Expected text: <strong>"{extractedText}"</strong>
                    </span>
                  )}
                </p>
              </div>
            ) : (
              <div>
                <h4 className="font-medium text-amber-800 dark:text-amber-200">
                  Spelling Guarantee Active
                </h4>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Using V3 model for enhanced text rendering.
                  {isExactText && (
                    <span className="block mt-1">
                      Target text: <strong>"{extractedText}"</strong>
                    </span>
                  )}
                </p>
              </div>
            )}
            
            <div className="flex items-center gap-2 flex-wrap">
              {!isV3Unavailable && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRegenerate}
                  className="border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/50"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  {isV2Fallback ? 'Retry with V3' : 'Regenerate'}
                </Button>
              )}
              
              {isExactText && onUseExactTextOverlay && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={onUseExactTextOverlay}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <Type className="h-3 w-3 mr-1" />
                  Use Caption Overlay
                </Button>
              )}
              
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200"
              >
                <X className="h-3 w-3 mr-1" />
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}