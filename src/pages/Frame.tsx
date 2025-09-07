import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { RotateCcw, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FrameInputs {
  category: string;
  subcategory: string;
  tone: string;
  tags: string[];
}

const Frame = () => {
  const [inputs, setInputs] = useState<FrameInputs>({
    category: "",
    subcategory: "",
    tone: "",
    tags: []
  });
  
  const [newTag, setNewTag] = useState("");
  const [devLog, setDevLog] = useState<string[]>([]);

  const addTag = () => {
    if (newTag.trim() && !inputs.tags.includes(newTag.trim())) {
      const updatedInputs = {
        ...inputs,
        tags: [...inputs.tags, newTag.trim()]
      };
      setInputs(updatedInputs);
      setNewTag("");
      logToDevConsole("Added tag: " + newTag.trim());
    }
  };

  const removeTag = (tagToRemove: string) => {
    const updatedInputs = {
      ...inputs,
      tags: inputs.tags.filter(tag => tag !== tagToRemove)
    };
    setInputs(updatedInputs);
    logToDevConsole("Removed tag: " + tagToRemove);
  };

  const logToDevConsole = (message: string) => {
    setDevLog(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleFactoryReset = async () => {
    try {
      // Clear localStorage keys
      const keysToRemove = [
        'openai_api_key',
        'ideogram_api_key', 
        'ideogram_proxy_settings',
        'remember_last_choices',
        'last_selected_text_style',
        'last_selected_text_layout', 
        'last_selected_visual_style',
        'last_text_model',
        'last_visual_model',
        'ai-runtime-overrides'
      ];
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Clear pop culture cache keys
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('pop_culture_cache_')) {
          localStorage.removeItem(key);
        }
      });
      
      // Sign out from Supabase to clear session
      await supabase.auth.signOut();
      
      // Reset form state
      setInputs({
        category: "",
        subcategory: "",
        tone: "",
        tags: []
      });
      setDevLog([]);
      
      toast.success("Factory reset complete - all app data cleared");
      logToDevConsole("Factory reset completed");
      
    } catch (error) {
      console.error('Factory reset error:', error);
      toast.error("Error during factory reset");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Prompt Builder Frame</h1>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <RotateCcw className="w-4 h-4 mr-2" />
                Factory Reset
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Factory Reset</AlertDialogTitle>
                <AlertDialogDescription>
                  This will clear all stored API keys, cached data, and reset the app to its initial state.
                  You will be signed out of any active sessions.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleFactoryReset}>
                  Reset Everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      {/* Main Content - 3 Pane Layout */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
          
          {/* Left Pane - Inputs */}
          <Card>
            <CardHeader>
              <CardTitle>Inputs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={inputs.category} 
                  onValueChange={(value) => {
                    setInputs(prev => ({...prev, category: value}));
                    logToDevConsole(`Category changed to: ${value}`);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="creative">Creative</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="subcategory">Subcategory</Label>
                <Input
                  id="subcategory"
                  value={inputs.subcategory}
                  onChange={(e) => {
                    setInputs(prev => ({...prev, subcategory: e.target.value}));
                    logToDevConsole(`Subcategory: ${e.target.value}`);
                  }}
                  placeholder="Enter subcategory"
                />
              </div>

              <div>
                <Label htmlFor="tone">Tone</Label>
                <Select 
                  value={inputs.tone} 
                  onValueChange={(value) => {
                    setInputs(prev => ({...prev, tone: value}));
                    logToDevConsole(`Tone changed to: ${value}`);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="humorous">Humorous</SelectItem>
                    <SelectItem value="serious">Serious</SelectItem>
                    <SelectItem value="creative">Creative</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Tags</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add tag"
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  />
                  <Button onClick={addTag} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {inputs.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {tag}
                      <button onClick={() => removeTag(tag)}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Dev Log */}
              <div>
                <Label>Dev Log</Label>
                <div className="text-xs text-muted-foreground bg-muted p-2 rounded max-h-24 overflow-y-auto">
                  {devLog.length === 0 ? (
                    <div>No activity yet</div>
                  ) : (
                    devLog.map((log, index) => (
                      <div key={index}>{log}</div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Middle Pane - Workbench */}
          <Card>
            <CardHeader>
              <CardTitle>Prompt Workbench</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Text Lines</h3>
                <div className="bg-muted p-4 rounded text-center text-muted-foreground">
                  No AI wired yet
                  <br />
                  <span className="text-xs">
                    TODO: Add your prompt builder here
                    <br />
                    Extension point: src/core/prompts/textLines.ts
                  </span>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-2">Visual Prompts</h3>
                <div className="bg-muted p-4 rounded text-center text-muted-foreground">
                  No AI wired yet
                  <br />
                  <span className="text-xs">
                    TODO: Add your visual generator here
                    <br />
                    Extension point: src/core/prompts/visuals.ts
                  </span>
                </div>
              </div>

              <Separator />

              <Button className="w-full" disabled>
                Generate (Connect AI First)
              </Button>
            </CardContent>
          </Card>

          {/* Right Pane - Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Current State</h3>
                  <div className="bg-muted p-3 rounded text-sm">
                    <div><strong>Category:</strong> {inputs.category || "Not set"}</div>
                    <div><strong>Subcategory:</strong> {inputs.subcategory || "Not set"}</div>
                    <div><strong>Tone:</strong> {inputs.tone || "Not set"}</div>
                    <div><strong>Tags:</strong> {inputs.tags.length > 0 ? inputs.tags.join(", ") : "None"}</div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">Output Preview</h3>
                  <div className="bg-muted p-4 rounded text-center text-muted-foreground">
                    Generated content will appear here
                    <br />
                    <span className="text-xs">
                      No timers, no model labels, no background calls
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Frame;