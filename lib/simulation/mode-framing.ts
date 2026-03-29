import type { DashboardMode } from '@/lib/store/dashboard-ui';

/** Wrap user input with mode-specific framing for the debate engine (Prompt 2.3). */
export function frameQuestionForMode(
  mode: DashboardMode,
  inputA: string,
  inputB?: string,
): string {
  const a = inputA.trim();
  const b = (inputB ?? '').trim();

  switch (mode) {
    case 'simulate':
      return a;

    case 'compare':
      return `Compare these two options and determine which is better:

Option A: ${a}

Option B: ${b}

Analyze both options across every dimension. For each dimension, declare a winner. Give a final overall recommendation.`;

    case 'stress':
      return `STRESS TEST this plan — find every way it can fail:

"${a}"

Be adversarial. Assume the worst. Identify every failure vector, estimate probability and impact for each. Rank them from most to least dangerous. Suggest mitigations for the top 3.`;

    case 'premortem':
      return `PRE-MORTEM ANALYSIS: Imagine it is 12 months from now and this plan has COMPLETELY FAILED:

"${a}"

Your job: explain exactly WHY it failed. Be specific. What went wrong first? What was the cascade? What early warning signs were missed? Finally, list what could have been done to prevent each failure.`;

    default:
      return a;
  }
}
