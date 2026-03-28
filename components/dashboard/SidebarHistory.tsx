'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { MoreHorizontal, Pin, Pencil, Trash2 } from 'lucide-react';
import { useAppStore } from '@/lib/store/app';
import type { ConversationSummary } from '@/lib/store/app';
import { DARK_THEME } from '@/lib/dashboard/theme';
import DeleteConfirmDialog from '@/components/sidebar/DeleteConfirmDialog';

const PINNED_IDS_KEY = 'octux_pinned_sims';

const MENU_SURFACE = 'rgba(15,15,20,0.95)';
const MENU_BORDER = 'rgba(255,255,255,0.1)';
const MENU_ITEM = 'rgba(255,255,255,0.6)';
const MENU_ITEM_HOVER_BG = 'rgba(255,255,255,0.06)';
const MENU_ITEM_HOVER_FG = 'rgba(255,255,255,0.8)';

function readPinnedIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PINNED_IDS_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function writePinnedIds(ids: string[]) {
  try {
    localStorage.setItem(PINNED_IDS_KEY, JSON.stringify(ids));
  } catch {
    /* quota */
  }
}

function sidebarBadgeFor(c: ConversationSummary): string {
  if (!c.has_simulation) return 'CHAT';
  const m = c.last_sim_mode;
  if (m === 'compare') return 'A/B';
  if (m === 'stress_test') return 'STRESS';
  if (m === 'premortem') return 'PRE-M';
  return 'SIM';
}

function resultFromVerdict(v: string | null): 'proceed' | 'delay' | 'abandon' {
  if (v === 'delay' || v === 'abandon' || v === 'proceed') return v;
  return 'proceed';
}

const RESULT_DOT: Record<'proceed' | 'delay' | 'abandon', string> = {
  proceed: DARK_THEME.success,
  delay: DARK_THEME.warning,
  abandon: DARK_THEME.danger,
};

