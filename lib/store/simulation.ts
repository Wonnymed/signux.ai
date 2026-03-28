import { create } from 'zustand';
import type { SimulationChargeType } from '@/lib/billing/token-costs';
import { parseSimulationChargeType } from '@/lib/billing/token-costs';
import type { GodViewVerdictSlice } from '@/lib/simulation/events';

export type SimPhaseStatus = 'pending' | 'active' | 'complete';

export interface SimPhase {
  name: string;
  status: SimPhaseStatus;
  description: string;
  details?: any[];
  startedAt?: string;
  completedAt?: string;
}

export interface AgentStreamState {
  agent_id: string;
  agent_name: string;
  role: string;
  status: 'pending' | 'streaming' | 'complete';
  position?: 'proceed' | 'delay' | 'abandon';
  confidence?: number;
  trend?: 'up' | 'down' | 'stable';
  partialResponse: string;
  report?: any;
}

export interface ConsensusState {
  proceed: number;
  delay: number;
  abandon: number;
  avgConfidence: number;
  positionsChanged: number;
  keyDisagreement?: string;
  round: number;
  totalRounds: number;
}

export interface CrowdVoiceStreamEntry {
  id: string;
  persona: string;
  role: string;
  sentiment: string;
  statement: string;
}

type SimStatus =
  | 'idle'
  | 'connecting'
  | 'planning'
  | 'opening'
  | 'adversarial'
  | 'converging'
  | 'verdict'
  | 'complete'
  | 'error';

interface SimulationState {
  status: SimStatus;
  setStatus: (status: SimStatus) => void;

  phases: SimPhase[];
  setPhases: (phases: SimPhase[]) => void;
  updatePhase: (name: string, updates: Partial<SimPhase>) => void;

  agents: Map<string, AgentStreamState>;
  updateAgent: (id: string, updates: Partial<AgentStreamState>) => void;
  appendAgentToken: (id: string, token: string) => void;

  consensus: ConsensusState | null;
  setConsensus: (consensus: ConsensusState) => void;

  /** Streamed market voices (God's View) — used for canvas particle density. */
  crowdVoices: CrowdVoiceStreamEntry[];
  godViewSummary: GodViewVerdictSlice | null;

  verdictText: string;
  appendVerdictToken: (token: string) => void;

  result: any | null;
  simulationId: string | null;
  setResult: (result: any, simulationId: string) => void;

  error: string | null;
  setError: (error: string) => void;

  /** Set when a simulation starts; drives canvas layout vs dashboard toggles. */
  activeChargeType: SimulationChargeType | null;

  startedAt: number | null;
  elapsed: number;
  setElapsed: (elapsed: number) => void;

  _abortController: AbortController | null;
  _timerRef: ReturnType<typeof setInterval> | null;

  startSimulation: (streamBody: Record<string, unknown>) => void;

  stopSimulation: () => void;

  reset: () => void;
}

const INITIAL_PHASES: SimPhase[] = [
  { name: 'Research Plan', status: 'pending', description: 'Decomposing question into sub-tasks' },
  { name: 'Opening Analysis', status: 'pending', description: 'Agents analyzing in parallel' },
  { name: 'Adversarial Debate', status: 'pending', description: 'Agents challenge each other' },
  { name: 'Convergence', status: 'pending', description: 'Final positions forming' },
  { name: 'Verdict', status: 'pending', description: 'Decision Object generated' },
];

function freshPhases(): SimPhase[] {
  return INITIAL_PHASES.map((p) => ({ ...p }));
}

