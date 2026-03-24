"use client";

import { useState, useCallback, useRef } from "react";
import type {
  AgentReport,
  ConsensusState,
  DecisionObject,
  SimulationPlan,
  SimulationPhase,
} from "@/app/lib/types/simulation";

export type PhaseState = {
  phase: SimulationPhase;
  status: "active" | "complete" | "pending";
};

type SimulationStreamState = {
  phases: PhaseState[];
  agents: AgentReport[];
  plan: SimulationPlan | null;
  consensus: ConsensusState | null;
  verdict: DecisionObject | null;
  followups: string[];
  simulationId: string | null;
  isRunning: boolean;
  error: string | null;
};

const PHASE_ORDER: SimulationPhase[] = [
  "planning",
  "opening",
  "adversarial",
  "convergence",
  "verdict",
];

const TIMEOUT_MS = 60_000;

const initialState: SimulationStreamState = {
  phases: PHASE_ORDER.map((p) => ({ phase: p, status: "pending" as const })),
  agents: [],
  plan: null,
  consensus: null,
  verdict: null,
  followups: [],
  simulationId: null,
  isRunning: false,
  error: null,
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
      // No events received for 60s — timeout
      if (abortRef.current) abortRef.current.abort();
      setState((s) => ({
        ...s,
        isRunning: false,
        error: "Simulation timed out — no response for 60 seconds",
      }));
    }, TIMEOUT_MS);
  };

  const startSimulation = useCallback(
    async (question: string, engine: string) => {
      // Reset state
      setState({
        ...initialState,
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
          body: JSON.stringify({ question, engine }),
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
              // Complete event — process it
              processEvent(currentEvent, currentData, setState);
              currentEvent = "";
              currentData = "";
            } else if (line !== "") {
              // Incomplete — put back in buffer
              buffer += line + "\n";
            }
          }

          // If we have an incomplete event, put it back
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
      setState((s) => ({
        ...s,
        phases: s.phases.map((p) => {
          if (p.phase === phase) return { ...p, status: "active" };
          // Mark previous phases as complete
          const phaseIdx = PHASE_ORDER.indexOf(phase);
          const thisIdx = PHASE_ORDER.indexOf(p.phase);
          if (thisIdx < phaseIdx && p.status === "active")
            return { ...p, status: "complete" };
          return p;
        }),
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

    case "complete": {
      const { simulation_id } = data as { simulation_id: string };
      setState((s) => ({
        ...s,
        simulationId: simulation_id,
        phases: s.phases.map((p) =>
          p.status === "active" ? { ...p, status: "complete" } : p,
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
