import type { OperatorProfile, OperatorType } from './types';

const MAX_CONTEXT_CHARS = 500;

export function getTypeLabel(t: OperatorType): string {
  switch (t) {
    case 'business_owner':
      return 'Business owner';
    case 'aspiring':
      return 'Building something';
    case 'career':
      return 'Career decision';
    case 'investor':
      return 'Investor';
    default:
      return 'Unknown';
  }
}

/** Compact operator block for specialist prompts (truncated). */
export function buildOperatorContext(profile: OperatorProfile | null | undefined): string {
  if (!profile || !profile.operatorType) return '';

  let ctx = `\n\nOPERATOR CONTEXT (user profile — adapt your analysis):\n`;
  ctx += `Name: ${profile.name.trim()}, Based in: ${profile.location.trim()}\n`;
  ctx += `Type: ${getTypeLabel(profile.operatorType)}\n`;

  switch (profile.operatorType) {
    case 'business_owner':
      ctx += `Industry: ${profile.industry}, Stage: ${profile.businessStage}\n`;
      if (profile.currentFocus.trim()) ctx += `Focus: ${profile.currentFocus.trim()}\n`;
      break;
    case 'aspiring':
      ctx += `Idea: ${profile.businessIdea.trim()}\n`;
      ctx += `Stage: ${profile.stage}, Capital: ${profile.availableCapital}\n`;
      break;
    case 'investor':
      ctx += `Investor: ${profile.investorType}, Check size: ${profile.checkSize}\n`;
      if (profile.currentEvaluation.trim()) ctx += `Evaluating: ${profile.currentEvaluation.trim()}\n`;
      break;
    case 'career':
      ctx += `Role: ${profile.currentRole.trim()}\n`;
      if (profile.decisionContext.trim()) ctx += `Decision: ${profile.decisionContext.trim()}\n`;
      break;
    default:
      break;
  }

  ctx += `Risk ${profile.riskTolerance}/10, Speed ${profile.decisionSpeed}/10\n`;
  ctx += `Goal: ${profile.goal.trim()}\n`;

  const out = ctx.trim();
  if (out.length <= MAX_CONTEXT_CHARS) return out;
  return `${out.slice(0, MAX_CONTEXT_CHARS - 1)}…`;
}

/** @deprecated Use buildOperatorContext */
export function formatOperatorContext(profile: OperatorProfile | null | undefined): string {
  return buildOperatorContext(profile);
}
