import type { AgentStreamState, ChiefAssemblyState } from '@/lib/store/simulation';
import type { ChiefPanelSnapshot, SpecialistBias, SpecialistChatPersona } from './types';

function positionToBias(p?: string): SpecialistBias {
  if (p === 'abandon') return 'bearish';
  if (p === 'delay') return 'cautious';
  if (p === 'proceed') return 'bullish';
  return 'neutral';
}

function defaultPersonality(role: string, bias: SpecialistBias): string {
  return `${bias === 'bearish' || bias === 'cautious' ? 'Skeptical, detail-oriented' : 'Constructive, opportunity-focused'} expert focused on ${role.slice(0, 80)}.`;
}

function defaultSpeakingStyle(name: string): string {
  return `Direct and conversational, in first person as ${name.split(' ')[0] || name}.`;
}

/**
 * Build chat persona for an agent row using Chief panel metadata when available.
 */
function panelFrom(
  chiefAssembly: ChiefAssemblyState | null,
  snapshot: ChiefPanelSnapshot | null,
): ChiefPanelSnapshot | null {
  if (chiefAssembly?.phase === 'panel') {
    return {
      specialists: chiefAssembly.specialists,
      operator: chiefAssembly.operator,
    };
  }
  return snapshot;
}

export function buildSpecialistChatPersona(
  agent: AgentStreamState,
  chiefAssembly: ChiefAssemblyState | null,
  chiefPanelSnapshot: ChiefPanelSnapshot | null,
): SpecialistChatPersona {
  const agentId = agent.agent_id;
  const isOperator = agentId === 'chief_operator';

  let name = agent.agent_name || agentId;
  let role = agent.role || 'Specialist';
  let team: string | undefined;

  const panel = panelFrom(chiefAssembly, chiefPanelSnapshot);
  if (panel) {
    if (isOperator && panel.operator) {
      name = panel.operator.name;
      role = 'You (operator voice in the simulation)';
    } else {
      const row = panel.specialists.find((s) => {
        const slug = s.id.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
        return agentId === `chief_${slug}` || s.name === agent.agent_name;
      });
      if (row) {
        name = row.name;
        role = row.role;
        team = row.team;
      }
    }
  }

  const bias = positionToBias(agent.position);
  return {
    id: isOperator ? 'operator' : agentId,
    agentId,
    name,
    role,
    team,
    personality: defaultPersonality(role, bias),
    speaking_style: defaultSpeakingStyle(name),
    bias,
    isOperator,
  };
}
