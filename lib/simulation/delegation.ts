// ── CrewAI #7 Delegation Pattern ──────────────────────────────
// Agents can REQUEST data from other agents during analysis.
// The Chair routes these requests automatically, enriching analysis.

import { callClaude } from './claude';
import type { AgentReport } from '../agents/types';
import type { SimulationState } from './state';
import { getAgentById } from '../agents/prompts';
import type { AgentId } from '../agents/types';

// ── Types ──────────────────────────────────────────────────

export type DelegationRequest = {
  requesting_agent: string;       // who needs data
  target_agent: string;           // who has it
  question: string;               // what they need
  urgency: 'blocking' | 'helpful';  // blocking = can't proceed without it
};

export type DelegationResponse = {
  request: DelegationRequest;
  response: string;               // the target agent's answer
  used_in_analysis: boolean;      // did the requesting agent incorporate it?
};

// ── Detection ──────────────────────────────────────────────

// After an agent produces their initial report, check if they flagged data needs
export function detectDelegationNeeds(report: AgentReport): DelegationRequest[] {
  const requests: DelegationRequest[] = [];

  // Check if agent's key_argument or evidence mentions needing data from another
  const text = `${report.key_argument} ${(report.evidence || []).join(' ')} ${(report.risks_identified || []).join(' ')}`;

  // Pattern: "I lack data on X" or "would need Y to give better answer" or "without Z data"
  const needPatterns = [
    /I lack data on (.+?)(?:\.|,|$)/i,
    /would need (.+?) to give/i,
    /without (.+?) data/i,
    /need (.+?) from (.+?) to/i,
    /if (.+?) could provide/i,
    /requires input from (.+?)(?:\.|,|$)/i,
  ];

  for (const pattern of needPatterns) {
    const match = text.match(pattern);
    if (match) {
      // Try to identify which agent could answer
      const need = match[1] || match[0];
      const targetAgent = identifyBestAgent(need);
      if (targetAgent && targetAgent !== report.agent_id) {
        requests.push({
          requesting_agent: report.agent_id,
          target_agent: targetAgent,
          question: `Provide specific data on: ${need.trim()}`,
          urgency: text.toLowerCase().includes('cannot') || text.toLowerCase().includes('blocking') ? 'blocking' : 'helpful',
        });
      }
    }
  }

  return requests;
}

// ── Agent Mapping ──────────────────────────────────────────

// Map data needs to the most relevant agent
function identifyBestAgent(need: string): string | null {
  const needLower = need.toLowerCase();

  const agentMapping: Record<string, string[]> = {
    'base_rate_archivist': ['failure rate', 'success rate', 'historical', 'base rate', 'statistics', 'precedent', 'benchmark'],
    'demand_signal_analyst': ['market size', 'demand', 'customer', 'growth rate', 'trend', 'market data', 'consumer'],
    'unit_economics_auditor': ['margin', 'cost', 'revenue', 'breakeven', 'cac', 'ltv', 'unit economics', 'pricing', 'financial'],
    'regulatory_gatekeeper': ['permit', 'license', 'regulation', 'compliance', 'legal', 'law', 'regulatory', 'government'],
    'competitive_intel': ['competitor', 'market share', 'positioning', 'competitive', 'incumbent', 'alternative'],
    'execution_operator': ['timeline', 'hiring', 'operational', 'supply chain', 'logistics', 'implementation', 'staffing'],
    'capital_allocator': ['funding', 'investment', 'runway', 'capital', 'budget', 'financing', 'opportunity cost'],
    'scenario_planner': ['scenario', 'best case', 'worst case', 'risk', 'assumption', 'contingency', 'what if'],
    'intervention_optimizer': ['leverage', 'priority', 'first step', 'critical path', 'highest impact', 'bottleneck'],
    'customer_reality': ['customer', 'willingness to pay', 'retention', 'product-market fit', 'switching cost', 'user behavior'],
  };

  for (const [agentId, keywords] of Object.entries(agentMapping)) {
    if (keywords.some(kw => needLower.includes(kw))) {
      return agentId;
    }
  }

  return null;
}

// ── Execution ──────────────────────────────────────────────

// Execute a delegation: ask the target agent a specific question
export async function executeDelegation(
  request: DelegationRequest,
  _state: SimulationState,
  question: string,
): Promise<DelegationResponse> {
  let targetAgent;
  try {
    targetAgent = getAgentById(request.target_agent as AgentId);
  } catch {
    return { request, response: 'Target agent not found', used_in_analysis: false };
  }

  const response = await callClaude({
    systemPrompt: `You are ${targetAgent.name}. Another specialist agent needs specific data from your expertise area. Provide a CONCISE, DATA-FOCUSED answer. No fluff — just the specific information requested. Include numbers, percentages, timelines where possible. Maximum 100 words.`,
    userMessage: `Original question being analyzed: "${question}"

${request.requesting_agent} needs the following from you:
"${request.question}"

Provide the specific data or analysis they need. Be concrete.`,
    maxTokens: 256,
  });

  return {
    request,
    response,
    used_in_analysis: true,
  };
}

// ── Batch Processing ───────────────────────────────────────

// Process all delegation requests from a batch of reports
export async function processDelegations(
  reports: AgentReport[],
  state: SimulationState,
  question: string,
): Promise<DelegationResponse[]> {
  const allRequests: DelegationRequest[] = [];

  for (const report of reports) {
    const needs = detectDelegationNeeds(report);
    allRequests.push(...needs);
  }

  if (allRequests.length === 0) return [];

  // Deduplicate: if multiple agents need the same data from the same target, merge
  const uniqueRequests = allRequests.filter((req, i, arr) =>
    arr.findIndex(r => r.target_agent === req.target_agent && r.question === req.question) === i,
  );

  // Limit to max 3 delegations per round to control costs
  const limitedRequests = uniqueRequests.slice(0, 3);

  // Execute all delegations in parallel
  const responses = await Promise.allSettled(
    limitedRequests.map(req => executeDelegation(req, state, question)),
  );

  return responses
    .filter((r): r is PromiseFulfilledResult<DelegationResponse> => r.status === 'fulfilled')
    .map(r => r.value);
}
