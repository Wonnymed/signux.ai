/** Suggested follow-up questions for post-sim deep dive (Prompt 2.5). */
export function getSuggestedQuestions(
  _agentName: string,
  position: string,
  _argument: string,
  _question: string,
): string[] {
  const pos = position.toLowerCase();
  const suggestions: string[] = [];

  if (pos === 'delay' || pos === 'abandon') {
    suggestions.push('What would change your mind to PROCEED?');
    suggestions.push("What's the minimum condition needed to move forward?");
  } else {
    suggestions.push("What's the biggest risk you might be underweighting?");
    suggestions.push('What would make you switch to DELAY?');
  }

  suggestions.push('Explain your reasoning in more detail');
  suggestions.push('What specific data supports your position?');

  return suggestions.slice(0, 4);
}
