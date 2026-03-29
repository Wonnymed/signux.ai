'use client';

import type { LucideIcon } from 'lucide-react';
import { Zap, ArrowLeftRight, ShieldAlert, Skull } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/design/cn';
import { TRANSITIONS } from '@/lib/design/transitions';
import { useDashboardUiStore, type DashboardMode } from '@/lib/store/dashboard-ui';
import { useSimulationStore } from '@/lib/store/simulation';

export const DASHBOARD_SIDEBAR_MODES: {
  id: DashboardMode;
  name: string;
  description: string;
  Icon: LucideIcon;
  accent: string;
}[] = [
  {
    id: 'simulate',
    name: 'Simulate',
    description: 'Run the full analysis',
    Icon: Zap,
    accent: '#e8593c',
  },
  {
    id: 'compare',
    name: 'Compare',
    description: 'A vs B — which wins?',
    Icon: ArrowLeftRight,
    accent: '#60a5fa',
  },
  {
    id: 'stress',
    name: 'Stress test',
    description: 'Find the breaking point',
    Icon: ShieldAlert,
    accent: '#f87171',
  },
  {
    id: 'premortem',
    name: 'Pre-mortem',
    description: 'The failure autopsy',
    Icon: Skull,
    accent: '#fbbf24',
  },
];

export default function SidebarModes({
  activeMode,
  onSelect,
}: {
  activeMode: DashboardMode;
  onSelect: (mode: DashboardMode) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function handleModeClick(mode: DashboardMode) {
    if (mode === activeMode && pathname === '/') {
      useDashboardUiStore.getState().resetSession();
      useSimulationStore.getState().reset();
    }
    onSelect(mode);
    if (pathname !== '/') {
      router.push('/');
    }
  }

  return (
    <div className="px-3">
      <p className="mb-2 px-1 text-[10px] font-medium uppercase tracking-[2px] text-white/30">
        Simulation modes
      </p>
      <ul className="flex flex-col gap-0.5">
        {DASHBOARD_SIDEBAR_MODES.map((m) => {
          const active = activeMode === m.id;
          const Icon = m.Icon;
          return (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => handleModeClick(m.id)}
                className={cn(
                  'group relative flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150',
                  active ? 'bg-white/[0.03]' : 'hover:bg-white/[0.04]',
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="dashboard-mode-indicator"
                    className="absolute bottom-2 left-0 top-2 w-0.5 rounded-r"
                    style={{ backgroundColor: m.accent }}
                    transition={TRANSITIONS.spring}
                    aria-hidden
                  />
                ) : null}
                <Icon
                  size={18}
                  strokeWidth={1.5}
                  className={cn(
                    'mt-0.5 shrink-0 transition-colors',
                    active ? '' : 'text-white/40 group-hover:text-white/50',
                  )}
                  style={active ? { color: m.accent } : undefined}
                />
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      'text-[13px] transition-colors',
                      active
                        ? 'font-semibold text-white'
                        : 'font-medium text-white/70 group-hover:text-white/80',
                    )}
                  >
                    {m.name}
                  </div>
                  <div
                    className={cn(
                      'mt-0.5 text-[11px] leading-snug transition-colors',
                      active ? 'text-white/35' : 'text-white/25 group-hover:text-white/30',
                    )}
                  >
                    {m.description}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
