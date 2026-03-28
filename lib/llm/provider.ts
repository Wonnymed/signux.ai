/**
 * Model-Agnostic LLM Provider — callClaude → callLLM
 *
 * Supports multiple backends:
 *   - Anthropic (Claude Haiku, Sonnet, Opus)
 *   - OpenAI (GPT-4o, o1) — future
 *   - NAVER HyperCLOVA X — for D2SF pitch
 *
 * Provider selected via OCTUX_LLM_PROVIDER env var.
 * Default: 'anthropic'
 */

export type LLMProvider = 'anthropic' | 'openai' | 'naver';

export type LLMCallOptions = {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  model?: string;
  temperature?: number;
  provider?: LLMProvider;
};

export type LLMResponse = {
  text: string;
  model: string;
  provider: LLMProvider;
  tokens_used?: number;
};

const DEFAULT_PROVIDER = (process.env.OCTUX_LLM_PROVIDER || 'anthropic') as LLMProvider;

/**
 * Unified LLM call. Drop-in replacement for callClaude.
 * Same interface, but routes to the correct provider.
 */
export async function callLLM(options: LLMCallOptions): Promise<string> {
  const provider = options.provider || DEFAULT_PROVIDER;

  switch (provider) {
    case 'anthropic':
      return callAnthropic(options);
    case 'openai':
      return callOpenAI(options);
    case 'naver':
      return callNaver(options);
    default:
      return callAnthropic(options);
  }
}

/**
 * Parse JSON from LLM response (strips markdown fences, handles errors).
 */
export function parseJSON<T>(text: string): T {
  const cleaned = text.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned) as T;
}

// ═══ ANTHROPIC PROVIDER ═══

async function callAnthropic(options: LLMCallOptions): Promise<string> {
  // Delegate to the existing callClaude which has timeout handling, client reuse, etc.
  const { callClaude } = await import('../simulation/claude');
  return callClaude({
    systemPrompt: options.systemPrompt,
    userMessage: options.userMessage,
    maxTokens: options.maxTokens,
    model: options.model,
  });
}

// ═══ OPENAI PROVIDER (future) ═══

async function callOpenAI(_options: LLMCallOptions): Promise<string> {
  throw new Error('OpenAI provider not yet implemented. Set OCTUX_LLM_PROVIDER=anthropic');
}

// ═══ NAVER HYPERCLOVA PROVIDER (for D2SF pitch) ═══

async function callNaver(_options: LLMCallOptions): Promise<string> {
  throw new Error('NAVER HyperCLOVA provider not yet implemented. Set OCTUX_LLM_PROVIDER=anthropic');
}
