import type { AgentId, AgentConfig, SimulationPlan } from '@/lib/agents/types';
import type { SimulationChargeType } from '@/lib/billing/token-costs';
import type {
  ChiefSimulationMode,
  OperatorAgentPlan,
  SpecialistChiefDesign,
  SpecialistPlan,
} from '@/lib/simulation/types';

/** Appended to per-round user prompts so models return parseable AgentReport JSON. */
export const CHIEF_DEBATE_JSON_SUFFIX = `

Respond with valid JSON only:
{
  "position": "proceed" | "delay" | "abandon",
  "confidence": 1-10,
  "key_argument": "2-3 sentences with concrete reasons",
  "evidence": ["specific evidence 1", "specific evidence 2"],
  "risks_identified": ["specific risk"],
  "recommendation": "one sentence, specific action"
}`;

const JSON_SUFFIX = CHIEF_DEBATE_JSON_SUFFIX;

export function mapChargeTypeToChiefMode(simMode?: SimulationChargeType): ChiefSimulationMode {
  switch (simMode) {
    case 'compare':
      return 'compare';
    case 'stress_test':
      return 'stress_test';
    case 'premortem':
      return 'premortem';
    default:
      return 'simulate';
  }
}

export function sanitizeChiefId(raw: string): string {
  const s = raw.replace(/[^a-zA-Z0-9_]+/g, '_').replace(/^_|_$/g, '') || 'agent';
  return s.slice(0, 48);
}

export function buildChiefPanelPlan(design: SpecialistChiefDesign): SimulationPlan {
  const tasks = design.specialists.map((s) => ({
    description: s.task || `Debate from perspective: ${s.role}`,
    assigned_agent: `chief_${sanitizeChiefId(s.id)}` as AgentId,
  }));
  if (design.operator) {
    tasks.push({
      description: design.operator.task || 'Ground the debate in your personal constraints and goals',
      assigned_agent: 'chief_operator' as AgentId,
    });
  }
  return { tasks, estimated_rounds: 10 };
}

function specialistJsonPrompt(s: SpecialistPlan, mode: ChiefSimulationMode): string {
  const team = s.team != null ? `\nYou are on TEAM ${s.team} in a structured compare debate.` : '';
  return `You are ${s.name}. ${s.role}
EXPERTISE: ${s.expertise}
BIAS: ${s.bias}
PERSONALITY: ${s.personality}
HOW YOU TALK (example): "${s.speaking_style}"
TASK: ${s.task}
${team}
SIMULATION MODE: ${mode}
Stay in character. Be specific to local markets and real constraints.${JSON_SUFFIX}`;
}

function operatorJsonPrompt(o: OperatorAgentPlan): string {
  return `You are ${o.name} — the real decision-maker (not a consultant).

YOUR SITUATION: ${o.perspective}
YOUR CONSTRAINTS: ${o.constraints}
HOW YOU TALK: ${o.speaking_style}

Speak in first person. Ground experts in YOUR reality. Challenge abstract advice that ignores your budget, timeline, or location.${JSON_SUFFIX}`;
}

export function specialistPlanToAgentConfig(
  s: SpecialistPlan,
  mode: ChiefSimulationMode,
): AgentConfig {
  const id = `chief_${sanitizeChiefId(s.id)}` as AgentId;
  return {
    id,
    name: s.name,
    role: s.role,
    icon: s.team === 'B' ? '◆' : s.team === 'A' ? '◇' : '●',
    color: s.team === 'B' ? '#60a5fa' : s.team === 'A' ? '#e8593c' : '#a3a3a3',
    goal: s.task,
    backstory: `${s.expertise}\nBias: ${s.bias}\n${s.personality}`,
    constraints: ['Stay in character', 'Use the speaking_style voice', 'Cite concrete scenarios'],
    sop: ['Analyze', 'Respond to peers', 'State position clearly'],
    systemPrompt: specialistJsonPrompt(s, mode),
  };
}

export function operatorPlanToAgentConfig(o: OperatorAgentPlan): AgentConfig {
  return {
    id: 'chief_operator' as AgentId,
    name: o.name,
    role: o.role || 'Decision-maker',
    icon: '★',
    color: '#e8593c',
    goal: 'Represent the user’s lived constraints in the debate',
    backstory: `${o.perspective}\nConstraints: ${o.constraints}`,
    constraints: ['First person only', 'No consultant voice'],
    sop: ['React personally', 'Surface deal-breakers', 'Challenge ivory-tower advice'],
    systemPrompt: operatorJsonPrompt(o),
  };
}

/**
 * Branch helpers — full debate remains in engine; used for docs and future splits.
 */
export function describeFlowLabel(mode: ChiefSimulationMode, tier: 'specialist' | 'swarm'): string {
  if (mode === 'compare') {
    return tier === 'specialist' ? 'Compare · 5v5 Sonnet teams' : 'Compare · 500+500 Haiku';
  }
  if (tier === 'swarm') return 'Swarm · 1000 Haiku voices';
  return 'Specialist · 8 Sonnet + Operator';
}
