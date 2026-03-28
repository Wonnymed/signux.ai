import type { OperatorProfile } from './types';
import { validateRequired } from './validation';

export function calculateCompleteness(profile: OperatorProfile): { filled: number; total: number; percent: number } {
  const { filled, total } = validateRequired(profile);
  const percent = total > 0 ? Math.round((filled / total) * 100) : 0;
  return { filled, total, percent };
}

export function branchFieldProgress(profile: OperatorProfile): { f: number; t: number } {
  const v = validateRequired(profile);
  return { f: v.filled, t: v.total };
}

export function decisionStyleProgress(profile: OperatorProfile): { f: number; t: number } {
  let f = 0;
  const t = 3;
  if (profile._riskTouched) f++;
  if (profile._speedTouched) f++;
  if (profile.goal.trim()) f++;
  return { f, t };
}

export function goalsProgress(profile: OperatorProfile): { f: number; t: number } {
  const ok = profile.goal.trim() ? 1 : 0;
  return { f: ok, t: 1 };
}
