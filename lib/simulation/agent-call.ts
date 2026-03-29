import { callClaude, callClaudeWithTools, type ToolCallResult } from './claude';
import type { ModelTier } from '@/lib/config/model-tiers';

export type AgentSearchResponse = ToolCallResult;

/**
 * Single entry for agent calls with optional Anthropic web search (tiered max_uses).
 */
export async function callAgentWithSearch(options: {
  model?: string;
  systemPrompt: string;
  userMessage: string;
  agentId: string;
  maxTokens?: number;
  tier?: ModelTier;
  maxSearchUses: number;
  searchContext?: string;
}): Promise<AgentSearchResponse> {
  if (options.maxSearchUses <= 0) {
    const text = await callClaude({
      systemPrompt: options.systemPrompt,
      userMessage: options.userMessage,
      maxTokens: options.maxTokens,
      model: options.model,
      tier: options.tier,
    });
    return { text, searchCitations: [], searchCount: 0 };
  }
  return callClaudeWithTools({
    systemPrompt: options.systemPrompt,
    userMessage: options.userMessage,
    agentId: options.agentId,
    maxTokens: options.maxTokens,
    model: options.model,
    tier: options.tier,
    forceWebSearch: {
      maxUses: options.maxSearchUses,
      searchContext: options.searchContext,
    },
  });
}
