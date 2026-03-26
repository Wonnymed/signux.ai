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
      className="flex flex-col items-start mb-4 w-full"
    >
      <div className="flex items-start gap-3 max-w-[min(85%,42rem)] w-full">
        <div
          className="w-7 h-7 rounded-full bg-gradient-to-br from-accent/60 to-cyan-500/40 flex items-center justify-center shrink-0 mt-0.5 border border-white/[0.08] shadow-sm shadow-black/20"
          aria-hidden
        >
          <span className="text-[10px] leading-none">🐙</span>
        </div>
        <div
          className={cn(
            'min-w-0 flex-1 px-4 py-3 rounded-2xl rounded-bl-sm',
            'bg-[#111118] border border-white/[0.06]',
            'text-[14px] leading-relaxed text-white/85',
            'shadow-sm shadow-black/20',
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
      </div>

      {tier && TIER_LABELS[tier] && (
        <span className="text-micro text-txt-disabled mt-1 ml-10">
          {TIER_LABELS[tier]}
        </span>
      )}

      {disclaimer && <DisclaimerBanner text={disclaimer} className="mt-2 ml-10" />}
    </motion.div>
  );
}
