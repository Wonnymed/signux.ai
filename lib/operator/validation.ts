import type { OperatorProfile, OperatorType } from './types';

export interface ValidationResult {
  complete: boolean;
  missing: string[];
  filled: number;
  total: number;
}

function getTotal(type: OperatorType | null): number {
  const base = 6; // name, location, type, risk touch, speed touch, goal
  switch (type) {
    case 'business_owner':
      return base + 3;
    case 'aspiring':
      return base + 3;
    case 'investor':
      return base + 3;
    case 'career':
      return base + 2;
    default:
      return base;
  }
}

/** Light validation: non-empty strings, pills selected, sliders touched. */
export function validateRequired(profile: OperatorProfile | null | undefined): ValidationResult {
  const missing: string[] = [];
  const p = profile;

  if (!p?.name?.trim()) missing.push('name');
  if (!p?.location?.trim()) missing.push('location');
  if (!p?.operatorType) missing.push('type');

  switch (p?.operatorType) {
    case 'business_owner':
      if (!p.industry?.trim()) missing.push('industry');
      if (!p.businessStage?.trim()) missing.push('stage');
      if (!p.currentFocus?.trim()) missing.push('focus');
      break;
    case 'aspiring':
      if (!p.businessIdea?.trim()) missing.push('idea');
      if (!p.stage?.trim()) missing.push('stage');
      if (!p.availableCapital?.trim()) missing.push('capital');
      break;
    case 'investor':
      if (!p.investorType?.trim()) missing.push('investorType');
      if (!p.checkSize?.trim()) missing.push('checkSize');
      if (!p.currentEvaluation?.trim()) missing.push('evaluation');
      break;
    case 'career':
      if (!p.currentRole?.trim()) missing.push('role');
      if (!p.decisionContext?.trim()) missing.push('decision');
      break;
    default:
      break;
  }

  if (!p?._riskTouched) missing.push('risk');
  if (!p?._speedTouched) missing.push('speed');
  if (!p?.goal?.trim()) missing.push('goal');

  const total = getTotal(p?.operatorType ?? null);
  return {
    complete: missing.length === 0,
    missing,
    filled: Math.max(0, total - missing.length),
    total,
  };
}

/** Back-compat export name used by older code paths. */
export function validateRequiredFields(profile: OperatorProfile | null | undefined): ValidationResult {
  return validateRequired(profile);
}
