'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/design/cn';
import { OctAvatar, OctButton, OctSkeleton } from '@/components/ui';
import SidebarSearch from '@/components/sidebar/SidebarSearch';
import SidebarCategories from '@/components/sidebar/SidebarCategories';
import SidebarContextMenu from '@/components/sidebar/SidebarContextMenu';
import SidebarProfile from '@/components/sidebar/SidebarProfile';
import SidebarEmptyState from '@/components/sidebar/SidebarEmptyState';

type CategoryFilter = 'all' | 'investment' | 'relationships' | 'career' | 'business' | 'life';

type Conversation = {
  id: string;
  title: string;
  verdict_recommendation?: string;
  model_tier?: string;
  category?: string;
  updated_at: string;
  pinned?: boolean;
};

interface ConversationSidebarProps {
  expanded: boolean;
  onNavigate?: () => void;
}

export default function ConversationSidebar({ expanded, onNavigate }: ConversationSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const router = useRouter();
  const pathname = usePathname();

  // Fetch conversations
  useEffect(() => {
    fetch('/api/c')
      .then(r => r.json())
      .then(data => { setConversations(data.conversations || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [pathname]);

  const navigate = useCallback((path: string) => {
    router.push(path);
    onNavigate?.();
  }, [router, onNavigate]);

  const activeId = pathname?.match(/^\/c\/(.+)/)?.[1];

  // Filter by category
  const filtered = useMemo(() => {
    if (categoryFilter === 'all') return conversations;
    return conversations.filter(c => c.category === categoryFilter);
  }, [conversations, categoryFilter]);

  // Separate pinned and recent
  const pinned = filtered.filter(c => c.pinned);
  const recent = filtered.filter(c => !c.pinned).slice(0, 20);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of conversations) {
      if (c.category) counts[c.category] = (counts[c.category] || 0) + 1;
    }
    return counts;
  }, [conversations]);

  // Actions
  const handlePin = async (id: string, currentlyPinned: boolean) => {
    try {
      await fetch(`/api/c/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: !currentlyPinned }),
      });
      setConversations(prev => prev.map(c => c.id === id ? { ...c, pinned: !currentlyPinned } : c));
    } catch {}
  };

  const handleRename = async (id: string) => {
    if (renamingId === id && renameValue.trim()) {
      try {
        await fetch(`/api/c/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: renameValue.trim() }),
        });
        setConversations(prev => prev.map(c => c.id === id ? { ...c, title: renameValue.trim() } : c));
      } catch {}
      setRenamingId(null);
      setRenameValue('');
    } else {
      const conv = conversations.find(c => c.id === id);
      setRenamingId(id);
      setRenameValue(conv?.title || '');
    }
  };

  const handleShare = (id: string) => {
    const url = `${window.location.origin}/c/${id}/report`;
    navigator.clipboard.writeText(url);
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/c/${id}`, { method: 'DELETE' });
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeId === id) navigate('/');
    } catch {}
  };

  return (
    <div className="h-full flex flex-col">
      {/* Top: entity + new */}
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
            onClick={() => navigate('/')}
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
            onClick={() => navigate('/')}
            className="w-9 h-9 rounded-md flex items-center justify-center text-icon-secondary hover:text-icon-primary hover:bg-surface-2 transition-colors duration-normal"
            title="New conversation"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 3v10M3 8h10" />
            </svg>
          </button>
        )}
      </div>

      {/* Search */}
      <div className={cn('px-3 mb-1', !expanded && 'flex justify-center')}>
        <SidebarSearch
          expanded={expanded}
          conversations={conversations}
          onSelect={(id) => navigate(`/c/${id}`)}
        />
      </div>

      {/* Category filters (expanded only) */}
      {expanded && conversations.length > 0 && (
        <div className="px-3 mb-2">
          <SidebarCategories
            active={categoryFilter}
            onChange={setCategoryFilter}
            counts={categoryCounts}
          />
        </div>
      )}

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
        {loading ? (
          <div className="space-y-2 px-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <OctSkeleton key={i} variant="text" className={expanded ? 'h-8' : 'h-8 w-8 rounded-md'} />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          expanded ? (
            <SidebarEmptyState onStartConversation={() => { navigate('/'); }} />
          ) : null
        ) : (
          <>
            {/* Pinned section */}
            {pinned.length > 0 && expanded && (
              <div className="mb-2">
                <div className="px-2 py-1 text-[10px] font-medium text-txt-disabled uppercase tracking-widest">
                  Pinned
                </div>
                {pinned.map(c => (
                  <SidebarContextMenu
                    key={c.id}
                    conversationId={c.id}
                    pinned={true}
                    onPin={() => handlePin(c.id, true)}
                    onRename={() => handleRename(c.id)}
                    onShare={() => handleShare(c.id)}
                    onDelete={() => handleDelete(c.id)}
                  >
                    <ConversationItem
                      conversation={c}
                      active={c.id === activeId}
                      expanded={expanded}
                      renaming={renamingId === c.id}
                      renameValue={renameValue}
                      onRenameChange={setRenameValue}
                      onRenameSubmit={() => handleRename(c.id)}
                      onClick={() => navigate(`/c/${c.id}`)}
                    />
                  </SidebarContextMenu>
                ))}
              </div>
            )}

            {/* Recent section */}
            {expanded && recent.length > 0 && (
              <div className="px-2 py-1 text-[10px] font-medium text-txt-disabled uppercase tracking-widest">
                Recent
              </div>
            )}
            {recent.map(c => expanded ? (
              <SidebarContextMenu
                key={c.id}
                conversationId={c.id}
                pinned={!!c.pinned}
                onPin={() => handlePin(c.id, !!c.pinned)}
                onRename={() => handleRename(c.id)}
                onShare={() => handleShare(c.id)}
                onDelete={() => handleDelete(c.id)}
              >
                <ConversationItem
                  conversation={c}
                  active={c.id === activeId}
                  expanded={expanded}
                  renaming={renamingId === c.id}
                  renameValue={renameValue}
                  onRenameChange={setRenameValue}
                  onRenameSubmit={() => handleRename(c.id)}
                  onClick={() => navigate(`/c/${c.id}`)}
                />
              </SidebarContextMenu>
            ) : (
              <ConversationItem
                key={c.id}
                conversation={c}
                active={c.id === activeId}
                expanded={false}
                onClick={() => navigate(`/c/${c.id}`)}
              />
            ))}
          </>
        )}
      </div>

      {/* Bottom: profile */}
      <div className={cn('shrink-0 border-t border-border-subtle px-3')}>
        <SidebarProfile
          expanded={expanded}
          tier="free"
          onSettings={() => {}}
        />
      </div>
    </div>
  );
}

// ═══ Conversation list item ═══
function ConversationItem({ conversation, active, expanded, renaming, renameValue, onRenameChange, onRenameSubmit, onClick }: {
  conversation: Conversation;
  active: boolean;
  expanded: boolean;
  renaming?: boolean;
  renameValue?: string;
  onRenameChange?: (v: string) => void;
  onRenameSubmit?: () => void;
  onClick: () => void;
}) {
  const verdictDot = conversation.verdict_recommendation?.toLowerCase();

  if (!expanded) {
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

  return (
    <button
      onClick={renaming ? undefined : onClick}
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

      {renaming ? (
        <input
          value={renameValue || ''}
          onChange={e => onRenameChange?.(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onRenameSubmit?.(); if (e.key === 'Escape') onRenameSubmit?.(); }}
          onBlur={onRenameSubmit}
          autoFocus
          className="flex-1 text-xs bg-transparent outline-none border-b border-accent/30 text-txt-primary"
        />
      ) : (
        <span className="text-xs truncate flex-1">{conversation.title || 'New conversation'}</span>
      )}

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
