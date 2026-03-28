'use client';

import { useState } from 'react';
import { Star, Pencil, FolderPlus, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/shadcn/dropdown-menu';
import { useAppStore } from '@/lib/store/app';
import { cn } from '@/lib/design/cn';
import DeleteConfirmDialog from './DeleteConfirmDialog';

interface ConversationContextMenuProps {
  conversationId: string;
  title: string;
  isPinned: boolean;
  children: React.ReactNode;
  onRename: () => void;
}

export default function ConversationContextMenu({
  conversationId,
  title,
  isPinned,
  children,
  onRename,
}: ConversationContextMenuProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const updateConversation = useAppStore((s) => s.updateConversation);
  const removeConversation = useAppStore((s) => s.removeConversation);

  const handleStar = async () => {
    const newPinned = !isPinned;
    updateConversation(conversationId, { is_pinned: newPinned });
    await fetch(`/api/c/${conversationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pin', pinned: newPinned }),
    }).catch(() => {
      updateConversation(conversationId, { is_pinned: isPinned });
    });
  };

  const handleAddToProject = () => {
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/c/${conversationId}`;
    void navigator.clipboard.writeText(url);
  };

  const handleDelete = async () => {
    removeConversation(conversationId);
    await fetch(`/api/c/${conversationId}`, { method: 'DELETE' }).catch(() => {});
    setDeleteOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          {children}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          side="right"
          sideOffset={6}
          className="min-w-[200px] rounded-xl border border-border-default bg-surface-raised p-1 shadow-lg"
        >
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              void handleStar();
            }}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-txt-primary focus:bg-surface-2"
          >
            <Star
              size={15}
              strokeWidth={1.75}
              className={cn(
                'shrink-0',
                isPinned ? 'fill-txt-primary text-txt-primary' : 'text-txt-secondary',
              )}
            />
            {isPinned ? 'Unstar' : 'Star'}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onRename();
            }}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-txt-primary focus:bg-surface-2"
          >
            <Pencil size={15} strokeWidth={1.75} className="text-txt-secondary" />
            Rename
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              handleAddToProject();
            }}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-txt-primary focus:bg-surface-2"
          >
            <FolderPlus size={15} strokeWidth={1.75} className="text-txt-secondary" />
            Add to project
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-border-subtle/80" />

          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setDeleteOpen(true);
            }}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-red-700 focus:bg-red-500/10 focus:text-red-700 dark:text-red-400 dark:focus:text-red-400"
          >
            <Trash2 size={15} strokeWidth={1.75} />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title={title}
      />
    </>
  );
}
