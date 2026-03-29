import type { AgentStreamState, ChiefInterventionUiState } from '@/lib/store/simulation';
import type { SimulationChargeType } from '@/lib/billing/token-costs';
import type { SimulationChatContext } from './types';

function reportSummary(agent: AgentStreamState): string {
  const r = agent.report as Record<string, unknown> | undefined;
  const arg = typeof r?.key_argument === 'string' ? r.key_argument : '';
  const rec = typeof r?.recommendation === 'string' ? r.recommendation : '';
  const parts = [arg, rec].filter(Boolean);
  if (parts.length) return parts.join(' — ');
  return (agent.partialResponse || '').trim().slice(0, 600) || '(No summary)';
}

/** Multi-line memory for post-verdict chat (final report + structured fields). */
export function buildYourResponsesForChat(agent: AgentStreamState | undefined): string[] {
  if (!agent) return [];
  const r = agent.report as Record<string, unknown> | undefined;
  const out: string[] = [];

  if (typeof r?.key_argument === 'string' && r.key_argument.trim()) {
    out.push(`Key argument: ${r.key_argument.trim()}`);
  }
  if (typeof r?.recommendation === 'string' && r.recommendation.trim()) {
    out.push(`Stated recommendation: ${r.recommendation.trim()}`);
  }
  const ev = r?.evidence;
  if (Array.isArray(ev) && ev.length > 0) {
    const bits = ev
      .slice(0, 4)
      .map((x) => (typeof x === 'string' ? x : JSON.stringify(x)))
      .filter(Boolean);
    if (bits.length) out.push(`Evidence / notes: ${bits.join(' · ')}`);
  }
  const risks = r?.risks_identified;
  if (Array.isArray(risks) && risks.length > 0) {
    const bits = risks.slice(0, 4).map((x) => String(x)).filter(Boolean);
    if (bits.length) out.push(`Risks you flagged: ${bits.join('; ')}`);
  }
  const kargs = r?.key_arguments;
  if (Array.isArray(kargs)) {
    kargs.slice(0, 6).forEach((x, i) => {
      if (typeof x === 'string' && x.trim()) out.push(`Debate point ${i + 1}: ${x.trim()}`);
    });
  }
  if (typeof r?.summary === 'string' && r.summary.trim()) {
    out.push(`Summary: ${r.summary.trim().slice(0, 900)}`);
  }

  if (out.length === 0) {
    const fb = reportSummary(agent);
    if (fb && fb !== '(No summary)') out.push(fb);
  }
  return out.slice(0, 14);
}

function verdictConfidenceFromResult(result: unknown): number {
  if (!result || typeof result !== 'object') return 50;
  const p = (result as Record<string, unknown>).probability;
  return typeof p === 'number' && Number.isFinite(p) ? Math.round(p) : 50;
}

function verdictSummaryFromResult(result: unknown): string {
  if (!result || typeof result !== 'object') return 'Verdict unavailable.';
  const o = result as Record<string, unknown>;
  const rec = String(o.recommendation || '');
  const prob = o.probability;
  const one = String(o.one_liner || o.main_risk || '');
  return [
    `Recommendation: ${rec}`,
    typeof prob === 'number' ? `Probability: ${prob}%` : '',
    one ? `Summary: ${one}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildSimulationChatContext(params: {
  question: string;
  mode: SimulationChargeType;
  agents: Map<string, AgentStreamState>;
  activeAgentId: string;
  result: unknown;
  chiefIntervention: ChiefInterventionUiState | null;
  operatorContext?: string;
}): SimulationChatContext {
  const { question, mode, agents, activeAgentId, result, chiefIntervention, operatorContext } = params;

  const your = agents.get(activeAgentId);
  const yourResponses = buildYourResponsesForChat(your);

  const otherResponses: SimulationChatContext['otherResponses'] = [];
  for (const [id, a] of agents) {
    if (id === activeAgentId) continue;
    if (a.status !== 'complete') continue;
    otherResponses.push({
      agentId: id,
      name: a.agent_name || id,
      summary: reportSummary(a),
    });
  }

  const iq =
    chiefIntervention?.phase && chiefIntervention.phase !== 'analyzing'
      ? chiefIntervention.question || null
      : null;
  const ia =
    chiefIntervention?.answer?.trim() ||
    (chiefIntervention?.skipped || chiefIntervention?.timedOut ? '(skipped or timed out)' : null);

  return {
    question,
    mode,
    yourResponses,
    otherResponses,
    interventionQuestion: iq,
    interventionAnswer: ia,
    verdictSummary: verdictSummaryFromResult(result),
    verdictConfidence: verdictConfidenceFromResult(result),
    operatorContext: (operatorContext || '').trim() || 'Not provided.',
  };
}
