export type OperatorType = 'business_owner' | 'aspiring' | 'investor' | 'career';

/**
 * Flat operator profile (light onboarding). Branch fields are filled based on `operatorType`.
 */
export interface OperatorProfile {
  name: string;
  location: string;
  operatorType: OperatorType | null;

  /** Branch A — business owner */
  industry: string;
  businessStage: string;
  currentFocus: string;

  /** Branch B — building / aspiring */
  businessIdea: string;
  /** How far along (aspiring) */
  stage: string;
  availableCapital: string;

  /** Branch C — investor */
  investorType: string;
  checkSize: string;
  currentEvaluation: string;

  /** Branch D — career */
  currentRole: string;
  decisionContext: string;

  riskTolerance: number;
  decisionSpeed: number;
  _riskTouched?: boolean;
  _speedTouched?: boolean;
  /** Primary goal (screen 3) */
  goal: string;
}
