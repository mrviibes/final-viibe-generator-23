import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { generateIdeogramImage, IdeogramAPIError } from "@/lib/ideogramApi";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const TestIdeogram = () => {
  const [isTestingIdeogram, setIsTestingIdeogram] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestIdeogram = async () => {
    setIsTestingIdeogram(true);
    setTestResult(null);
    
    try {
      const result = await generateIdeogramImage({
        prompt: "A simple test image with text 'Hello World'",
        aspect_ratio: "ASPECT_1_1",
        model: "V_3",
        magic_prompt_option: "OFF",
        count: 1
      });

      if (result.success && result.images && result.images.length > 0) {
        setTestResult({
          success: true,
          message: "✅ Ideogram API test successful! Generated 1 image."
        });
      } else {
        setTestResult({
          success: false,
          message: "❌ Ideogram API returned no images"
        });
      }
    } catch (error) {
      console.error('Ideogram test failed:', error);
      if (error instanceof IdeogramAPIError) {
        setTestResult({
          success: false,
          message: `❌ Ideogram API Error: ${error.message}`
        });
      } else {
        setTestResult({
          success: false,
          message: `❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    } finally {
      setIsTestingIdeogram(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleTestIdeogram}
          disabled={isTestingIdeogram}
          className="text-xs"
        >
          {isTestingIdeogram && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
          Test Ideogram
        </Button>
        
        {testResult && (
          <Badge variant={testResult.success ? "default" : "destructive"} className="text-xs">
            {testResult.success ? (
              <CheckCircle className="w-3 h-3 mr-1" />
            ) : (
              <AlertCircle className="w-3 h-3 mr-1" />
            )}
            {testResult.success ? "Working" : "Failed"}
          </Badge>
        )}
      </div>
      
      {testResult && !testResult.success && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {testResult.message}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};