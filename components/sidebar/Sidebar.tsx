'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  PanelLeftClose,
  MessageSquare,
  Pin,
  MoreHorizontal,
  Home,
  BarChart3,
  Settings2,
  Zap,
  ChevronRight,
  LogIn,
  LogOut,
  Moon,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/design/cn';
import { useAppStore, type ConversationSummary } from '@/lib/store/app';
import { useBillingStore } from '@/lib/store/billing';
import { useAuth } from '@/components/auth/AuthProvider';
import { TIERS, type TierType } from '@/lib/billing/tiers';
import { OCTUX_TOOLS, type OctuxTool } from '@/lib/tools/config';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/shadcn/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/shadcn/dropdown-menu';
import { Skeleton } from '@/components/ui/shadcn/skeleton';
import ConversationContextMenu from './ConversationContextMenu';
import InlineRename from './InlineRename';

const SIDEBAR_BG = '#0E0E16';
const ICON_STROKE = 1.5;
const EXPANDED_W = 256;
const COLLAPSED_W = 56;

/** Okara flyout order: Compare → Risk Matrix → Templates → Journal */
const TOOLS_FLYOUT_ORDER = ['compare', 'risk-matrix', 'templates', 'journal'] as const;

function getToolsForFlyout(): OctuxTool[] {
  return TOOLS_FLYOUT_ORDER.map((slug) => OCTUX_TOOLS.find((t) => t.slug === slug)).filter(
    (t): t is OctuxTool => !!t,
  );
}

export default function Sidebar() {
  const expanded = useAppStore((s) => s.sidebarExpanded);
  return expanded ? <SidebarExpanded /> : <SidebarCollapsed />;
}

// ═══════════════════════════════════════════════════════════════════════════
// Collapsed — 56px icon rail (instant swap, no width animation)
// ═══════════════════════════════════════════════════════════════════════════

function SidebarCollapsed() {
  const router = useRouter();
  const pathname = usePathname();
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const setSidebarExpanded = useAppStore((s) => s.setSidebarExpanded);
  const tier = useBillingStore((s) => s.tier);

  const toolsActive = pathname.startsWith('/tools');

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className="flex h-dvh shrink-0 flex-col items-center border-r border-white/[0.04] py-4 select-none"
        style={{ width: COLLAPSED_W, backgroundColor: SIDEBAR_BG }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggleSidebar}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent/70 to-cyan-500/40 transition-transform hover:scale-[1.02]"
              aria-label="Open sidebar"
            >
              <span className="text-sm leading-none">🐙</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Open sidebar</TooltipContent>
        </Tooltip>

        <div className="h-2 shrink-0" />

        <CollapsedIconButton onClick={() => router.push('/')} tooltip="New conversation">
          <Plus size={17} strokeWidth={ICON_STROKE} />
        </CollapsedIconButton>

        <CollapsedIconButton
          onClick={() => router.push('/')}
          tooltip="Home"
          active={pathname === '/'}
        >
          <Home size={17} strokeWidth={ICON_STROKE} />
        </CollapsedIconButton>

        <CollapsedIconButton
          onClick={() => router.push('/tools/journal')}
          tooltip="Decision Journal"
          active={pathname === '/tools/journal' || pathname?.startsWith('/tools/journal/')}
        >
          <BarChart3 size={17} strokeWidth={ICON_STROKE} />
        </CollapsedIconButton>

        <ToolsFlyoutMenu pathname={pathname} variant="collapsed" toolsActive={toolsActive} />

        <CollapsedIconButton onClick={() => setSidebarExpanded(true)} tooltip="Conversations">
          <Clock size={17} strokeWidth={ICON_STROKE} />
        </CollapsedIconButton>

        <div className="min-h-2 flex-1" />

        <CollapsedIconButton
          onClick={() => router.push('/pricing')}
          tooltip="Upgrade to Pro"
        >
          <Zap size={17} className="text-accent" strokeWidth={ICON_STROKE} />
        </CollapsedIconButton>

        <ProfileMenu variant="collapsed" tier={tier} />
      </div>
    </TooltipProvider>
  );
}

function CollapsedIconButton({
  children,
  onClick,
  tooltip,
  active = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tooltip: string;
  active?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            'relative mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all',
            active
              ? 'bg-accent/[0.08] text-white/80'
              : 'text-white/25 hover:bg-white/[0.04] hover:text-white/55',
          )}
        >
          {active && (
            <span className="absolute left-0 top-1/2 h-3 w-[2px] -translate-y-1/2 rounded-full bg-accent" />
          )}
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Expanded — 256px
// ═══════════════════════════════════════════════════════════════════════════

