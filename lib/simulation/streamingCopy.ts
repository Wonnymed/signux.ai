/**
 * Phase 1.2 — streaming status strings (single source for Deep Simulation UI).
 */

export const SIMULATION_STATUS_LABELS: Record<string, string> = {
  connecting: 'Connecting…',
  planning: 'Planning research…',
  opening: 'Agents analyzing…',
  adversarial: 'Agents debating…',
  converging: 'Forming consensus…',
  verdict: 'Generating verdict…',
};

export function getSimulationStatusLabel(status: string): string {
  return SIMULATION_STATUS_LABELS[status] ?? 'Processing…';
}
