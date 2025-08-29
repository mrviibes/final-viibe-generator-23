import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AiSettings() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Generator
            </Button>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <h1 className="text-xl font-semibold">AI Settings</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              AI Configuration
            </CardTitle>
            <CardDescription>
              Your AI is configured and ready to use.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">AI Model</p>
                  <p className="text-sm text-muted-foreground">GPT-4.1 (Latest)</p>
                </div>
                <div className="text-green-500">
                  <CheckCircle className="h-5 w-5" />
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Text Generation</p>
                  <p className="text-sm text-muted-foreground">Optimized for quality and speed</p>
                </div>
                <div className="text-green-500">
                  <CheckCircle className="h-5 w-5" />
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Visual Generation</p>
                  <p className="text-sm text-muted-foreground">Enhanced prompts and recommendations</p>
                </div>
                <div className="text-green-500">
                  <CheckCircle className="h-5 w-5" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}