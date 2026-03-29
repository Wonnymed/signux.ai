import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth/supabase-server';
import { callClaudeWithTools } from '@/lib/simulation/claude';
import { buildSpecialistChatPrompt, buildSpecialistChatUserPayload } from '@/lib/prompts/specialist-chat';
import type { SpecialistChatPersona } from '@/lib/specialist-chat/types';
import type { SimulationChatContext } from '@/lib/specialist-chat/types';

export const maxDuration = 60;

type Body = {
  simulationId?: string;
  specialistPlan?: SpecialistChatPersona;
  simulationContext?: SimulationChatContext;
  message?: string;
  conversationHistory?: { role: 'user' | 'assistant'; text: string }[];
};

export async function POST(req: NextRequest) {
  try {
    const { isAuthenticated } = await getUserIdFromRequest(req);
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Model unavailable.' }, { status: 503 });
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    const specialistPlan = body?.specialistPlan;
    const simulationContext = body?.simulationContext;
    const message = String(body?.message || '').trim().slice(0, 4000);
    const history = Array.isArray(body?.conversationHistory) ? body!.conversationHistory! : [];

    if (!specialistPlan?.agentId || !simulationContext || !message) {
      return NextResponse.json(
        { error: 'specialistPlan, simulationContext, and message are required.' },
        { status: 400 },
      );
    }

    const systemPrompt = buildSpecialistChatPrompt(specialistPlan, simulationContext);
    const userMessage = buildSpecialistChatUserPayload(
      history.map((h) => ({ role: h.role, text: String(h.text || '').slice(0, 8000) })),
      message,
    );

    const tool = await callClaudeWithTools({
      systemPrompt,
      userMessage,
      agentId: 'specialist_followup_chat',
      maxTokens: 900,
      tier: 'specialist',
      forceWebSearch: {
        maxUses: 2,
        searchContext:
          'Current market data, rents, regulations, benchmarks, and news relevant to the user question. Prefer authoritative sources.',
      },
    });

    const sources = (tool.searchCitations || []).slice(0, 8).map((c) => ({
      url: c.url,
      title: c.title || c.url,
    }));

    return NextResponse.json({
      text: tool.text.trim(),
      sources,
    });
  } catch (e) {
    console.error('[specialist-chat]', e);
    return NextResponse.json({ error: 'Chat request failed.' }, { status: 500 });
  }
}
