import type { ChiefSimulationMode } from '@/lib/simulation/types';
import type { SimulationChargeType } from '@/lib/billing/token-costs';

function toChiefMode(simMode: SimulationChargeType | null | undefined): ChiefSimulationMode {
  if (simMode === 'compare') return 'compare';
  if (simMode === 'stress_test') return 'stress_test';
  if (simMode === 'premortem') return 'premortem';
  return 'simulate';
}

/**
 * Human-readable phase for the dashboard canvas (engine rounds 1–10).
 * `interventionActive` = Chief is waiting on user mid-sim input.
 */
export function getPhaseLabelForEngineRound(
  simMode: SimulationChargeType | null | undefined,
  engineRound: number,
  interventionActive: boolean,
): string {
  if (interventionActive) return 'Chief check-in';

  const mode = toChiefMode(simMode);

  if (engineRound <= 2) {
    switch (mode) {
      case 'simulate':
        return 'Opening takes';
      case 'compare':
        return 'Opening arguments';
      case 'stress_test':
        return 'Surface scan';
      case 'premortem':
        return 'The beginning';
      default:
        return 'Opening';
    }
  }

  if (engineRound <= 5) {
    switch (mode) {
      case 'simulate':
        return 'Deep analysis';
      case 'compare':
        return 'Cross-examination';
      case 'stress_test':
        return 'Deep probing';
      case 'premortem':
        return 'The decline';
      default:
        return 'Analysis';
    }
  }

  if (engineRound <= 8) {
    switch (mode) {
      case 'simulate':
        return 'Targeted analysis';
      case 'compare':
        return 'Focused rebuttal';
      case 'stress_test':
        return 'Recovery testing';
      case 'premortem':
        return 'The collapse';
      default:
        return 'Deep dive';
    }
  }

  switch (mode) {
    case 'simulate':
      return 'Convergence';
    case 'compare':
      return 'Closing statements';
    case 'stress_test':
      return 'Final assessment';
    case 'premortem':
      return 'The aftermath';
    default:
      return 'Wrap-up';
  }
}
