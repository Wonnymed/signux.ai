'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/design/cn';
import MarkdownRenderer from './MarkdownRenderer';
import DisclaimerBanner from './DisclaimerBanner';

interface AssistantMessageProps {
  content: string;
  tier?: string;
  disclaimer?: string;
  isCode?: boolean;
}

const TIER_LABELS: Record<string, string> = {
  ink: 'Ink',
  deep: 'Deep',
  kraken: 'Kraken',
};

export default function AssistantMessage({ content, tier, disclaimer, isCode }: AssistantMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-start mb-4 max-w-[88%]"
    >
      <div
        className={cn(
          'px-4 py-3 rounded-2xl rounded-bl-md',
          'bg-surface-2 border border-border-default',
          'text-sm text-txt-primary leading-relaxed',
        )}
      >
        {isCode ? (
          <pre className="text-xs text-txt-secondary font-mono whitespace-pre-wrap overflow-x-auto">
            {content}
          </pre>
        ) : (
          <MarkdownRenderer content={content} />
        )}
      </div>

      {tier && TIER_LABELS[tier] && (
        <span className="text-micro text-txt-disabled mt-1 ml-2">
          {TIER_LABELS[tier]}
        </span>
      )}

      {disclaimer && <DisclaimerBanner text={disclaimer} className="mt-2 ml-0" />}
    </motion.div>
  );
}
