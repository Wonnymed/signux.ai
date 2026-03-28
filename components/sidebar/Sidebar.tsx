'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, LayoutGroup } from 'framer-motion';
import {
  Plus,
  PanelLeftClose,
  MessageSquare,
  MoreHorizontal,
  Dna,
  Settings2,
  Zap,
  ChevronRight,
  LogIn,
  LogOut,
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
/** Expanded rail — Okara-scale width (matches --sidebar-width-expanded) */
const EXPANDED_W = 288;
/** BUILD PLAN §2.1 / §3.1 collapsed rail */
const COLLAPSED_W = 56;
/** Top chrome — same as ChatLayout header (h-12, px-3 sm:px-4) */
const TOP_BAR_H = 'h-12';
const TOP_BAR_PAD = 'px-3 sm:px-4';
/** Claude-style nav: compact icons */
const NAV_ICON = 18;

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

        <CollapsedIconButton
          onClick={() => router.push('/')}
          tooltip="New chat"
          active={pathname === '/'}
        >
          <Plus size={NAV_ICON} strokeWidth={ICON_STROKE} />
        </CollapsedIconButton>

        <CollapsedIconButton
          onClick={() => router.push('/agents')}
          tooltip="Agent Lab"
          active={agentLabActive}
        >
          <Dna size={NAV_ICON} strokeWidth={ICON_STROKE} />
        </CollapsedIconButton>

        <ToolsFlyoutMenu pathname={pathname} variant="collapsed" toolsActive={toolsActive} />

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
// Expanded — 288px (Okara-like)
// ═══════════════════════════════════════════════════════════════════════════

function SidebarExpanded() {
  const router = useRouter();
  const pathname = usePathname();
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const conversations = useAppStore((s) => s.conversations);
  const loading = useAppStore((s) => s.conversationsLoading);
  const setActiveId = useAppStore((s) => s.setActiveConversationId);

  const tier = useBillingStore((s) => s.tier);
  const tokensRemaining = useBillingStore((s) => s.tokensRemaining);
  const tokensTotal = useBillingStore((s) => s.tokensTotal);

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

  const recentsOrdered = sortRecents(conversations);

  const handleNew = useCallback(() => router.push('/'), [router]);
  const pro = TIERS.pro;

  const newChatActive = pathname === '/';
  const agentLabActive = pathname === '/agents';
  const toolsNavActive = pathname.startsWith('/tools');

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

        <div className="space-y-0.5 px-2.5 pt-1.5">
          <NavItemButton
            icon={Plus}
            label="New chat"
            active={newChatActive}
            onClick={handleNew}
          />
          <NavItemButton
            icon={Dna}
            label="Agent Lab"
            active={agentLabActive}
            onClick={() => router.push('/agents')}
          />
          <ToolsFlyoutMenu pathname={pathname} variant="expanded" toolsActive={toolsNavActive} />
        </div>

        <div className="mx-3 my-2 h-px bg-border-subtle/80" />

        <LayoutGroup id="sidebar-conversations">
          <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto px-2.5 pt-0.5">
            {loading ? (
              <SidebarLoadingSkeleton />
            ) : (
              <>
                {recentsOrdered.length > 0 && (
                  <div className="mb-1">
                    <RecentsHeading />
                    <div className="space-y-0">
                      {recentsOrdered.map((c) => (
                        <ConversationRow key={c.id} convo={c} isActive={pathname === `/c/${c.id}`} />
                      ))}
                    </div>
                  </div>
                )}

                {conversations.length === 0 && (
                  <div className="py-10 text-center">
                    <MessageSquare size={18} className="mx-auto mb-2 text-txt-disabled" strokeWidth={ICON_STROKE} />
                    <p className="text-[11px] text-txt-disabled">No conversations yet</p>
                  </div>
                )}
              </>
            )}
          </div>
        </LayoutGroup>

        <div className="shrink-0 space-y-2 border-t border-border-subtle/60 p-2.5 pt-2">
          {tier === 'free' ? (
            <button
              type="button"
              onClick={() => router.push('/pricing')}
              className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-txt-secondary transition-colors hover:bg-surface-2 hover:text-txt-primary"
            >
              <Zap size={NAV_ICON} className="shrink-0 text-txt-tertiary" strokeWidth={ICON_STROKE} />
              <span className="min-w-0 flex-1 truncate text-[13px] font-normal">
                Upgrade · {pro.priceLabel}
                {pro.period}
              </span>
              <ChevronRight size={14} className="shrink-0 text-txt-disabled" strokeWidth={ICON_STROKE} />
            </button>
          ) : (
            <div className="flex items-center gap-2 px-2 py-1">
              <Zap size={14} className="shrink-0 text-txt-disabled" strokeWidth={ICON_STROKE} />
              <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-3">
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
              <span className="shrink-0 tabular-nums text-[11px] text-txt-tertiary">
                {tokensRemaining}/{tokensTotal}
              </span>
            </div>
          )}
          <div className="rounded-xl border border-border-default bg-surface-0 p-2.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:border-border-subtle dark:bg-surface-1 dark:shadow-none">
            <ProfileMenu variant="expanded" tier={tier} />
          </div>
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
        'flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left transition-colors duration-150',
        active
          ? 'bg-surface-2 text-txt-primary'
          : 'text-txt-secondary hover:bg-surface-2/80 hover:text-txt-primary',
      )}
    >
      <Icon
        size={NAV_ICON}
        strokeWidth={ICON_STROKE}
        className={cn('shrink-0 opacity-80', active ? 'text-txt-primary opacity-100' : 'text-txt-tertiary', iconClassName)}
      />
      <span className="flex-1 text-[13px] font-normal leading-snug">{label}</span>
    </button>
  );
}

