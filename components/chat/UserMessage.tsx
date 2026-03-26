'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/design/cn';

interface UserMessageProps {
  content: string;
  tier?: string;
  optimistic?: boolean;
  label?: string;
}

export default function UserMessage({ content, tier, optimistic, label }: UserMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: optimistic ? 0.7 : 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-end mb-4"
    >
      {label && (
        <span className="text-micro text-txt-disabled mb-1 mr-1">{label}</span>
      )}
      <div
        className={cn(
          'max-w-[85%] px-4 py-2.5 rounded-2xl rounded-br-md',
          'bg-accent text-white',
          'text-sm leading-relaxed whitespace-pre-wrap break-words',
          optimistic && 'opacity-70',
        )}
      >
        {content}
      </div>
    </motion.div>
  );
}
