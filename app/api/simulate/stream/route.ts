import { NextRequest } from "next/server";
import type {
  AgentReport,
  ConsensusState,
  DecisionObject,
  SimulationPlan,
  SimulationPhase,
} from "@/app/lib/types/simulation";

/* ═══════════════════════════════════════
   POST /api/simulate/stream
   Returns: text/event-stream (SSE)
   Mock simulation — ~8-10s total
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

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      const wait = (ms: number) =>
        new Promise<void>((resolve) => setTimeout(resolve, ms));

      try {
        // ── 1. Planning phase ──
        send("phase_start", {
          phase: "planning" satisfies SimulationPhase,
          status: "active",
        });
        await wait(1000);

        // ── 2. Plan complete ──
        const plan: SimulationPlan = {
          tasks: [
            { description: "Analyze market data", agent: "Demand Signal" },
            {
              description: "Check historical rates",
              agent: "Base Rate Archivist",
            },
            {
              description: "Evaluate unit economics",
              agent: "Unit Economics Auditor",
            },
            {
              description: "Assess regulatory risk",
              agent: "Regulatory Gatekeeper",
            },
            { description: "Map competition", agent: "Competitive Intel" },
          ],
        };
        send("plan_complete", plan);
        await wait(500);

        // ── 3. Opening phase ──
        send("phase_start", {
          phase: "opening" satisfies SimulationPhase,
          status: "active",
        });
        await wait(500);

        // ── 4. Agent reports ──
        const agents: AgentReport[] = [
          {
            agent_id: "base-rate",
            agent_name: "Base Rate Archivist",
            position: "delay",
            confidence: 8,
            key_argument:
              "Historical data shows 42% failure rate in F&B within the first year. The base rate for success in Gangnam specifically is even lower at 35% due to high rent and turnover.",
          },
          {
            agent_id: "demand-signal",
            agent_name: "Demand Signal",
            position: "proceed",
            confidence: 7,
            key_argument:
              "Target segment is growing 15% YoY with underserved demand in the 25-35 demographic. Delivery-first models are outperforming dine-in by 2.3x in the district.",
          },
          {
            agent_id: "unit-econ",
            agent_name: "Unit Economics Auditor",
            position: "proceed",
            confidence: 6,
            key_argument:
              "Unit economics are marginal but viable — 62% gross margin with the proposed menu, but breakeven requires 85% of projected volume. Tight but achievable.",
          },
          {
            agent_id: "regulatory",
            agent_name: "Regulatory Gatekeeper",
            position: "delay",
            confidence: 9,
            key_argument:
              "Permit process in Gangnam-gu takes 3-6 months. Starting lease payments before permits are secured creates a cash burn window of ₩15-30M with zero revenue.",
          },
        ];

        for (const agent of agents) {
          send("agent_complete", agent);
          await wait(800);
        }

        // ── 5. Adversarial phase ──
        send("phase_start", {
          phase: "adversarial" satisfies SimulationPhase,
          status: "active",
        });
        await wait(1000);

        // ── 6. Consensus update ──
        const consensus: ConsensusState = {
          proceed: 70,
          delay: 20,
          abandon: 10,
          avg_confidence: 7.2,
        };
        send("consensus_update", consensus);
        await wait(1500);

        // ── 7. Convergence phase ──
        send("phase_start", {
          phase: "convergence" satisfies SimulationPhase,
          status: "active",
        });
        await wait(1000);

        // ── 8. Verdict phase ──
        send("phase_start", {
          phase: "verdict" satisfies SimulationPhase,
          status: "active",
        });
        await wait(500);

        // ── 9. Verdict artifact ──
        const verdict: DecisionObject = {
          recommendation: "proceed_with_conditions",
          probability: 67,
          main_risk: "Regulatory timeline uncertainty",
          leverage_point: "Secure permits before signing lease",
          next_action: "Apply for food service permit this week",
          grade: "B+",
          grade_score: 82,
          citations: [
            {
              id: 1,
              agent_name: "Base Rate Archivist",
              claim: "42% failure rate in F&B first year",
              confidence: 8,
            },
            {
              id: 2,
              agent_name: "Regulatory Gatekeeper",
              claim: "Permit process takes 3-6 months in Gangnam",
              confidence: 9,
            },
            {
              id: 3,
              agent_name: "Demand Signal",
              claim: "Market growing 15% YoY in target segment",
              confidence: 7,
            },
          ],
        };
        send("verdict_artifact", verdict);
        await wait(500);

        // ── 10. Follow-up suggestions ──
        send("followup_suggestions", [
          "What if I start with a pop-up first?",
          "Which permits do I need first?",
          "How does the analysis change with 2x budget?",
          "Who are my top 3 competitors?",
        ]);
        await wait(300);

        // ── 11. Complete ──
        send("complete", { simulation_id: "sim_mock_001" });
      } catch {
        send("error", { message: "Simulation failed" });
      } finally {
        controller.close();
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
