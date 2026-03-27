/**
 * Phase 1 — Deep Simulation copy (single source): status line, inline labels, actions.
 */

export const SIMULATION_STATUS_LABELS: Record<string, string> = {
  connecting: 'Connecting…',
  planning: 'Planning research…',
  opening: 'Agents analyzing…',
  adversarial: 'Agents debating…',
  converging: 'Forming consensus…',
  verdict: 'Generating verdict…',
};

/** Row headers, badges, and post-run actions (ellipsis aligned with status labels). */
export const SIMULATION_UI_LABELS = {
  agentAnalyzing: 'Analyzing…',
  simulationComplete: 'Complete',
  replayPreparing: 'Preparing…',
  forkRunning: 'Forking…',
  shareCopied: 'Copied!',
} as const;

export function getSimulationStatusLabel(status: string): string {
  return SIMULATION_STATUS_LABELS[status] ?? 'Processing…';
}

export function formatAgentThinking(agentName: string): string {
  return `${agentName} is thinking…`;
}
