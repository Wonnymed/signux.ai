'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PanelLeftClose, Plus, Gem } from 'lucide-react';
import { cn } from '@/lib/design/cn';
import { useBillingStore } from '@/lib/store/billing';
import { useDashboardUiStore } from '@/lib/store/dashboard-ui';
import { useSimulationStore } from '@/lib/store/simulation';
import { DARK_THEME } from '@/lib/dashboard/theme';
import SidebarModes, { DASHBOARD_SIDEBAR_MODES } from '@/components/dashboard/SidebarModes';
import SidebarHistory from '@/components/dashboard/SidebarHistory';
import UserProfilePopover from '@/components/dashboard/UserProfilePopover';

export type DashboardSidebarLayout = 'expanded' | 'collapsed' | 'drawer';

export default function DashboardSidebar({
  layout,
  onCollapse,
  onExpand,
}: {
  layout: DashboardSidebarLayout;
  onCollapse: () => void;
  onExpand: () => void;
}) {
  const router = useRouter();
  const tier = useBillingStore((s) => s.tier);
  const fetchBalance = useBillingStore((s) => s.fetchBalance);

  const activeMode = useDashboardUiStore((s) => s.activeMode);
  const setActiveMode = useDashboardUiStore((s) => s.setActiveMode);
  const resetSession = useDashboardUiStore((s) => s.resetSession);
  const setActiveTier = useDashboardUiStore((s) => s.setActiveTier);

  useEffect(() => {
    void fetchBalance();
  }, [fetchBalance]);

  useEffect(() => {
    if (tier === 'free') {
      setActiveTier('swarm');
    }
  }, [tier, setActiveTier]);

  const newSimulation = () => {
    resetSession();
    useSimulationStore.getState().reset();
    router.push('/');
  };

  const asideBase = {
    backgroundColor: DARK_THEME.bg_sidebar,
    color: DARK_THEME.text_primary,
    borderColor: 'rgba(255,255,255,0.06)',
  } as const;

  if (layout === 'collapsed') {
    return (
      <aside
        className="flex h-full w-full flex-col items-center border-r font-sans antialiased"
        style={asideBase}
      >
        <div className="flex w-full flex-col items-center px-2 pt-4">
          <button
            type="button"
            title="Open sidebar"
            aria-label="Open sidebar"
            onClick={onExpand}
            className="group flex h-8 w-8 items-center justify-center rounded-full transition-[transform,box-shadow] hover:scale-[1.03]"
          >
            <span
              className="h-[10px] w-[10px] shrink-0 rounded-full bg-[#e8593c] transition-shadow group-hover:shadow-[0_0_14px_rgba(232,89,60,0.85)]"
              style={{ boxShadow: '0 0 8px rgba(232,89,60,0.5)' }}
            />
          </button>
        </div>

        <div className="mt-3 flex w-full flex-col items-center px-2">
          <button
            type="button"
            title="New simulation"
            aria-label="New simulation"
            onClick={newSimulation}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/80 transition-colors hover:bg-white/[0.06]"
          >
            <Plus size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="mt-2 flex w-full flex-col items-center gap-1 px-2">
          {DASHBOARD_SIDEBAR_MODES.map((m) => {
            const active = activeMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                title={m.name}
                aria-label={m.name}
                onClick={() => setActiveMode(m.id)}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg border transition-colors',
                  m.iconBoxClass,
                )}
                style={{
                  borderColor: active ? DARK_THEME.accent_border : 'transparent',
                  backgroundColor: active ? DARK_THEME.accent_soft : undefined,
                }}
              >
                <m.Icon size={16} strokeWidth={1.75} className={m.iconClass} />
              </button>
            );
          })}
        </div>

        <SidebarHistory variant="rail" />

        {tier === 'free' && (
          <div className="mt-2 flex w-full justify-center px-2">
            <Link
              href="/pricing"
              title="Upgrade to Pro"
              aria-label="Upgrade to Pro"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[#e8593c] transition-colors hover:bg-white/[0.06]"
            >
              <Gem size={16} strokeWidth={1.75} />
            </Link>
          </div>
        )}

        <div className="mt-auto w-full border-t pt-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <UserProfilePopover variant="rail" />
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-full shrink-0 flex-col border-r font-sans antialiased" style={asideBase}>
      <div
        className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3"
        style={{ borderColor: DARK_THEME.border_default }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="h-[10px] w-[10px] shrink-0 rounded-full bg-[#e8593c]"
            style={{ boxShadow: '0 0 8px rgba(232,89,60,0.5)' }}
          />
          <span className="truncate text-[14px] font-medium tracking-tight text-white/90">Octux</span>
        </div>
        <button
          type="button"
          onClick={onCollapse}
          title="Close sidebar"
          aria-label="Close sidebar"
          className="group shrink-0 rounded-md p-1 transition-colors"
        >
          <PanelLeftClose
            size={18}
            strokeWidth={1.75}
            className="text-white/30 transition-colors group-hover:text-white/60"
          />
        </button>
      </div>

      <div className="px-3 pt-3">
        <button
          type="button"
          onClick={newSimulation}
          className="w-full rounded-[10px] border py-2.5 text-[13px] font-medium transition-colors hover:bg-white/[0.04]"
          style={{ borderColor: DARK_THEME.border_default, color: DARK_THEME.text_primary }}
        >
          + New simulation
        </button>
      </div>

      <div className="mt-4 min-h-0 flex flex-1 flex-col">
        <SidebarModes activeMode={activeMode} onSelect={setActiveMode} />
        <div className="mt-4 min-h-0 flex flex-1 flex-col">
          <SidebarHistory variant="full" />
        </div>
      </div>

      {tier === 'free' && (
        <div className="shrink-0 px-3 pb-3">
          <Link
            href="/pricing"
            className="block rounded-[10px] border p-3 transition-colors hover:bg-white/[0.04]"
            style={{
              borderColor: DARK_THEME.accent + '55',
              background: `linear-gradient(${DARK_THEME.bg_sidebar}, ${DARK_THEME.bg_sidebar}) padding-box, linear-gradient(135deg, ${DARK_THEME.accent}55, ${DARK_THEME.info}44) border-box`,
              border: '1px solid transparent',
            }}
          >
            <p className="text-[12px] font-semibold text-white/90">Upgrade to Pro — $29/mo</p>
            <p className="mt-0.5 text-[10px]" style={{ color: DARK_THEME.text_secondary }}>
              Unlimited specialist sims
            </p>
          </Link>
        </div>
      )}

      <UserProfilePopover variant="full" />
    </aside>
  );
}
