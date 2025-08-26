import { useEffect, useState } from "react";
import { AlertCircle, Server, Wifi, WifiOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { serverHealthService, ServerHealth } from "@/lib/serverHealth";

export function ServerStatusBanner() {
  const [health, setHealth] = useState<ServerHealth | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkHealth = async () => {
    setIsChecking(true);
    try {
      const result = await serverHealthService.checkHealth();
      setHealth(result);
    } catch (error) {
      console.error('Health check error:', error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  // Don't show banner if everything is working
  if (health?.serverReachable && health?.openaiAvailable && health?.ideogramAvailable) {
    return null;
  }

  // Show loading state on first check
  if (!health && isChecking) {
    return (
      <Alert className="mb-6">
        <Server className="h-4 w-4" />
        <AlertDescription>
          Checking server connection...
        </AlertDescription>
      </Alert>
    );
  }

  if (!health?.serverReachable) {
    return (
      <Alert className="mb-6">
        <WifiOff className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <div className="font-medium">Server Unreachable</div>
            <div className="text-sm text-muted-foreground mt-1">
              Cannot connect to API server. Deploy your server and set <code className="px-1 py-0.5 bg-muted rounded text-sm">VITE_SERVER_URL</code> environment variable.
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              See <code>server/DEPLOYMENT.md</code> for setup instructions.
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={checkHealth} disabled={isChecking}>
            {isChecking ? "Checking..." : "Retry"}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const missingServices = [];
  if (!health.openaiAvailable) missingServices.push("OpenAI");
  if (!health.ideogramAvailable) missingServices.push("Ideogram");

  if (missingServices.length === 0) {
    return null;
  }

  return (
    <Alert className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <div>
          <div className="font-medium">Missing API Keys</div>
          <div className="text-sm text-muted-foreground mt-1">
            {missingServices.join(" and ")} API keys not configured on server.
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            Set environment variables in your deployed server or <code>server/.env</code> for local development.
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={checkHealth} disabled={isChecking}>
          {isChecking ? "Checking..." : "Retry"}
        </Button>
      </AlertDescription>
    </Alert>
  );
}