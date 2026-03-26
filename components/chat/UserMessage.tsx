'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/design/cn';
import { useAuth } from '@/components/auth/AuthProvider';

function initialsFromUser(user: { email?: string | null; user_metadata?: Record<string, unknown> } | null): string {
  if (!user) return 'U';
  const meta = user.user_metadata;
  const name = (typeof meta?.full_name === 'string' && meta.full_name) ||
    (typeof meta?.name === 'string' && meta.name) ||
    user.email;
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

interface UserMessageProps {
  content: string;
  optimistic?: boolean;
  label?: string;
}

export default function UserMessage({ content, optimistic, label }: UserMessageProps) {
  const { user } = useAuth();
  const initials = initialsFromUser(user);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: optimistic ? 0.7 : 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-end mb-4 w-full"
    >
      {label && (
        <span className="text-micro text-txt-disabled mb-1 mr-1">{label}</span>
      )}
      <div className="flex items-start gap-3 justify-end max-w-[min(85%,42rem)] w-full">
        <div
          className={cn(
            'px-4 py-2.5 rounded-2xl rounded-br-sm',
            'bg-accent text-white',
            'text-sm leading-relaxed whitespace-pre-wrap break-words',
            optimistic && 'opacity-70',
          )}
        >
          {content}
        </div>
        <div
          className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5 border border-accent/15"
          aria-hidden
        >
          <span className="text-[10px] font-bold text-accent tabular-nums">{initials}</span>
        </div>
      </div>
    </motion.div>
  );
}
