import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RotateCcw, Settings, AlertTriangle, Lock, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { isAdmin, setAdminSession, clearAdminSession } from "@/lib/adminGate";
import { 
  getRuntimeOverrides, 
  setRuntimeOverrides, 
  clearRuntimeOverrides,
  AVAILABLE_MODELS,
  MODEL_DISPLAY_NAMES,
  type AIRuntimeOverrides
} from "@/vibe-ai.config";

export default function AiSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [overrides, setOverrides] = useState<AIRuntimeOverrides>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  useEffect(() => {
    const adminAuth = isAdmin();
    setIsAuthenticated(adminAuth);
    if (adminAuth) {
      const current = getRuntimeOverrides();
      setOverrides(current);
    }
  }, []);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPin = import.meta.env.VITE_ADMIN_PIN || "admin2025";
    
    if (pinInput === correctPin) {
      setAdminSession();
      setIsAuthenticated(true);
      setPinError("");
      const current = getRuntimeOverrides();
      setOverrides(current);
      toast({
        title: "Admin Access Granted",
        description: "Welcome to the admin settings panel."
      });
    } else {
      setPinError("Invalid PIN. Access denied.");
      setPinInput("");
    }
  };

  const handleSignOut = () => {
    clearAdminSession();
    setIsAuthenticated(false);
    navigate("/");
  };

  const updateOverride = (key: keyof AIRuntimeOverrides, value: any) => {
    const newOverrides = { ...overrides, [key]: value };
    setOverrides(newOverrides);
    setHasChanges(true);
  };

  const saveChanges = () => {
    setRuntimeOverrides(overrides);
    setHasChanges(false);
    toast({
      title: "Settings Saved",
      description: "Admin configuration has been updated successfully."
    });
  };

  const resetToDefaults = () => {
    clearRuntimeOverrides();
    const defaults = getRuntimeOverrides(); // Gets the forced defaults
    setOverrides(defaults);
    setHasChanges(false);
    toast({
      title: "Settings Reset",
      description: "All settings have been reset to system defaults."
    });
  };

  const discardChanges = () => {
    const current = getRuntimeOverrides();
    setOverrides(current);
    setHasChanges(false);
  };

  // PIN entry form for non-admin users
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Shield className="h-12 w-12 text-primary" />
            </div>
            <CardTitle>Admin Access Required</CardTitle>
            <CardDescription>
              Enter your admin PIN to access AI settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pin">Admin PIN</Label>
                <Input
                  id="pin"
                  type="password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Enter PIN"
                  className={pinError ? "border-destructive" : ""}
                />
                {pinError && (
                  <p className="text-sm text-destructive">{pinError}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Access Settings
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate("/")}>
                  Back
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin settings interface
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
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
                <h1 className="text-xl font-semibold">Admin Settings</h1>
                <Badge variant="secondary" className="gap-1">
                  <Lock className="h-3 w-3" />
                  Admin Only
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {hasChanges && (
                <>
                  <Button variant="outline" size="sm" onClick={discardChanges}>
                    Discard
                  </Button>
                  <Button size="sm" onClick={saveChanges}>
                    Save Changes
                  </Button>
                </>
              )}
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid gap-6">

          {/* Locked Customer Settings */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Customer Settings (Locked)
              </CardTitle>
              <CardDescription>
                These settings are locked for all customers and cannot be changed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Spellcheck</p>
                  <p className="text-sm text-muted-foreground">Always enabled for all users</p>
                </div>
                <Badge variant="secondary">Always ON</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Image Model</p>
                  <p className="text-sm text-muted-foreground">Locked to Ideogram V3</p>
                </div>
                <Badge variant="secondary">V3 Only</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Text Model</p>
                  <p className="text-sm text-muted-foreground">Locked to GPT-4.1 (2025-04-14)</p>
                </div>
                <Badge variant="secondary">GPT-4.1</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Admin Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Admin Controls</CardTitle>
              <CardDescription>
                Advanced settings available only to administrators.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Strict Model Lock</Label>
                  <p className="text-sm text-muted-foreground">
                    When ON, all users are locked to GPT-4.1. When OFF, admin can select different models.
                  </p>
                </div>
                <Switch
                  checked={overrides.strictModelEnabled ?? true}
                  onCheckedChange={(checked) => updateOverride('strictModelEnabled', checked)}
                />
              </div>

              {!overrides.strictModelEnabled && (
                <div className="space-y-2">
                  <Label>Admin Text Model Override</Label>
                  <Select
                    value={overrides.model || 'gpt-4.1-2025-04-14'}
                    onValueChange={(value) => updateOverride('model', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_MODELS.map((model) => (
                        <SelectItem key={model} value={model}>
                          {MODEL_DISPLAY_NAMES[model] || model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Only applies when Strict Model Lock is OFF. Customers still see GPT-4.1.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Admin Image Model Override</Label>
                  <p className="text-sm text-muted-foreground">
                    Admin can switch to Turbo for testing. Customers remain locked to V3.
                  </p>
                </div>
                <Select
                  value={overrides.ideogramModel || 'V_3'}
                  onValueChange={(value) => updateOverride('ideogramModel', value as 'V_2A_TURBO' | 'V_3')}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="V_3">V3 (Default)</SelectItem>
                    <SelectItem value="V_2A_TURBO">Turbo (Testing)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Reset Settings */}
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Reset All Settings
              </CardTitle>
              <CardDescription>
                Clear all admin overrides and return to system defaults.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={resetToDefaults}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset to System Defaults
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}