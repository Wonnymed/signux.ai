'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { PanelLeftClose, Home, Gem, UserCircle } from 'lucide-react';
import { cn } from '@/lib/design/cn';
import { normalizeTierType } from '@/lib/billing/tiers';
import { useBillingStore } from '@/lib/store/billing';
import { useDashboardUiStore, type DashboardMode } from '@/lib/store/dashboard-ui';
import { DARK_THEME } from '@/lib/dashboard/theme';
import SidebarModes, { DASHBOARD_SIDEBAR_MODES } from '@/components/dashboard/SidebarModes';
import SidebarHistory from '@/components/dashboard/SidebarHistory';
import UserProfilePopover from '@/components/dashboard/UserProfilePopover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/shadcn/tooltip';
import SukgoLogo from '@/components/brand/SukgoLogo';
import RailIcon from '@/components/shell/RailIcon';

const RAIL_TOOLTIP =
  'border border-white/[0.08] bg-[#1a1a1f] px-2.5 py-1.5 text-[12px] text-white/80 shadow-lg';

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
  const pathname = usePathname();
  const operatorActive = pathname === '/operator';
  const tier = useBillingStore((s) => s.tier);
  const fetchBalance = useBillingStore((s) => s.fetchBalance);
  const isFreeTier = normalizeTierType(tier) === 'free';

  const activeMode = useDashboardUiStore((s) => s.activeMode);
  const setActiveMode = useDashboardUiStore((s) => s.setActiveMode);
  const setActiveTier = useDashboardUiStore((s) => s.setActiveTier);
  const setPreviewTier = useDashboardUiStore((s) => s.setPreviewTier);

  useEffect(() => {
    void fetchBalance();
  }, [fetchBalance]);

  /** Free accounts bill at swarm; align preview canvas to swarm on load/tier sync. */
  useEffect(() => {
    if (normalizeTierType(tier) === 'free') {
      setActiveTier('swarm');
      setPreviewTier('swarm');
    }
  }, [tier, setActiveTier, setPreviewTier]);

  const selectMode = (mode: DashboardMode) => {
    setActiveMode(mode);
    if (pathname !== '/') {
      router.push('/');
    }
  };

  const asideBase = {
    backgroundColor: DARK_THEME.bg_sidebar,
    color: DARK_THEME.text_primary,
    borderColor: 'rgba(255,255,255,0.06)',
  } as const;

  if (layout === 'collapsed') {
    const homeActive = pathname === '/home';

    return (
      <TooltipProvider delayDuration={200}>
        <aside
          className="flex h-full w-full flex-col items-center border-r py-3 font-sans antialiased"
          style={asideBase}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onExpand}
                className="mb-2 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg p-0 transition-opacity hover:opacity-90"
                aria-label="Open sidebar"
              >
                <SukgoLogo variant="dark" size="md" showWordmark={false} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10} className={RAIL_TOOLTIP}>
              Open sidebar
            </TooltipContent>
          </Tooltip>

          <div className="flex flex-col items-center gap-1">
            <RailIcon tone="dark" icon={Home} label="Home" active={homeActive} href="/home" />
            <RailIcon
              tone="dark"
              icon={UserCircle}
              label="My Operator"
              active={operatorActive}
              href="/operator"
            />
          </div>

          <div className="my-2 h-px w-5 shrink-0 bg-white/[0.08]" role="presentation" aria-hidden />

          <div className="flex flex-col items-center gap-1">
            {DASHBOARD_SIDEBAR_MODES.map((m) => {
              const active = activeMode === m.id;
              return (
                <RailIcon
                  key={m.id}
                  tone="dark"
                  icon={m.Icon}
                  label={m.name}
                  active={active}
                  onClick={() => selectMode(m.id)}
                />
              );
            })}
          </div>

          <div className="my-2 h-px w-5 shrink-0 bg-white/[0.08]" role="presentation" aria-hidden />

          <div className="min-h-0 w-full min-w-0 flex-1 overflow-hidden">
            <SidebarHistory variant="rail" />
          </div>

          <div className="mt-auto flex w-full flex-col items-center gap-2 pb-1 pt-1">
            {isFreeTier ? (
              <RailIcon
                tone="dark"
                icon={Gem}
                label="Upgrade"
                href="/pricing"
                iconSize={20}
                tooltipClassName={RAIL_TOOLTIP}
              />
            ) : null}
            <UserProfilePopover variant="rail" />
          </div>
        </aside>
      </TooltipProvider>
    );
  }

  return (
    <aside className="flex h-full w-full shrink-0 flex-col border-r font-sans antialiased" style={asideBase}>
      <div
        className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3"
        style={{ borderColor: DARK_THEME.border_default }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <SukgoLogo variant="dark" size="md" showWordmark />
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

      <div className="space-y-2 px-3 pt-3">
        <Link
          href="/home"
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-[13px] font-medium transition-all',
            pathname === '/home'
              ? 'border-[#e8593c]/40 bg-[rgba(232,89,60,0.06)] text-white/85'
              : 'border-white/[0.08] text-white/60 hover:bg-white/[0.04] hover:text-white/70',
          )}
        >
          <Home size={16} strokeWidth={1.5} />
          Home
        </Link>
        <Link
          href="/operator"
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-[13px] font-medium transition-all',
            operatorActive
              ? 'border-[#e8593c]/40 bg-[rgba(232,89,60,0.06)] text-white/85'
              : 'border-white/[0.08] text-white/60 hover:bg-white/[0.04] hover:text-white/70',
          )}
        >
          <UserCircle size={16} strokeWidth={1.5} />
          My Operator
        </Link>
      </div>

      <div className="mt-4 min-h-0 flex flex-1 flex-col">
        <SidebarModes activeMode={activeMode} onSelect={setActiveMode} />
        <div className="mt-4 min-h-0 flex flex-1 flex-col">
          <SidebarHistory variant="full" />
        </div>
      </div>

      {isFreeTier && (
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
            <p className="text-[13px] font-semibold text-white/80">Upgrade to Pro — $29/mo</p>
            <p className="mt-0.5 text-[11px] text-white/35">Unlimited specialist sims</p>
          </Link>
        </div>
      )}

      <UserProfilePopover variant="full" />
    </aside>
  );
}
