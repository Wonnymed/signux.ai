import { NextRequest, NextResponse } from 'next/server';
import {
  chatWithAgent,
  chatWithAgentEphemeral,
  type AgentChatEphemeralContext,
  type AgentChatMessage,
} from '@/lib/agent-chat/chat';
import { getUserIdFromRequest } from '@/lib/auth/supabase-server';

function parseHistory(history: unknown): AgentChatMessage[] {
  return Array.isArray(history)
    ? history.slice(-10).map((m: { role?: string; content?: string }) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content || '').substring(0, 2000),
      }))
    : [];
}

function parseEphemeralContext(raw: unknown): AgentChatEphemeralContext | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const originalQuestion = typeof o.originalQuestion === 'string' ? o.originalQuestion : '';
  const agentPosition = typeof o.agentPosition === 'string' ? o.agentPosition : '';
  const agentArgument = typeof o.agentArgument === 'string' ? o.agentArgument : '';
  const verdictSummary = typeof o.verdictSummary === 'string' ? o.verdictSummary : '';
  const agentConfidence =
    typeof o.agentConfidence === 'number' && Number.isFinite(o.agentConfidence)
      ? o.agentConfidence
      : undefined;
  const otherRaw = o.otherAgents;
  const otherAgents: { name: string; position: string }[] = [];
  if (Array.isArray(otherRaw)) {
    for (const row of otherRaw) {
      if (!row || typeof row !== 'object') continue;
      const r = row as Record<string, unknown>;
      const name = typeof r.name === 'string' ? r.name : '';
      const position = typeof r.position === 'string' ? r.position : '';
      if (name) otherAgents.push({ name, position });
    }
  }
  if (!originalQuestion.trim() && !verdictSummary.trim()) return null;
  return {
    originalQuestion: originalQuestion.slice(0, 8000),
    agentPosition,
    agentArgument: agentArgument.slice(0, 12000),
    agentConfidence,
    verdictSummary: verdictSummary.slice(0, 8000),
    otherAgents,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { simulationId, agentId, message, history, ephemeralContext } = body;

    if (!agentId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: agentId, message' },
        { status: 400 }
      );
    }

    const { userId } = await getUserIdFromRequest(req);
    const chatHistory = parseHistory(history);

    const ep = parseEphemeralContext(ephemeralContext);
    if (ep) {
      const response = await chatWithAgentEphemeral(
        String(agentId),
        userId,
        String(message).substring(0, 2000),
        chatHistory,
        ep,
      );
      return NextResponse.json(response);
    }

    if (!simulationId) {
      return NextResponse.json(
        { error: 'Missing simulationId, or provide ephemeralContext for dashboard deep dive' },
        { status: 400 }
      );
    }

    const response = await chatWithAgent({
      simulationId,
      agentId,
      userId,
      message: String(message).substring(0, 2000),
      history: chatHistory,
    });

    return NextResponse.json(response);

  } catch (err) {
    console.error('AGENT CHAT API error:', err);
    return NextResponse.json(
      { error: 'Failed to process agent chat request' },
      { status: 500 }
    );
  }
}