function sortByPinnedThenDate(list: ConversationSummary[], pinnedIds: string[]): ConversationSummary[] {
  const order = new Map(pinnedIds.map((id, i) => [id, i]));
  return [...list].sort((a, b) => {
    const ap = pinnedIds.includes(a.id);
    const bp = pinnedIds.includes(b.id);
    if (ap !== bp) return ap ? -1 : 1;
    if (ap && bp) return (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0);
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}

export default function SidebarHistory() {
  const router = useRouter();
  const pathname = usePathname();
  const conversations = useAppStore((s) => s.conversations);
  const fetchConversations = useAppStore((s) => s.fetchConversations);
  const updateConversation = useAppStore((s) => s.updateConversation);
  const removeConversation = useAppStore((s) => s.removeConversation);

  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ConversationSummary | null>(null);

  useEffect(() => {
    setPinnedIds(readPinnedIds());
  }, []);

  const refreshPinned = useCallback(() => {
    setPinnedIds(readPinnedIds());
  }, []);

  useEffect(() => {
    void fetchConversations({ silent: true });
  }, [fetchConversations]);

  const sorted = useMemo(
    () => sortByPinnedThenDate(conversations, pinnedIds).slice(0, 30),
    [conversations, pinnedIds],
  );
  const pinnedRows = useMemo(() => sorted.filter((c) => pinnedIds.includes(c.id)), [sorted, pinnedIds]);
  const historyRows = useMemo(() => sorted.filter((c) => !pinnedIds.includes(c.id)), [sorted, pinnedIds]);

  const currentConversationId = pathname?.match(/^\/c\/([^/]+)/)?.[1] ?? null;

  useEffect(() => {
    if (!openMenuId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenuId(null);
    };
    const onPointer = (e: MouseEvent) => {
      const el = e.target as Element | null;
      if (!el) return;
      const root = el.closest('[data-history-menu-root]');
      if (root?.getAttribute('data-history-menu-root') === openMenuId) return;
      setOpenMenuId(null);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [openMenuId]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    removeConversation(id);
    const nextPins = readPinnedIds().filter((x) => x !== id);
    writePinnedIds(nextPins);
    setPinnedIds(nextPins);
    if (currentConversationId === id) router.push('/');
    setDeleteTarget(null);
    try {
      await fetch(`/api/c/${id}`, { method: 'DELETE' });
    } catch {
      void fetchConversations({ silent: true });
    }
  }, [deleteTarget, removeConversation, currentConversationId, router, fetchConversations]);

  const renderSection = (label: string, rows: ConversationSummary[]) => {
    if (rows.length === 0) return null;
    return (
      <>
        <p
          className="mb-2 mt-1 px-1 text-[9px] font-medium uppercase tracking-[0.2em]"
          style={{ color: DARK_THEME.text_tertiary }}
        >
          {label}
        </p>
        <ul className="mb-3 flex flex-col gap-1">
          {rows.map((c) => (
            <HistoryRow
              key={c.id}
              c={c}
              isPinned={pinnedIds.includes(c.id)}
              modeBadge={sidebarBadgeFor(c)}
              isActive={currentConversationId === c.id}
              menuOpen={openMenuId === c.id}
              onMenuOpenChange={(open) => setOpenMenuId(open ? c.id : null)}
              onPinsUpdated={refreshPinned}
              updateConversation={updateConversation}
              onRequestDelete={() => {
                setOpenMenuId(null);
                setDeleteTarget(c);
              }}
              onNavigate={() => router.push(`/c/${c.id}`)}
            />
          ))}
        </ul>
      </>
    );
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
      {sorted.length === 0 ? (
        <p className="px-2 text-[11px]" style={{ color: DARK_THEME.text_tertiary }}>
          No simulations yet
        </p>
      ) : (
        <>
          {pinnedRows.length > 0 && renderSection('PINNED', pinnedRows)}
          {renderSection('HISTORY', historyRows)}
        </>
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDeleteConfirm()}
        title={deleteTarget?.title || ''}
      />
    </div>
  );
}

function HistoryRow({
  c,
  isPinned,
  modeBadge,
  isActive,
  menuOpen,
  onMenuOpenChange,
  onPinsUpdated,
  updateConversation,
  onRequestDelete,
  onNavigate,
}: {
  c: ConversationSummary;
  isPinned: boolean;
  modeBadge: string;
  isActive: boolean;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onPinsUpdated: () => void;
  updateConversation: (id: string, u: Partial<ConversationSummary>) => void;
  onRequestDelete: () => void;
  onNavigate: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [titleDraft, setTitleDraft] = useState(c.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLLIElement>(null);

  const result = c.has_simulation ? resultFromVerdict(c.latest_verdict) : 'proceed';

  useEffect(() => {
    if (!renaming) return;
    setTitleDraft(c.title);
    const t = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => clearTimeout(t);
  }, [renaming, c.title]);

  const saveRename = useCallback(async () => {
    const trimmed = titleDraft.trim();
    setRenaming(false);
    if (!trimmed || trimmed === c.title) {
      setTitleDraft(c.title);
      return;
    }
    const prev = c.title;
    updateConversation(c.id, { title: trimmed });
    try {
      const res = await fetch(`/api/c/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rename', title: trimmed }),
      });
      if (!res.ok) updateConversation(c.id, { title: prev });
    } catch {
      updateConversation(c.id, { title: prev });
    }
  }, [titleDraft, c.id, c.title, updateConversation]);

  const togglePin = useCallback(() => {
    const ids = readPinnedIds();
    const next = ids.includes(c.id) ? ids.filter((x) => x !== c.id) : [...ids, c.id];
    writePinnedIds(next);
    onPinsUpdated();
    onMenuOpenChange(false);
  }, [c.id, onPinsUpdated, onMenuOpenChange]);

  const cancelRename = useCallback(() => {
    setTitleDraft(c.title);
    setRenaming(false);
  }, [c.title]);

  return (
    <li ref={rowRef} className="group relative" data-history-menu-root={c.id}>
      <div
        className="relative flex items-center gap-1 rounded-lg py-1 pl-2 pr-8 transition-colors hover:bg-white/[0.04]"
        style={{
          backgroundColor: isActive ? 'rgba(255,255,255,0.06)' : undefined,
        }}
      >
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 py-0.5 text-left"
          onClick={() => {
            if (!renaming) onNavigate();
          }}
        >
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{
              backgroundColor: c.has_simulation ? RESULT_DOT[result] : DARK_THEME.text_tertiary,
            }}
            aria-hidden
          />
          {isPinned && (
            <Pin size={11} className="shrink-0 text-amber-400/90" strokeWidth={2} aria-label="Pinned" />
          )}
          {renaming ? (
            <input
              ref={inputRef}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void saveRename();
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  cancelRename();
                }
              }}
              onBlur={() => void saveRename()}
              maxLength={200}
              className="min-w-0 flex-1 rounded border bg-white/[0.05] px-1.5 py-0.5 text-[12px] font-normal text-white/80 outline-none"
              style={{ borderColor: 'rgba(255,255,255,0.15)' }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="min-w-0 flex-1 truncate text-[12px] text-white/80">{c.title}</span>
          )}
          <span
            className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
            style={{
              color: DARK_THEME.accent,
              backgroundColor: `${DARK_THEME.accent}22`,
            }}
          >
            {modeBadge}
          </span>
        </button>

        {!renaming && (
          <button
            type="button"
            className="absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
            style={{ color: 'rgba(255,255,255,0.3)' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.3)';
            }}
            aria-label="Conversation actions"
            aria-expanded={menuOpen}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onMenuOpenChange(!menuOpen);
            }}
          >
            <MoreHorizontal size={16} strokeWidth={2} />
          </button>
        )}

        {menuOpen && !renaming && (
          <div
            className="absolute right-0 top-[calc(100%-2px)] z-[70] min-w-[180px] rounded-lg p-1 shadow-lg"
            style={{
              backgroundColor: MENU_SURFACE,
              border: `1px solid ${MENU_BORDER}`,
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-[12px] transition-colors"
              style={{ color: MENU_ITEM }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = MENU_ITEM_HOVER_BG;
                e.currentTarget.style.color = MENU_ITEM_HOVER_FG;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = MENU_ITEM;
              }}
              onClick={(e) => {
                e.stopPropagation();
                togglePin();
              }}
            >
              <Pin size={14} className="shrink-0 opacity-80" />
              {isPinned ? 'Unpin' : 'Pin'}
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-[12px] transition-colors"
              style={{ color: MENU_ITEM }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = MENU_ITEM_HOVER_BG;
                e.currentTarget.style.color = MENU_ITEM_HOVER_FG;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = MENU_ITEM;
              }}
              onClick={(e) => {
                e.stopPropagation();
                onMenuOpenChange(false);
                setRenaming(true);
              }}
            >
              <Pencil size={14} className="shrink-0 opacity-80" />
              Rename
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-[12px] transition-colors"
              style={{ color: MENU_ITEM }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = MENU_ITEM_HOVER_BG;
                e.currentTarget.style.color = MENU_ITEM_HOVER_FG;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = MENU_ITEM;
              }}
              onClick={(e) => {
                e.stopPropagation();
                onMenuOpenChange(false);
                onRequestDelete();
              }}
            >
              <Trash2 size={14} className="shrink-0 opacity-80" />
              Delete
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
