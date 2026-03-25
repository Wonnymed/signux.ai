'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/design/cn';

interface ContextMenuAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  danger?: boolean;
  onClick: () => void;
}

interface SidebarContextMenuProps {
  conversationId: string;
  pinned: boolean;
  onPin: () => void;
  onRename: () => void;
  onShare: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}

export default function SidebarContextMenu({
  conversationId, pinned, onPin, onRename, onShare, onDelete, children,
}: SidebarContextMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setPosition({ x: e.clientX, y: e.clientY });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [open]);

  const actions: ContextMenuAction[] = [
    {
      id: 'pin',
      label: pinned ? 'Unpin' : 'Pin',
      icon: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M7 1L4 4L1 5l2 2l-2 4l4-2l2 2l1-3l3-3" />
        </svg>
      ),
      onClick: () => { onPin(); setOpen(false); },
    },
    {
      id: 'rename',
      label: 'Rename',
      icon: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M8.5 1.5l2 2L4 10H2v-2L8.5 1.5z" />
        </svg>
      ),
      onClick: () => { onRename(); setOpen(false); },
    },
    {
      id: 'share',
      label: 'Share',
      icon: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 7.5L8 4.5M4 4.5L8 7.5" />
          <circle cx="3" cy="6" r="1.5" />
          <circle cx="9" cy="3.5" r="1.5" />
          <circle cx="9" cy="8.5" r="1.5" />
        </svg>
      ),
      onClick: () => { onShare(); setOpen(false); },
    },
    {
      id: 'delete',
      label: 'Delete',
      danger: true,
      icon: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 3h8M4.5 3V2h3v1M3 3v7a1 1 0 001 1h4a1 1 0 001-1V3" />
        </svg>
      ),
      onClick: () => { onDelete(); setOpen(false); },
    },
  ];

  return (
    <div onContextMenu={handleContextMenu}>
      {children}

      {open && (
        <>
          <div className="fixed inset-0 z-[90]" onClick={() => setOpen(false)} />

          <div
            ref={menuRef}
            className={cn(
              'fixed z-[100] py-1 min-w-[140px] animate-scale-in origin-top-left',
              'bg-surface-raised border border-border-subtle rounded-lg shadow-lg',
            )}
            style={{ left: position.x, top: position.y }}
          >
            {actions.map((action) => (
              <div key={action.id}>
                {action.danger && <div className="my-1 border-t border-border-subtle" />}
                <button
                  onClick={action.onClick}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-left transition-colors duration-fast',
                    action.danger ? 'text-verdict-abandon hover:bg-verdict-abandon/10' : 'text-txt-primary hover:bg-surface-2',
                  )}
                >
                  <span className="text-icon-secondary">{action.icon}</span>
                  {action.label}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
