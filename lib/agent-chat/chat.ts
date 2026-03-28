/**
 * Post-Sim Agent Drill-Down — MiroFish deep interaction pattern.
 *
 * After a simulation, the user can chat with ANY specific agent.
 * The agent responds IN CHARACTER with full simulation context:
 *   - Its own report from the sim
 *   - Other agents' reports (what was debated)
 *   - The final verdict
 *   - The user's accumulated memory (core + knowledge graph)
 *
 * This transforms the verdict from static → interactive investigation.
 * "Regulatory Gatekeeper, which exact permits do I need?"
 *
 * Ref: MiroFish (#10 — post-sim deep interaction, individual agent chat)
 */

import { supabase } from '../memory/supabase';
import { callClaude } from '../simulation/claude';
import { loadMemoryForSimulation, formatMemoryContext } from '../memory/core-memory';
import { buildAllAgentKnowledge } from '../memory/agent-knowledge';
import { getTopKMemories } from '../memory/recall';

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

export type AgentChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type AgentChatRequest = {
  simulationId: string;
  agentId: string;
  userId: string;
  message: string;
  history: AgentChatMessage[];
};

export type AgentChatResponse = {
  agentId: string;
  agentName: string;
  response: string;
  citations: string[];
};

// ═══════════════════════════════════════════
// AGENT DEFINITIONS — Display names + chat personas
// ═══════════════════════════════════════════

const AGENT_CHAT_PERSONAS: Record<string, { name: string; chatStyle: string }> = {
  base_rate_archivist: {
    name: 'Base Rate Archivist',
    chatStyle: 'You respond with data and statistics. Cite numbers, percentages, and comparable benchmarks. When uncertain, state the confidence level of your estimates.',
  },
  demand_signal_analyst: {
    name: 'Demand Signal Analyst',
    chatStyle: 'You focus on market demand, customer behavior, and growth signals. Reference specific market segments and trends.',
  },
  unit_economics_auditor: {
    name: 'Unit Economics Auditor',
    chatStyle: 'You talk in numbers — margins, costs, breakeven, ROI. Show your math. If the user asks about cost, give specific calculations.',
  },
  regulatory_gatekeeper: {
    name: 'Regulatory Gatekeeper',
    chatStyle: 'You are precise about permits, licenses, timelines, and compliance requirements. Name specific regulations and authorities. Flag what you\'re uncertain about.',
  },
  competitive_radar: {
    name: 'Competitive Radar',
    chatStyle: 'You analyze competitors — their strengths, weaknesses, market position, and what the user can learn from them. Be specific about competitor names and strategies.',
  },
  execution_engineer: {
    name: 'Execution Engineer',
    chatStyle: 'You are practical and action-oriented. Give step-by-step plans with timelines. Focus on what to do FIRST, what can wait, and what resources are needed.',
  },
  capital_strategist: {
    name: 'Capital Strategist',
    chatStyle: 'You think about funding, cash flow, and capital allocation. Discuss burn rate, runway, and funding strategies. Be honest about financial risks.',
  },
  scenario_architect: {
    name: 'Scenario Architect',
    chatStyle: 'You think in scenarios — best case, worst case, most likely. Quantify each scenario. Identify the key variables that determine which scenario plays out.',
  },
  intervention_designer: {
    name: 'Intervention Designer',
    chatStyle: 'You design concrete action plans — what to change, when, and expected impact. Focus on leverage points and quick wins.',
  },
  customer_reality: {
    name: 'Customer Reality Check',
    chatStyle: 'You represent the customer\'s perspective. Challenge assumptions about product-market fit. Ask "would a real customer actually want/pay for this?"',
  },
  decision_chair: {
    name: 'Decision Chair',
    chatStyle: 'You are the orchestrator. You can explain the overall verdict, how agents disagreed, and why the final recommendation was made. You see the big picture.',
  },
};

// ═══════════════════════════════════════════
// buildAgentChatContext() — Full context for agent conversation
// ═══════════════════════════════════════════

