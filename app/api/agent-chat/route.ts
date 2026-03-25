import { NextRequest, NextResponse } from 'next/server';
import { chatWithAgent, type AgentChatMessage } from '@/lib/agent-chat/chat';
import { getUserIdFromRequest } from '@/lib/auth/supabase-client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { simulationId, agentId, message, history } = body;

    if (!simulationId || !agentId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: simulationId, agentId, message' },
        { status: 400 }
      );
    }

    const { userId } = await getUserIdFromRequest(req);

    // Validate history format
    const chatHistory: AgentChatMessage[] = Array.isArray(history)
      ? history.slice(-10).map((m: any) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: String(m.content || '').substring(0, 2000),
        }))
      : [];

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
