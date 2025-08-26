import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Settings } from "lucide-react";
import { hasOpenAIKey, hasIdeogramKey, checkRateLimit } from "@/lib/keyManager";
import { openAIService } from "@/lib/openai";
import { testProxyConnection } from "@/lib/ideogramApi";

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
    hasKey: hasOpenAIKey(),
    isWorking: false,
    testing: false
  });
  
  const [ideogramStatus, setIdeogramStatus] = useState<ApiStatus>({
    hasKey: hasIdeogramKey(),
    isWorking: false,
    testing: false
  });

  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setOpenaiStatus(prev => ({ ...prev, hasKey: hasOpenAIKey() }));
    setIdeogramStatus(prev => ({ ...prev, hasKey: hasIdeogramKey() }));
  }, []);

  const testOpenAI = async () => {
    if (!hasOpenAIKey()) return;
    
    setOpenaiStatus(prev => ({ ...prev, testing: true, lastError: undefined }));
    
    try {
      if (!checkRateLimit('openai')) {
        throw new Error('Rate limited - wait 3 seconds');
      }
      
      const result = await openAIService.chatJSON([
        { role: 'user', content: 'Reply with exactly: {"test": "success"}' }
      ]);
      
      if (result?.test === 'success') {
        setOpenaiStatus(prev => ({ ...prev, isWorking: true, testing: false }));
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error: any) {
      setOpenaiStatus(prev => ({ 
        ...prev, 
        isWorking: false, 
        testing: false,
        lastError: error.message || 'Test failed'
      }));
    }
  };

  const testIdeogram = async () => {
    if (!hasIdeogramKey()) return;
    
    setIdeogramStatus(prev => ({ ...prev, testing: true, lastError: undefined }));
    
    try {
      if (!checkRateLimit('ideogram')) {
        throw new Error('Rate limited - wait 3 seconds');
      }
      
      const result = await testProxyConnection('direct');
      if (result) {
        setIdeogramStatus(prev => ({ ...prev, isWorking: true, testing: false }));
      } else {
        throw new Error('Connection test failed');
      }
    } catch (error: any) {
      setIdeogramStatus(prev => ({ 
        ...prev, 
        isWorking: false, 
        testing: false,
        lastError: error.message || 'Test failed'
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
    if (!status.hasKey) return "No API key";
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
        <Settings className="h-4 w-4 mr-2" />
        API Status
      </Button>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">API Connectivity</CardTitle>
            <CardDescription>
              Check your API key status and connectivity
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
                <div className="font-medium">OpenAI</div>
                <div className="text-sm text-muted-foreground">
                  Text generation
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusVariant(openaiStatus)}>
                {getStatusText(openaiStatus)}
              </Badge>
              {openaiStatus.hasKey && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={testOpenAI}
                  disabled={openaiStatus.testing}
                >
                  Test
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              {getStatusIcon(ideogramStatus)}
              <div>
                <div className="font-medium">Ideogram</div>
                <div className="text-sm text-muted-foreground">
                  Image generation
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusVariant(ideogramStatus)}>
                {getStatusText(ideogramStatus)}
              </Badge>
              {ideogramStatus.hasKey && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={testIdeogram}
                  disabled={ideogramStatus.testing}
                >
                  Test
                </Button>
              )}
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
                  <div><strong>Ideogram:</strong> {ideogramStatus.lastError}</div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={onSettingsClick} className="flex-1">
            <Settings className="h-4 w-4 mr-2" />
            Configure Keys
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}