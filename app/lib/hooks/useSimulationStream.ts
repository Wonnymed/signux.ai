"use client";

import { useState, useCallback, useRef } from "react";
import type {
  AgentReport,
  ConsensusState,
  DecisionObject,
  SimulationPlan,
  SimulationPhase,
} from "@/app/lib/types/simulation";
import type { AdvisorPersona, CrowdWisdomResult } from "@/lib/agents/advisors";

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
  // Crowd wisdom
  crowdPersonas: AdvisorPersona[] | null;
  crowdResult: CrowdWisdomResult | null;
  crowdLoading: boolean;
};

const BASE_PHASES: SimulationPhase[] = [
  "planning",
  "opening",
  "adversarial",
  "convergence",
  "verdict",
];

const TIMEOUT_MS = 60_000;

function buildPhases(enableCrowdWisdom: boolean): PhaseState[] {
  const phases = [...BASE_PHASES];
  if (enableCrowdWisdom) phases.push("crowd_wisdom");
  return phases.map((p) => ({ phase: p, status: "pending" as const }));
}

const initialState: SimulationStreamState = {
  phases: buildPhases(false),
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
  crowdPersonas: null,
  crowdResult: null,
  crowdLoading: false,
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
    async (question: string, engine: string, enableCrowdWisdom = false) => {
      // Reset state with correct phases
      setState({
        ...initialState,
        phases: buildPhases(enableCrowdWisdom),
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
          body: JSON.stringify({ question, engine, enableCrowdWisdom }),
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
        // If crowd_wisdom phase arrives but wasn't in initial phases, add it
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
          // Mark all previous active rounds as complete
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

    // Crowd wisdom events
    case "crowd_personas":
      setState((s) => ({
        ...s,
        crowdPersonas: data as AdvisorPersona[],
        crowdLoading: true,
      }));
      break;

    case "crowd_advisor_complete":
      // Progressive — individual advisors arriving (tracked via crowdResult)
      break;

    case "crowd_complete":
      setState((s) => ({
        ...s,
        crowdResult: data as CrowdWisdomResult,
        crowdLoading: false,
      }));
      break;

    case "complete": {
      const { simulation_id } = data as { simulation_id: string };
      setState((s) => ({
        ...s,
        simulationId: simulation_id,
        crowdLoading: false,
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
