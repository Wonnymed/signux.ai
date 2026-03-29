import type { SpecialistChatPersona } from './types';
import type { SimulationChatContext } from './types';

export function getSuggestedQuestions(
  specialist: SpecialistChatPersona,
  context: SimulationChatContext,
): string[] {
  const questions: string[] = [];

  if (specialist.isOperator) {
    questions.push('What surprised you most about how the specialists reacted?');
    questions.push('Does the verdict match what you felt during the simulation?');
    questions.push('What would you tell yourself on day one after this decision?');
    return questions.slice(0, 3);
  }

  if (specialist.bias === 'bearish' || specialist.bias === 'cautious') {
    questions.push('What would it take to change your mind?');
    questions.push("What's the ONE thing I could do to address your biggest concern?");
  } else {
    questions.push("What's the biggest risk you're still not talking about?");
    questions.push('If you are wrong, what would it cost me?');
  }

  questions.push('Can you be more specific about the numbers you had in mind?');

  if (context.verdictConfidence < 60) {
    questions.push('The verdict looked uncertain — what extra data would make this clearer?');
  }

  if (context.mode === 'compare' && specialist.team) {
    questions.push(
      specialist.team === 'A'
        ? "What did Team B get RIGHT that you'd concede?"
        : specialist.team === 'B'
          ? "What did Team A get RIGHT that you'd concede?"
          : "What did the other side get RIGHT that you'd concede?",
    );
    questions.push('What if I blended pieces of both options?');
  }

  if (context.mode === 'stress_test') {
    questions.push('How would you mitigate the vulnerability you stressed?');
    questions.push("What's the cheapest fix you'd still trust?");
  }

  if (context.mode === 'premortem') {
    questions.push('In your failure thread, when was the last realistic chance to save it?');
    questions.push('If I had unlimited budget, would your scenario still end badly?');
  }

  return questions.slice(0, 3);
}
