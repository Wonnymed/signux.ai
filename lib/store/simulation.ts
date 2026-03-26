import { create } from 'zustand';

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

type SimStatus = 'idle' | 'connecting' | 'planning' | 'opening' | 'adversarial' | 'converging' | 'verdict' | 'complete' | 'error';

interface SimulationState {
  // State machine
  status: SimStatus;
  setStatus: (status: SimStatus) => void;

  // Phases
  phases: SimPhase[];
  setPhases: (phases: SimPhase[]) => void;
  updatePhase: (name: string, updates: Partial<SimPhase>) => void;

  // Agents
  agents: Map<string, AgentStreamState>;
  updateAgent: (id: string, updates: Partial<AgentStreamState>) => void;
  appendAgentToken: (id: string, token: string) => void;

  // Consensus
  consensus: ConsensusState | null;
  setConsensus: (consensus: ConsensusState) => void;

  // Verdict (streaming)
  verdictText: string;
  appendVerdictToken: (token: string) => void;

  // Final result
  result: any | null;
  simulationId: string | null;
  setResult: (result: any, simulationId: string) => void;

  // Error
  error: string | null;
  setError: (error: string) => void;

  // Elapsed time
  startedAt: number | null;
  elapsed: number;
  setElapsed: (elapsed: number) => void;

  // EventSource reference (for cleanup)
  _eventSourceRef: EventSource | null;
  _timerRef: ReturnType<typeof setInterval> | null;

  // Start simulation (connects to SSE)
  startSimulation: (streamUrl: string) => void;

  // Stop simulation (cleanup)
  stopSimulation: () => void;

  // Reset
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

  verdictText: '',
  appendVerdictToken: (token) =>
    set((s) => ({ verdictText: s.verdictText + token })),

  result: null,
  simulationId: null,
  setResult: (result, simulationId) => set({ result, simulationId, status: 'complete' }),

  error: null,
  setError: (error) => set({ error, status: 'error' }),

  startedAt: null,
  elapsed: 0,
  setElapsed: (elapsed) => set({ elapsed }),

  _eventSourceRef: null,
  _timerRef: null,

  startSimulation: (streamUrl) => {
    const { stopSimulation } = get();
    stopSimulation(); // cleanup previous

    set({
      status: 'connecting',
      phases: freshPhases(),
      agents: new Map(),
      consensus: null,
      verdictText: '',
      result: null,
      simulationId: null,
      error: null,
      startedAt: Date.now(),
      elapsed: 0,
    });

    // Timer
    const timer = setInterval(() => {
      const started = get().startedAt;
      if (started) set({ elapsed: Math.floor((Date.now() - started) / 1000) });
    }, 1000);
    set({ _timerRef: timer });

    const es = new EventSource(streamUrl);
    set({ _eventSourceRef: es });

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const { updateAgent, appendAgentToken, setConsensus, appendVerdictToken, setResult, setStatus } = get();

        switch (data.event) {
          case 'phase_update':
          case 'phase_start': {
            const phase = data.data?.phase;
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
                  ? { ...p, status: 'complete' as const, details: data.data?.plan || data.data?.tasks }
                  : p
              ),
            }));
            break;

          case 'agent_token':
            appendAgentToken(data.data?.agent_id, data.data?.token || '');
            break;

          case 'agent_report':
          case 'agent_complete':
            updateAgent(data.data?.agent_id || data.data?.agent_name, {
              agent_name: data.data?.agent_name || data.data?.agent_id,
              role: data.data?.role || '',
              status: 'complete',
              position: data.data?.position,
              confidence: data.data?.confidence,
              report: data.data,
            });
            break;

          case 'consensus_update':
            setConsensus(data.data);
            break;

          case 'verdict_token':
            appendVerdictToken(data.data?.token || '');
            break;

          case 'verdict':
          case 'simulation_complete':
            setResult(data.data, data.data?.simulation_id || '');
            set((s) => ({
              phases: s.phases.map((p) => ({ ...p, status: 'complete' as const })),
            }));
            es.close();
            clearInterval(timer);
            break;

          case 'error':
            set({ error: data.data?.message || 'Simulation failed', status: 'error' });
            es.close();
            clearInterval(timer);
            break;

          case 'hitl_pause':
            // HITL checkpoint — keep current phase, UI shows checkpoint
            break;
        }
      } catch {
        // Ignore parse errors
      }
    };

    es.onerror = () => {
      const { status } = get();
      if (status !== 'complete' && status !== 'error') {
        set({ error: 'Connection lost', status: 'error' });
      }
      es.close();
      clearInterval(timer);
    };
  },

  stopSimulation: () => {
    const { _eventSourceRef, _timerRef } = get();
    if (_eventSourceRef) _eventSourceRef.close();
    if (_timerRef) clearInterval(_timerRef);
    set({ _eventSourceRef: null, _timerRef: null });
  },

  reset: () => {
    get().stopSimulation();
    set({
      status: 'idle',
      phases: freshPhases(),
      agents: new Map(),
      consensus: null,
      verdictText: '',
      result: null,
      simulationId: null,
      error: null,
      startedAt: null,
      elapsed: 0,
    });
  },
}));