export async function buildAgentChatContext(
  simulationId: string,
  agentId: string,
  userId: string,
  userQuestion: string
): Promise<{ systemPrompt: string; simulationContext: string } | null> {
  if (!supabase) return null;

  // Load simulation data
  const { data: sim, error } = await supabase
    .from('simulations')
    .select('question, verdict, debate, citations, created_at')
    .eq('id', simulationId)
    .single();

  if (error || !sim) {
    console.error('AGENT CHAT: Simulation not found:', simulationId);
    return null;
  }

  const persona = AGENT_CHAT_PERSONAS[agentId];
  if (!persona) {
    console.error('AGENT CHAT: Unknown agent:', agentId);
    return null;
  }

  // Extract this agent's report from the debate
  const debate = sim.debate as any;
  let ownReport = 'No report found from this simulation.';
  let otherReports = '';

  if (debate && typeof debate === 'object') {
    const reports = extractAgentReports(debate);

    if (reports[agentId]) {
      const r = reports[agentId];
      ownReport = [
        `Position: ${r.position || 'unknown'}`,
        `Confidence: ${r.confidence || '?'}/10`,
        `Key argument: ${r.key_argument || r.summary || 'none'}`,
        r.evidence ? `Evidence: ${formatList(r.evidence, 3)}` : '',
        r.risks_identified ? `Risks identified: ${formatList(r.risks_identified, 3)}` : '',
        r.data_points ? `Data points: ${formatList(r.data_points, 3)}` : '',
      ].filter(Boolean).join('\n');
    }

    // Other agents' reports (summarized)
    const others = Object.entries(reports)
      .filter(([id]) => id !== agentId && id !== 'decision_chair')
      .map(([id, r]: [string, any]) => {
        const name = AGENT_CHAT_PERSONAS[id]?.name || id;
        return `${name}: ${(r.position || '?').toUpperCase()} (${r.confidence || '?'}/10) — ${(r.key_argument || 'no argument').substring(0, 100)}`;
      });

    if (others.length > 0) {
      otherReports = 'OTHER AGENTS\' POSITIONS:\n' + others.join('\n');
    }
  }

  // Format verdict
  const verdict = sim.verdict as any;
  const verdictText = verdict
    ? `FINAL VERDICT: ${(verdict.recommendation || 'unknown').toUpperCase()} (${verdict.probability || 0}%)
Main risk: ${verdict.main_risk || 'unknown'}
Next action: ${verdict.next_action || 'unknown'}
${verdict.one_liner || ''}`
    : 'No verdict generated.';

  // Load user memory (parallel)
  const [memoryResult, knowledgeResult, recallResult] = await Promise.allSettled([
    loadMemoryForSimulation(userId, userQuestion),
    buildAllAgentKnowledge(userId),
    getTopKMemories(userId, userQuestion, 10),
  ]);

  const memoryText = [
    memoryResult.status === 'fulfilled' && memoryResult.value.isReturningUser
      ? formatMemoryContext(memoryResult.value)
      : '',
    knowledgeResult.status === 'fulfilled'
      ? knowledgeResult.value.get(agentId) || ''
      : '',
    recallResult.status === 'fulfilled' ? recallResult.value : '',
  ].filter(Boolean).join('\n');

  // Build system prompt
  const systemPrompt = `You are the ${persona.name} from Octux AI — a Decision Operating System.

ROLE: ${persona.chatStyle}

You just completed a simulation analyzing the question: "${sim.question}"

YOUR REPORT FROM THIS SIMULATION:
${ownReport}

${otherReports}

${verdictText}

${memoryText}

CONVERSATION RULES:
- Stay IN CHARACTER as the ${persona.name}. Speak from your expertise.
- Reference YOUR analysis from the simulation. Be specific.
- If the user asks about something OUTSIDE your expertise, say so and suggest which agent to ask.
- If you're unsure about a claim, say so explicitly. Don't make up data.
- Be concise. The user already saw the verdict — they want DEEPER answers, not repetition.
- If the user challenges your analysis, engage genuinely. Consider their point. You can change your mind if they raise valid points.`;

  const simulationContext = `This conversation is about the simulation: "${sim.question}" (run on ${new Date(sim.created_at).toLocaleDateString()})`;

  return { systemPrompt, simulationContext };
}

// ═══════════════════════════════════════════
// chatWithAgent() — Handle a single exchange
// ═══════════════════════════════════════════

