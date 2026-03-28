/** Canonical agent ids that have chat personas (client-safe, no server imports). */
const CHAT_AGENT_IDS = new Set([
  'base_rate_archivist',
  'demand_signal_analyst',
  'unit_economics_auditor',
  'regulatory_gatekeeper',
  'competitive_radar',
  'execution_engineer',
  'capital_strategist',
  'scenario_architect',
  'intervention_designer',
  'customer_reality',
  'decision_chair',
]);

const DISPLAY_LOWER_TO_ID: Record<string, string> = {
  'base rate archivist': 'base_rate_archivist',
  'demand signal analyst': 'demand_signal_analyst',
  'unit economics auditor': 'unit_economics_auditor',
  'regulatory gatekeeper': 'regulatory_gatekeeper',
  'competitive radar': 'competitive_radar',
  'execution engineer': 'execution_engineer',
  'capital strategist': 'capital_strategist',
  'scenario architect': 'scenario_architect',
  'intervention designer': 'intervention_designer',
  'customer reality check': 'customer_reality',
  'decision chair': 'decision_chair',
};

/** Map display name or stream id → canonical agent id for chat personas. */
export function resolveAgentChatId(
  agentNameOrId: string,
  streamAgents: Map<string, { agent_id: string; agent_name: string }>,
): string {
  const trimmed = agentNameOrId.trim();
  if (CHAT_AGENT_IDS.has(trimmed)) return trimmed;
  for (const v of streamAgents.values()) {
    if (v.agent_id === trimmed) return v.agent_id;
    if (v.agent_name === trimmed || v.agent_name === agentNameOrId) return v.agent_id;
  }
  const norm = agentNameOrId.toLowerCase().trim();
  const fromDisplay = DISPLAY_LOWER_TO_ID[norm];
  if (fromDisplay) return fromDisplay;
  const slug = norm.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  return slug || trimmed;
}
