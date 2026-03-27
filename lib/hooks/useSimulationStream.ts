'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSimulationStore } from '@/lib/store/simulation';
import { useChatStore } from '@/lib/store/chat';
import { useAppStore } from '@/lib/store/app';
import { useBillingStore } from '@/lib/store/billing';
import { TOKEN_COSTS } from '@/lib/billing/tiers';
import { SIMULATION_TIMEOUT_MS } from '@/lib/simulation/phases';
import type { VerdictResult } from '@/lib/simulation/events';

// ─── RE-EXPORTED TYPES ───
// These types are consumed by simulation UI components that import from this module.

export interface StreamingAgent {
  agent_id: string;
  agent_name: string;
  role?: string;
  category?: string;
  status: 'pending' | 'streaming' | 'complete';
  position?: 'proceed' | 'delay' | 'abandon';
  confidence?: number;
  confidence_trend?: 'up' | 'down' | 'stable';
  partial_text?: string;
  key_argument?: string;
  evidence?: string[];
  risks?: string[];
  round?: number;
  report?: any;
}

export interface ChallengeEvent {
  challenger_name: string;
  challenged_name: string;
  topic?: string;
  round: number;
}

export interface ConsensusState {
  proceed: number;
  delay: number;
  abandon: number;
  total: number;
  avg_confidence: number;
  positions_changed: number;
  key_disagreement?: string;
  round?: number;
}

export interface HITLState {
  active: boolean;
  round: number;
  assumptions: Array<{ key: string; value: string }>;
}

export interface PhaseStep {
  name: string;
  status: 'pending' | 'active' | 'complete';
  description?: string;
  details?: Array<{
    task: string;
    status?: 'pending' | 'active' | 'complete';
    assigned_agent?: string;
  }>;
}

export interface VerdictState {
  streaming: boolean;
  complete: boolean;
  partial_text?: string;
  recommendation?: string;
  probability?: number;
  grade?: string;
  one_liner?: string;
  main_risk?: string;
  next_action?: string;
  disclaimer?: string;
  calibration_adjusted?: boolean;
}

/** Full simulation UI state returned by the 2-arg overload (used by SimulationBlock). */
export interface SimulationStreamState {
  phase: string;
  phases: PhaseStep[];
  agents: Map<string, StreamingAgent>;
  agentOrder: string[];
  challenges: ChallengeEvent[];
  consensus: ConsensusState;
  hitl: HITLState;
  verdict: VerdictState;
  elapsed: number;
  error?: string;
}

interface UseSimulationStreamOptions {
  conversationId: string;
}

// ─── OVERLOADS ───
// Overload 1: legacy 2-arg signature used by SimulationBlock (will be replaced in later PFs)
export function useSimulationStream(
  streamUrl: string,
  question: string,
): { state: SimulationStreamState; respondToHITL: (response: { approved: boolean; corrections?: Record<string, string> }) => void };
// Overload 2: current object-arg signature
export function useSimulationStream(
  options: UseSimulationStreamOptions,
): {
  triggerSimulation: (question: string, tier: string) => Promise<void>;
  cancel: () => void;
  isSimulating: boolean;
  status: string;
  error: string | null;
};

/**
 * Orchestration hook that bridges:
 *   - Simulation store (SSE state machine)
 *   - Chat store (add messages to thread)
 *   - App store (update sidebar verdict)
 *   - Billing store (consume tokens)
 */
