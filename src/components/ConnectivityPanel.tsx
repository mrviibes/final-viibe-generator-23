import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Settings, Server } from "lucide-react";
import { openAIService } from "@/lib/openai";
import { ideogramDirectService } from "@/lib/ideogramDirect";

interface ConnectivityPanelProps {
  onSettingsClick: () => void;
}

interface ApiStatus {
  hasKey: boolean;
  isWorking: boolean;
  lastError?: string;
  testing: boolean;
}

export function ConnectivityPanel({ onSettingsClick }: ConnectivityPanelProps) {
  const [openaiStatus, setOpenaiStatus] = useState<ApiStatus>({
    hasKey: false,
    isWorking: false,
    testing: false
  });
  
  const [ideogramStatus, setIdeogramStatus] = useState<ApiStatus>({
    hasKey: false,
    isWorking: false,
    testing: false
  });

  const [expanded, setExpanded] = useState(false);

  // Initialize status on mount
  useEffect(() => {
    const checkKeys = () => {
      const hasOpenAI = openAIService.hasApiKey();
      const hasIdeogram = ideogramDirectService.hasApiKey();
      setOpenaiStatus(prev => ({ ...prev, hasKey: hasOpenAI }));
      setIdeogramStatus(prev => ({ ...prev, hasKey: hasIdeogram }));
    };
    checkKeys();
  }, []);

  const testOpenAI = async () => {
    setOpenaiStatus(prev => ({ ...prev, testing: true, lastError: undefined }));
    
    try {
      // Test with a simple chat completion
      const result = await openAIService.chatJSON([
        { role: 'user', content: 'Respond with a simple JSON object containing just {"test": "success"}' }
      ], { max_tokens: 50 });

      const isWorking = result && typeof result === 'object' && !result.error;
      setOpenaiStatus(prev => ({ 
        ...prev, 
        isWorking, 
        testing: false,
        lastError: isWorking ? undefined : 'Unexpected response format'
      }));
    } catch (error) {
      console.error('OpenAI test failed:', error);
      setOpenaiStatus(prev => ({ 
        ...prev, 
        isWorking: false, 
        testing: false,
        lastError: error instanceof Error ? error.message : 'Connection test failed'
      }));
    }
  };

  const testIdeogram = async () => {
    setIdeogramStatus(prev => ({ ...prev, testing: true, lastError: undefined }));
    
    try {
      // Test with a simple generation request
      await ideogramDirectService.generateImage("test", "ASPECT_1_1");
      
      setIdeogramStatus(prev => ({ 
        ...prev, 
        isWorking: true, 
        testing: false,
        lastError: undefined
      }));
    } catch (error) {
      console.error('Ideogram test failed:', error);
      setIdeogramStatus(prev => ({ 
        ...prev, 
        isWorking: false, 
        testing: false,
        lastError: error instanceof Error ? error.message : 'Connection test failed'
      }));
    }
  };

  const getStatusIcon = (status: ApiStatus) => {
    if (status.testing) return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (!status.hasKey) return <XCircle className="h-4 w-4 text-destructive" />;
    if (status.isWorking) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (status.lastError) return <AlertCircle className="h-4 w-4 text-amber-500" />;
    return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
  };

  const getStatusText = (status: ApiStatus) => {
    if (status.testing) return "Testing...";
    if (!status.hasKey) return "Not configured";
    if (status.isWorking) return "Working";
    if (status.lastError) return "Error";
    return "Untested";
  };

  const getStatusVariant = (status: ApiStatus): "default" | "secondary" | "destructive" | "outline" => {
    if (!status.hasKey) return "destructive";
    if (status.isWorking) return "default";
    if (status.lastError) return "secondary";
    return "outline";
  };

  const hasAnyIssues = !openaiStatus.hasKey || !ideogramStatus.hasKey || 
                      openaiStatus.lastError || ideogramStatus.lastError;

  if (!expanded && !hasAnyIssues) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setExpanded(true)}
        className="mb-4"
      >
        <Server className="h-4 w-4 mr-2" />
        API Status (Direct)
      </Button>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Server className="h-5 w-5" />
              API Connectivity (Direct)
            </CardTitle>
            <CardDescription>
              APIs configured locally with hardcoded keys
            </CardDescription>
          </div>
          {expanded && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setExpanded(false)}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              {getStatusIcon(openaiStatus)}
              <div>
                <div className="font-medium">OpenAI (Direct)</div>
                <div className="text-sm text-muted-foreground">
                  Text generation directly from browser
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusVariant(openaiStatus)}>
                {getStatusText(openaiStatus)}
              </Badge>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={testOpenAI}
                disabled={openaiStatus.testing}
              >
                Test
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              {getStatusIcon(ideogramStatus)}
              <div>
                <div className="font-medium">Ideogram (Direct)</div>
                <div className="text-sm text-muted-foreground">
                  Image generation directly from browser
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusVariant(ideogramStatus)}>
                {getStatusText(ideogramStatus)}
              </Badge>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={testIdeogram}
                disabled={ideogramStatus.testing}
              >
                Test
              </Button>
            </div>
          </div>
        </div>

        {(openaiStatus.lastError || ideogramStatus.lastError) && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                {openaiStatus.lastError && (
                  <div><strong>OpenAI:</strong> {openaiStatus.lastError}</div>
                )}
                {ideogramStatus.lastError && (
                  <div>
                    <strong>Ideogram:</strong> {ideogramStatus.lastError}
                    {ideogramStatus.lastError.includes('CORS') && (
                      <div className="text-xs mt-1 text-muted-foreground">
                        💡 Tip: Set proxy URL in Settings → Ideogram Proxy URL to bypass CORS
                      </div>
                    )}
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={onSettingsClick} className="flex-1">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          {ideogramStatus.lastError?.includes('CORS') && (
            <Button variant="secondary" onClick={onSettingsClick} className="flex-1">
              <AlertCircle className="h-4 w-4 mr-2" />
              Fix CORS
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}