'use client';

import type { LucideIcon } from 'lucide-react';
import { Zap, ArrowLeftRight, ShieldAlert, Skull } from 'lucide-react';
import { cn } from '@/lib/design/cn';
import { DARK_THEME } from '@/lib/dashboard/theme';
import type { DashboardMode } from '@/lib/store/dashboard-ui';

export const DASHBOARD_SIDEBAR_MODES: {
  id: DashboardMode;
  name: string;
  description: string;
  Icon: LucideIcon;
  iconBoxClass: string;
  iconClass: string;
}[] = [
  {
    id: 'simulate',
    name: 'Simulate',
    description: '10 specialists analyze your decision',
    Icon: Zap,
    iconBoxClass: 'bg-[rgba(232,89,60,0.12)]',
    iconClass: 'text-[#e8593c]',
  },
  {
    id: 'compare',
    name: 'Compare',
    description: 'A vs B — which path wins?',
    Icon: ArrowLeftRight,
    iconBoxClass: 'bg-[rgba(96,165,250,0.12)]',
    iconClass: 'text-[#60a5fa]',
  },
  {
    id: 'stress',
    name: 'Stress test',
    description: 'Find every way this plan can fail',
    Icon: ShieldAlert,
    iconBoxClass: 'bg-[rgba(248,113,113,0.12)]',
    iconClass: 'text-[#f87171]',
  },
  {
    id: 'premortem',
    name: 'Pre-mortem',
    description: 'It failed in 1 year. Why?',
    Icon: Skull,
    iconBoxClass: 'bg-[rgba(251,191,36,0.12)]',
    iconClass: 'text-[#fbbf24]',
  },
];

export default function SidebarModes({
  activeMode,
  onSelect,
}: {
  activeMode: DashboardMode;
  onSelect: (mode: DashboardMode) => void;
}) {
  return (
    <div className="px-3">
      <p
        className="mb-2 px-1 text-[9px] font-medium uppercase tracking-[0.2em]"
        style={{ color: DARK_THEME.text_tertiary }}
      >
        Simulation modes
      </p>
      <ul className="flex flex-col gap-1">
        {DASHBOARD_SIDEBAR_MODES.map((m) => {
          const active = activeMode === m.id;
          return (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => onSelect(m.id)}
                className={cn(
                  'flex w-full items-start gap-2.5 rounded-[10px] border px-2.5 py-2 text-left transition-colors',
                )}
                style={{
                  borderColor: active ? DARK_THEME.accent_border : DARK_THEME.border_default,
                  backgroundColor: active ? DARK_THEME.accent_soft : 'transparent',
                }}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                    m.iconBoxClass,
                  )}
                >
                  <m.Icon size={16} strokeWidth={1.75} className={m.iconClass} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-medium text-white/90">{m.name}</span>
                  <span className="mt-0.5 block text-[10px] leading-snug" style={{ color: DARK_THEME.text_secondary }}>
                    {m.description}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
