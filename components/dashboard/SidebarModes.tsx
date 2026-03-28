'use client';

import type { LucideIcon } from 'lucide-react';
import { Zap, ArrowLeftRight, ShieldAlert, Skull } from 'lucide-react';
import { cn } from '@/lib/design/cn';
import { DARK_THEME } from '@/lib/dashboard/theme';
import type { DashboardMode } from '@/lib/store/dashboard-ui';

const MODES: {
  id: DashboardMode;
  name: string;
  description: string;
  Icon: LucideIcon;
  iconBg: string;
}[] = [
  {
    id: 'simulate',
    name: 'Simulate',
    description: '10 specialists analyze your decision',
    Icon: Zap,
    iconBg: DARK_THEME.accent,
  },
  {
    id: 'compare',
    name: 'Compare',
    description: 'A vs B — which path wins?',
    Icon: ArrowLeftRight,
    iconBg: DARK_THEME.info,
  },
  {
    id: 'stress',
    name: 'Stress test',
    description: 'Find every way this plan can fail',
    Icon: ShieldAlert,
    iconBg: DARK_THEME.danger,
  },
  {
    id: 'premortem',
    name: 'Pre-mortem',
    description: 'It failed in 1 year. Why?',
    Icon: Skull,
    iconBg: DARK_THEME.warning,
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
        {MODES.map((m) => {
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
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: m.iconBg + '33' }}
                >
                  <m.Icon className="h-4 w-4" style={{ color: m.iconBg }} strokeWidth={1.75} />
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
