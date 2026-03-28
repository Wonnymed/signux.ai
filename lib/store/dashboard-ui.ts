import { create } from 'zustand';

export type DashboardMode = 'simulate' | 'compare' | 'stress' | 'premortem';
export type DashboardTier = 'swarm' | 'specialist';

/** Maps dashboard mode + tier to API simulation charge types. */
export function dashboardModeToChargeType(
  mode: DashboardMode,
  tier: DashboardTier,
): 'swarm' | 'specialist' | 'compare' | 'stress_test' | 'premortem' {
  if (mode === 'compare') return 'compare';
  if (mode === 'stress') return 'stress_test';
  if (mode === 'premortem') return 'premortem';
  return tier === 'swarm' ? 'swarm' : 'specialist';
}

export interface SimulationDashboardState {
  activeMode: DashboardMode;
  activeTier: DashboardTier;
  inputA: string;
  inputB: string;
  isRunning: boolean;
  currentRound: number;
  totalRounds: number;
  verdict: unknown | null;
  agentReports: unknown[];
  crowdVoices: unknown[];

  setActiveMode: (mode: DashboardMode) => void;
  setActiveTier: (tier: DashboardTier) => void;
  setInputA: (v: string) => void;
  setInputB: (v: string) => void;
  setSimulationProgress: (current: number, total: number) => void;
  setRunning: (v: boolean) => void;
  resetSession: () => void;
}

const initial: Omit<
  SimulationDashboardState,
  | 'setActiveMode'
  | 'setActiveTier'
  | 'setInputA'
  | 'setInputB'
  | 'setSimulationProgress'
  | 'setRunning'
  | 'resetSession'
> = {
  activeMode: 'simulate',
  activeTier: 'specialist',
  inputA: '',
  inputB: '',
  isRunning: false,
  currentRound: 0,
  totalRounds: 10,
  verdict: null,
  agentReports: [],
  crowdVoices: [],
};

export const useDashboardUiStore = create<SimulationDashboardState>((set) => ({
  ...initial,

  setActiveMode: (activeMode) => set({ activeMode }),
  setActiveTier: (activeTier) => set({ activeTier }),
  setInputA: (inputA) => set({ inputA }),
  setInputB: (inputB) => set({ inputB }),
  setSimulationProgress: (currentRound, totalRounds) => set({ currentRound, totalRounds }),
  setRunning: (isRunning) => set({ isRunning }),
  resetSession: () =>
    set({
      inputA: '',
      inputB: '',
      isRunning: false,
      currentRound: 0,
      totalRounds: 10,
      verdict: null,
      agentReports: [],
      crowdVoices: [],
    }),
}));
