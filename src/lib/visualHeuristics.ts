// Stubbed visual heuristics - returns static responses when AI is disabled
export function analyzeImageryElements() {
  return {
    subject: "Frame mode placeholder",
    background: "Static background",
    style: "Frame style"
  };
}

export function generateHeuristicOptions() {
  return [
    {
      title: "Frame Mode Option 1",
      description: "Static heuristic option",
      reasoning: "AI disabled",
      prompt: "Frame mode: Visual heuristics disabled"
    }
  ];
}