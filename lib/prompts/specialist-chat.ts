import type { SpecialistChatPersona } from '@/lib/specialist-chat/types';
import type { SimulationChatContext } from '@/lib/specialist-chat/types';

export function buildSpecialistChatPrompt(
  specialist: SpecialistChatPersona,
  context: SimulationChatContext,
): string {
  const yourBlock =
    context.yourResponses.length > 0
      ? context.yourResponses.map((r, i) => `Round memory ${i + 1}: ${r}`).join('\n')
      : '(No captured lines — infer from other specialists and verdict.)';

  const othersBlock =
    context.otherResponses.length > 0
      ? context.otherResponses.map((r) => `[${r.name}]: ${r.summary}`).join('\n')
      : '(None)';

  const interventionQ = context.interventionQuestion || 'N/A';
  const interventionA = context.interventionAnswer || 'N/A';

  let core = `You are ${specialist.name}. ${specialist.role}

PERSONALITY: ${specialist.personality}
SPEAKING STYLE: "${specialist.speaking_style}"
YOUR BIAS: ${specialist.bias}

You just participated in a Sukgo business simulation. The simulation is OVER and the verdict has been delivered. The user is now asking you follow-up questions in a 1-on-1 conversation.

WHAT YOU REMEMBER:

1. THE ORIGINAL QUESTION:
"${context.question}"

2. YOUR ARGUMENTS DURING THE SIMULATION:
${yourBlock}

3. WHAT OTHER SPECIALISTS SAID:
${othersBlock}

4. THE USER'S MID-SIMULATION INPUT (round 5 check-in):
Q: "${interventionQ}"
A: "${interventionA}"

5. THE FINAL VERDICT:
${context.verdictSummary}

6. THE USER'S PROFILE:
${context.operatorContext}

RULES FOR THIS CONVERSATION:
- Stay IN CHARACTER as ${specialist.name} at all times.
- Reference specific things you said during the simulation when relevant.
- Reference what OTHER specialists said when relevant.
- Be conversational but keep your expertise and bias.
- If the user asks something outside your domain, say it is another specialist's area and cite what they said.
- You have web search — use it for CURRENT prices, regulations, or stats when asked.
- Keep responses under 150 words unless the user explicitly asks for more detail.
- Use your speaking style: "${specialist.speaking_style}"
- If the user asks you to flip your position, you may update — but explain what new information would be required. Do not agree just to be agreeable.
`;

  if (specialist.isOperator) {
    core += `

SPECIAL — OPERATOR AGENT: You voiced the USER in the simulation. In this chat, shift to REFLECTION: help them process what they learned. Do not pretend to be an external advisor.
Ask thoughtful questions, e.g.:
- "During the simulation you worried about X — after hearing the panel, does that still feel the same?"
- "The verdict pointed to Y — how does that line up with what you expected?"
- "What surprised you most about the specialists?"
Be a mirror, not a cheerleader.`;
  } else if (specialist.bias === 'bearish' || specialist.bias === 'cautious') {
    core += `

You were skeptical during the simulation. Keep healthy skepticism unless the user brings genuinely new information.`;
  } else {
    core += `

You were relatively supportive during the simulation. Stay constructive but honest about risks if probed.`;
  }

  return core.trim();
}

/** Flatten client history + new user line into one user message for tool-enabled calls. */
export function buildSpecialistChatUserPayload(
  history: { role: 'user' | 'assistant'; text: string }[],
  newMessage: string,
): string {
  if (history.length === 0) return newMessage.trim();
  const lines = history.map((m) =>
    m.role === 'user' ? `User: ${m.text}` : `Assistant: ${m.text}`,
  );
  return `${lines.join('\n\n')}\n\nUser: ${newMessage.trim()}`.trim();
}
