import type { SimulationChargeType } from '@/lib/billing/token-costs';
import type { DashboardMode, DashboardTier, SimulationDashboardState } from '@/lib/store/dashboard-ui';
import type { AgentStreamState, ConsensusState } from '@/lib/store/simulation';
import type { AgentNode, CanvasSimStatus, CanvasSnapshot, DebateEdge, VerdictData } from './types';

type SimSlice = {
  status: CanvasSimStatus;
  error: string | null;
  agents: Map<string, AgentStreamState>;
  consensus: ConsensusState | null;
  result: unknown;
  elapsed: number;
  activeChargeType: SimulationChargeType | null;
  /** Count of streamed God's View crowd voices (drives particle density on canvas). */
  crowdVoiceCount?: number;
};

function effectiveModeTier(
  dash: SimulationDashboardState,
  sim: SimSlice,
): { mode: DashboardMode; tier: DashboardTier } {
  const ct = sim.activeChargeType;
  if (!ct || sim.status === 'idle') {
    return { mode: dash.activeMode, tier: dash.activeTier };
  }
  if (ct === 'swarm') return { mode: 'simulate', tier: 'swarm' };
  if (ct === 'specialist') return { mode: 'simulate', tier: 'specialist' };
  if (ct === 'compare') return { mode: 'compare', tier: dash.activeTier };
  if (ct === 'stress_test') return { mode: 'stress', tier: dash.activeTier };
  if (ct === 'premortem') return { mode: 'premortem', tier: dash.activeTier };
  return { mode: dash.activeMode, tier: dash.activeTier };
}

const RUNNING: CanvasSimStatus[] = [
  'connecting',
  'planning',
  'opening',
  'adversarial',
  'converging',
  'verdict',
];

function mapAgents(map: Map<string, AgentStreamState>): AgentNode[] {
  return [...map.values()]
    .sort((a, b) => a.agent_id.localeCompare(b.agent_id))
    .map((a) => ({
      id: a.agent_id,
      name: a.agent_name || a.agent_id,
      position:
        a.status === 'complete' && a.position
          ? a.position
          : a.status === 'streaming'
            ? 'pending'
            : a.position || 'pending',
      confidence: typeof a.confidence === 'number' ? a.confidence : 5,
      argument: (a.partialResponse || '').slice(0, 160),
      isActive: a.status === 'streaming',
    }));
}

function padSpecialistSlots(agents: AgentNode[], running: boolean, minSlots: number): AgentNode[] {
  if (!running || agents.length >= minSlots) return agents;
  const out = [...agents];
  for (let i = out.length; i < minSlots; i++) {
    out.push({
      id: `placeholder-${i}`,
      name: `Specialist ${i + 1}`,
      position: 'pending',
      confidence: 0,
      argument: '',
      isActive: false,
    });
  }
  return out;
}

function buildEdges(agents: AgentNode[], round: number, total: number): DebateEdge[] {
  const settled = agents.filter((a) => a.position !== 'pending');
  if (settled.length < 2) return [];
  const progress = Math.min(1, round / Math.max(total, 1));
  const cap = Math.max(2, Math.floor(progress * settled.length * 2.2));
  const edges: DebateEdge[] = [];
  for (let i = 0; i < settled.length; i++) {
    for (let j = i + 1; j < settled.length; j++) {
      if (edges.length >= cap) return edges;
      const same = settled[i].position === settled[j].position;
      edges.push({
        sourceId: settled[i].id,
        targetId: settled[j].id,
        type: same ? 'agree' : 'disagree',
        strength: 0.55 + ((i + j) % 5) * 0.08,
      });
    }
  }
  return edges;
}

function consensusFromState(c: ConsensusState | null): number {
  if (!c) return 0;
  const sum = c.proceed + c.delay + c.abandon;
  if (sum <= 0) return 0;
  return Math.round((100 * c.proceed) / sum);
}

function fallbackRound(status: CanvasSimStatus, c: ConsensusState | null): number {
  if (c && typeof c.round === 'number' && c.round > 0) return c.round;
  const phase: Record<CanvasSimStatus, number> = {
    idle: 0,
    connecting: 0,
    planning: 1,
    opening: 2,
    adversarial: 5,
    converging: 8,
    verdict: 9,
    complete: 10,
    error: 0,
  };
  return phase[status] ?? 0;
}

function verdictFromResult(r: unknown): VerdictData | null {
  if (!r || typeof r !== 'object') return null;
  const o = r as Record<string, unknown>;
  let rec = o.recommendation;
  if (rec === 'proceed_with_conditions') rec = 'proceed';
  if (rec !== 'proceed' && rec !== 'delay' && rec !== 'abandon') return null;
  return {
    recommendation: rec as VerdictData['recommendation'],
    probability: typeof o.probability === 'number' ? o.probability : 0,
    grade: typeof o.grade === 'string' ? o.grade : undefined,
    one_liner: typeof o.one_liner === 'string' ? o.one_liner : undefined,
  };
}