function wrapSsePayload(
  eventName: string,
  parsed: unknown,
): { event: string; data: unknown } {
  switch (eventName) {
    case 'plan_complete':
      return {
        event: 'plan_complete',
        data: { plan: parsed, tasks: (parsed as { tasks?: unknown })?.tasks },
      };
    case 'verdict_artifact':
      return { event: 'verdict', data: parsed };
    case 'error':
      return {
        event: 'error',
        data:
          typeof parsed === 'object' && parsed !== null && 'message' in parsed
            ? parsed
            : { message: String(parsed) },
      };
    default:
      return { event: eventName, data: parsed };
  }
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  status: 'idle',
  setStatus: (status) => set({ status }),

  phases: freshPhases(),
  setPhases: (phases) => set({ phases }),
  updatePhase: (name, updates) =>
    set((s) => ({
      phases: s.phases.map((p) => (p.name === name ? { ...p, ...updates } : p)),
    })),

  agents: new Map(),
  updateAgent: (id, updates) =>
    set((s) => {
      const agents = new Map(s.agents);
      const existing = agents.get(id) || {
        agent_id: id,
        agent_name: id,
        role: '',
        status: 'pending' as const,
        partialResponse: '',
      };
      agents.set(id, { ...existing, ...updates });
      return { agents };
    }),
  appendAgentToken: (id, token) =>
    set((s) => {
      const agents = new Map(s.agents);
      const existing = agents.get(id);
      if (existing) {
        agents.set(id, {
          ...existing,
          status: 'streaming',
          partialResponse: existing.partialResponse + token,
        });
      }
      return { agents };
    }),

  consensus: null,
  setConsensus: (consensus) => set({ consensus }),

  crowdVoices: [],
  godViewSummary: null,

  verdictText: '',
  appendVerdictToken: (token) =>
    set((s) => ({ verdictText: s.verdictText + token })),

  result: null,
  simulationId: null,
  setResult: (result, simulationId) => set({ result, simulationId, status: 'complete' }),

  error: null,
  setError: (error) => set({ error, status: 'error' }),

  activeChargeType: null,

  startedAt: null,
  elapsed: 0,
  setElapsed: (elapsed) => set({ elapsed }),

  _abortController: null,
  _timerRef: null,

  startSimulation: (streamBody) => {
    get().stopSimulation();

    const activeChargeType = parseSimulationChargeType(streamBody.simMode);

    set({
      status: 'connecting',
      phases: freshPhases(),
      agents: new Map(),
      consensus: null,
      crowdVoices: [],
      godViewSummary: null,
      verdictText: '',
      result: null,
      simulationId: null,
      error: null,
      activeChargeType,
      startedAt: Date.now(),
      elapsed: 0,
    });

    const timer = setInterval(() => {
      const started = get().startedAt;
      if (started) set({ elapsed: Math.floor((Date.now() - started) / 1000) });
    }, 1000);
    set({ _timerRef: timer });

    const ac = new AbortController();
    set({ _abortController: ac });

    void (async () => {
      try {
        const res = await fetch('/api/simulate/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(streamBody),
          signal: ac.signal,
        });

        if (!res.ok) {
          const ct = res.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const j = (await res.json().catch(() => ({}))) as {
              message?: string;
              error?: string;
            };
            get().setError(j.message || j.error || `Simulation failed (${res.status})`);
          } else {
            get().setError(`Simulation failed (${res.status})`);
          }
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          get().setError('No response body');
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        const dispatch = (raw: { event: string; data: unknown }) => {
          const data = wrapSsePayload(raw.event, raw.data);
          const { updateAgent, appendAgentToken, setConsensus, appendVerdictToken, setResult, setStatus } =
            get();

          switch (data.event) {
            case 'phase_update':
            case 'phase_start': {
              const phase = (data.data as { phase?: string } | null)?.phase;
              if (phase) {
                const phaseMap: Record<string, string> = {
                  planning: 'Research Plan',
                  opening: 'Opening Analysis',
                  adversarial: 'Adversarial Debate',
                  convergence: 'Convergence',
                  verdict: 'Verdict',
                };
                const phaseName = phaseMap[phase] || phase;

                set((s) => ({
                  phases: s.phases.map((p) => {
                    if (p.name === phaseName) return { ...p, status: 'active' as const };
                    if (p.status === 'active') return { ...p, status: 'complete' as const };
                    return p;
                  }),
                }));

                setStatus(phase as SimStatus);
              }
              break;
            }

            case 'plan_complete':
              set((s) => ({
                phases: s.phases.map((p) =>
                  p.name === 'Research Plan'
                    ? {
                        ...p,
                        status: 'complete' as const,
                        details: (data.data as { plan?: unknown; tasks?: unknown })?.plan ||
                          (data.data as { tasks?: unknown })?.tasks,
                      }
                    : p,
                ),
              }));
              break;

            case 'agent_token':
              appendAgentToken(
                (data.data as { agent_id?: string })?.agent_id,
                (data.data as { token?: string })?.token || '',
              );
              break;

            case 'agent_report':
            case 'agent_complete': {
              const d = data.data as Record<string, unknown>;
              updateAgent(String(d?.agent_id || d?.agent_name || ''), {
                agent_name: String(d?.agent_name || d?.agent_id || ''),
                role: String(d?.role || ''),
                status: 'complete',
                position: d?.position as AgentStreamState['position'],
                confidence: d?.confidence as number | undefined,
                report: d,
              });
              break;
            }

            case 'consensus_update':
              setConsensus(data.data as ConsensusState);
              break;

            case 'crowd_round_started':
              set({ crowdVoices: [], godViewSummary: null });
              break;

            case 'crowd_voice': {
              const d = data.data as {
                persona?: string;
                role?: string;
                sentiment?: string;
                statement?: string;
              };
              set((s) => ({
                crowdVoices: [
                  ...s.crowdVoices,
                  {
                    id: `cv_${s.crowdVoices.length}_${Date.now()}`,
                    persona: String(d.persona || ''),
                    role: String(d.role || ''),
                    sentiment: String(d.sentiment || 'neutral'),
                    statement: String(d.statement || ''),
                  },
                ],
              }));
              break;
            }

            case 'crowd_summary':
              set({ godViewSummary: data.data as GodViewVerdictSlice });
              break;

            case 'crowd_round_complete':
              break;

            case 'verdict_token':
              appendVerdictToken((data.data as { token?: string })?.token || '');
              break;

            case 'verdict':
            case 'simulation_complete': {
              const d = data.data as { simulation_id?: string };
              setResult(data.data, d?.simulation_id || '');
              set((s) => ({
                phases: s.phases.map((p) => ({ ...p, status: 'complete' as const })),
              }));
              break;
            }

            case 'error':
              set({
                error: (data.data as { message?: string })?.message || 'Simulation failed',
                status: 'error',
              });
              break;

            case 'hitl_pause':
            case 'hitl_checkpoint':
              break;
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split('\n\n');
          buffer = chunks.pop() || '';

          for (const block of chunks) {
            if (!block.trim()) continue;
            let eventName = 'message';
            let dataStr = '';
            for (const line of block.split('\n')) {
              if (line.startsWith('event:')) eventName = line.slice(6).trim();
              else if (line.startsWith('data:')) dataStr += line.slice(5).trimStart();
            }
            if (!dataStr) continue;
            try {
              const parsed = JSON.parse(dataStr) as unknown;
              dispatch({ event: eventName, data: parsed });
            } catch {
              /* ignore bad chunk */
            }
          }
        }

        const { status } = get();
        if (status !== 'complete' && status !== 'error') {
          set({ error: 'Stream ended unexpectedly', status: 'error' });
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        get().setError(err instanceof Error ? err.message : 'Simulation failed');
      } finally {
        clearInterval(timer);
        set({ _timerRef: null, _abortController: null });
      }
    })();
  },

  stopSimulation: () => {
    const { _abortController, _timerRef } = get();
    _abortController?.abort();
    if (_timerRef) clearInterval(_timerRef);
    set({ _abortController: null, _timerRef: null });
  },

  reset: () => {
    get().stopSimulation();
    set({
      status: 'idle',
      phases: freshPhases(),
      agents: new Map(),
      consensus: null,
      crowdVoices: [],
      godViewSummary: null,
      verdictText: '',
      result: null,
      simulationId: null,
      error: null,
      activeChargeType: null,
      startedAt: null,
      elapsed: 0,
    });
  },
}));
