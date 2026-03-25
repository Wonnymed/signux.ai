'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/design/cn';
import { OctAvatar, OctBadge, OctButton, OctSkeleton } from '@/components/ui';
import { verdictColors } from '@/lib/design/tokens';

interface ConversationSidebarProps {
  expanded: boolean;
  onNavigate?: () => void;
}

type Conversation = {
  id: string;
  title: string;
  verdict_recommendation?: string;
  model_tier?: string;
  updated_at: string;
  pinned?: boolean;
};

export default function ConversationSidebar({ expanded, onNavigate }: ConversationSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/c')
      .then(r => r.json())
      .then(data => { setConversations(data.conversations || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [pathname]);

  const navigate = (path: string) => {
    router.push(path);
    onNavigate?.();
  };

  const activeId = pathname?.match(/^\/c\/(.+)/)?.[1];

  // Separate pinned and recent
  const pinned = conversations.filter(c => c.pinned);
  const recent = conversations.filter(c => !c.pinned).slice(0, 20);

  return (
    <div className="h-full flex flex-col">
      {/* Top: entity + new button */}
      <div className={cn('shrink-0 p-3', !expanded && 'flex flex-col items-center')}>
        {expanded ? (
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <OctAvatar type="entity" state="dormant" size="xs" />
              <span className="text-sm font-light tracking-[0.15em] text-txt-secondary lowercase">octux</span>
            </div>
          </div>
        ) : (
          <div className="mb-3">
            <OctAvatar type="entity" state="dormant" size="sm" />
          </div>
        )}

        {expanded ? (
          <OctButton
            variant="primary"
            size="sm"
            fullWidth
            onClick={() => navigate('/c')}
            iconLeft={
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 2v10M2 7h10" />
              </svg>
            }
          >
            New
          </OctButton>
        ) : (
          <button
            onClick={() => navigate('/c')}
            className="w-9 h-9 rounded-md flex items-center justify-center text-icon-secondary hover:text-icon-primary hover:bg-surface-2 transition-colors duration-normal"
            title="New conversation"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 3v10M3 8h10" />
            </svg>
          </button>
        )}
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
        {loading ? (
          <div className="space-y-2 px-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <OctSkeleton key={i} variant="text" className={expanded ? 'h-8' : 'h-8 w-8 rounded-md'} />
            ))}
          </div>
        ) : (
          <>
            {/* Pinned section */}
            {pinned.length > 0 && expanded && (
              <div className="mb-2">
                <div className="px-2 py-1 text-[10px] font-medium text-txt-disabled uppercase tracking-widest">
                  Pinned
                </div>
                {pinned.map(c => (
                  <ConversationItem
                    key={c.id}
                    conversation={c}
                    active={c.id === activeId}
                    expanded={expanded}
                    onClick={() => navigate(`/c/${c.id}`)}
                  />
                ))}
              </div>
            )}

            {/* Recent section */}
            {expanded && recent.length > 0 && (
              <div className="px-2 py-1 text-[10px] font-medium text-txt-disabled uppercase tracking-widest">
                Recent
              </div>
            )}
            {recent.map(c => (
              <ConversationItem
                key={c.id}
                conversation={c}
                active={c.id === activeId}
                expanded={expanded}
                onClick={() => navigate(`/c/${c.id}`)}
              />
            ))}

            {/* Empty state */}
            {conversations.length === 0 && !loading && expanded && (
              <div className="px-3 py-8 text-center">
                <p className="text-xs text-txt-tertiary">Your decisions will appear here</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom: tier + settings */}
      <div className={cn('shrink-0 border-t border-border-subtle p-3', !expanded && 'flex flex-col items-center gap-2')}>
        {expanded ? (
          <div className="flex items-center justify-between">
            <OctBadge tier="free" size="xs">FREE</OctBadge>
            <button className="p-1.5 rounded-md text-icon-secondary hover:text-icon-primary hover:bg-surface-2 transition-colors duration-normal">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="7" cy="7" r="2.5" />
                <path d="M7 1v1.5M7 11.5V13M13 7h-1.5M2.5 7H1M11.2 2.8l-1.1 1.1M3.9 9.1l-1.1 1.1M11.2 11.2l-1.1-1.1M3.9 4.9L2.8 2.8" />
              </svg>
            </button>
          </div>
        ) : (
          <button className="p-1.5 rounded-md text-icon-secondary hover:text-icon-primary hover:bg-surface-2 transition-colors duration-normal">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="7" cy="7" r="2.5" />
              <path d="M7 1v1.5M7 11.5V13M13 7h-1.5M2.5 7H1M11.2 2.8l-1.1 1.1M3.9 9.1l-1.1 1.1M11.2 11.2l-1.1-1.1M3.9 4.9L2.8 2.8" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// --- Sub-component: Conversation list item ---
function ConversationItem({ conversation, active, expanded, onClick }: {
  conversation: Conversation;
  active: boolean;
  expanded: boolean;
  onClick: () => void;
}) {
  const verdictDot = conversation.verdict_recommendation?.toLowerCase();

  if (!expanded) {
    // Collapsed: just a dot
    return (
      <button
        onClick={onClick}
        className={cn(
          'w-9 h-9 rounded-md flex items-center justify-center transition-colors duration-normal',
          active ? 'bg-surface-2' : 'hover:bg-surface-2',
        )}
        title={conversation.title}
      >
        <span className={cn(
          'w-2 h-2 rounded-full',
          verdictDot === 'proceed' && 'bg-verdict-proceed',
          verdictDot === 'delay' && 'bg-verdict-delay',
          verdictDot === 'abandon' && 'bg-verdict-abandon',
          !verdictDot && 'bg-txt-disabled',
        )} />
      </button>
    );
  }

  // Expanded: full item
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-left transition-colors duration-normal group',
        active ? 'bg-surface-2 text-txt-primary' : 'text-txt-secondary hover:bg-surface-2 hover:text-txt-primary',
      )}
    >
      <span className={cn(
        'w-1.5 h-1.5 rounded-full shrink-0',
        verdictDot === 'proceed' && 'bg-verdict-proceed',
        verdictDot === 'delay' && 'bg-verdict-delay',
        verdictDot === 'abandon' && 'bg-verdict-abandon',
        !verdictDot && 'bg-txt-disabled',
      )} />
      <span className="text-xs truncate flex-1">{conversation.title || 'New conversation'}</span>
      <span className="text-micro text-txt-disabled shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {formatRelativeTime(conversation.updated_at)}
      </span>
    </button>
  );
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}
