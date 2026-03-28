import type { OperatorProfile, OperatorType } from './types';

export function emptyOperatorProfile(): OperatorProfile {
  return {
    name: '',
    location: '',
    operatorType: null,
    industry: '',
    businessStage: '',
    currentFocus: '',
    businessIdea: '',
    stage: '',
    availableCapital: '',
    investorType: '',
    checkSize: '',
    currentEvaluation: '',
    currentRole: '',
    decisionContext: '',
    riskTolerance: 5,
    decisionSpeed: 5,
    _riskTouched: false,
    _speedTouched: false,
    goal: '',
  };
}

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

const VALID_TYPES: OperatorType[] = ['business_owner', 'aspiring', 'investor', 'career'];

/** Merge JSON from DB; maps legacy nested shapes when present. */
export function normalizeOperatorProfile(raw: unknown): OperatorProfile {
  const base = emptyOperatorProfile();
  if (!isObj(raw)) return base;

  const mergeStr = (v: unknown) => (typeof v === 'string' ? v : '');
  const mergeNum = (v: unknown, d: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(10, Math.max(1, v)) : d;

  base.name = mergeStr(raw.name);
  base.location = mergeStr(raw.location);
  const ot = raw.operatorType;
  base.operatorType = VALID_TYPES.includes(ot as OperatorType) ? (ot as OperatorType) : null;

  base.industry = mergeStr(raw.industry);
  base.businessStage = mergeStr(raw.businessStage);
  base.currentFocus = mergeStr(raw.currentFocus);
  base.businessIdea = mergeStr(raw.businessIdea);
  base.stage = mergeStr(raw.stage);
  base.availableCapital = mergeStr(raw.availableCapital);
  base.investorType = mergeStr(raw.investorType);
  base.checkSize = mergeStr(raw.checkSize);
  base.currentEvaluation = mergeStr(raw.currentEvaluation);
  base.currentRole = mergeStr(raw.currentRole);
  base.decisionContext = mergeStr(raw.decisionContext);
  base.goal = mergeStr(raw.goal);

  if (!base.goal) {
    base.goal =
      mergeStr(raw.sixMonthGoal) ||
      mergeStr(raw.oneYearGoal) ||
      mergeStr(raw.primaryGoal);
  }

  base.riskTolerance = mergeNum(raw.riskTolerance, 5);
  base.decisionSpeed = mergeNum(raw.decisionSpeed, 5);
  base._riskTouched = raw._riskTouched === true;
  base._speedTouched = raw._speedTouched === true;

  // Legacy nested migration
  if (isObj(raw.businessOwner)) {
    const bo = raw.businessOwner;
    if (!base.industry) base.industry = mergeStr(bo.industry);
    if (!base.businessStage) base.businessStage = mergeStr(bo.businessStage);
    if (!base.currentFocus) base.currentFocus = mergeStr(bo.currentFocus);
  }
  if (isObj(raw.aspiring)) {
    const a = raw.aspiring;
    if (!base.businessIdea) base.businessIdea = mergeStr(a.businessIdea);
    if (!base.stage) base.stage = mergeStr(a.stage);
    if (!base.availableCapital) base.availableCapital = mergeStr(a.availableCapital);
  }
  if (isObj(raw.investor)) {
    const inv = raw.investor;
    if (!base.investorType) base.investorType = mergeStr(inv.investorType);
    if (!base.checkSize) base.checkSize = mergeStr(inv.checkSize);
    if (!base.currentEvaluation) base.currentEvaluation = mergeStr(inv.currentEvaluation);
  }
  if (isObj(raw.career)) {
    const c = raw.career;
    if (!base.currentRole) base.currentRole = mergeStr(c.currentRole);
    if (!base.decisionContext) base.decisionContext = mergeStr(c.decisionContext);
  }

  return base;
}
