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
  Settings,
  Settings2,
  Globe,
  List,
  Zap,
  ChevronRight,
  LogIn,
  LogOut,
  FolderKanban,
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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/shadcn/dropdown-menu';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/shadcn/hover-card';
import { Skeleton } from '@/components/ui/shadcn/skeleton';
import ConversationContextMenu from './ConversationContextMenu';
import InlineRename from './InlineRename';
import { ThemeToggleCompact } from '@/components/theme/ThemeToggle';
import { useProjects } from '@/app/lib/useProjects';

const ICON_STROKE = 1.5;
/** Expanded rail — Okara-scale width (matches --sidebar-width-expanded) */
const EXPANDED_W = 288;
/** BUILD PLAN §2.1 / §3.1 collapsed rail */
const COLLAPSED_W = 56;
/** Sidebar header — compact gap to first nav item (Okara-style, ≤12px below header) */
const SIDEBAR_HEADER_PAD = 'px-3 sm:px-4 py-3';
/** Brand mark — matches wordmark scale (Okara-like prominence) */
const BRAND_LOGO_BOX = 'h-11 w-11';
const BRAND_LOGO_EMOJI = 'text-[20px]';
const BRAND_WORDMARK = 'text-[16px]';
/** Claude-style nav: compact icons */
const NAV_ICON = 18;
/** Match conversation title styling in the history list */
const NAV_LABEL_CLASS =
  'flex-1 text-left text-[13px] font-medium leading-[1.4] tracking-[-0.01em] text-txt-primary';

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
  const projectsNavActive = pathname === '/projects' || pathname.startsWith('/projects/');

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full w-full flex-col items-center">
        <div
          className={cn(
            'flex w-full shrink-0 items-center justify-center border-b border-border-subtle/60',
            SIDEBAR_HEADER_PAD,
          )}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleSidebar}
                className={cn(
                  'flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent/70 to-amber-600/40 shadow-sm transition-transform hover:scale-[1.02]',
                  BRAND_LOGO_BOX,
                )}
                aria-label="Open sidebar"
              >
                <span className={cn('leading-none', BRAND_LOGO_EMOJI)}>🐙</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Open sidebar</TooltipContent>
          </Tooltip>
        </div>

        <div className="h-3 shrink-0" />

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
        <ProjectsFlyoutMenu variant="collapsed" projectsActive={projectsNavActive} />

        <div className="min-h-2 flex-1" />

        <CollapsedIconButton
          onClick={() => router.push('/pricing')}
          tooltip="Upgrade to Pro"
        >
          <Zap size={NAV_ICON} className="text-accent" strokeWidth={ICON_STROKE} />
        </CollapsedIconButton>

        <div className="pb-2">
          <ProfileMenu variant="collapsed" tier={tier} />
        </div>
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
              : 'text-txt-primary/70 hover:bg-surface-2 hover:text-txt-primary',
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

  const starredOrdered = sortByUpdatedDesc(conversations.filter((c) => c.is_pinned));
  const recentsOrdered = sortByUpdatedDesc(conversations.filter((c) => !c.is_pinned));

  const handleNew = useCallback(() => router.push('/'), [router]);
  const pro = TIERS.pro;

  const newChatActive = pathname === '/';
  const agentLabActive = pathname === '/agents';
  const toolsNavActive = pathname.startsWith('/tools');
  const projectsNavActive = pathname === '/projects' || pathname?.startsWith('/projects/');

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full w-full min-w-0 flex-col overflow-hidden">
        {/* Header — tight stack to first nav item (Okara-style) */}
        <div
          className={cn(
            'mb-3 flex shrink-0 items-center justify-between border-b border-border-subtle/60',
            SIDEBAR_HEADER_PAD,
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={cn(
                'flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent/70 to-amber-600/40 shadow-sm',
                BRAND_LOGO_BOX,
              )}
            >
              <span className={cn('leading-none', BRAND_LOGO_EMOJI)}>🐙</span>
            </div>
            <span className={cn('truncate font-semibold tracking-tight text-txt-primary lowercase', BRAND_WORDMARK)}>
              octux
            </span>
          </div>
          <button
            type="button"
            onClick={toggleSidebar}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-txt-disabled transition-all hover:bg-surface-2 hover:text-txt-secondary"
            aria-label="Close sidebar"
            title="Close sidebar"
          >
            <PanelLeftClose size={20} strokeWidth={ICON_STROKE} />
          </button>
        </div>

        <div className="space-y-0.5 px-2.5 pt-0">
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
          <ProjectsFlyoutMenu variant="expanded" projectsActive={projectsNavActive} />
        </div>

        <div className="mx-3 my-2 h-px bg-border-subtle/80" />

        <LayoutGroup id="sidebar-conversations">
          <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto px-2.5 pt-0.5">
            {loading ? (
              <SidebarLoadingSkeleton />
            ) : (
              <>
                {starredOrdered.length > 0 && (
                  <div className="mb-3">
                    <SidebarSectionHeading>Starred</SidebarSectionHeading>
                    <div className="space-y-0">
                      {starredOrdered.map((c) => (
                        <ConversationRow key={c.id} convo={c} isActive={pathname === `/c/${c.id}`} />
                      ))}
                    </div>
                  </div>
                )}

                {recentsOrdered.length > 0 && (
                  <div className="mb-1">
                    <SidebarSectionHeading>Recents</SidebarSectionHeading>
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
          ? 'bg-surface-2'
          : 'hover:bg-[#f0efea]/80 dark:hover:bg-surface-2/80',
      )}
    >
      <Icon
        size={NAV_ICON}
        strokeWidth={ICON_STROKE}
        className={cn(
          'shrink-0 text-txt-primary',
          active ? 'opacity-100' : 'opacity-80',
          iconClassName,
        )}
      />
      <span className={NAV_LABEL_CLASS}>{label}</span>
    </button>
  );
}

function SidebarSectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 pb-2 pt-1 first:pt-0">
      <span className="text-[12px] font-medium text-txt-tertiary">{children}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Tools / Projects flyouts — HoverCard opens on hover (Claude-style)
// ═══════════════════════════════════════════════════════════════════════════

const FLYOUT_CONTENT_CLASS =
  'z-[100] w-60 rounded-xl border border-border-default bg-surface-raised p-2 shadow-lg';

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

  const panel = (
    <>
      <div className="mb-1 flex items-center gap-2 px-2 py-1.5">
        <Settings2 size={14} className="text-txt-secondary" strokeWidth={ICON_STROKE} />
        <span className="text-[12px] font-medium text-txt-tertiary">Tools</span>
      </div>
      {tools.map((tool) => {
        const Icon = tool.icon;
        const active = pathname === tool.href || pathname?.startsWith(`${tool.href}/`);
        return (
          <button
            key={tool.href}
            type="button"
            onClick={() => {
              router.push(tool.href);
              setOpen(false);
            }}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-surface-2/80',
              active ? 'bg-accent-subtle' : '',
            )}
          >
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${tool.color}18` }}
            >
              <Icon size={14} style={{ color: tool.color }} strokeWidth={ICON_STROKE} />
            </div>
            <span className="text-[13px] text-txt-secondary">{tool.name}</span>
          </button>
        );
      })}
    </>
  );

  if (variant === 'expanded') {
    return (
      <HoverCard open={open} onOpenChange={setOpen} openDelay={0} closeDelay={120}>
        <HoverCardTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left transition-colors duration-150',
              toolsActive || open
                ? 'bg-surface-2'
                : 'hover:bg-[#f0efea]/80 dark:hover:bg-surface-2/80',
            )}
          >
            <Settings2
              size={NAV_ICON}
              strokeWidth={ICON_STROKE}
              className={cn(
                'shrink-0 text-txt-primary',
                toolsActive || open ? 'opacity-100' : 'opacity-80',
              )}
            />
            <span className={NAV_LABEL_CLASS}>Tools</span>
            <ChevronRight
              size={14}
              strokeWidth={ICON_STROKE}
              className={cn('shrink-0 text-txt-disabled transition-transform duration-150', open && 'rotate-90')}
            />
          </button>
        </HoverCardTrigger>
        <HoverCardContent side="right" align="start" sideOffset={8} className={FLYOUT_CONTENT_CLASS}>
          {panel}
        </HoverCardContent>
      </HoverCard>
    );
  }

  return (
    <HoverCard open={open} onOpenChange={setOpen} openDelay={0} closeDelay={120}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className={cn(
            'mb-1 flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-150',
            toolsActive || open
              ? 'bg-accent-subtle text-txt-primary'
              : 'text-txt-primary/75 hover:bg-surface-2 hover:text-txt-primary',
          )}
          aria-label="Tools"
          title="Tools"
        >
          <Settings2 size={NAV_ICON} strokeWidth={ICON_STROKE} />
        </button>
      </HoverCardTrigger>
      <HoverCardContent side="right" align="start" sideOffset={8} className={FLYOUT_CONTENT_CLASS}>
        {panel}
      </HoverCardContent>
    </HoverCard>
  );
}

function ProjectsFlyoutMenu({
  variant,
  projectsActive,
}: {
  variant: 'expanded' | 'collapsed';
  projectsActive: boolean;
}) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { projects, loading, selectProject } = useProjects(isAuthenticated);
  const [open, setOpen] = useState(false);

  const recent = projects.slice(0, 8);

  const panel = (
    <>
      <div className="mb-1 flex items-center gap-2 px-2 py-1.5">
        <FolderKanban size={14} className="text-txt-secondary" strokeWidth={ICON_STROKE} />
        <span className="text-[12px] font-medium text-txt-tertiary">Projects</span>
      </div>
      {!isAuthenticated ? (
        <p className="px-2.5 py-2 text-[12px] leading-snug text-txt-secondary">Sign in to use projects.</p>
      ) : loading ? (
        <p className="px-2.5 py-2 text-[12px] text-txt-tertiary">Loading…</p>
      ) : recent.length === 0 ? (
        <p className="px-2.5 py-2 text-[12px] leading-snug text-txt-secondary">No projects yet.</p>
      ) : (
        recent.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              selectProject(p.id);
              setOpen(false);
              router.push('/');
            }}
            className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-surface-2/80"
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: p.color || '#D4AF37' }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-[13px] text-txt-secondary">{p.name}</span>
          </button>
        ))
      )}
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          router.push('/projects');
        }}
        className="mt-1 w-full rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-accent transition-colors hover:bg-surface-2/80"
      >
        View all projects
      </button>
    </>
  );

  if (variant === 'expanded') {
    return (
      <HoverCard open={open} onOpenChange={setOpen} openDelay={0} closeDelay={120}>
        <HoverCardTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left transition-colors duration-150',
              projectsActive || open
                ? 'bg-surface-2'
                : 'hover:bg-[#f0efea]/80 dark:hover:bg-surface-2/80',
            )}
          >
            <FolderKanban
              size={NAV_ICON}
              strokeWidth={ICON_STROKE}
              className={cn(
                'shrink-0 text-txt-primary',
                projectsActive || open ? 'opacity-100' : 'opacity-80',
              )}
            />
            <span className={NAV_LABEL_CLASS}>Projects</span>
            <ChevronRight
              size={14}
              strokeWidth={ICON_STROKE}
              className={cn(
                'shrink-0 text-txt-disabled transition-transform duration-150',
                open && 'rotate-90',
              )}
            />
          </button>
        </HoverCardTrigger>
        <HoverCardContent side="right" align="start" sideOffset={8} className={FLYOUT_CONTENT_CLASS}>
          {panel}
        </HoverCardContent>
      </HoverCard>
    );
  }

  return (
    <HoverCard open={open} onOpenChange={setOpen} openDelay={0} closeDelay={120}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className={cn(
            'mb-1 flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-150',
            projectsActive || open
              ? 'bg-accent-subtle text-txt-primary'
              : 'text-txt-primary/75 hover:bg-surface-2 hover:text-txt-primary',
          )}
          aria-label="Projects"
          title="Projects"
        >
          <FolderKanban size={NAV_ICON} strokeWidth={ICON_STROKE} />
        </button>
      </HoverCardTrigger>
      <HoverCardContent side="right" align="start" sideOffset={8} className={FLYOUT_CONTENT_CLASS}>
        {panel}
      </HoverCardContent>
    </HoverCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Profile — popover above (DropdownMenu side=top)
// ═══════════════════════════════════════════════════════════════════════════

const PROFILE_MENU_W =
  'w-[min(100vw-24px,280px)] min-w-[260px] max-w-[300px] rounded-2xl border border-[#E8E4DE] bg-white p-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:border-border-default dark:bg-surface-raised dark:shadow-lg';
const PROFILE_MENU_ITEM =
  'cursor-pointer gap-3 rounded-lg px-4 py-2.5 text-[14px] leading-snug text-[#1A1A1A] focus:bg-[#F5F3EF] data-[highlighted]:bg-[#F5F3EF] dark:text-txt-primary dark:focus:bg-surface-2 dark:data-[highlighted]:bg-surface-2 [&_svg]:size-[15px] [&_svg]:shrink-0 [&_svg]:text-[#6B6560] dark:[&_svg]:text-icon-secondary';

function ProfileMenu({ variant, tier }: { variant: 'expanded' | 'collapsed'; tier: TierType }) {
  const router = useRouter();
  const { user, isAuthenticated, signOut } = useAuth();
  const [language, setLanguage] = useState('en');
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
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-accent/20 transition-colors hover:bg-accent/28',
        BRAND_LOGO_BOX,
      )}
      aria-label="Profile"
    >
      <span className="text-[13px] font-semibold leading-none text-accent">{initial}</span>
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
        className={cn('z-[100] overflow-hidden p-0', PROFILE_MENU_W)}
      >
        {isAuthenticated ? (
          <>
            <div className="px-4 pb-3 pt-4">
              <p className="text-[15px] font-semibold leading-tight text-[#1A1A1A] dark:text-txt-primary">
                {displayName}
              </p>
              {user?.email && (
                <p className="mt-1 text-[13px] leading-snug text-[#6B6560] dark:text-txt-secondary">{user.email}</p>
              )}
            </div>
            <DropdownMenuSeparator className="m-0 bg-[#E5E5E5] dark:bg-border-subtle" />
            <div className="p-1.5">
              <DropdownMenuItem
                className={PROFILE_MENU_ITEM}
                onSelect={() => {
                  router.push('/settings');
                }}
              >
                <Settings strokeWidth={ICON_STROKE} aria-hidden />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className={cn(PROFILE_MENU_ITEM, 'h-auto w-full')}>
                  <Globe strokeWidth={ICON_STROKE} aria-hidden />
                  Language
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent
                  className="min-w-[180px] rounded-xl border border-[#E8E4DE] bg-white p-1 shadow-lg dark:border-border-default dark:bg-surface-raised"
                  sideOffset={6}
                >
                  <DropdownMenuRadioGroup value={language} onValueChange={setLanguage}>
                    <DropdownMenuRadioItem
                      value="en"
                      className="rounded-lg py-2 pl-8 pr-3 text-[13px] focus:bg-[#F5F3EF] dark:focus:bg-surface-2"
                    >
                      English
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem
                className={PROFILE_MENU_ITEM}
                onSelect={() => {
                  router.push('/pricing');
                }}
              >
                <List strokeWidth={ICON_STROKE} aria-hidden />
                View all plans
              </DropdownMenuItem>
            </div>
            <DropdownMenuSeparator className="m-0 bg-[#E5E5E5] dark:bg-border-subtle" />
            <div className="p-1.5">
              <DropdownMenuItem
                className={cn(
                  PROFILE_MENU_ITEM,
                  'text-rose-500 focus:bg-rose-500/[0.06] data-[highlighted]:bg-rose-500/[0.06] [&_svg]:text-rose-500',
                )}
                onSelect={async () => {
                  await signOut();
                  router.push('/');
                }}
              >
                <LogOut strokeWidth={ICON_STROKE} aria-hidden />
                Log out
              </DropdownMenuItem>
            </div>
          </>
        ) : (
          <>
            <div className="px-4 pb-2 pt-4">
              <p className="text-[15px] font-semibold text-[#1A1A1A] dark:text-txt-primary">Guest</p>
              <p className="mt-1 text-[13px] text-[#6B6560] dark:text-txt-secondary">Sign in to sync your account</p>
            </div>
            <DropdownMenuSeparator className="m-0 bg-[#E5E5E5] dark:bg-border-subtle" />
            <div className="p-1.5">
              <div className="px-3 py-1" onPointerDown={(e) => e.preventDefault()}>
                <ThemeToggleCompact />
              </div>
              <DropdownMenuItem
                className={PROFILE_MENU_ITEM}
                onSelect={() =>
                  window.dispatchEvent(new CustomEvent('octux:show-auth', { detail: { mode: 'login' } }))
                }
              >
                <LogIn strokeWidth={ICON_STROKE} aria-hidden />
                Sign in to your account
              </DropdownMenuItem>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
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
          <span className="block truncate text-[13px] font-medium leading-[1.4] tracking-[-0.01em] text-txt-primary">
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
    <div className="space-y-4 px-2 py-1">
      <div>
        <Skeleton className="mb-2 h-3 w-14 rounded bg-surface-3" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={`s-${i}`} className="flex items-center gap-2 py-1.5">
            <Skeleton className="h-[13px] flex-1 rounded bg-surface-3" />
            <Skeleton className="h-7 w-7 shrink-0 rounded-md bg-surface-3" />
          </div>
        ))}
      </div>
      <div>
        <Skeleton className="mb-2 h-3 w-16 rounded bg-surface-3" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={`r-${i}`} className="flex items-center gap-2 py-1.5">
            <Skeleton className="h-[13px] flex-1 rounded bg-surface-3" />
            <Skeleton className="h-7 w-7 shrink-0 rounded-md bg-surface-3" />
          </div>
        ))}
      </div>
    </div>
  );
}

function sortByUpdatedDesc(convos: ConversationSummary[]): ConversationSummary[] {
  return [...convos].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
}

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || (el as HTMLElement).isContentEditable;
}
