'use client';

import { cn } from '@/lib/design/cn';

interface SidebarEmptyStateProps {
  onStartConversation: (prompt: string) => void;
  className?: string;
}

const starters = [
  { emoji: '\u{1F4B0}', text: 'Should I invest in...?', category: 'investment' },
  { emoji: '\u{1F4BC}', text: 'Time to switch jobs?', category: 'career' },
  { emoji: '\u{1F3EA}', text: 'Should I start a business?', category: 'business' },
];

export default function SidebarEmptyState({ onStartConversation, className }: SidebarEmptyStateProps) {
  return (
    <div className={cn('px-3 py-6 text-center', className)}>
      <p className="text-xs text-txt-tertiary mb-4">Your decisions will appear here</p>

      <div className="space-y-1.5">
        {starters.map((s, i) => (
          <button
            key={i}
            onClick={() => onStartConversation(s.text)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 rounded-md',
              'bg-surface-2/50 hover:bg-surface-2 text-left',
              'transition-colors duration-normal',
              `stagger-${i + 1} animate-fade-in`,
            )}
          >
            <span className="text-sm">{s.emoji}</span>
            <span className="text-xs text-txt-secondary">{s.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
