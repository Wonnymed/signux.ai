import { NextRequest } from "next/server";
import { runSimulation } from "@/lib/simulation/engine";
import { getUserIdFromRequest } from "@/lib/auth/supabase-server";
import { hitlStore } from "@/lib/simulation/hitl-store";
import type { HITLResponse } from "@/lib/simulation/hitl";
import { addMessage, updateConversationAfterSim } from "@/lib/conversation/manager";
import {
  ensureUserSubscription,
  checkSimulationStart,
  getTokenBalance,
  reserveSimulationTokens,
  refundSimulationTokens,
} from "@/lib/billing/usage";
import { parseSimulationChargeType, getTokenCost } from "@/lib/billing/token-costs";
import { resolveEngineParams } from "@/lib/billing/sim-engine-params";

/* ═══════════════════════════════════════
   POST /api/simulate/stream
   Returns: text/event-stream (SSE)

   Octux AI — 10-agent adversarial debate engine
   Uses Claude Sonnet for specialist agents,
   Claude Haiku for crowd wisdom advisors.
   ═══════════════════════════════════════ */

// Allow up to 5 minutes for full 10-round simulation
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body || !body.question || !body.engine) {
    return new Response(
      JSON.stringify({ error: "question and engine are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const { userId, isAuthenticated } = await getUserIdFromRequest(req);
  if (!isAuthenticated) {
    return new Response(
      JSON.stringify({ error: "Sign in required to run simulations." }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  await ensureUserSubscription(userId);

  const simMode = parseSimulationChargeType(body.simMode);
  const gate = await checkSimulationStart(userId, simMode);
  if (!gate.allowed) {
    const status = gate.denyCode === "insufficient_tokens" ? 402 : 403;
    return new Response(
      JSON.stringify({
        error: status === 402 ? "payment_required" : "forbidden",
        message: gate.reason,
        upgradeRequired: gate.upgradeRequired,
        tokensUsed: gate.tokensUsed,
        tokensTotal: gate.tokensTotal,
        denyCode: gate.denyCode,
      }),
      { status, headers: { "Content-Type": "application/json" } },
    );
  }

  const tokenCost = getTokenCost(simMode);
  const reserved = await reserveSimulationTokens(userId, tokenCost);
  if (!reserved.ok) {
    return new Response(
      JSON.stringify({
        error: "Insufficient tokens",
        message: reserved.message,
        required: tokenCost,
        balanceAfter: reserved.balanceAfter,
      }),
      { status: 402, headers: { "Content-Type": "application/json" } },
    );
  }

  const balance = await getTokenBalance(userId);
  const { tier: engineTier, enableCrowdWisdom, advisorCount } = resolveEngineParams(
    balance.tier,
    simMode,
  );

  // `question` is usually client-framed (see lib/simulation/mode-framing.ts) before POST.
  const {
    question,
    engine,
    advisorGuidance,
    threadId,
    conversationId,
    agentIds,
    includeSelf,
    joker,
    agentOverrides,
  } = body as {
    question: string;
    engine: string;
    advisorGuidance?: string;
    threadId?: string;
    conversationId?: string;
    agentIds?: string[];
    includeSelf?: boolean;
    joker?: Record<string, unknown> | null;
    agentOverrides?: Record<string, unknown>;
  };

  console.log(
    `[simulate/stream] engine=${engine}, simMode=${simMode}, cost=${tokenCost}, engineTier=${engineTier}, crowd=${enableCrowdWisdom}, advisors=${advisorCount}, question="${question.slice(0, 80)}"`,
  );

  const encoder = new TextEncoder();

  /** Tracks billing across start/cancel so client disconnect still refunds once if no verdict. */
  const billingRef = {
    simulationDelivered: false,
    refundIssued: false,
  };

  const tryRefundReservedTokens = async () => {
    if (billingRef.simulationDelivered || billingRef.refundIssued) return;
    billingRef.refundIssued = true;
    try {
      await refundSimulationTokens(userId, tokenCost);
    } catch (refundErr) {
      console.error("[simulate/stream] token refund failed:", refundErr);
      billingRef.refundIssued = false;
    }
  };

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          closed = true;
        }
      };

      try {
        const onHITLCheckpoint = (checkpoint: any): Promise<HITLResponse> => {
          return new Promise((resolve) => {
            const simId = checkpoint._simId;
            if (!simId) {
              resolve({ action: "skip", timestamp: Date.now() });
              return;
            }

            const timeout = setTimeout(() => {
              hitlStore.delete(simId);
              resolve({ action: "skip", timestamp: Date.now() });
            }, 60000);

            hitlStore.set(simId, { resolve, timeout });
          });
        };

        const generator = runSimulation(question, engine, {
          enableCrowdWisdom,
          advisorGuidance: advisorGuidance || undefined,
          advisorCount: advisorCount > 0 ? advisorCount : undefined,
          tier: engineTier,
          simMode,
          userId,
          threadId: threadId || undefined,
          onHITLCheckpoint,
          agentIds: agentIds || undefined,
          includeSelf: includeSelf || undefined,
          joker: joker || undefined,
          agentOverrides: agentOverrides || undefined,
        });

        let finalVerdict: any = null;
        let simulationId = "";

        for await (const sse of generator) {
          send(sse.event, sse.data);
          if (sse.event === "verdict_artifact") {
            finalVerdict = sse.data;
            simulationId = (sse.data as any)?.simulation_id || "";
            billingRef.simulationDelivered = true;
          }
        }

        if (conversationId && finalVerdict && userId) {
          try {
            await addMessage(conversationId, userId, {
              message_type: "simulation_verdict",
              role: "assistant",
              content: finalVerdict.one_liner || "Simulation complete",
              structured_data: finalVerdict,
              simulation_id: simulationId,
            });
            await updateConversationAfterSim(
              conversationId,
              finalVerdict,
              finalVerdict.domain || "general",
              simMode,
            );
          } catch (e) {
            console.error("[simulate/stream] failed to save verdict to conversation:", e);
          }
        }
      } catch (err) {
        console.error("[simulate/stream] fatal error:", err);
        send("error", {
          message: err instanceof Error ? err.message : "Simulation failed",
        });
      } finally {
        // Refund reserved tokens only when no verdict was delivered (billingRef.simulationDelivered stays false).
        // Also invoked from ReadableStream cancel() on client disconnect so abandon-in-flight still refunds once.
        await tryRefundReservedTokens();
        if (!closed) {
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        }
      }
    },
    cancel() {
      void tryRefundReservedTokens();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
