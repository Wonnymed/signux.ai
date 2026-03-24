import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Model Configuration ─────────────────────────────────────
// TEST PHASE: All Haiku. Production: Free/Pro/Max=Sonnet, Octopus=Opus

export const MODELS = {
  test: 'claude-haiku-4-5-20251001',
  specialists: {
    free: 'claude-haiku-4-5-20251001',      // PROD: claude-sonnet-4-20250514
    pro: 'claude-haiku-4-5-20251001',       // PROD: claude-sonnet-4-20250514
    max: 'claude-haiku-4-5-20251001',       // PROD: claude-sonnet-4-20250514
    octopus: 'claude-haiku-4-5-20251001',   // PROD: claude-opus-4-20250514
  },
  advisors: 'claude-haiku-4-5-20251001',    // Always Haiku, all tiers
  evaluation: 'claude-haiku-4-5-20251001',  // Always Haiku (cheap eval calls)
} as const;

// Current active model — change this ONE line to switch all specialists
export const DEFAULT_MODEL = MODELS.test;

// Helper: get model for a specific purpose and tier
export function getModel(purpose: 'specialist' | 'advisor' | 'evaluation', tier?: string): string {
  if (purpose === 'advisor') return MODELS.advisors;
  if (purpose === 'evaluation') return MODELS.evaluation;
  if (purpose === 'specialist' && tier) {
    return MODELS.specialists[tier as keyof typeof MODELS.specialists] || DEFAULT_MODEL;
  }
  return DEFAULT_MODEL;
}

// Display helper: shows PRODUCTION model names in UI (not the test model)
export function getDisplayModel(tier?: string): string {
  if (tier === 'octopus') return 'Opus';
  return 'Sonnet';
}

// ── API Client ──────────────────────────────────────────────

export async function callClaude(options: {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  model?: string;
}): Promise<string> {
  const { systemPrompt, userMessage, maxTokens = 1024, model = DEFAULT_MODEL } = options;

  try {
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });
    return response.content[0].type === 'text' ? response.content[0].text : '';
  } catch (error) {
    console.error('Claude API error:', error);
    throw error;
  }
}

export function parseJSON<T>(text: string): T {
  // Strip markdown code fences if present
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}
