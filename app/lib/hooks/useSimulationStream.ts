"use client";

import { useState, useCallback, useRef } from "react";
import type {
  AgentReport,
  ConsensusState,
  DecisionObject,
  SimulationPlan,
  SimulationPhase,
} from "@/app/lib/types/simulation";
import type { AdvisorPersona } from "@/lib/agents/advisors";
import type { FieldScan } from "@/lib/simulation/field-intelligence";

export type PhaseState = {
  phase: SimulationPhase;
  status: "active" | "complete" | "pending";
};

export type RoundState = {
  round: number;
  title: string;
  description: string;
  status: "active" | "complete" | "pending" | "skipped";
};

type SimulationStreamState = {
  phases: PhaseState[];
  rounds: RoundState[];
  currentRound: number;
  agents: AgentReport[];
  plan: SimulationPlan | null;
  consensus: ConsensusState | null;
  verdict: DecisionObject | null;
  followups: string[];
  simulationId: string | null;
  isRunning: boolean;
  error: string | null;
  // Field Intelligence Network
  fieldPersonas: AdvisorPersona[] | null;
  fieldScans: FieldScan[];
  // Post-verdict analytics
  auditTrail: any | null;
  enrichedCitations: any[] | null;
  agentScores: any[] | null;
  verdictCritique: any | null;
  ledgerUpdates: any[];
  delegations: any[];
  counterFactual: any | null;
  blindSpots: any | null;
  stateSummary: any | null;
  evaluation: any | null;
  memory: { isReturningUser: boolean; factCount: number; hasProfile: boolean; previousSimCount: number; hasRecalledMemories: boolean; hasThreadHistory: boolean; threadId: string | null; hasAgentLessons: boolean } | null;
};

const BASE_PHASES: SimulationPhase[] = [
  "planning",
  "opening",
  "adversarial",
  "convergence",
  "verdict",
];

const TIMEOUT_MS = 60_000;

function buildPhases(): PhaseState[] {
  return BASE_PHASES.map((p) => ({ phase: p, status: "pending" as const }));
}

const initialState: SimulationStreamState = {
  phases: buildPhases(),
  rounds: [],
  currentRound: 0,
  agents: [],
  plan: null,
  consensus: null,
  verdict: null,
  followups: [],
  simulationId: null,
  isRunning: false,
  error: null,
  fieldPersonas: null,
  fieldScans: [],
  auditTrail: null,
  enrichedCitations: null,
  agentScores: null,
  verdictCritique: null,
  ledgerUpdates: [],
  delegations: [],
  counterFactual: null,
  blindSpots: null,
  stateSummary: null,
  evaluation: null,
  memory: null,
};

export function useSimulationStream() {
  const [state, setState] = useState<SimulationStreamState>(initialState);
  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimeout_ = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const resetTimeout = () => {
    clearTimeout_();
    timeoutRef.current = setTimeout(() => {
      if (abortRef.current) abortRef.current.abort();
      setState((s) => ({
        ...s,
        isRunning: false,
        error: "Simulation timed out — no response for 60 seconds",
      }));
    }, TIMEOUT_MS);
  };

  const startSimulation = useCallback(
    async (question: string, engine: string, enableCrowdWisdom = false, advisorGuidance?: string, advisorCount?: number) => {
      // Reset state
      setState({
        ...initialState,
        phases: buildPhases(),
        isRunning: true,
      });

      // Abort any existing stream
      if (abortRef.current) abortRef.current.abort();
      const abort = new AbortController();
      abortRef.current = abort;

      // Start timeout
      resetTimeout();

      try {
        const res = await fetch("/api/simulate/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, engine, enableCrowdWisdom, advisorGuidance: advisorGuidance || undefined, advisorCount: advisorCount || undefined }),
          signal: abort.signal,
        });

        if (!res.ok || !res.body) {
          clearTimeout_();
          setState((s) => ({
            ...s,
            isRunning: false,
            error: `Failed to start simulation (${res.status})`,
          }));
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Reset timeout on every chunk
          resetTimeout();

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events from buffer
          const lines = buffer.split("\n");
          buffer = "";

          let currentEvent = "";
          let currentData = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              currentData = line.slice(6).trim();
            } else if (line === "" && currentEvent && currentData) {
              processEvent(currentEvent, currentData, setState);
              currentEvent = "";
              currentData = "";
            } else if (line !== "") {
              buffer += line + "\n";
            }
          }

          if (currentEvent || currentData) {
            if (currentEvent) buffer += `event: ${currentEvent}\n`;
            if (currentData) buffer += `data: ${currentData}\n`;
          }
        }

        clearTimeout_();
        setState((s) => ({ ...s, isRunning: false }));
      } catch (err: unknown) {
        clearTimeout_();
        if (err instanceof Error && err.name === "AbortError") return;
        setState((s) => ({
          ...s,
          isRunning: false,
          error: err instanceof Error ? err.message : "Stream failed",
        }));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const stop = useCallback(() => {
    clearTimeout_();
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setState((s) => ({ ...s, isRunning: false }));
  }, []);

  return { ...state, startSimulation, stop };
}

/* ── Event processor ── */

