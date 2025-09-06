// Universal Contract Implementation
// Separates content from instructions and enforces 4-lane outputs

import { UniversalContract, VisualContract, buildLayoutSpec, buildUniversalContract } from './contracts';
import { openAIService } from './openai';

export interface ContractInputs {
  category: string;
  subcategory: string;
  tone: string;
  tags: string[];
  finalLine?: string;
  visualStyle?: string;
  typographyStyle?: string;
}

// UNIVERSAL CONTRACT: Generate 4-lane text following strict lane rules
export async function generateTextContract(inputs: ContractInputs): Promise<string[]> {
  const lanePrompt = `Generate exactly 4 text options following UNIVERSAL CONTRACT LANES:

LANE 1 (Platform/Prop): Focus on the setting, tool, or stage related to ${inputs.subcategory}
LANE 2 (Audience/Reaction): Focus on how people respond to ${inputs.subcategory}  
LANE 3 (Skill/Ability): Focus on talent, technique, or competence in ${inputs.subcategory}
LANE 4 (Absurdity/Lifestyle): Focus on unexpected, quirky, or exaggerated scenarios

Tags to cover across all 4 options: ${inputs.tags.join(', ')}
Tone: ${inputs.tone}

Return exactly 4 lines, one per lane, separated by newlines only.`;

  try {
    const response = await openAIService.chatJSON([
      { role: 'user', content: lanePrompt }
    ], {
      model: 'gpt-5-mini-2025-08-07',
      max_completion_tokens: 150
      // No temperature for GPT-5
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return [];

    const lines = content.split('\n').filter(line => line.trim()).slice(0, 4);
    return lines.length === 4 ? lines : [];
  } catch (error) {
    console.error('❌ Text contract generation failed:', error);
    return generateCategoryAwareTextFallback(inputs);
  }
}

// UNIVERSAL CONTRACT: Generate 4-lane visuals following strict lane rules
export async function generateVisualContract(inputs: ContractInputs): Promise<VisualContract | null> {
  const visualPrompt = `Generate exactly 4 visual prompts following UNIVERSAL CONTRACT LANES:

LANE 1 (Objects): Scene with objects/props related to ${inputs.subcategory}, NO PEOPLE visible
LANE 2 (Group): Friends/team visible in ${inputs.subcategory} context, candid interactions, people clearly shown
LANE 3 (Solo): One person performing explicit action related to ${inputs.subcategory}
LANE 4 (Creative): Symbolic/graphic arrangement representing ${inputs.subcategory}, artistic composition

Category: ${inputs.category}
Visual Style: ${inputs.visualStyle}

Format response as:
OBJECTS: [scene description]
GROUP: [scene description] 
SOLO: [scene description]
CREATIVE: [scene description]`;

  try {
    const response = await openAIService.chatJSON([
      { role: 'user', content: visualPrompt }
    ], {
      model: 'gpt-5-mini-2025-08-07',
      max_completion_tokens: 500
      // No temperature for GPT-5
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    // Parse the 4-lane response
    const lines = content.split('\n').filter(line => line.trim());
    const contract: VisualContract = {
      lanes: {
        objects: "",
        group: "",
        solo: "",
        creative: ""
      }
    };

    lines.forEach(line => {
      if (line.includes('OBJECTS:')) {
        contract.lanes.objects = line.replace('OBJECTS:', '').trim();
      } else if (line.includes('GROUP:')) {
        contract.lanes.group = line.replace('GROUP:', '').trim();
      } else if (line.includes('SOLO:')) {
        contract.lanes.solo = line.replace('SOLO:', '').trim();
      } else if (line.includes('CREATIVE:')) {
        contract.lanes.creative = line.replace('CREATIVE:', '').trim();
      }
    });

    return contract;
  } catch (error) {
    console.error('❌ Visual contract generation failed:', error);
    return generateCategoryAwareVisualFallback(inputs);
  }
}

// Category-aware text fallbacks (prevents domain contamination)
function generateCategoryAwareTextFallback(inputs: ContractInputs): string[] {
  const category = inputs.category.toLowerCase();
  const subcategory = inputs.subcategory.toLowerCase();

  // Sports fallbacks
  if (category === 'sports') {
    if (subcategory.includes('hockey')) {
      return [
        "When your hockey stick becomes your best friend", // Platform/Prop
        "The crowd goes wild for a perfect slap shot", // Audience/Reaction  
        "Mastering the art of skating backwards while arguing", // Skill/Ability
        "Living that 'missing teeth are a fashion statement' lifestyle" // Absurdity/Lifestyle
      ];
    }
    if (subcategory.includes('basketball')) {
      return [
        "The basketball court is my second home",
        "When everyone stops to watch your three-pointer",
        "Perfecting the art of the no-look pass",
        "That 'air ball but make it look intentional' life"
      ];
    }
  }

  // Celebrations fallbacks  
  if (category === 'celebrations') {
    if (subcategory.includes('birthday')) {
      return [
        "When the birthday cake becomes the star of the show",
        "Everyone singing happy birthday off-key together",
        "Mastering the art of blowing out all candles in one breath",
        "Living that 'birthday calories don't count' lifestyle"
      ];
    }
  }

  // Generic category-aware fallbacks
  return [
    `The tools of ${subcategory} tell their own story`,
    `When everyone appreciates good ${subcategory}`,
    `Mastering the art of ${subcategory}`,
    `Living the ${subcategory} lifestyle to the fullest`
  ];
}

// Category-aware visual fallbacks (prevents domain contamination)
function generateCategoryAwareVisualFallback(inputs: ContractInputs): VisualContract {
  const category = inputs.category.toLowerCase();
  const subcategory = inputs.subcategory.toLowerCase();

  // Sports fallbacks
  if (category === 'sports') {
    if (subcategory.includes('hockey')) {
      return {
        lanes: {
          objects: "Hockey equipment arranged on ice rink - sticks, puck, goal net, helmet on ice surface",
          group: "Hockey teammates practicing together on ice, wearing jerseys, candid training moment",
          solo: "Hockey player taking a powerful slap shot, stick hitting puck, action freeze frame",
          creative: "Artistic composition of hockey arena with dramatic lighting and symbolic ice patterns"
        }
      };
    }
  }

  // Celebrations fallbacks
  if (category === 'celebrations') {
    if (subcategory.includes('birthday')) {
      return {
        lanes: {
          objects: "Birthday cake with lit candles, balloons, wrapped gifts arranged on party table",
          group: "Friends gathered around birthday table, singing together, candid celebration",
          solo: "One person blowing out birthday candles, cheeks puffed, eyes closed in concentration",
          creative: "Stylized birthday scene with floating balloons and magical lighting effects"
        }
      };
    }
  }

  // Generic category-aware fallbacks
  return {
    lanes: {
      objects: `Props and equipment related to ${subcategory}, arranged in scene without people`,
      group: `People engaged in ${subcategory} activity together, candid group interaction`,
      solo: `One person actively performing ${subcategory} action, clear movement visible`,
      creative: `Artistic representation of ${subcategory} with symbolic composition and creative lighting`
    }
  };
}

// Build complete Universal Contract
export async function buildCompleteContract(inputs: ContractInputs): Promise<UniversalContract> {
  const [textLines, visualContract] = await Promise.all([
    generateTextContract(inputs),
    generateVisualContract(inputs)
  ]);

  // Build layout specification
  const layoutSpec = buildLayoutSpec(inputs.typographyStyle || 'negative-space');
  
  // Select best text content
  const textContent = textLines.length > 0 ? textLines[0] : `Default ${inputs.subcategory} content`;
  
  // Build image prompt from visual contract
  const imagePrompt = visualContract ? visualContract.lanes.objects : `Scene related to ${inputs.subcategory}`;
  
  // Category-aware negatives
  const negatives = buildCategoryAwareNegatives(inputs);

  return buildUniversalContract(
    textContent,
    layoutSpec,
    imagePrompt,
    negatives,
    {
      fallbackUsed: textLines.length === 0 || !visualContract,
      reason: textLines.length === 0 ? 'Text fallback used' : !visualContract ? 'Visual fallback used' : 'Generated successfully'
    }
  );
}

// Build category-aware negative prompts (prevents domain contamination)
function buildCategoryAwareNegatives(inputs: ContractInputs): string[] {
  const category = inputs.category.toLowerCase();
  const negatives: string[] = [];

  // Universal negatives
  negatives.push('blurry', 'low quality', 'watermark', 'text overlay', 'logo');

  // Category-specific negatives to prevent contamination
  if (category === 'sports') {
    negatives.push('office desk', 'laptop', 'coffee mug', 'business suit', 'paperwork', 'corporate setting');
  } else if (category === 'celebrations') {
    negatives.push('sports equipment', 'athletic gear', 'gym equipment', 'workout clothes');
  } else if (category === 'daily life' && inputs.subcategory.includes('office')) {
    negatives.push('sports equipment', 'party balloons', 'birthday cake', 'athletic wear');
  }

  return negatives;
}