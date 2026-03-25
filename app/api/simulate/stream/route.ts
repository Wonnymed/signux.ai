import { NextRequest } from "next/server";
import { runSimulation } from "@/lib/simulation/engine";
import { getUserIdFromRequest } from "@/lib/auth/supabase-server";
import { hitlStore } from "@/lib/simulation/hitl-store";
import type { HITLResponse } from "@/lib/simulation/hitl";

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

  const { question, engine, enableCrowdWisdom, advisorGuidance, advisorCount, tier, threadId } = body as {
    question: string;
    engine: string;
    enableCrowdWisdom?: boolean;
    advisorGuidance?: string;
    advisorCount?: number;
    tier?: string;
    threadId?: string;
  };

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  console.log(
    `[simulate/stream] engine=${engine}, crowd=${!!enableCrowdWisdom}, advisors=${advisorCount || 0}, question="${question.slice(0, 80)}"`,
  );

  const encoder = new TextEncoder();

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
        const { userId } = await getUserIdFromRequest(req);

        // HITL callback: engine calls this when it reaches a checkpoint.
        // We create a promise keyed by simId in the hitlStore, which
        // the POST /api/simulate/hitl endpoint resolves when the user responds.
        const onHITLCheckpoint = (checkpoint: any): Promise<HITLResponse> => {
          return new Promise((resolve) => {
            // The engine passes the simId through when it yields the checkpoint
            // We extract it from the SSE event data that was just sent
            const simId = checkpoint._simId;
            if (!simId) {
              resolve({ action: 'skip', timestamp: Date.now() });
              return;
            }

            const timeout = setTimeout(() => {
              hitlStore.delete(simId);
              resolve({ action: 'skip', timestamp: Date.now() });
            }, 60000);

            hitlStore.set(simId, { resolve, timeout });
          });
        };

        const generator = runSimulation(question, engine, {
          enableCrowdWisdom: !!enableCrowdWisdom,
          advisorGuidance: advisorGuidance || undefined,
          advisorCount: advisorCount || undefined,
          tier: tier || 'free',
          userId,
          threadId: threadId || undefined,
          onHITLCheckpoint,
        });

        for await (const sse of generator) {
          send(sse.event, sse.data);
        }
      } catch (err) {
        console.error("[simulate/stream] fatal error:", err);
        send("error", {
          message: err instanceof Error ? err.message : "Simulation failed",
        });
      } finally {
        if (!closed) {
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        }
      }
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
