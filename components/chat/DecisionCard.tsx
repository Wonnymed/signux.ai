'use client';

import { motion } from 'framer-motion';
import { Zap, Sparkles } from 'lucide-react';
import { TRANSITION } from '@/lib/motion/constants';
import { useChatStore } from '@/lib/store/chat';
import MarkdownRenderer from './MarkdownRenderer';
import DisclaimerBanner from './DisclaimerBanner';
import type { SimulationChargeType } from '@/lib/billing/token-costs';

interface DecisionCardProps {
  content: string;
  tier?: string;
  suggestSimulation?: boolean;
  simulationPrompt?: string;
  disclaimer?: string;
  onSimulate?: (question: string, simMode?: SimulationChargeType) => void;
}

export default function DecisionCard({
  content,
  tier,
  suggestSimulation,
  simulationPrompt,
  disclaimer,
  onSimulate,
}: DecisionCardProps) {
  const selectedSimMode = useChatStore((s) => s.selectedSimMode);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...TRANSITION.reveal, delay: 0.05 }}
      className="flex flex-col items-start mb-4 w-full"
    >
      <div className="flex items-start gap-3 max-w-[min(85%,42rem)] w-full">
        <div
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border-default bg-gradient-to-br from-surface-3 to-surface-2 shadow-sm shadow-black/20"
          aria-hidden
        >
          <Sparkles className="h-3.5 w-3.5 text-txt-secondary" strokeWidth={2} aria-hidden />
        </div>
        <div
          className="min-w-0 flex-1 rounded-2xl rounded-bl-md border border-border-subtle bg-surface-raised text-sm leading-relaxed text-txt-primary shadow-sm shadow-black/20 dark:bg-surface-1"
          style={{ padding: '12px 16px' }}
        >
          <MarkdownRenderer content={content} />
        </div>
      </div>

      {suggestSimulation && simulationPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          className="mt-3 ml-10 w-full max-w-[min(85%,42rem)] rounded-xl border border-border-default bg-[var(--bg-card)] p-4 shadow-md"
        >
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--bg-hover)]">
              <Zap size={13} className="text-txt-secondary" strokeWidth={2} />
            </div>
            <span className="text-xs font-medium text-txt-primary">
              This looks like a decision worth simulating
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSimulate?.(simulationPrompt, selectedSimMode)}
            className="inline-flex items-center gap-2 rounded-lg border-0 bg-[var(--btn-primary-bg)] px-5 py-2.5 text-sm font-medium text-[var(--btn-primary-text)] transition-opacity hover:opacity-90"
          >
            <Zap size={14} strokeWidth={2} className="shrink-0 text-[var(--btn-primary-text)]" />
            Run simulation
          </button>
        </motion.div>
      )}

      {disclaimer && <DisclaimerBanner text={disclaimer} className="mt-2 ml-10" />}
    </motion.div>
  );
}