export function useSimulationStream(
  streamUrlOrOptions: string | UseSimulationStreamOptions,
  question?: string,
): any {
  // Legacy 2-arg call (SimulationBlock) — stub returning empty state.
  // This overload will be replaced when SimulationBlock is rewritten.
  if (typeof streamUrlOrOptions === 'string') {
    const emptyConsensus: ConsensusState = { proceed: 0, delay: 0, abandon: 0, total: 0, avg_confidence: 0, positions_changed: 0 };
    const emptyHitl: HITLState = { active: false, round: 0, assumptions: [] };
    const emptyVerdict: VerdictState = { streaming: false, complete: false };
    const state: SimulationStreamState = {
      phase: 'idle',
      phases: [],
      agents: new Map(),
      agentOrder: [],
      challenges: [],
      consensus: emptyConsensus,
      hitl: emptyHitl,
      verdict: emptyVerdict,
      elapsed: 0,
    };
    const respondToHITL = (_response: { approved: boolean; corrections?: Record<string, string> }) => {};
    return { state, respondToHITL };
  }

  const { conversationId } = streamUrlOrOptions;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedRef = useRef(false);

  const simStatus = useSimulationStore((s) => s.status);
  const simResult = useSimulationStore((s) => s.result);
  const simError = useSimulationStore((s) => s.error);
  const simulationId = useSimulationStore((s) => s.simulationId);
  const startSimulation = useSimulationStore((s) => s.startSimulation);
  const stopSimulation = useSimulationStore((s) => s.stopSimulation);

  const addMessage = useChatStore((s) => s.addMessage);
  const setEntityState = useChatStore((s) => s.setEntityState);

  const updateConversation = useAppStore((s) => s.updateConversation);
  const consumeTokens = useBillingStore((s) => s.consumeTokens);

  // ─── TRIGGER SIMULATION ───
  const triggerSimulation = useCallback(
    async (question: string, tier: string) => {
      completedRef.current = false;

      try {
        let jokerPayload: Record<string, unknown> | null = null;
        let agentOverridesPayload: Record<string, unknown> = {};
        try {
          const profileRes = await fetch('/api/agents?action=profile');
          if (profileRes.ok) {
            const profileJson = await profileRes.json();
            const profile = profileJson?.data;
            if (profile?.joker_enabled) {
              jokerPayload = {
                id: 'joker',
                name: profile.joker_name || 'The Joker',
                role: profile.joker_role || '',
                bio: profile.joker_bio || '',
                risk_tolerance: profile.joker_risk_tolerance || 'moderate',
                priorities: profile.joker_priorities || [],
                biases: profile.joker_biases || '',
                isJoker: true,
              };
            }
            agentOverridesPayload = profile?.agent_overrides || {};
          }
        } catch {
          jokerPayload = null;
          agentOverridesPayload = {};
        }

        const res = await fetch(`/api/c/${conversationId}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'simulate',
            question,
            tier,
            joker: jokerPayload,
            agentOverrides: agentOverridesPayload,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));

          // Token gate
          if (res.status === 403) {
            addMessage({
              id: `upgrade-${Date.now()}`,
              message_type: 'system',
              role: 'system',
              content: null,
              structured_data: {
                type: 'upgrade_prompt',
                reason: errData.message || 'Insufficient tokens',
                suggestedTier: errData.suggestedTier || 'pro',
              },
              model_tier: tier,
              simulation_id: null,
              created_at: new Date().toISOString(),
            });
            return;
          }

          throw new Error(errData.error || 'Failed to start simulation');
        }

        const data = await res.json();
        if (!data.streamUrl) throw new Error('No stream URL returned');

        // Add simulation_start message to chat
        addMessage({
          id: `sim-start-${Date.now()}`,
          message_type: 'simulation_start',
          role: 'system',
          content: question,
          structured_data: { streamUrl: data.streamUrl, tier },
          model_tier: tier,
          simulation_id: null,
          created_at: new Date().toISOString(),
        });

        // Set entity state
        setEntityState('diving');

        // Start SSE via Zustand store
        startSimulation(data.streamUrl);

        // Set timeout
        timeoutRef.current = setTimeout(() => {
          if (!completedRef.current) {
            useSimulationStore.getState().setError('Simulation timed out. Please try again.');
            useSimulationStore.getState().stopSimulation();
            setEntityState('active');
          }
        }, SIMULATION_TIMEOUT_MS);
      } catch (error) {
        console.error('Simulation trigger failed:', error);
        addMessage({
          id: `sim-error-${Date.now()}`,
          message_type: 'text',
          role: 'assistant',
          content: `Failed to start simulation: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
          structured_data: null,
          model_tier: tier,
          simulation_id: null,
          created_at: new Date().toISOString(),
          _error: true,
        });
        setEntityState('active');
      }
    },
    [conversationId, addMessage, setEntityState, startSimulation],
  );

  // ─── HANDLE COMPLETION ───
  useEffect(() => {
    if (simStatus === 'complete' && simResult && !completedRef.current) {
      completedRef.current = true;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      addMessage({
        id: `verdict-${Date.now()}`,
        message_type: 'simulation_verdict',
        role: 'assistant',
        content: null,
        structured_data: simResult,
        model_tier: 'deep',
        simulation_id: simulationId,
        created_at: new Date().toISOString(),
      });

      setEntityState('resting');

      const verdict = simResult as VerdictResult;
      const rec = verdict?.recommendation?.toLowerCase();
      if (rec) {
        updateConversation(conversationId, {
          has_simulation: true,
          latest_verdict: rec,
          latest_verdict_probability: verdict?.probability || null,
          simulation_count: 1,
        });
      }

      consumeTokens(TOKEN_COSTS.deep);
    }
  }, [
    simStatus, simResult, simulationId, conversationId,
    addMessage, setEntityState, updateConversation, consumeTokens,
  ]);

  // ─── HANDLE ERROR ───
  useEffect(() => {
    if (simStatus === 'error' && simError && !completedRef.current) {
      completedRef.current = true;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      addMessage({
        id: `sim-error-${Date.now()}`,
        message_type: 'text',
        role: 'assistant',
        content: `Simulation error: ${simError}`,
        structured_data: null,
        model_tier: 'deep',
        simulation_id: null,
        created_at: new Date().toISOString(),
        _error: true,
      });

      setEntityState('active');
    }
  }, [simStatus, simError, addMessage, setEntityState]);

  // ─── CANCEL ───
  const cancel = useCallback(() => {
    completedRef.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    stopSimulation();
    setEntityState('active');
  }, [stopSimulation, setEntityState]);

  // ─── CLEANUP ON UNMOUNT ───
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    triggerSimulation,
    cancel,
    isSimulating: ['connecting', 'planning', 'opening', 'adversarial', 'converging', 'verdict'].includes(simStatus),
    status: simStatus,
    error: simError,
  };
}
