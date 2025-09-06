// Stubbed visual validators - returns static responses when AI is disabled
export function validateCategoryAnchors() {
  return true;
}

export function validateDomainGuards() {
  return true;
}

export function validateOptions() {
  return [
    {
      title: "Frame Mode Validated Option",
      description: "Static validated option",
      reasoning: "AI disabled",
      prompt: "Frame mode: Visual validation disabled"
    }
  ];
}