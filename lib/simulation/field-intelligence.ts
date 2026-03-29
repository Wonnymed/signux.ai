import { callClaude } from './claude';
import type { AdvisorPersona, AdvisorReport } from '../agents/advisors';
import type { SimulationState } from './state';

// A field scan is a QUICK batch of Haiku advisors focused on a specific angle
export type FieldScan = {
  round: number;
  focus_area: string;               // "market demand", "regulatory", "competition"
  advisors_queried: number;
  insights: FieldInsight[];
  scan_duration_ms: number;
};

export type FieldInsight = {
  advisor_name: string;
  advisor_role: string;
  stakeholder_type: string;
  insight: string;                   // 1 sentence, very specific
  sentiment: 'positive' | 'negative' | 'neutral';
  relevance_to_specialists: string;  // which specialist agent benefits most from this
};

// Select which advisors are relevant for the current round's focus
export function selectRelevantAdvisors(
  personas: AdvisorPersona[],
  focusAgentIds: string[],          // which Sonnet agents are about to analyze
  previouslyQueried: Set<string>     // avoid re-querying same advisors
): AdvisorPersona[] {
  // Map specialist focus areas to stakeholder types
  const agentToStakeholder: Record<string, string[]> = {
    'base_rate_archivist': ['competitor', 'expert'],
    'demand_signal_analyst': ['customer', 'community'],
    'unit_economics_auditor': ['supply_chain', 'indirect'],
    'regulatory_gatekeeper': ['expert', 'community'],
    'competitive_intel': ['competitor', 'customer'],
    'execution_operator': ['supply_chain', 'indirect'],
    'capital_allocator': ['indirect', 'expert'],
    'scenario_planner': ['wildcard', 'expert'],
    'intervention_optimizer': ['customer', 'wildcard'],
    'customer_reality': ['customer', 'community'],
  };

  // Find relevant stakeholder types for the specialists in this round
  const relevantTypes = new Set<string>();
  for (const agentId of focusAgentIds) {
    const types = agentToStakeholder[agentId] || ['customer', 'expert'];
    types.forEach(t => relevantTypes.add(t));
  }

  // Select advisors matching those types, excluding already queried
  const relevant = personas.filter(p =>
    relevantTypes.has(p.stakeholder_type) &&
    !previouslyQueried.has(p.id)
  );

  // Return up to 10 per round (keeps costs low, scans fast)
  return relevant.slice(0, 10);
}

// Run a field scan — quick parallel Haiku calls for ground-level intelligence
export async function runFieldScan(
  question: string,
  advisors: AdvisorPersona[],
  focusArea: string,
  round: number
): Promise<FieldScan> {
  const startTime = Date.now();

  const promises = advisors.map(async (persona): Promise<FieldInsight | null> => {
    try {
      const response = await callClaude({
        systemPrompt: `You are ${persona.name}. ${persona.role}. Give ONE specific fact or observation from your personal experience. Maximum 1 sentence. Be concrete — names, numbers, locations. No generic advice.`,
        userMessage: `Quick question about: "${question}"\nFocus on: ${focusArea}\nYour 1-sentence insight:`,
        maxTokens: 100, // Very short — just 1 sentence
        tier: 'swarm',
      });

      // Parse as simple text, not JSON — faster and cheaper
      const insight = response.trim().replace(/^["']|["']$/g, '');

      return {
        advisor_name: persona.name,
        advisor_role: persona.role,
        stakeholder_type: persona.stakeholder_type,
        insight,
        sentiment: insight.match(/not|fail|risk|concern|difficult|expensive|problem/i) ? 'negative'
          : insight.match(/great|growing|opportunity|strong|popular|demand/i) ? 'positive'
          : 'neutral',
        relevance_to_specialists: focusArea,
      };
    } catch {
      return null;
    }
  });

  const results = await Promise.allSettled(promises);
  const insights = results
    .filter((r): r is PromiseFulfilledResult<FieldInsight | null> => r.status === 'fulfilled')
    .map(r => r.value)
    .filter((r): r is FieldInsight => r !== null);

  return {
    round,
    focus_area: focusArea,
    advisors_queried: advisors.length,
    insights,
    scan_duration_ms: Date.now() - startTime,
  };
}

// Format field intelligence for injection into Sonnet specialist context
export function formatFieldIntelligence(scans: FieldScan[]): string {
  if (scans.length === 0) return '';

  const allInsights = scans.flatMap(s => s.insights);
  if (allInsights.length === 0) return '';

  const positive = allInsights.filter(i => i.sentiment === 'positive');
  const negative = allInsights.filter(i => i.sentiment === 'negative');
  const neutral = allInsights.filter(i => i.sentiment === 'neutral');

  let output = `\nFIELD INTELLIGENCE (${allInsights.length} local voices surveyed):`;

  if (positive.length > 0) {
    output += `\n📗 Positive signals (${positive.length}):`;
    positive.slice(0, 5).forEach(i => {
      output += `\n  • ${i.advisor_name} (${i.advisor_role}): ${i.insight}`;
    });
  }

  if (negative.length > 0) {
    output += `\n📕 Concerns raised (${negative.length}):`;
    negative.slice(0, 5).forEach(i => {
      output += `\n  • ${i.advisor_name} (${i.advisor_role}): ${i.insight}`;
    });
  }

  if (neutral.length > 0) {
    output += `\n📘 Neutral observations (${neutral.length}):`;
    neutral.slice(0, 3).forEach(i => {
      output += `\n  • ${i.advisor_name} (${i.advisor_role}): ${i.insight}`;
    });
  }

  output += `\n\nUse this field intelligence to ground your analysis in local reality. Reference specific advisor insights when relevant.`;

  return output;
}
