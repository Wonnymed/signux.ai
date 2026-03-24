import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function callClaude(options: {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  model?: string;
}): Promise<string> {
  const { systemPrompt, userMessage, maxTokens = 1024, model = 'claude-sonnet-4-20250514' } = options;

  try {
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });
    return response.content[0].type === 'text' ? response.content[0].text : '';
  } catch (error) {
    console.error('Claude API error:', error);
    throw error;
  }
}

export function parseJSON<T>(text: string): T {
  // Strip markdown code fences if present
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}