export async function chatWithAgent(
  request: AgentChatRequest
): Promise<AgentChatResponse> {
  const { simulationId, agentId, userId, message, history } = request;

  const context = await buildAgentChatContext(simulationId, agentId, userId, message);

  if (!context) {
    return {
      agentId,
      agentName: AGENT_CHAT_PERSONAS[agentId]?.name || agentId,
      response: 'I couldn\'t load the simulation data. Please try again.',
      citations: [],
    };
  }

  // Build conversation with history
  const recentHistory = history.slice(-8);
  let userMessage = '';

  if (recentHistory.length > 0) {
    userMessage += 'CONVERSATION SO FAR:\n';
    for (const msg of recentHistory) {
      const prefix = msg.role === 'user' ? 'User' : AGENT_CHAT_PERSONAS[agentId]?.name || 'Agent';
      userMessage += `${prefix}: ${msg.content}\n`;
    }
    userMessage += '\n';
  }

  userMessage += `User: ${message}\n\nRespond as the ${AGENT_CHAT_PERSONAS[agentId]?.name || agentId}. Be specific and reference your simulation analysis.`;

  try {
    const response = await callClaude({
      systemPrompt: context.systemPrompt,
      userMessage,
      maxTokens: 800,
    });

    const citations = extractCitations(response);

    return {
      agentId,
      agentName: AGENT_CHAT_PERSONAS[agentId]?.name || agentId,
      response: response.trim(),
      citations,
    };
  } catch (err) {
    console.error(`AGENT CHAT: Call failed for ${agentId}:`, err);
    return {
      agentId,
      agentName: AGENT_CHAT_PERSONAS[agentId]?.name || agentId,
      response: 'I encountered an error processing your question. Please try again.',
      citations: [],
    };
  }
}

// ═══════════════════════════════════════════
// getAvailableAgents() — List agents with reports
// ═══════════════════════════════════════════

export async function getAvailableAgents(
  simulationId: string
): Promise<{ agentId: string; agentName: string; position: string; confidence: number }[]> {
  if (!supabase) return [];

  const { data: sim } = await supabase
    .from('simulations')
    .select('debate')
    .eq('id', simulationId)
    .single();

  if (!sim || !sim.debate) return [];

  const reports = extractAgentReports(sim.debate as any);
  const agents: { agentId: string; agentName: string; position: string; confidence: number }[] = [];

  for (const [agentId, report] of Object.entries(reports)) {
    const persona = AGENT_CHAT_PERSONAS[agentId];
    if (!persona) continue;

    agents.push({
      agentId,
      agentName: persona.name,
      position: (report as any).position || 'unknown',
      confidence: (report as any).confidence || 0,
    });
  }

  return agents;
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

function extractAgentReports(debate: any): Record<string, any> {
  const reports: Record<string, any> = {};

  // Format 1: { agent_reports: { agentId: report } }
  if (debate.agent_reports && typeof debate.agent_reports === 'object') {
    Object.assign(reports, debate.agent_reports);
    return reports;
  }

  // Format 2: { rounds: [{ agents: { agentId: report } }] }
  if (Array.isArray(debate.rounds)) {
    for (const round of debate.rounds) {
      if (round.agents && typeof round.agents === 'object') {
        for (const [agentId, report] of Object.entries(round.agents)) {
          reports[agentId] = report;
        }
      }
      if (Array.isArray(round.reports)) {
        for (const report of round.reports) {
          if (report.agent_id) {
            reports[report.agent_id] = report;
          }
        }
      }
    }
    return reports;
  }

  // Format 3: debate is directly { agentId: report }
  if (typeof debate === 'object' && !Array.isArray(debate)) {
    for (const [key, value] of Object.entries(debate)) {
      if (value && typeof value === 'object' && ('position' in (value as any) || 'key_argument' in (value as any))) {
        reports[key] = value;
      }
    }
  }

  return reports;
}

function formatList(arr: any[], max: number): string {
  if (!Array.isArray(arr)) return '';
  return arr.slice(0, max).map(item => {
    if (typeof item === 'string') return item;
    return item.description || item.text || item.risk || item.value || JSON.stringify(item);
  }).join('; ');
}

function extractCitations(text: string): string[] {
  const citations: string[] = [];
  const matches = text.match(/\[(\d+)\]/g);
  if (matches) {
    for (const m of matches) {
      if (!citations.includes(m)) citations.push(m);
    }
  }
  return citations;
}
