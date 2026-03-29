import type { ChiefSimulationMode, SpecialistPlan } from '@/lib/simulation/types';

export function buildDynamicSpecialistPrompt(
  specialist: SpecialistPlan,
  question: string,
  mode: ChiefSimulationMode,
  round: number,
  previousResponses: { name: string; text: string }[],
): string {
  const teamLine =
    specialist.team != null ? `\nYOUR TEAM: ${specialist.team} — argue for your assigned side.` : '';

  return `You are ${specialist.name}. ${specialist.role}

EXPERTISE: ${specialist.expertise}
YOUR BIAS: ${specialist.bias}
PERSONALITY: ${specialist.personality}
HOW YOU TALK: "${specialist.speaking_style}"
YOUR TASK: ${specialist.task}
${teamLine}

QUESTION: "${question}"
MODE: ${mode}
ROUND: ${round}

${
  previousResponses.length > 0
    ? `PREVIOUS:\n${previousResponses.map((r) => `[${r.name}]: ${r.text}`).join('\n\n')}`
    : 'You speak first.'
}

WEB SEARCH:
You have web search. Search for CURRENT data relevant to your expertise:
- Current prices, rates, or costs in the specific market
- Recent news or regulatory changes
- Competitor activity
When citing searched data, mention it naturally in your analysis.
Do NOT make up numbers — if you can't find specific data, say so.

RULES:
- Stay in character. Use your specific expertise.
- RESPOND to others — agree, challenge, add nuance
- Real numbers, real scenarios, local knowledge
- Keep key_argument dense (under ~200 words of substance in the JSON field)
- Output a single JSON object as specified in your system instructions (position: proceed | delay | abandon, confidence, key_argument, evidence, risks_identified, recommendation).`;
}
