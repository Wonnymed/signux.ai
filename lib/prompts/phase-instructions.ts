import type { ChiefSimulationMode } from '@/lib/simulation/types';

/** Per-mode specialist/operator behavior by debate round label (engine rounds 3,5,6,7,8,9…). */
export function getPhaseInstruction(mode: ChiefSimulationMode, debateRoundLabel: number): string {
  if (mode === 'simulate') {
    if (debateRoundLabel <= 3) return 'PHASE: Opening — Give your initial take. Be direct. Set your position.';
    if (debateRoundLabel <= 5)
      return 'PHASE: Deep analysis — Respond to what others said. Challenge or support with evidence. Use web search for current data when it strengthens your point.';
    if (debateRoundLabel <= 8)
      return 'PHASE: Targeted analysis — The user may have provided new context after round 5. Factor it in explicitly. Say how it changes your view.';
    return 'PHASE: Convergence — State your FINAL position clearly. Note if your view changed since your first round.';
  }

  if (mode === 'compare') {
    if (debateRoundLabel <= 3)
      return "PHASE: Opening arguments — Present your team's case. Why is your option better? Be persuasive.";
    if (debateRoundLabel <= 5)
      return 'PHASE: Cross-examination — Respond to the OTHER team. Find weaknesses; defend your position with evidence.';
    if (debateRoundLabel <= 8)
      return 'PHASE: Focused rebuttal — The user stated what matters most to them. Refocus your argument on that dimension.';
    if (debateRoundLabel === 9) return 'PHASE: Closing — Your BEST case for why your option wins.';
    return "PHASE: Honest assessment — What is your option's biggest weakness? Be candid.";
  }

  if (mode === 'stress_test') {
    if (debateRoundLabel <= 3)
      return "PHASE: Surface scan — Quick scan of your risk angle. What's the most obvious vulnerability?";
    if (debateRoundLabel <= 5)
      return 'PHASE: Deep probing — Go deeper. Combine your findings with other risks. What if multiple threats hit together?';
    if (debateRoundLabel <= 8)
      return "PHASE: Recovery testing — The user answered the Chief's readiness question. Stress-test whether they can actually survive; name mitigations and kill switches.";
    if (debateRoundLabel === 9)
      return 'PHASE: Final severity — Your FINAL severity for your category (critical/high/medium/low). Justify briefly.';
    return 'PHASE: Final line — Does this plan survive your attack? One sentence: yes or no and why.';
  }

  // premortem
  if (debateRoundLabel <= 3)
    return 'PHASE: The beginning — Narrate the FIRST months in past tense. Start optimistic; plant subtle warning signs in your domain.';
  if (debateRoundLabel <= 5)
    return 'PHASE: The decline — Narrate the next months. Problems surface; be specific with timing and numbers.';
  if (debateRoundLabel <= 8)
    return "PHASE: The collapse — The user shared a contingency. Work it into the story: did it help or fail? Narrate toward the point of no return.";
  if (debateRoundLabel === 9)
    return 'PHASE: The end — Final straw; when it became irreversible; what was lost.';
  return 'PHASE: Aftermath — What SHOULD have been done differently? One specific action that would have changed the outcome.';
}

export function getModeSpecificInterventionInstruction(mode: ChiefSimulationMode): string {
  switch (mode) {
    case 'simulate':
      return 'Ask about MISSING CONTEXT — something only the user knows that would unlock better advice from specialists.';
    case 'compare':
      return 'Ask about USER PRIORITIES — which dimension of the comparison matters most for the next 12 months.';
    case 'stress_test':
      return 'Ask about WORST-CASE READINESS — safety net for the biggest risk the panel surfaced.';
    case 'premortem':
      return 'Ask about CONTINGENCY — at the turning point in the failure story, what would they actually do? Is there a Plan B?';
    default:
      return 'Ask one sharp, user-specific question.';
  }
}