function RecentsHeading() {
  return (
    <div className="px-2 pb-2 pt-1">
      <span className="text-[12px] font-medium text-txt-tertiary">Recents</span>
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
              'flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left transition-colors duration-150',
              toolsActive || open
                ? 'bg-surface-2 text-txt-primary'
                : 'text-txt-secondary hover:bg-surface-2/80 hover:text-txt-primary',
            )}
          >
            <Settings2
              size={NAV_ICON}
              strokeWidth={ICON_STROKE}
              className={cn(
                'shrink-0 opacity-80',
                toolsActive || open ? 'text-txt-primary opacity-100' : 'text-txt-tertiary',
              )}
            />
            <span className="flex-1 text-[13px] font-normal leading-snug">Tools</span>
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
      className="flex w-full items-center gap-3 rounded-lg px-1 py-0.5 text-left transition-colors hover:bg-surface-2/60"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/20">
        <span className="text-[12px] font-semibold text-accent">{initial}</span>
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-[13px] font-semibold text-txt-primary">{displayName}</p>
        {!isAuthenticated && (
          <p className="text-[11px] text-accent">Sign in</p>
        )}
        {isAuthenticated && user?.email && (
          <p className="truncate text-[11px] text-txt-tertiary">{user.email}</p>
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

  const title = convo.title || 'New conversation';

  return (
    <div
      className={cn(
        'group relative flex min-h-[38px] cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 transition-colors duration-150',
        isActive
          ? 'bg-surface-2 text-txt-primary'
          : 'text-txt-primary hover:bg-[#f0efea]/80 dark:hover:bg-surface-2/80',
      )}
      onClick={() => {
        if (!renaming) router.push(`/c/${convo.id}`);
      }}
    >
      <div className="min-w-0 flex-1 pr-1">
        {renaming ? (
          <InlineRename
            conversationId={convo.id}
            currentTitle={title}
            active={renaming}
            onDone={() => setRenaming(false)}
          />
        ) : (
          <span className="block truncate text-[13px] font-normal leading-[1.4] tracking-[-0.01em] text-txt-primary">
            {title}
          </span>
        )}
      </div>

      {!renaming && (
        <ConversationContextMenu
          conversationId={convo.id}
          title={title}
          isPinned={!!convo.is_pinned}
          onRename={() => setRenaming(true)}
        >
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
              'bg-[#f0efea] text-txt-secondary shadow-none dark:bg-surface-3 dark:text-txt-tertiary',
              'opacity-0 transition-opacity duration-150',
              'pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100',
              'hover:bg-[#e8e6e1] dark:hover:bg-surface-2',
              'data-[state=open]:pointer-events-auto data-[state=open]:opacity-100',
              'focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--sidebar-bg)]',
            )}
            aria-label="Conversation options"
          >
            <MoreHorizontal size={14} strokeWidth={ICON_STROKE} className="translate-y-px" />
          </button>
        </ConversationContextMenu>
      )}
    </div>
  );
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
    <div className="space-y-2 px-2 py-1">
      <Skeleton className="mb-2 h-3 w-14 rounded bg-surface-3" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 py-1.5">
          <Skeleton className="h-[13px] flex-1 rounded bg-surface-3" />
          <Skeleton className="h-7 w-7 shrink-0 rounded-md bg-surface-3" />
        </div>
      ))}
    </div>
  );
}

function sortRecents(convos: ConversationSummary[]): ConversationSummary[] {
  return [...convos].sort((a, b) => {
    const ap = a.is_pinned ? 1 : 0;
    const bp = b.is_pinned ? 1 : 0;
    if (ap !== bp) return bp - ap;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || (el as HTMLElement).isContentEditable;
}