function processEvent(
  event: string,
  dataStr: string,
  setState: React.Dispatch<React.SetStateAction<SimulationStreamState>>,
) {
  let data: unknown;
  try {
    data = JSON.parse(dataStr);
  } catch {
    console.error("[SSE] Failed to parse event data:", dataStr);
    return;
  }

  switch (event) {
    case "phase_start": {
      const { phase } = data as { phase: SimulationPhase };
      setState((s) => {
        const hasPhase = s.phases.some((p) => p.phase === phase);
        const phases = hasPhase
          ? s.phases
          : [...s.phases, { phase, status: "pending" as const }];
        return {
          ...s,
          phases: phases.map((p) => {
            if (p.phase === phase) return { ...p, status: "active" };
            const allPhases = phases.map((pp) => pp.phase);
            const phaseIdx = allPhases.indexOf(phase);
            const thisIdx = allPhases.indexOf(p.phase);
            if (thisIdx < phaseIdx && p.status === "active")
              return { ...p, status: "complete" };
            return p;
          }),
        };
      });
      break;
    }

    case "round_start": {
      const { round, title, description } = data as {
        round: number;
        title: string;
        description: string;
        total_rounds: number;
      };
      setState((s) => ({
        ...s,
        currentRound: round,
        rounds: [
          ...s.rounds.map((r) =>
            r.status === "active" ? { ...r, status: "complete" as const } : r,
          ),
          {
            round,
            title,
            description,
            status: "active" as const,
          },
        ],
      }));
      break;
    }

    case "round_complete": {
      const { round } = data as { round: number };
      setState((s) => ({
        ...s,
        rounds: s.rounds.map((r) =>
          r.round === round && r.status === "active"
            ? { ...r, status: "complete" as const }
            : r,
        ),
      }));
      break;
    }

    case "plan_complete":
      setState((s) => ({ ...s, plan: data as SimulationPlan }));
      break;

    case "agent_complete":
      setState((s) => ({
        ...s,
        agents: [...s.agents, data as AgentReport],
      }));
      break;

    case "consensus_update":
      setState((s) => ({ ...s, consensus: data as ConsensusState }));
      break;

    case "verdict_artifact":
      setState((s) => ({ ...s, verdict: data as DecisionObject }));
      break;

    case "followup_suggestions":
      setState((s) => ({ ...s, followups: data as string[] }));
      break;

    // Field Intelligence Network events
    case "crowd_personas":
      setState((s) => ({
        ...s,
        fieldPersonas: data as AdvisorPersona[],
      }));
      break;

    case "field_scan":
      setState((s) => ({
        ...s,
        fieldScans: [...s.fieldScans, data as FieldScan],
      }));
      break;

    // Post-verdict analytics events
    case "audit_complete":
      setState((s) => ({ ...s, auditTrail: data }));
      break;

    case "citations_enriched":
      setState((s) => ({ ...s, enrichedCitations: data as any[] }));
      break;

    case "agent_scores":
      setState((s) => ({ ...s, agentScores: data as any[] }));
      break;

    case "verdict_critique":
      setState((s) => ({ ...s, verdictCritique: data }));
      break;

    case "ledger_update":
    case "stall_replan":
      setState((s) => ({ ...s, ledgerUpdates: [...s.ledgerUpdates, data] }));
      break;

    case "delegation":
      setState((s) => ({ ...s, delegations: [...s.delegations, data] }));
      break;

    case "counter_factual":
      setState((s) => ({ ...s, counterFactual: data }));
      break;

    case "blind_spots":
      setState((s) => ({ ...s, blindSpots: data }));
      break;

    case "memory_loaded":
      setState((s) => ({ ...s, memory: data as SimulationStreamState['memory'] }));
      break;

    case "knowledge_graph_started":
      console.log('Knowledge graph extraction started for sim:', (data as Record<string, unknown>).simulation_id);
      break;

    case "reflect_triggered":
      console.log(`Reflect triggered at ${(data as Record<string, unknown>).sim_count} sims`);
      break;

    case "optimization_triggered":
      console.log(`Memory optimization triggered at ${(data as Record<string, unknown>).sim_count} sims`);
      break;

    case "agent_reflected": {
      const rd = data as Record<string, unknown>;
      console.log(`Agent ${rd.agent_id} reflected: ${rd.original_score} → ${rd.final_score} (${rd.iterations} iters)`);
      break;
    }

    case "state_summary":
      setState((s) => ({ ...s, stateSummary: data }));
      break;

    case "evaluation":
      setState((s) => ({ ...s, evaluation: data }));
      break;

    case "complete": {
      const { simulation_id } = data as { simulation_id: string };
      setState((s) => ({
        ...s,
        simulationId: simulation_id,
        phases: s.phases.map((p) =>
          p.status === "active" ? { ...p, status: "complete" } : p,
        ),
        rounds: s.rounds.map((r) =>
          r.status === "active" ? { ...r, status: "complete" as const } : r,
        ),
      }));
      break;
    }

    case "error": {
      const { message } = data as { message: string };
      setState((s) => ({
        ...s,
        error: message,
        isRunning: false,
      }));
      break;
    }
  }
}
