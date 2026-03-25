import { NextRequest } from "next/server";
import { runSimulation } from "@/lib/simulation/engine";

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

  const { question, engine, enableCrowdWisdom, advisorGuidance, advisorCount, tier } = body as {
    question: string;
    engine: string;
    enableCrowdWisdom?: boolean;
    advisorGuidance?: string;
    advisorCount?: number;
    tier?: string;
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
        // Generate stable anonymous user ID from request fingerprint
        // Temporary until real auth — same browser = same memory
        const forwarded = req.headers.get('x-forwarded-for');
        const ip = forwarded?.split(',')[0] || 'anonymous';
        const userAgent = req.headers.get('user-agent') || 'unknown';
        const fingerprint = `${ip}-${userAgent}`.substring(0, 100);
        const fingerprintData = new TextEncoder().encode(fingerprint);
        const hashBuffer = await crypto.subtle.digest('SHA-256', fingerprintData);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const userId = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 36);

        const generator = runSimulation(question, engine, {
          enableCrowdWisdom: !!enableCrowdWisdom,
          advisorGuidance: advisorGuidance || undefined,
          advisorCount: advisorCount || undefined,
          tier: tier || 'free',
          userId,
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
