'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Pin, MessageSquare, Settings,
  MoreHorizontal, Pencil, Trash2, Share2, Zap,
} from 'lucide-react';
import { cn } from '@/lib/design/cn';
import { useAppStore, type ConversationSummary } from '@/lib/store/app';
import { useBillingStore } from '@/lib/store/billing';
import type { TierType } from '@/lib/billing/tiers';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/shadcn/tooltip';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/shadcn/dropdown-menu';
import { Skeleton } from '@/components/ui/shadcn/skeleton';
import { Separator } from '@/components/ui/shadcn/separator';

// ═══ SIDEBAR SHELL ═══

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const expanded = useAppStore((s) => s.sidebarExpanded);
  const setExpanded = useAppStore((s) => s.setSidebarExpanded);
  const conversations = useAppStore((s) => s.conversations);
  const loading = useAppStore((s) => s.conversationsLoading);
  const activeId = useAppStore((s) => s.activeConversationId);
  const setActiveId = useAppStore((s) => s.setActiveConversationId);

  const tier = useBillingStore((s) => s.tier);
  const tokensRemaining = useBillingStore((s) => s.tokensRemaining);
  const tokensTotal = useBillingStore((s) => s.tokensTotal);

  // Sync active conversation from URL
  useEffect(() => {
    const match = pathname?.match(/^\/c\/(.+)/);
    setActiveId(match ? match[1] : null);
  }, [pathname, setActiveId]);

  // [ keyboard shortcut to toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '[' && !e.metaKey && !e.ctrlKey && !isInputFocused()) {
        e.preventDefault();
        setExpanded(!expanded);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [expanded, setExpanded]);

  // Group conversations
  const pinned = conversations.filter((c) => c.is_pinned);
  const unpinned = conversations.filter((c) => !c.is_pinned);
  const { today, yesterday, older } = groupByDate(unpinned);

  const handleNewConversation = () => {
    router.push('/');
  };

  const handleConversationClick = (id: string) => {
    router.push(`/c/${id}`);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <motion.aside
        initial={false}
        animate={{ width: expanded ? 260 : 56 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className={cn(
          'h-full shrink-0 flex flex-col',
          'bg-surface-1 border-r border-border-subtle',
          'select-none overflow-hidden'
        )}
      >
        {/* ─── HEADER ─── */}
        <div className="flex items-center gap-2 px-3 pt-3 pb-2">
          <button
            onClick={handleNewConversation}
            className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent/80 to-entity-bioluminescent/60 flex items-center justify-center shrink-0 hover:shadow-md hover:shadow-accent/20 transition-shadow duration-normal"
          >
            <span className="text-sm">🐙</span>
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2 overflow-hidden flex-1 min-w-0"
              >
                <span className="text-sm font-medium text-txt-primary tracking-wide truncate">
                  octux
                </span>
                <div className="ml-auto">
                  <SidebarIconButton
                    icon={Plus}
                    tooltip="New conversation"
                    onClick={handleNewConversation}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ─── SEARCH ─── */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.12 }}
              className="px-3 pb-2"
            >
              <button
                onClick={() => {
                  const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true });
                  window.dispatchEvent(event);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-txt-disabled hover:text-txt-tertiary hover:bg-surface-2 transition-colors duration-normal"
              >
                <Search size={13} className="shrink-0 opacity-45" />
                <span>Search...</span>
                <kbd className="ml-auto text-[10px] text-txt-disabled bg-surface-2 px-1 py-0.5 rounded">⌘K</kbd>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <Separator className="bg-border-subtle/50 mx-3" />

        {/* ─── CONVERSATIONS ─── */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-1.5 py-2 space-y-0.5">
          {loading ? (
            <SidebarSkeleton expanded={expanded} />
          ) : conversations.length === 0 ? (
            <SidebarEmpty expanded={expanded} />
          ) : (
            <>
              {pinned.length > 0 && (
                <ConversationGroup
                  label="Pinned"
                  conversations={pinned}
                  expanded={expanded}
                  activeId={activeId}
                  onClick={handleConversationClick}
                />
              )}
              {today.length > 0 && (
                <ConversationGroup
                  label="Today"
                  conversations={today}
                  expanded={expanded}
                  activeId={activeId}
                  onClick={handleConversationClick}
                />
              )}
              {yesterday.length > 0 && (
                <ConversationGroup
                  label="Yesterday"
                  conversations={yesterday}
                  expanded={expanded}
                  activeId={activeId}
                  onClick={handleConversationClick}
                />
              )}
              {older.length > 0 && (
                <ConversationGroup
                  label="Previous"
                  conversations={older.slice(0, 20)}
                  expanded={expanded}
                  activeId={activeId}
                  onClick={handleConversationClick}
                />
              )}
            </>
          )}
        </div>

        <Separator className="bg-border-subtle/50 mx-3" />

        {/* ─── BOTTOM: UPGRADE + SETTINGS ─── */}
        <div className="shrink-0 px-3 py-2.5 space-y-2">
          {/* Upgrade to Pro card */}
          <AnimatePresence mode="wait">
            {expanded ? (
              <motion.div
                key="expanded-upgrade"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {tier === 'free' ? (
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('octux:show-upgrade', { detail: { suggestedTier: 'pro' } }))}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-2/80 hover:bg-surface-3 border border-border-subtle/80 border-accent/10 shadow-sm shadow-black/20 backdrop-blur-sm transition-colors duration-normal text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                      <Zap size={14} className="text-accent" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-txt-primary">Upgrade to Pro</p>
                      <p className="text-[10px] text-txt-tertiary">Unlock more usage and benefits</p>
                    </div>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Zap size={13} className="text-accent opacity-60" />
                    <span className="text-micro text-txt-tertiary">
                      {tokensRemaining}/{tokensTotal} tokens
                    </span>
                    <div className="flex-1 h-1 rounded-full bg-surface-2 overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-300',
                          tokensRemaining === 0
                            ? 'bg-verdict-abandon'
                            : tokensRemaining <= 2
                            ? 'bg-verdict-delay'
                            : 'bg-accent',
                        )}
                        style={{ width: `${tokensTotal > 0 ? (tokensRemaining / tokensTotal) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="collapsed-upgrade"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex justify-center"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center">
                      <Zap size={14} className="text-accent" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {tier === 'free' ? 'Upgrade to Pro' : `${tokensRemaining}/${tokensTotal} tokens`}
                  </TooltipContent>
                </Tooltip>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tier + Settings */}
          <div className="flex items-center gap-2">
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden"
                >
                  <TierBadge tier={tier} />
                </motion.div>
              )}
            </AnimatePresence>

            <SidebarIconButton
              icon={Settings}
              tooltip="Settings"
              onClick={() => { /* TODO: PF-28 settings */ }}
            />
          </div>
        </div>
      </motion.aside>
    </TooltipProvider>
  );
}

// ═══ CONVERSATION GROUP ═══

function ConversationGroup({
  label, conversations, expanded, activeId, onClick,
}: {
  label: string;
  conversations: ConversationSummary[];
  expanded: boolean;
  activeId: string | null;
  onClick: (id: string) => void;
}) {
  return (
    <div className="mb-1">
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-2 py-1"
          >
            <span className="sidebar-section-label block !mt-0 !mb-0 !py-1 !px-2">
              {label}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {conversations.map((convo) => (
        <ConversationItem
          key={convo.id}
          convo={convo}
          expanded={expanded}
          active={activeId === convo.id}
          onClick={() => onClick(convo.id)}
        />
      ))}
    </div>
  );
}

// ═══ CONVERSATION ITEM ═══

function ConversationItem({
  convo, expanded, active, onClick,
}: {
  convo: ConversationSummary;
  expanded: boolean;
  active: boolean;
  onClick: () => void;
}) {
  const updateConversation = useAppStore((s) => s.updateConversation);
  const removeConversation = useAppStore((s) => s.removeConversation);

  const handlePin = async () => {
    updateConversation(convo.id, { is_pinned: !convo.is_pinned });
    await fetch(`/api/c/${convo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pin', pinned: !convo.is_pinned }),
    }).catch(() => {
      updateConversation(convo.id, { is_pinned: convo.is_pinned });
    });
  };

  const handleDelete = async () => {
    if (!confirm('Delete this conversation? This cannot be undone.')) return;
    removeConversation(convo.id);
    await fetch(`/api/c/${convo.id}`, { method: 'DELETE' }).catch(() => {});
  };

  const handleRename = () => {
    const newTitle = prompt('Rename conversation:', convo.title);
    if (!newTitle?.trim()) return;
    updateConversation(convo.id, { title: newTitle.trim() });
    fetch(`/api/c/${convo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'rename', title: newTitle.trim() }),
    }).catch(() => {});
  };

  return (
    <DropdownMenu>
      <div className="group relative">
        <button
          onClick={onClick}
          className={cn(
            'w-full flex items-center gap-2 rounded-md transition-all duration-normal border-l-2 border-transparent',
            expanded ? 'px-2 py-1.5' : 'px-0 py-1.5 justify-center',
            active
              ? 'sidebar-item-active text-txt-primary'
              : 'text-txt-secondary hover:bg-surface-2/60 hover:text-txt-primary',
          )}
        >
          <VerdictDot verdict={convo.latest_verdict} hasSim={convo.has_simulation} pinned={convo.is_pinned} />

          <AnimatePresence>
            {expanded && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="text-xs truncate text-left flex-1 min-w-0"
              >
                {convo.title || 'New conversation'}
              </motion.span>
            )}
          </AnimatePresence>

          {expanded && (
            <DropdownMenuTrigger asChild>
              <button
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-surface-3 transition-opacity duration-normal shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal size={13} className="text-icon-secondary" />
              </button>
            </DropdownMenuTrigger>
          )}
        </button>

        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={handlePin} className="text-xs gap-2">
            <Pin size={13} className={cn(convo.is_pinned && 'text-accent')} />
            {convo.is_pinned ? 'Unpin' : 'Pin'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleRename} className="text-xs gap-2">
            <Pencil size={13} />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigator.clipboard.writeText(`${window.location.origin}/c/${convo.id}/report`)}
            className="text-xs gap-2"
          >
            <Share2 size={13} />
            Copy link
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleDelete}
            className="text-xs gap-2 text-verdict-abandon focus:text-verdict-abandon"
          >
            <Trash2 size={13} />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </div>
    </DropdownMenu>
  );
}

// ═══ VERDICT DOT ═══

function VerdictDot({ verdict, hasSim, pinned }: {
  verdict: string | null;
  hasSim: boolean;
  pinned: boolean;
}) {
  if (pinned) {
    return <Pin size={13} className="shrink-0 text-accent opacity-70" />;
  }

  if (!hasSim || !verdict) {
    return <MessageSquare size={14} className="shrink-0 text-icon-secondary opacity-50" />;
  }

  const colorMap: Record<string, string> = {
    proceed: 'bg-verdict-proceed',
    delay: 'bg-verdict-delay',
    abandon: 'bg-verdict-abandon',
  };

  const dotColor = verdict ? colorMap[verdict] : 'bg-txt-disabled';

  return <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', dotColor)} />;
}

// ═══ TIER BADGE ═══

function TierBadge({ tier }: { tier: TierType }) {
  const colorMap: Record<string, string> = {
    free: 'text-txt-disabled border-border-subtle',
    pro: 'text-accent border-accent/30',
    max: 'text-tier-max border-tier-max/30',
    octopus: 'text-entity-bioluminescent border-entity-bioluminescent/30',
  };

  return (
    <span className={cn(
      'text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border',
      colorMap[tier] || colorMap.free,
    )}>
      {tier}
    </span>
  );
}

// ═══ SIDEBAR ICON BUTTON ═══

function SidebarIconButton({ icon: Icon, tooltip, onClick }: {
  icon: React.ComponentType<{ size?: number }>;
  tooltip: string;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className="w-7 h-7 rounded-md flex items-center justify-center text-icon-secondary hover:text-icon-primary hover:bg-surface-2 transition-all duration-normal"
        >
          <Icon size={15} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

// ═══ LOADING SKELETON ═══

function SidebarSkeleton({ expanded }: { expanded: boolean }) {
  return (
    <div className="space-y-1 px-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 py-1.5">
          <Skeleton className="w-2 h-2 rounded-full shrink-0" />
          {expanded && <Skeleton className="h-3 flex-1 rounded" />}
        </div>
      ))}
    </div>
  );
}

// ═══ EMPTY STATE ═══

function SidebarEmpty({ expanded }: { expanded: boolean }) {
  if (!expanded) return null;

  return (
    <div className="px-3 py-6 text-center">
      <p className="text-micro text-txt-disabled mb-1">No conversations yet</p>
      <p className="text-micro text-txt-disabled">
        Ask your first question above
      </p>
    </div>
  );
}

// ═══ HELPERS ═══

function groupByDate(convos: ConversationSummary[]) {
  const now = new Date();
  const todayStr = now.toDateString();
  const yesterdayStr = new Date(now.getTime() - 86400000).toDateString();

  const today: ConversationSummary[] = [];
  const yesterday: ConversationSummary[] = [];
  const older: ConversationSummary[] = [];

  for (const c of convos) {
    const dateStr = new Date(c.updated_at).toDateString();
    if (dateStr === todayStr) today.push(c);
    else if (dateStr === yesterdayStr) yesterday.push(c);
    else older.push(c);
  }

  return { today, yesterday, older };
}

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || (el as HTMLElement).isContentEditable;
}