/** Merge dashboard UI + simulation store into a single canvas snapshot. */
export function buildCanvasSnapshot(dash: SimulationDashboardState, sim: SimSlice): CanvasSnapshot {
  const { mode: viewMode, tier: viewTier } = effectiveModeTier(dash, sim);
  const simStatus = sim.status;
  const isRunning = RUNNING.includes(simStatus);
  let agents = mapAgents(sim.agents);

  if (viewMode === 'simulate' && viewTier === 'specialist') {
    agents = padSpecialistSlots(agents, isRunning, 10);
  }

  const totalRounds = sim.consensus?.totalRounds ?? 10;
  const currentRound = fallbackRound(simStatus, sim.consensus);
  const edges = buildEdges(agents, currentRound, totalRounds);

  let consensusTarget = consensusFromState(sim.consensus);
  if (simStatus === 'complete' && sim.result && typeof sim.result === 'object') {
    const p = (sim.result as Record<string, unknown>).probability;
    if (typeof p === 'number') consensusTarget = Math.round(p);
  }

  const completed = agents.filter((a) => a.position !== 'pending').length;
  const nCrowd = sim.crowdVoiceCount ?? 0;
  const voiceCount = Math.min(
    viewTier === 'swarm' && viewMode === 'simulate' ? 1000 : 520,
    nCrowd > 0
      ? Math.min(520, 48 + nCrowd * 5)
      : completed * 14 + Math.floor(sim.elapsed * 6),
  );

  return {
    mode: viewMode,
    tier: viewTier,
    demo: false,
    isRunning,
    simStatus,
    simError: sim.error,
    agents,
    edges,
    consensusTarget,
    currentRound,
    totalRounds,
    verdict: verdictFromResult(sim.result),
    voiceCount,
    elapsedSec: sim.elapsed,
  };
}

export const DEMO_AGENTS: AgentNode[] = [
  { id: 'd1', name: 'Demand Signal', position: 'proceed', confidence: 7, argument: 'Strong pull from core segments.', isActive: false },
  { id: 'd2', name: 'Unit Economics', position: 'proceed', confidence: 8, argument: 'Margins hold at scale.', isActive: false },
  { id: 'd3', name: 'Base Rate', position: 'delay', confidence: 6, argument: 'Historical failure rate elevated.', isActive: false },
  { id: 'd4', name: 'Regulatory', position: 'delay', confidence: 5, argument: 'Compliance timeline unclear.', isActive: false },
  { id: 'd5', name: 'Execution', position: 'proceed', confidence: 7, argument: 'Team has shipped before.', isActive: false },
  { id: 'd6', name: 'Competition', position: 'abandon', confidence: 4, argument: 'Incumbents can undercut.', isActive: false },
  { id: 'd7', name: 'Brand', position: 'proceed', confidence: 6, argument: 'Narrative resonates.', isActive: false },
  { id: 'd8', name: 'Capital', position: 'delay', confidence: 5, argument: 'Runway tight if revenue slips.', isActive: false },
  { id: 'd9', name: 'Tech risk', position: 'proceed', confidence: 6, argument: 'Stack is proven.', isActive: false },
  { id: 'd10', name: 'Market timing', position: 'proceed', confidence: 7, argument: 'Window is open.', isActive: false },
];

export function demoSnapshot(dash: SimulationDashboardState): CanvasSnapshot {
  const swarmDemo = dash.activeMode === 'simulate' && dash.activeTier === 'swarm';
  const layoutDemo = swarmDemo || dash.activeMode === 'compare' || dash.activeMode === 'stress' || dash.activeMode === 'premortem';
  const agents = layoutDemo ? [] : DEMO_AGENTS;
  const edges = layoutDemo ? [] : buildEdges(DEMO_AGENTS, 9, 10);
  return {
    mode: dash.activeMode,
    tier: dash.activeTier,
    demo: true,
    isRunning: false,
    simStatus: 'idle',
    simError: null,
    agents,
    edges,
    consensusTarget: 72,
    currentRound: 9,
    totalRounds: 10,
    verdict: {
      recommendation: 'proceed',
      probability: 72,
      grade: 'B+',
      one_liner: 'Strong upside with manageable risks.',
    },
    voiceCount: dash.activeTier === 'swarm' && dash.activeMode === 'simulate' ? 1000 : 127,
    elapsedSec: 0,
  };
}

/** Idle (no SSE agents) → ambient demo; otherwise live snapshot from the simulation store. */
export function getCanvasSnapshot(dash: SimulationDashboardState, sim: SimSlice): CanvasSnapshot {
  if (sim.status === 'idle' && sim.agents.size === 0 && !sim.error) {
    return demoSnapshot(dash);
  }
  return buildCanvasSnapshot(dash, sim);
}
