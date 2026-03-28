'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, LayoutGroup } from 'framer-motion';
import {
  Plus,
  Search,
  PanelLeftClose,
  MessageSquare,
  Pin,
  MoreHorizontal,
  Home,
  Dna,
  Settings2,
  Zap,
  ChevronRight,
  LogIn,
  LogOut,
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
import { ThemeToggleCompact } from '@/components/theme/ThemeToggle';

const ICON_STROKE = 1.5;
/** BUILD PLAN §2.1 — expanded rail (matches --sidebar-width-expanded) */
const EXPANDED_W = 200;
/** BUILD PLAN §2.1 / §3.1 collapsed rail */
const COLLAPSED_W = 56;
/** Top chrome — same as ChatLayout header (h-12, px-3 sm:px-4) */
const TOP_BAR_H = 'h-12';
const TOP_BAR_PAD = 'px-3 sm:px-4';
/** Okara nav icons ~20px outlined */
const NAV_ICON = 20;

/** Okara flyout order: Compare → Risk Matrix → Templates → Journal */
const TOOLS_FLYOUT_ORDER = ['compare', 'risk-matrix', 'templates', 'journal'] as const;

function getToolsForFlyout(): OctuxTool[] {
  return TOOLS_FLYOUT_ORDER.map((slug) => OCTUX_TOOLS.find((t) => t.slug === slug)).filter(
    (t): t is OctuxTool => !!t,
  );
}

export default function Sidebar() {
  const expanded = useAppStore((s) => s.sidebarExpanded);
  return (
    <motion.aside
      initial={false}
      animate={{ width: expanded ? EXPANDED_W : COLLAPSED_W }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="flex h-dvh shrink-0 flex-col overflow-hidden border-r border-border-subtle bg-sidebar font-sans antialiased select-none"
    >
      {expanded ? <SidebarExpanded /> : <SidebarCollapsed />}
    </motion.aside>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Collapsed — 56px icon rail
// ═══════════════════════════════════════════════════════════════════════════

function SidebarCollapsed() {
  const router = useRouter();
  const pathname = usePathname();
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const setSidebarExpanded = useAppStore((s) => s.setSidebarExpanded);
  const tier = useBillingStore((s) => s.tier);

  const toolsActive = pathname.startsWith('/tools');
  const agentLabActive = pathname === '/agents';

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full w-full flex-col items-center">
        <div className={cn('flex w-full shrink-0 items-center justify-center border-b border-border-subtle/60', TOP_BAR_H)}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleSidebar}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent/70 to-cyan-500/40 shadow-sm transition-transform hover:scale-[1.02]"
                aria-label="Open sidebar"
              >
                <span className="text-[14px] leading-none">🐙</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Open sidebar</TooltipContent>
          </Tooltip>
        </div>

        <div className="h-2 shrink-0" />

        <CollapsedIconButton onClick={() => router.push('/')} tooltip="New conversation">
          <Plus size={NAV_ICON} strokeWidth={ICON_STROKE} />
        </CollapsedIconButton>

        <CollapsedIconButton
          onClick={() => router.push('/')}
          tooltip="Home"
          active={pathname === '/'}
        >
          <Home size={NAV_ICON} strokeWidth={ICON_STROKE} />
        </CollapsedIconButton>

        <CollapsedIconButton
          onClick={() => router.push('/agents')}
          tooltip="Agent Lab"
          active={agentLabActive}
        >
          <Dna size={NAV_ICON} strokeWidth={ICON_STROKE} />
        </CollapsedIconButton>

        <ToolsFlyoutMenu pathname={pathname} variant="collapsed" toolsActive={toolsActive} />

        <CollapsedIconButton onClick={() => setSidebarExpanded(true)} tooltip="Chat">
          <Clock size={NAV_ICON} strokeWidth={ICON_STROKE} />
        </CollapsedIconButton>

        <div className="min-h-2 flex-1" />

        <CollapsedIconButton
          onClick={() => router.push('/pricing')}
          tooltip="Upgrade to Pro"
        >
          <Zap size={NAV_ICON} className="text-accent" strokeWidth={ICON_STROKE} />
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
            'mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-150',
            active
              ? 'bg-accent-subtle text-txt-primary'
              : 'text-txt-tertiary hover:bg-surface-2 hover:text-txt-secondary',
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Expanded — 200px
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
  const agentLabActive = pathname === '/agents';
  const toolsNavActive = pathname.startsWith('/tools');
  const chatActive = pathname.startsWith('/c/');

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full w-full min-w-0 flex-col overflow-hidden">
        {/* Header — aligned 1:1 with main shell header (Log in / Sign up row) */}
        <div className={cn('flex shrink-0 items-center justify-between border-b border-border-subtle/60', TOP_BAR_H, TOP_BAR_PAD)}>
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent/70 to-cyan-500/40 shadow-sm">
              <span className="text-[13px] leading-none">🐙</span>
            </div>
            <span className="truncate text-[15px] font-semibold tracking-tight text-txt-primary lowercase">
              octux
            </span>
          </div>
          <button
            type="button"
            onClick={toggleSidebar}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-txt-disabled transition-all hover:bg-surface-2 hover:text-txt-secondary"
            aria-label="Close sidebar"
            title="Close sidebar"
          >
            <PanelLeftClose size={18} strokeWidth={ICON_STROKE} />
          </button>
        </div>

        <div className="px-3">
          <NavItemButton icon={Plus} label="New conversation" onClick={handleNew} />
        </div>

        <div className="mx-4 my-2 h-px bg-border-subtle" />

        <div className="space-y-1 px-3">
          <NavItemButton
            icon={Home}
            label="Home"
            active={homeActive}
            onClick={() => router.push('/')}
          />
          <NavItemButton
            icon={Dna}
            label="Agent Lab"
            active={agentLabActive}
            onClick={() => router.push('/agents')}
          />
          <ToolsFlyoutMenu pathname={pathname} variant="expanded" toolsActive={toolsNavActive} />
          <NavItemButton
            icon={Clock}
            label="Chat"
            active={chatActive}
            onClick={() => setSearchActive(true)}
          />
        </div>

        <div className="mx-4 my-2 h-px bg-border-subtle" />

        <div className="mb-1 px-3">
          {searchActive ? (
            <div className="flex h-9 items-center gap-2 rounded-xl border border-border-subtle bg-surface-2/80 px-3">
              <Search size={13} className="shrink-0 text-txt-disabled" strokeWidth={ICON_STROKE} />
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
                className="min-w-0 flex-1 bg-transparent text-[12px] text-txt-primary outline-none placeholder:text-txt-disabled"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSearchActive(true)}
              className="flex h-9 w-full items-center gap-2.5 rounded-xl px-3 text-txt-disabled transition-all hover:bg-surface-2/60 hover:text-txt-secondary"
            >
              <Search size={14} strokeWidth={ICON_STROKE} />
              <span className="flex-1 text-left text-[12px]">Search...</span>
              <kbd className="rounded px-1.5 py-0.5 font-mono text-[9px] text-txt-disabled bg-surface-2/80">
                ⌘K
              </kbd>
            </button>
          )}
        </div>

        <div className="mx-4 mb-1 h-px bg-border-subtle" />

        <LayoutGroup id="sidebar-conversations">
          <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto px-3 pt-1">
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
                    <MessageSquare size={18} className="mx-auto mb-2 text-txt-disabled" strokeWidth={ICON_STROKE} />
                    <p className="text-[11px] text-txt-disabled">
                      {searchQuery.trim() ? 'No results' : 'No conversations yet'}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </LayoutGroup>

        <div className="shrink-0 space-y-2 p-3 pt-2">
          <div className="rounded-xl border border-accent/15 bg-surface-2/60 p-1.5">
            <ProfileMenu variant="expanded" tier={tier} />
          </div>
          {tier === 'free' ? (
            <button
              type="button"
              onClick={() => router.push('/pricing')}
              className="group w-full rounded-xl border border-accent/[0.08] bg-gradient-to-br from-accent/[0.08] to-accent/[0.03] p-2.5 text-left transition-all hover:border-accent/[0.15]"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 transition-colors group-hover:bg-accent/15">
                  <Zap size={13} className="text-accent" strokeWidth={ICON_STROKE} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-txt-secondary">Upgrade to Pro</p>
                  <p className="text-[10px] text-txt-tertiary">
                    Tokens = 10-specialist simulations · {pro.priceLabel}
                    {pro.period}
                  </p>
                </div>
                <ChevronRight
                  size={12}
                  className="shrink-0 text-txt-disabled transition-colors group-hover:text-txt-tertiary"
                  strokeWidth={ICON_STROKE}
                />
              </div>
            </button>
          ) : (
            <div className="rounded-xl border border-border-subtle bg-surface-2/60 px-2 py-2">
              <div className="mb-1.5 flex items-center gap-2">
                <Zap size={13} className="shrink-0 text-accent/70" strokeWidth={ICON_STROKE} />
                <span className="text-[10px] text-txt-tertiary">
                  {tokensRemaining}/{tokensTotal} tokens
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-surface-3">
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
        </div>
      </div>
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
  iconClassName,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  label: string;
  active?: boolean;
  iconClassName?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-10 w-full items-center gap-2.5 rounded-xl px-2.5 text-left transition-colors duration-150',
        active
          ? 'bg-accent-subtle text-txt-primary'
          : 'text-txt-secondary hover:bg-surface-2 hover:text-txt-primary',
      )}
    >
      <Icon
        size={NAV_ICON}
        strokeWidth={ICON_STROKE}
        className={cn('shrink-0', active ? 'text-txt-primary' : 'text-txt-tertiary', iconClassName)}
      />
      <span className="flex-1 text-[14px] font-normal leading-5">{label}</span>
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1 block px-2 text-[10px] font-medium uppercase tracking-[0.08em] text-txt-disabled">
      {children}
    </span>
  );
}

function SectionGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2.5">
      <SectionLabel>{label}</SectionLabel>
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
              'flex h-10 w-full items-center gap-2.5 rounded-xl px-2.5 text-left transition-colors duration-150',
              toolsActive || open
                ? 'bg-accent-subtle text-txt-primary'
                : 'text-txt-secondary hover:bg-surface-2 hover:text-txt-primary',
            )}
          >
            <Settings2
              size={NAV_ICON}
              strokeWidth={ICON_STROKE}
              className={cn('shrink-0', toolsActive || open ? 'text-txt-primary' : 'text-txt-tertiary')}
            />
            <span className="flex-1 text-[14px] font-normal leading-5">Tools</span>
            <ChevronRight
              size={14}
              strokeWidth={ICON_STROKE}
              className={cn('shrink-0 text-txt-disabled transition-transform duration-150', open && 'rotate-90')}
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="right"
          align="start"
          sideOffset={8}
          className="z-[100] w-60 rounded-xl border border-border-default bg-surface-raised p-2 shadow-lg"
        >
          <div className="mb-1 flex items-center gap-2 px-2 py-1.5">
            <Settings2 size={14} className="text-txt-secondary" strokeWidth={ICON_STROKE} />
            <span className="text-[12px] font-medium text-txt-tertiary">Tools</span>
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
                  active ? 'bg-accent-subtle' : '',
                )}
              >
                <span className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-surface-2/80">
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${tool.color}18` }}
                  >
                    <Icon size={14} style={{ color: tool.color }} strokeWidth={ICON_STROKE} />
                  </div>
                  <span className="text-[13px] text-txt-secondary">{tool.name}</span>
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
                'mb-1 flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-150',
                toolsActive || open
                  ? 'bg-accent-subtle text-txt-primary'
                  : 'text-txt-tertiary hover:bg-surface-2 hover:text-txt-tertiary',
              )}
              aria-label="Tools"
            >
              <Settings2 size={NAV_ICON} strokeWidth={ICON_STROKE} />
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <DropdownMenuContent
          side="right"
          align="start"
          sideOffset={8}
          className="z-[100] w-60 rounded-xl border border-border-default bg-surface-raised p-2 shadow-lg"
        >
          <div className="mb-1 flex items-center gap-2 px-2 py-1.5">
            <Settings2 size={14} className="text-txt-secondary" strokeWidth={ICON_STROKE} />
            <span className="text-[12px] font-medium text-txt-tertiary">Tools</span>
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
                  active ? 'bg-accent-subtle' : '',
                )}
              >
                <span className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-surface-2/80">
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${tool.color}18` }}
                  >
                    <Icon size={14} style={{ color: tool.color }} strokeWidth={ICON_STROKE} />
                  </div>
                  <span className="text-[13px] text-txt-secondary">{tool.name}</span>
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

  const triggerExpanded = (
    <button
      type="button"
      className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 transition-all hover:bg-surface-2"
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15">
        <span className="text-[10px] font-bold text-accent">{initial}</span>
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-[12px] text-txt-secondary">{displayName}</p>
        {!isAuthenticated && (
          <p className="text-[10px] text-accent/60">Sign In</p>
        )}
        {isAuthenticated && user?.email && (
          <p className="truncate text-[10px] text-txt-disabled">{user.email}</p>
        )}
      </div>
      <TierPill tier={tier} />
    </button>
  );

  const triggerCollapsed = (
    <button
      type="button"
      className="flex h-10 w-10 items-center justify-center rounded-xl transition-all hover:bg-surface-2/80"
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
        className="z-[100] min-w-[220px] rounded-xl border border-border-default bg-surface-raised p-1.5 shadow-lg"
      >
        {isAuthenticated ? (
          <>
            <div className="px-3 py-2">
              <p className="text-[13px] font-medium text-txt-primary">{displayName}</p>
              {user?.email && <p className="text-[11px] text-txt-tertiary">{user.email}</p>}
            </div>
            <div className="mx-2 my-1 h-px bg-border-subtle" />
            <PopoverRow
              icon={Zap}
              label={`${tier === 'free' ? 'Free' : tier === 'pro' ? 'Pro' : tier === 'max' ? 'Max' : 'Octopus'} plan · ${tokensRemaining} token${tokensRemaining === 1 ? '' : 's'}`}
              sub
            />
            <DropdownMenuItem
              className="cursor-pointer rounded-lg px-3 py-2 text-txt-secondary focus:bg-surface-2/80"
              onSelect={() => {
                router.push('/settings');
              }}
            >
              <span className="flex items-center gap-2.5 text-[13px]">
                <Settings2 size={15} strokeWidth={ICON_STROKE} />
                Settings
              </span>
            </DropdownMenuItem>
            <div className="px-1 py-1" onPointerDown={(e) => e.preventDefault()}>
              <ThemeToggleCompact />
            </div>
            <div className="mx-2 my-1 h-px bg-border-subtle" />
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
            <div className="px-1 py-1" onPointerDown={(e) => e.preventDefault()}>
              <ThemeToggleCompact />
            </div>
            <DropdownMenuItem
              className="cursor-pointer rounded-lg px-3 py-2 text-txt-secondary focus:bg-surface-2/80"
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
    <div className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-txt-tertiary">
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
  const meta = getConversationMeta(convo);

  return (
    <div
      className={cn(
        'group relative flex min-h-[40px] cursor-pointer items-start gap-2 rounded-lg py-[7px] pl-2.5 pr-1.5 transition-colors duration-150',
        isActive
          ? 'border border-accent/20 bg-gradient-to-r from-accent-subtle/90 to-accent-subtle/30 font-medium text-txt-primary shadow-[inset_0_0_0_1px_rgba(124,58,237,0.06)]'
          : 'text-txt-secondary hover:bg-surface-2 hover:text-txt-primary',
      )}
      onClick={() => {
        if (!renaming) router.push(`/c/${convo.id}`);
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {isActive && (
        <motion.div
          layoutId="sidebar-active-indicator"
          className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-accent"
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          aria-hidden
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
          <>
            <span className="block truncate text-[12px] leading-tight">{title}</span>
            <span className="mt-0.5 block truncate text-[10px] text-txt-disabled">{meta}</span>
          </>
        )}
      </div>

      {convo.is_pinned && !hovered && !renaming && (
        <Pin size={9} className="shrink-0 text-accent/30" strokeWidth={ICON_STROKE} />
      )}

      {!renaming && (
        <ConversationContextMenu
          conversationId={convo.id}
          title={title}
          isPinned={!!convo.is_pinned}
          onRename={() => setRenaming(true)}
          onShare={() => navigator.clipboard.writeText(`${window.location.origin}/c/${convo.id}/report`)}
        >
          <motion.button
            type="button"
            initial={false}
            animate={{ opacity: hovered ? 1 : 0 }}
            transition={{ duration: 0.1 }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'flex h-5 w-5 shrink-0 items-center justify-center rounded text-txt-disabled transition-colors hover:bg-surface-2 hover:text-txt-tertiary',
              hovered ? 'pointer-events-auto' : 'pointer-events-none',
            )}
            aria-label="More"
          >
            <MoreHorizontal size={12} strokeWidth={ICON_STROKE} />
          </motion.button>
        </ConversationContextMenu>
      )}
    </div>
  );
}

function getConversationMeta(convo: ConversationSummary): string {
  const updated = relativeTime(convo.updated_at);
  if (convo.has_simulation && convo.latest_verdict) {
    return `${convo.latest_verdict.toUpperCase()} · ${updated}`;
  }
  return updated;
}

function relativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  return `${day}d`;
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
        className="h-2 w-2 shrink-0 rounded-full ring-1 ring-border-default"
        style={{ backgroundColor: colors[convo.latest_verdict || ''] || '#7C3AED' }}
      />
    );
  }
  return <MessageSquare size={13} className="shrink-0 text-txt-disabled" strokeWidth={ICON_STROKE} />;
}

function TierPill({ tier }: { tier: TierType }) {
  const label =
    tier === 'free' ? 'Free' : tier === 'pro' ? 'Pro' : tier === 'max' ? 'Max' : 'Octopus';
  return (
    <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-txt-disabled">{label}</span>
  );
}

function SidebarLoadingSkeleton() {
  return (
    <div className="space-y-3 px-1 py-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 py-1.5">
          <Skeleton className="h-2 w-2 shrink-0 rounded-full bg-surface-3" />
          <Skeleton className="h-3 flex-1 rounded bg-surface-3" />
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
