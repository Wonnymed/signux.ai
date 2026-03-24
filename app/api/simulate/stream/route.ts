import { NextRequest } from "next/server";
import { runSimulation } from "@/lib/simulation/engine";
import { runMockSimulation } from "@/lib/simulation/mock";

/* ═══════════════════════════════════════
   POST /api/simulate/stream
   Returns: text/event-stream (SSE)

   If ANTHROPIC_API_KEY exists → real Claude engine
   If no API key → mock data fallback
   ═══════════════════════════════════════ */

export async function POST(req: NextRequest) {
  const { question, engine } = (await req.json()) as {
    question: string;
    engine: string;
  };

  if (!question || !engine) {
    return new Response(
      JSON.stringify({ error: "question and engine are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const useRealEngine = !!process.env.ANTHROPIC_API_KEY;
  console.log(`[simulate/stream] engine=${engine}, real=${useRealEngine}, question="${question.slice(0, 80)}"`);

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
        const generator = useRealEngine
          ? runSimulation(question, engine)
          : runMockSimulation(question, engine);

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
          try { controller.close(); } catch { /* already closed */ }
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