function SidebarExpanded() {
  const router = useRouter();
  const pathname = usePathname();
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const setExpanded = useAppStore((s) => s.setSidebarExpanded);
  const conversations = useAppStore((s) => s.conversations);
  const loading = useAppStore((s) => s.conversationsLoading);
  const setActiveId = useAppStore((s) => s.setActiveConversationId);

  const tier = useBillingStore((s) => s.tier);
  const tokensRemaining = useBillingStore((s) => s.tokensRemaining);
  const tokensTotal = useBillingStore((s) => s.tokensTotal);

  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const match = pathname?.match(/^\/c\/(.+)/);
    setActiveId(match ? match[1] : null);
  }, [pathname, setActiveId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '[' && !e.metaKey && !e.ctrlKey && !isInputFocused()) {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleSidebar]);

  useEffect(() => {
    const focusSearch = () => {
      setExpanded(true);
      setTimeout(() => setSearchActive(true), 120);
    };
    window.addEventListener('octux:focus-sidebar-search', focusSearch);
    return () => window.removeEventListener('octux:focus-sidebar-search', focusSearch);
  }, [setExpanded]);

  const filtered = searchQuery.trim()
    ? conversations.filter((c) => c.title?.toLowerCase().includes(searchQuery.toLowerCase()))
    : conversations;

  const pinned = filtered.filter((c) => c.is_pinned);
  const unpinned = filtered.filter((c) => !c.is_pinned);
  const groups = groupByDate(unpinned);

  const handleNew = useCallback(() => router.push('/'), [router]);
  const pro = TIERS.pro;

  const homeActive = pathname === '/';
  const journalNavActive = pathname === '/tools/journal' || pathname.startsWith('/tools/journal/');
  const toolsNavActive = pathname.startsWith('/tools');

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className="flex h-dvh shrink-0 flex-col overflow-hidden border-r border-white/[0.04] select-none"
        style={{ width: EXPANDED_W, backgroundColor: SIDEBAR_BG }}
      >
        {/* Header — logo is NOT a toggle when expanded */}
        <div className="flex h-14 shrink-0 items-center justify-between px-3">
          <div className="flex min-w-0 items-center gap-2.5 px-1">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent/70 to-cyan-500/40">
              <span className="text-[11px] leading-none">🐙</span>
            </div>
            <span className="truncate text-[14px] font-medium tracking-[0.06em] text-white/75 lowercase">
              octux
            </span>
          </div>
          <button
            type="button"
            onClick={toggleSidebar}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/20 transition-all hover:bg-white/[0.04] hover:text-white/50"
            aria-label="Close sidebar"
          >
            <PanelLeftClose size={16} strokeWidth={ICON_STROKE} />
          </button>
        </div>

        <div className="px-2">
          <NavItemButton icon={Plus} label="New conversation" onClick={handleNew} />
        </div>

        <div className="mx-4 my-2 h-px bg-white/[0.04]" />

        <div className="space-y-0.5 px-2">
          <NavItemButton
            icon={Home}
            label="Home"
            active={homeActive}
            onClick={() => router.push('/')}
          />
          <NavItemButton
            icon={BarChart3}
            label="Decision Journal"
            active={journalNavActive}
            onClick={() => router.push('/tools/journal')}
          />
          <ToolsFlyoutMenu pathname={pathname} variant="expanded" toolsActive={toolsNavActive} />
        </div>

        <div className="mx-4 my-2 h-px bg-white/[0.04]" />

        <div className="mb-1 px-2">
          {searchActive ? (
            <div className="flex h-9 items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.04] px-3">
              <Search size={13} className="shrink-0 text-white/25" strokeWidth={ICON_STROKE} />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => {
                  if (!searchQuery.trim()) setSearchActive(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchQuery('');
                    setSearchActive(false);
                  }
                }}
                placeholder="Search conversations..."
                className="min-w-0 flex-1 bg-transparent text-[12px] text-white/80 outline-none placeholder:text-white/20"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSearchActive(true)}
              className="flex h-9 w-full items-center gap-2.5 rounded-xl px-3 text-white/25 transition-all hover:bg-white/[0.03] hover:text-white/40"
            >
              <Search size={14} strokeWidth={ICON_STROKE} />
              <span className="flex-1 text-left text-[12px]">Search...</span>
              <kbd className="rounded px-1.5 py-0.5 font-mono text-[9px] text-white/15 bg-white/[0.04]">
                ⌘K
              </kbd>
            </button>
          )}
        </div>

        <div className="mx-4 mb-1 h-px bg-white/[0.04]" />

        <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto px-2 pt-1">
          {loading ? (
            <SidebarLoadingSkeleton />
          ) : (
            <>
              {pinned.length > 0 && (
                <SectionGroup label="Pinned">
                  {pinned.map((c) => (
                    <ConversationRow key={c.id} convo={c} isActive={pathname === `/c/${c.id}`} />
                  ))}
                </SectionGroup>
              )}

              {groups.map((group) => (
                <SectionGroup key={group.label} label={group.label}>
                  {group.conversations.map((c) => (
                    <ConversationRow key={c.id} convo={c} isActive={pathname === `/c/${c.id}`} />
                  ))}
                </SectionGroup>
              ))}

              {filtered.length === 0 && (
                <div className="py-10 text-center">
                  <MessageSquare size={18} className="mx-auto mb-2 text-white/10" strokeWidth={ICON_STROKE} />
                  <p className="text-[11px] text-white/20">
                    {searchQuery.trim() ? 'No results' : 'No conversations yet'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="shrink-0 space-y-1.5 p-2">
          {tier === 'free' ? (
            <button
              type="button"
              onClick={() => router.push('/pricing')}
              className="group w-full rounded-xl border border-accent/[0.08] bg-gradient-to-br from-accent/[0.08] to-accent/[0.03] p-3 text-left transition-all hover:border-accent/[0.15]"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 transition-colors group-hover:bg-accent/15">
                  <Zap size={14} className="text-accent" strokeWidth={ICON_STROKE} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-white/70">Upgrade to Pro</p>
                  <p className="text-[10px] text-white/25">
                    {pro.limits.tokensPerMonth} tokens/mo · {pro.priceLabel}
                    {pro.period}
                  </p>
                </div>
                <ChevronRight
                  size={13}
                  className="shrink-0 text-white/15 transition-colors group-hover:text-white/30"
                  strokeWidth={ICON_STROKE}
                />
              </div>
            </button>
          ) : (
            <div className="rounded-xl border border-white/[0.05] bg-white/[0.03] px-2 py-2">
              <div className="mb-1.5 flex items-center gap-2">
                <Zap size={13} className="shrink-0 text-accent/70" strokeWidth={ICON_STROKE} />
                <span className="text-[10px] text-white/35">
                  {tokensRemaining}/{tokensTotal} tokens
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-300',
                    tokensRemaining === 0
                      ? 'bg-verdict-abandon'
                      : tokensRemaining <= 2
                        ? 'bg-verdict-delay'
                        : 'bg-accent',
                  )}
                  style={{
                    width: `${tokensTotal > 0 ? (tokensRemaining / tokensTotal) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          )}

          <ProfileMenu variant="expanded" tier={tier} />
        </div>
      </aside>
    </TooltipProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Nav primitives
// ═══════════════════════════════════════════════════════════════════════════

function NavItemButton({
  icon: Icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left transition-all',
        active ? 'bg-accent/[0.08] text-white/80' : 'text-white/45 hover:bg-white/[0.04] hover:text-white/70',
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-accent" />
      )}
      <Icon size={17} strokeWidth={ICON_STROKE} className={active ? 'text-white/70' : 'text-white/30'} />
      <span className="flex-1 text-[13px]">{label}</span>
    </button>
  );
}

function SectionGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2.5">
      <span className="mb-1 block px-2 text-[10px] font-medium uppercase tracking-[0.08em] text-white/15">
        {label}
      </span>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Tools flyout — Dropdown to the right (Okara pattern)
// ═══════════════════════════════════════════════════════════════════════════

function ToolsFlyoutMenu({
  pathname,
  variant,
  toolsActive,
}: {
  pathname: string | null;
  variant: 'expanded' | 'collapsed';
  toolsActive: boolean;
}) {
  const router = useRouter();
  const tools = getToolsForFlyout();
  const [open, setOpen] = useState(false);

  if (variant === 'expanded') {
    return (
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              'relative flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left transition-all duration-150',
              toolsActive || open
                ? 'bg-accent/[0.08] text-white/80'
                : 'text-white/45 hover:bg-white/[0.04] hover:text-white/70',
            )}
          >
            {(toolsActive || open) && (
              <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-accent" />
            )}
            <Settings2
              size={17}
              strokeWidth={ICON_STROKE}
              className={toolsActive || open ? 'text-white/70' : 'text-white/30'}
            />
            <span className="flex-1 text-[13px]">Tools</span>
            <ChevronRight
              size={13}
              strokeWidth={ICON_STROKE}
              className={cn('text-white/20 transition-transform duration-150', open && 'rotate-90')}
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="right"
          align="start"
          sideOffset={8}
          className="z-[100] w-60 rounded-xl border border-white/[0.08] bg-[#18181F] p-2 shadow-xl shadow-black/40"
        >
          <div className="mb-1 flex items-center gap-2 px-2 py-1.5">
            <Settings2 size={14} className="text-white/40" strokeWidth={ICON_STROKE} />
            <span className="text-[12px] font-medium text-white/60">Tools</span>
          </div>
          {tools.map((tool) => {
            const Icon = tool.icon;
            const active = pathname === tool.href || pathname?.startsWith(`${tool.href}/`);
            return (
              <DropdownMenuItem
                key={tool.href}
                onSelect={() => {
                  router.push(tool.href);
                  setOpen(false);
                }}
                className={cn(
                  'cursor-pointer rounded-lg p-0 focus:bg-transparent',
                  active ? 'bg-white/[0.06]' : '',
                )}
              >
                <span className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-white/[0.04]">
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${tool.color}18` }}
                  >
                    <Icon size={14} style={{ color: tool.color }} strokeWidth={ICON_STROKE} />
                  </div>
                  <span className="text-[13px] text-white/65">{tool.name}</span>
                </span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Tooltip>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                'relative mb-1 flex h-10 w-10 items-center justify-center rounded-xl transition-all',
                toolsActive || open
                  ? 'bg-accent/[0.08] text-white/80'
                  : 'text-white/25 hover:bg-white/[0.04] hover:text-white/55',
              )}
              aria-label="Tools"
            >
              {(toolsActive || open) && (
                <span className="absolute left-0 top-1/2 h-3 w-[2px] -translate-y-1/2 rounded-full bg-accent" />
              )}
              <Settings2 size={17} strokeWidth={ICON_STROKE} />
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <DropdownMenuContent
          side="right"
          align="start"
          sideOffset={8}
          className="z-[100] w-60 rounded-xl border border-white/[0.08] bg-[#18181F] p-2 shadow-xl shadow-black/40"
        >
          <div className="mb-1 flex items-center gap-2 px-2 py-1.5">
            <Settings2 size={14} className="text-white/40" strokeWidth={ICON_STROKE} />
            <span className="text-[12px] font-medium text-white/60">Tools</span>
          </div>
          {tools.map((tool) => {
            const Icon = tool.icon;
            const active = pathname === tool.href || pathname?.startsWith(`${tool.href}/`);
            return (
              <DropdownMenuItem
                key={tool.href}
                onSelect={() => {
                  router.push(tool.href);
                  setOpen(false);
                }}
                className={cn(
                  'cursor-pointer rounded-lg p-0 focus:bg-transparent',
                  active ? 'bg-white/[0.06]' : '',
                )}
              >
                <span className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-white/[0.04]">
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${tool.color}18` }}
                  >
                    <Icon size={14} style={{ color: tool.color }} strokeWidth={ICON_STROKE} />
                  </div>
                  <span className="text-[13px] text-white/65">{tool.name}</span>
                </span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      <TooltipContent side="right">Tools</TooltipContent>
    </Tooltip>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Profile — popover above (DropdownMenu side=top)
// ═══════════════════════════════════════════════════════════════════════════

function ProfileMenu({ variant, tier }: { variant: 'expanded' | 'collapsed'; tier: TierType }) {
  const router = useRouter();
  const { user, isAuthenticated, signOut } = useAuth();
  const tokensRemaining = useBillingStore((s) => s.tokensRemaining);
  const displayName =
    isAuthenticated && typeof user?.user_metadata?.full_name === 'string' && user.user_metadata.full_name
      ? user.user_metadata.full_name
      : isAuthenticated
        ? user?.email ?? 'User'
        : 'Guest';

  const initial =
    isAuthenticated && user?.email ? user.email[0].toUpperCase() : 'G';

  const onThemeToggle = () => {
    document.documentElement.classList.toggle('dark');
  };

  const triggerExpanded = (
    <button
      type="button"
      className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 transition-all hover:bg-white/[0.03]"
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15">
        <span className="text-[10px] font-bold text-accent">{initial}</span>
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-[12px] text-white/55">{displayName}</p>
        {!isAuthenticated && (
          <p className="text-[10px] text-accent/60">Sign In</p>
        )}
        {isAuthenticated && user?.email && (
          <p className="truncate text-[10px] text-white/25">{user.email}</p>
        )}
      </div>
      <TierPill tier={tier} />
    </button>
  );

  const triggerCollapsed = (
    <button
      type="button"
      className="flex h-10 w-10 items-center justify-center rounded-xl transition-all hover:bg-white/[0.04]"
      aria-label="Profile"
    >
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15">
        <span className="text-[9px] font-bold text-accent">{initial}</span>
      </div>
    </button>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === 'expanded' ? triggerExpanded : triggerCollapsed}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="start"
        sideOffset={8}
        className="z-[100] min-w-[220px] rounded-xl border border-white/[0.08] bg-[#18181F] p-1.5 shadow-xl shadow-black/40"
      >
        {isAuthenticated ? (
          <>
            <div className="px-3 py-2">
              <p className="text-[13px] font-medium text-white/75">{displayName}</p>
              {user?.email && <p className="text-[11px] text-white/30">{user.email}</p>}
            </div>
            <div className="mx-2 my-1 h-px bg-white/[0.06]" />
            <PopoverRow
              icon={Zap}
              label={`${tier === 'free' ? 'Free' : tier === 'pro' ? 'Pro' : tier === 'max' ? 'Max' : 'Octopus'} plan · ${tokensRemaining} token${tokensRemaining === 1 ? '' : 's'}`}
              sub
            />
            <DropdownMenuItem
              className="cursor-pointer rounded-lg px-3 py-2 text-white/55 focus:bg-white/[0.04]"
              onSelect={() => router.push('/pricing')}
            >
              <span className="flex items-center gap-2.5 text-[13px]">
                <Settings2 size={15} strokeWidth={ICON_STROKE} />
                Settings
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer rounded-lg px-3 py-2 text-white/55 focus:bg-white/[0.04]"
              onSelect={() => onThemeToggle()}
            >
              <span className="flex items-center gap-2.5 text-[13px]">
                <Moon size={15} strokeWidth={ICON_STROKE} />
                Toggle dark mode
              </span>
            </DropdownMenuItem>
            <div className="mx-2 my-1 h-px bg-white/[0.06]" />
            <DropdownMenuItem
              className="cursor-pointer rounded-lg px-3 py-2 text-red-400/80 focus:bg-red-500/[0.06]"
              onSelect={async () => {
                await signOut();
                router.push('/');
              }}
            >
              <span className="flex items-center gap-2.5 text-[13px]">
                <LogOut size={15} strokeWidth={ICON_STROKE} />
                Sign out
              </span>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem
              className="cursor-pointer rounded-lg px-3 py-2 text-white/55 focus:bg-white/[0.04]"
              onSelect={() => onThemeToggle()}
            >
              <span className="flex items-center gap-2.5 text-[13px]">
                <Moon size={15} strokeWidth={ICON_STROKE} />
                Toggle dark mode
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer rounded-lg px-3 py-2 text-white/55 focus:bg-white/[0.04]"
              onSelect={() =>
                window.dispatchEvent(new CustomEvent('octux:show-auth', { detail: { mode: 'login' } }))
              }
            >
              <span className="flex items-center gap-2.5 text-[13px]">
                <LogIn size={15} strokeWidth={ICON_STROKE} />
                Sign in to your account
              </span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PopoverRow({
  icon: Icon,
  label,
  sub,
}: {
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  label: string;
  sub?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-white/45">
      <Icon size={15} className={sub ? 'text-accent/70' : undefined} strokeWidth={ICON_STROKE} />
      {label}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Conversation row
// ═══════════════════════════════════════════════════════════════════════════

function ConversationRow({ convo, isActive }: { convo: ConversationSummary; isActive: boolean }) {
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [hovered, setHovered] = useState(false);

  const title = convo.title || 'New conversation';

  return (
    <div
      className={cn(
        'group relative flex min-h-[32px] cursor-pointer items-center gap-2 rounded-lg py-[7px] pl-2.5 pr-1.5 transition-all',
        isActive
          ? 'bg-accent/[0.07] text-white/80'
          : 'text-white/35 hover:bg-white/[0.03] hover:text-white/60',
      )}
      onClick={() => {
        if (!renaming) router.push(`/c/${convo.id}`);
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {isActive && (
        <motion.div
          layoutId="sidebar-active-convo"
          className="absolute left-0 top-1/2 h-3.5 w-[2px] -translate-y-1/2 rounded-full bg-accent"
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}

      <ConvoIcon convo={convo} />

      <div className="min-w-0 flex-1">
        {renaming ? (
          <InlineRename
            conversationId={convo.id}
            currentTitle={title}
            active={renaming}
            onDone={() => setRenaming(false)}
          />
        ) : (
          <span className="block truncate text-[12px] leading-tight">{title}</span>
        )}
      </div>

      {convo.is_pinned && !hovered && !renaming && (
        <Pin size={9} className="shrink-0 text-accent/30" strokeWidth={ICON_STROKE} />
      )}

      {hovered && !renaming && (
        <ConversationContextMenu
          conversationId={convo.id}
          title={title}
          isPinned={!!convo.is_pinned}
          onRename={() => setRenaming(true)}
          onShare={() => navigator.clipboard.writeText(`${window.location.origin}/c/${convo.id}/report`)}
        >
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-white/15 transition-all hover:bg-white/[0.06] hover:text-white/45"
            aria-label="More"
          >
            <MoreHorizontal size={12} strokeWidth={ICON_STROKE} />
          </button>
        </ConversationContextMenu>
      )}
    </div>
  );
}

function ConvoIcon({ convo }: { convo: ConversationSummary }) {
  if (convo.is_pinned) {
    return <Pin size={13} className="shrink-0 text-accent/50" strokeWidth={ICON_STROKE} />;
  }
  if (convo.has_simulation && convo.latest_verdict) {
    const colors: Record<string, string> = {
      proceed: '#10b981',
      delay: '#f59e0b',
      abandon: '#ef4444',
    };
    return (
      <span
        className="h-2 w-2 shrink-0 rounded-full ring-1 ring-white/10"
        style={{ backgroundColor: colors[convo.latest_verdict || ''] || '#7C3AED' }}
      />
    );
  }
  return <MessageSquare size={13} className="shrink-0 text-white/15" strokeWidth={ICON_STROKE} />;
}

function TierPill({ tier }: { tier: TierType }) {
  const label =
    tier === 'free' ? 'Free' : tier === 'pro' ? 'Pro' : tier === 'max' ? 'Max' : 'Octopus';
  return (
    <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-white/15">{label}</span>
  );
}

function SidebarLoadingSkeleton() {
  return (
    <div className="space-y-3 px-1 py-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 py-1.5">
          <Skeleton className="h-2 w-2 shrink-0 rounded-full bg-white/[0.06]" />
          <Skeleton className="h-3 flex-1 rounded bg-white/[0.06]" />
        </div>
      ))}
    </div>
  );
}

function groupByDate(convos: ConversationSummary[]) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const weekAgo = new Date(todayStart.getTime() - 7 * 86400000);

  const buckets = {
    today: [] as ConversationSummary[],
    yesterday: [] as ConversationSummary[],
    week: [] as ConversationSummary[],
    older: [] as ConversationSummary[],
  };

  for (const c of convos) {
    const d = new Date(c.updated_at);
    if (d >= todayStart) buckets.today.push(c);
    else if (d >= yesterdayStart) buckets.yesterday.push(c);
    else if (d >= weekAgo) buckets.week.push(c);
    else buckets.older.push(c);
  }

  const groups: { label: string; conversations: ConversationSummary[] }[] = [];
  if (buckets.today.length) groups.push({ label: 'Today', conversations: buckets.today });
  if (buckets.yesterday.length) groups.push({ label: 'Yesterday', conversations: buckets.yesterday });
  if (buckets.week.length) groups.push({ label: 'This week', conversations: buckets.week });
  if (buckets.older.length) groups.push({ label: 'Older', conversations: buckets.older });

  return groups;
}

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || (el as HTMLElement).isContentEditable;
}
