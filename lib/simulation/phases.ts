/**
 * Simulation phase configuration.
 * Maps backend phase names to display names and metadata.
 */

export interface PhaseConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  estimatedDuration: number;
}

export const SIMULATION_PHASES: PhaseConfig[] = [
  {
    id: 'planning',
    name: 'Research Plan',
    description: 'Decomposing your question into sub-tasks',
    icon: 'FileSearch',
    estimatedDuration: 5,
  },
  {
    id: 'opening',
    name: 'Opening Analysis',
    description: 'Agents analyzing in parallel',
    icon: 'Users',
    estimatedDuration: 20,
  },
  {
    id: 'adversarial',
    name: 'Adversarial Debate',
    description: 'Agents challenging each other',
    icon: 'Swords',
    estimatedDuration: 15,
  },
  {
    id: 'convergence',
    name: 'Convergence',
    description: 'Forming final positions',
    icon: 'GitMerge',
    estimatedDuration: 10,
  },
  {
    id: 'verdict',
    name: 'Verdict',
    description: 'Generating Decision Object',
    icon: 'Scale',
    estimatedDuration: 8,
  },
];

/** Map backend phase name → display name */
export const PHASE_NAME_MAP: Record<string, string> = Object.fromEntries(
  SIMULATION_PHASES.map((p) => [p.id, p.name]),
);

/** Total estimated duration in seconds */
export const ESTIMATED_TOTAL_SECONDS = SIMULATION_PHASES.reduce(
  (sum, p) => sum + p.estimatedDuration,
  0,
);

/** Timeout: max wait before declaring error (2x estimated + buffer) */
export const SIMULATION_TIMEOUT_MS = (ESTIMATED_TOTAL_SECONDS * 2 + 30) * 1000;
