/**
 * Human-in-the-Loop — Mid-simulation user intervention.
 *
 * After Round 4 (deep analysis), the Chair summarizes key assumptions
 * and PAUSES for user input. The user can confirm, correct, or skip.
 *
 * Ref: LangGraph (#2 — interrupt/resume), Dify (#15 — user checkpoint)
 */

import { callClaude } from './claude';

export type HITLCheckpoint = {
  assumptions: string[];
  summary: string;
  agentPositions: { agent: string; position: string; confidence: number }[];
  timestamp: number;
};

export type HITLResponse = {
  action: 'confirm' | 'correct' | 'skip';
  correction?: string;
  timestamp: number;
};

export async function generateCheckpoint(
  question: string,
  agentReports: Map<string, any> | Record<string, any>
): Promise<HITLCheckpoint> {
  const reports: string[] = [];
  const positions: HITLCheckpoint['agentPositions'] = [];

  const entries = agentReports instanceof Map
    ? Array.from(agentReports.entries())
    : Object.entries(agentReports);

  for (const [id, report] of entries) {
    if (id === 'decision_chair') continue;
    const r = report as any;
    reports.push(
      `${id}: ${(r.position || '?').toUpperCase()} (${r.confidence || '?'}/10) — ${(r.key_argument || r.summary || '').substring(0, 150)}`
    );
    positions.push({
      agent: r.agent_name || id,
      position: r.position || 'unknown',
      confidence: r.confidence || 5,
    });
  }

  try {
    const response = await callClaude({
      systemPrompt: `You are the Decision Chair reviewing analysis so far.
Extract the KEY ASSUMPTIONS that agents are making about the user's situation.
These are things the user might want to CORRECT (wrong market, wrong budget, wrong timeline, etc.)

Return ONLY JSON:
{
  "assumptions": ["assumption 1", "assumption 2", "assumption 3"],
  "summary": "One paragraph summarizing the analysis direction so far"
}

Max 5 assumptions. Focus on the ones most likely to be WRONG or INCOMPLETE.
Phrase each assumption as a statement the user can confirm or deny.`,
      userMessage: `QUESTION: "${question}"

AGENT REPORTS SO FAR:
${reports.join('\n\n')}

JSON:`,
      maxTokens: 300,
    });

    const parsed = JSON.parse(response.replace(/```json|```/g, '').trim());

    return {
      assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions.slice(0, 5) : [],
      summary: parsed.summary || 'Analysis in progress.',
      agentPositions: positions,
      timestamp: Date.now(),
    };
  } catch (err) {
    console.error('HITL: generateCheckpoint failed:', err);
    return {
      assumptions: [],
      summary: 'Analysis in progress. Unable to extract assumptions.',
      agentPositions: positions,
      timestamp: Date.now(),
    };
  }
}

export function formatUserCorrection(response: HITLResponse): string {
  if (response.action === 'confirm') {
    return '\n── USER CONFIRMED ──\nThe decision-maker confirmed all assumptions are correct. Proceed with current analysis.\n────────────────────\n';
  }

  if (response.action === 'correct' && response.correction) {
    return `\n── USER CORRECTION (mid-simulation input) ──
The decision-maker provided this correction during the analysis:

"${response.correction}"

IMPORTANT: Adjust your analysis to account for this new information.
Previous assumptions that conflict with this correction should be REVISED.
This correction takes PRIORITY over agent estimates.
──────────────────────────────────────────\n`;
  }

  return '';
}

export const HITL_CONFIG = {
  enabled: true,
  timeoutMs: 60000,
  afterRound: 4,
  minAgentReports: 3,
};
