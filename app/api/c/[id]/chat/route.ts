/**
 * Unified chat endpoint for a conversation.
 * Handles: text messages, simulation triggers, refinements.
 */

import { NextRequest, NextResponse } from 'next/server';
import { addMessage, getConversationMessages } from '@/lib/conversation/manager';
import { chatWithMemory } from '@/lib/chat/chat';
import { refineSimulation } from '@/lib/chat/refine';
import { getUserIdFromRequest } from '@/lib/auth/supabase-server';
import { canUseTier, getDefaultTier, type ModelTier, type UserPlan } from '@/lib/chat/tiers';
import { getKrakenBalance } from '@/lib/chat/kraken';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, isAuthenticated } = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: conversationId } = await params;
  const body = await req.json();
  const { message, action, tier: requestedTier, simulationId, modification } = body;

  // Determine plan + tier
  const plan: UserPlan = isAuthenticated ? 'pro' : 'free';
  const krakenBalance = await getKrakenBalance(userId);
  let tier: ModelTier = requestedTier || getDefaultTier(plan);

  const access = canUseTier(plan, tier, krakenBalance);
  if (!access.allowed) tier = getDefaultTier(plan);

  // ═══ ACTION: CHAT MESSAGE ═══
  if (!action || action === 'chat') {
    if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 });

    // Save user message
    await addMessage(conversationId, userId, {
      message_type: 'text',
      role: 'user',
      content: message,
      model_tier: tier,
    });

    // Load recent messages for context
    const recentMsgs = await getConversationMessages(conversationId, 20);
    const history = recentMsgs
      .filter(m => m.message_type === 'text' && m.content)
      .slice(-10)
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content! }));

    // Chat with memory
    const result = await chatWithMemory(userId, message, history, tier);

    // Save assistant response
    const msgType = result.suggestSimulation ? 'decision_card' : 'text';
    await addMessage(conversationId, userId, {
      message_type: msgType,
      role: 'assistant',
      content: result.response,
      model_tier: result.tier,
      structured_data: result.suggestSimulation ? {
        suggest_simulation: true,
        simulation_prompt: result.simulationPrompt,
        related_simulations: result.relatedSimulations,
        disclaimer: result.disclaimer,
      } : result.disclaimer ? { disclaimer: result.disclaimer } : undefined,
    });

    return NextResponse.json(result);
  }

  // ═══ ACTION: TRIGGER SIMULATION ═══
  if (action === 'simulate') {
    const question = message || body.question;
    if (!question) return NextResponse.json({ error: 'Question required' }, { status: 400 });

    const agentIds: string[] | undefined = body.agentIds;
    const includeSelf: boolean | undefined = body.includeSelf;
    const joker: Record<string, unknown> | null | undefined = body.joker;
    const agentOverrides: Record<string, unknown> | undefined = body.agentOverrides;

    // Save simulation start message
    await addMessage(conversationId, userId, {
      message_type: 'simulation_start',
      role: 'system',
      content: question,
      structured_data: { tier, question, agentIds, includeSelf, joker, agentOverrides },
    });

    // Build stream URL with optional params
    let streamUrl = `/api/simulate/stream?q=${encodeURIComponent(question)}&conversationId=${conversationId}&tier=${tier}`;
    if (agentIds?.length) streamUrl += `&agentIds=${agentIds.join(',')}`;
    if (includeSelf) streamUrl += `&includeSelf=true`;

    // Return the simulation config — frontend will connect to SSE
    return NextResponse.json({
      action: 'simulate',
      question,
      conversationId,
      tier,
      agentIds,
      includeSelf,
      joker,
      agentOverrides,
      streamUrl,
    });
  }

  // ═══ ACTION: REFINE SIMULATION ═══
  if (action === 'refine') {
    if (!simulationId || !modification) {
      return NextResponse.json({ error: 'simulationId and modification required' }, { status: 400 });
    }

    const result = await refineSimulation({ simulationId, modification, userId, tier });
    if (!result) return NextResponse.json({ error: 'Refinement failed' }, { status: 500 });

    // Save refinement as special message
    await addMessage(conversationId, userId, {
      message_type: 'refinement',
      role: 'assistant',
      structured_data: result,
      model_tier: tier,
      simulation_id: simulationId,
    });

    return NextResponse.json(result);
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
