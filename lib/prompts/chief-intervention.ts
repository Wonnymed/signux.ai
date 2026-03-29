import type { ChiefSimulationMode } from '@/lib/simulation/types';
import { getModeSpecificInterventionInstruction } from '@/lib/prompts/phase-instructions';
import { callAgentWithSearch } from '@/lib/simulation/agent-call';
import { getModel } from '@/lib/config/model-tiers';

export type ChiefInterventionQuestion = {
  question: string;
  context: string;
  specialist_who_raised_it: string;
  impact: string;
};

export function buildChiefInterventionSystemPrompt(mode: ChiefSimulationMode): string {
  const modeHint = getModeSpecificInterventionInstruction(mode);
  return `You are the Chief Orchestrator analyzing the first waves of a ${mode} simulation. You have been watching the panel.

Your job: identify the ONE most critical piece of missing information that would dramatically improve the remaining rounds.

${modeHint}

RULES:
- Ask exactly ONE question — not 2, not 3. ONE.
- The question must be SPECIFIC to what was discussed, not generic.
- It must be something only the USER can answer (not a web search).
- Avoid generic questions like "What's your budget?" or "Are you sure?"

Return JSON only (no markdown fences):
{
  "question": "The specific question to ask",
  "context": "1 sentence explaining WHY you're asking (shown to the user)",
  "specialist_who_raised_it": "Name of the specialist whose argument made this necessary (or 'Panel')",
  "impact": "How this answer will change the remaining rounds"
}`;
}

export function buildChiefInterventionUserPayload(params: {
  mode: ChiefSimulationMode;
  question: string;
  operatorContext: string;
  roundsSummary: string;
}): string {
  return `MODE: ${params.mode}
USER QUESTION / DECISION: ${params.question}
USER PROFILE / OPERATOR CONTEXT: ${params.operatorContext || '(none)'}

SPECIALIST OUTPUT SO FAR (truncated):
${params.roundsSummary}

What ONE question should I ask the user right now?
Return JSON only.`;
}

export function parseChiefInterventionJson(raw: string): ChiefInterventionQuestion {
  const cleaned = raw.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
  let o: Record<string, unknown>;
  try {
    o = JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    throw new Error('Chief intervention JSON parse failed');
  }
  const question = String(o.question || '').trim();
  if (!question) throw new Error('Chief intervention missing question');
  return {
    question: question.slice(0, 800),
    context: String(o.context || 'This answer helps specialists calibrate the rest of the simulation.').slice(0, 500),
    specialist_who_raised_it: String(o.specialist_who_raised_it || 'Panel').slice(0, 120),
    impact: String(o.impact || 'Remaining rounds will use this directly.').slice(0, 500),
  };
}

export function fallbackChiefIntervention(mode: ChiefSimulationMode): ChiefInterventionQuestion {
  const fallbacks: Record<ChiefSimulationMode, ChiefInterventionQuestion> = {
    simulate: {
      question:
        'What is the one constraint or resource (time, money, relationships) that specialists have NOT nailed down yet but would change your decision?',
      context: 'Your answer lets the panel stop guessing about your real limits.',
      specialist_who_raised_it: 'Panel',
      impact: 'Later rounds will align recommendations to that constraint.',
    },
    compare: {
      question:
        'Between the two options, what single dimension (cost, speed, risk, scale, quality of life) matters most to you in the next year?',
      context: 'Teams will re-focus their arguments on what you actually optimize for.',
      specialist_who_raised_it: 'Panel',
      impact: 'Rounds 6+ weight evidence on that dimension.',
    },
    stress_test: {
      question:
        'If revenue misses plan for three months straight, do you have emergency funding or a line of credit to draw on?',
      context: 'Every stress angle eventually hits liquidity; we need your real buffer.',
      specialist_who_raised_it: 'Panel',
      impact: 'Attackers will test survival against what you actually have.',
    },
    premortem: {
      question:
        'At the moment the story turns bad, what is your real Plan B — pivot, cut costs, or exit — and have you ever executed something like it before?',
      context: 'Narrators need to know if your contingency is credible or fantasy.',
      specialist_who_raised_it: 'Panel',
      impact: 'The rest of the failure arc will reflect your answer.',
    },
  };
  return fallbacks[mode] || fallbacks.simulate;
}

export async function runChiefInterventionQuestion(params: {
  mode: ChiefSimulationMode;
  question: string;
  operatorContext: string;
  roundsSummary: string;
}): Promise<ChiefInterventionQuestion> {
  try {
    const tool = await callAgentWithSearch({
      model: getModel('chief'),
      systemPrompt: buildChiefInterventionSystemPrompt(params.mode),
      userMessage: buildChiefInterventionUserPayload(params),
      agentId: 'chief_mid_sim_intervention',
      maxTokens: 900,
      tier: 'chief',
      maxSearchUses: 1,
      searchContext:
        'Optional: verify one factual anchor mentioned by the panel (regulation, market stat) to sharpen the user question.',
    });
    return parseChiefInterventionJson(tool.text);
  } catch (e) {
    console.warn('[chief intervention] falling back:', e);
    return fallbackChiefIntervention(params.mode);
  }
}
