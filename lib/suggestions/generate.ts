export type SuggestionContext = 'post_verdict' | 'post_chat' | 'post_agent_chat';

export interface SuggestionInput {
  context: SuggestionContext;
  conversationTitle?: string;
  verdict?: {
    recommendation: string;
    probability: number;
    grade?: string;
    one_liner?: string;
    main_risk?: string;
    next_action?: string;
    agent_scores?: { agent_name: string; position: string; confidence: number }[];
  };
  recentMessages?: { role: string; content: string }[];
  agentName?: string;
  agentCategory?: string;
  agentLastResponse?: string;
  userTier?: string;
}

export interface Suggestion {
  id: string;
  text: string;
  type: 'what_if' | 'deep_dive' | 'compare' | 'simulate' | 'explore' | 'challenge';
  priority: number;
}

/**
 * Generate suggestions LOCALLY using templates.
 * NO API CALL for free/paygo users.
 * Only Pro/Max get AI-generated suggestions (post-verdict only).
 */
export async function generateSuggestions(input: SuggestionInput): Promise<Suggestion[]> {
  if (
    input.context === 'post_verdict' &&
    input.verdict &&
    (input.userTier === 'pro' || input.userTier === 'max')
  ) {
    try {
      return await generateAISuggestions(input);
    } catch {
      return generateTemplateSuggestions(input);
    }
  }

  return generateTemplateSuggestions(input);
}

function generateTemplateSuggestions(input: SuggestionInput): Suggestion[] {
  if (input.context === 'post_verdict' && input.verdict) {
    return generateVerdictSuggestions(input);
  }
  if (input.context === 'post_chat') {
    return generateChatSuggestions(input);
  }
  if (input.context === 'post_agent_chat') {
    return generateAgentChatSuggestions(input);
  }
  return getGenericSuggestions();
}

function uid(): string {
  return `sug_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function generateVerdictSuggestions(input: SuggestionInput): Suggestion[] {
  const v = input.verdict!;
  const suggestions: Suggestion[] = [];

  if (v.recommendation?.toLowerCase() === 'proceed') {
    suggestions.push({ id: uid(), text: 'What if the timeline was twice as long?', type: 'what_if', priority: 4 });
    suggestions.push({ id: uid(), text: 'What could make this fail?', type: 'challenge', priority: 3 });
  } else if (v.recommendation?.toLowerCase() === 'delay') {
    suggestions.push({ id: uid(), text: 'What conditions would change this to proceed?', type: 'what_if', priority: 4 });
    suggestions.push({ id: uid(), text: 'How long should I wait?', type: 'deep_dive', priority: 3 });
  } else {
    suggestions.push({ id: uid(), text: 'What alternatives should I consider?', type: 'compare', priority: 4 });
    suggestions.push({ id: uid(), text: 'Is there a smaller version worth trying?', type: 'what_if', priority: 3 });
  }

  if (v.main_risk) {
    suggestions.push({ id: uid(), text: 'How do I mitigate the main risk?', type: 'deep_dive', priority: 2 });
  }

  if (v.next_action) {
    suggestions.push({ id: uid(), text: 'Break down the next action into steps', type: 'explore', priority: 1 });
  } else {
    suggestions.push({ id: uid(), text: 'What should I do first?', type: 'explore', priority: 1 });
  }

  return suggestions.slice(0, 4);
}

function generateChatSuggestions(input: SuggestionInput): Suggestion[] {
  const lastMsg = input.recentMessages?.slice(-1)[0]?.content?.toLowerCase() || '';
  const suggestions: Suggestion[] = [];

  if (lastMsg.includes('invest') || lastMsg.includes('stock') || lastMsg.includes('crypto')) {
    suggestions.push({ id: uid(), text: 'What are the main risks?', type: 'deep_dive', priority: 3 });
    suggestions.push({ id: uid(), text: 'Run a full simulation on this', type: 'simulate', priority: 2 });
  } else if (lastMsg.includes('relationship') || lastMsg.includes('partner') || lastMsg.includes('break')) {
    suggestions.push({ id: uid(), text: 'What would a therapist say?', type: 'explore', priority: 3 });
    suggestions.push({ id: uid(), text: 'Run a full simulation on this', type: 'simulate', priority: 2 });
  } else if (lastMsg.includes('job') || lastMsg.includes('career') || lastMsg.includes('quit')) {
    suggestions.push({ id: uid(), text: 'What does the job market look like?', type: 'deep_dive', priority: 3 });
    suggestions.push({ id: uid(), text: 'Run a full simulation on this', type: 'simulate', priority: 2 });
  } else {
    suggestions.push({ id: uid(), text: 'Tell me more about the risks', type: 'deep_dive', priority: 3 });
    suggestions.push({ id: uid(), text: 'Run a full simulation on this', type: 'simulate', priority: 2 });
  }

  suggestions.push({ id: uid(), text: 'What am I not considering?', type: 'challenge', priority: 1 });
  return suggestions.slice(0, 3);
}

function generateAgentChatSuggestions(_input: SuggestionInput): Suggestion[] {
  return [
    { id: uid(), text: 'What data sources did you use?', type: 'deep_dive', priority: 2 },
    { id: uid(), text: 'How does your view compare to the others?', type: 'challenge', priority: 1 },
  ];
}

function getGenericSuggestions(): Suggestion[] {
  return [
    { id: uid(), text: 'Tell me more about this', type: 'explore', priority: 3 },
    { id: uid(), text: 'Run a full simulation', type: 'simulate', priority: 2 },
    { id: uid(), text: 'What are the risks?', type: 'deep_dive', priority: 1 },
  ];
}

/**
 * AI-powered suggestions — ONLY for Pro/Max post-verdict.
 * Cost: ~$0.003 per call (Haiku).
 */
async function generateAISuggestions(input: SuggestionInput): Promise<Suggestion[]> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const anthropic = new Anthropic();
  const v = input.verdict!;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    system: 'Generate 4 follow-up questions for a decision analysis verdict. Each question 5-12 words. Return ONLY a JSON array of objects with "text" and "type" fields. Types: what_if, deep_dive, compare, simulate, explore, challenge.',
    messages: [{
      role: 'user',
      content: `Verdict: ${v.recommendation?.toUpperCase()} (${v.probability}%). Summary: ${v.one_liner || ''}. Risk: ${v.main_risk || 'none'}. Action: ${v.next_action || 'none'}. Generate 4 specific follow-ups.`,
    }],
  });

  const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
  try {
    const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(clean);
    return parsed.slice(0, 4).map((item: any, i: number) => ({
      id: `ai_${Date.now()}_${i}`,
      text: item.text,
      type: item.type || 'explore',
      priority: 4 - i,
    }));
  } catch {
    return generateTemplateSuggestions(input);
  }
}
