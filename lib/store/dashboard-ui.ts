import { create } from 'zustand';

export type DashboardMode = 'simulate' | 'compare' | 'stress' | 'premortem';
export type DashboardTier = 'swarm' | 'specialist';
/** `home` = sidebar Home. `mode` = simulation mode rail. `operator` = My Operator onboarding (inline). */
export type DashboardModeNavFocus = 'home' | 'mode' | 'operator';

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
  /** Sidebar: Home vs mode icons — all modes share `/`, so this is separate from pathname. */
  modeNavFocus: DashboardModeNavFocus;
  activeTier: DashboardTier;
  /** Idle canvas + tier toggle UI: which simulate visualization to show (free users can preview specialist). */
  previewTier: DashboardTier;
  inputA: string;
  inputB: string;
  isRunning: boolean;
  currentRound: number;
  totalRounds: number;
  verdict: unknown | null;
  agentReports: unknown[];
  crowdVoices: unknown[];

  setActiveMode: (mode: DashboardMode) => void;
  setModeNavFocus: (focus: DashboardModeNavFocus) => void;
  setActiveTier: (tier: DashboardTier) => void;
  setPreviewTier: (previewTier: DashboardTier) => void;
  setInputA: (v: string) => void;
  setInputB: (v: string) => void;
  setSimulationProgress: (current: number, total: number) => void;
  setRunning: (v: boolean) => void;
  resetSession: () => void;
}

const initial: Omit<
  SimulationDashboardState,
  | 'setActiveMode'
  | 'setModeNavFocus'
  | 'setActiveTier'
  | 'setPreviewTier'
  | 'setInputA'
  | 'setInputB'
  | 'setSimulationProgress'
  | 'setRunning'
  | 'resetSession'
> = {
  activeMode: 'simulate',
  modeNavFocus: 'mode',
  activeTier: 'specialist',
  previewTier: 'specialist',
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

  setActiveMode: (activeMode) =>
    set((s) =>
      activeMode === 'stress' || activeMode === 'premortem'
        ? { activeMode, modeNavFocus: 'mode', activeTier: 'specialist', previewTier: 'specialist' }
        : { activeMode, modeNavFocus: 'mode', previewTier: s.previewTier },
    ),
  setModeNavFocus: (modeNavFocus) => set({ modeNavFocus }),
  setActiveTier: (activeTier) => set({ activeTier }),
  setPreviewTier: (previewTier) => set({ previewTier }),
  setInputA: (inputA) => set({ inputA }),
  setInputB: (inputB) => set({ inputB }),
  setSimulationProgress: (currentRound, totalRounds) => set({ currentRound, totalRounds }),
  setRunning: (isRunning) => set({ isRunning }),
  resetSession: () =>
    set((s) => ({
      inputA: '',
      inputB: '',
      isRunning: false,
      currentRound: 0,
      totalRounds: 10,
      verdict: null,
      agentReports: [],
      crowdVoices: [],
      previewTier: s.activeTier,
    })),
}));
