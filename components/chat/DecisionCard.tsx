'use client';

import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { OctButton } from '@/components/octux';
import { TRANSITION } from '@/lib/motion/constants';
import MarkdownRenderer from './MarkdownRenderer';
import DisclaimerBanner from './DisclaimerBanner';

interface DecisionCardProps {
  content: string;
  tier?: string;
  suggestSimulation?: boolean;
  simulationPrompt?: string;
  disclaimer?: string;
  onSimulate?: (question: string, tier: string) => void;
}

export default function DecisionCard({
  content, tier, suggestSimulation, simulationPrompt, disclaimer, onSimulate,
}: DecisionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...TRANSITION.reveal, delay: 0.05 }}
      className="flex flex-col items-start mb-4 w-full"
    >
      <div className="flex items-start gap-3 max-w-[min(85%,42rem)] w-full">
        <div
          className="w-7 h-7 rounded-full bg-gradient-to-br from-accent/60 to-amber-600/40 flex items-center justify-center shrink-0 mt-0.5 border border-border-default shadow-sm shadow-black/20"
          aria-hidden
        >
          <span className="text-[10px] leading-none">🐙</span>
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
          className="mt-3 ml-10 w-full max-w-[min(85%,42rem)] rounded-r-xl border-l-2 border-accent/40 bg-surface-raised p-4 shadow-sm dark:bg-surface-1"
        >
          <div className="relative overflow-hidden octx-card-premium p-4">
            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
                <Zap size={13} className="text-accent" />
              </div>
              <span className="text-xs font-medium text-accent-light">
                This looks like a decision worth analyzing deeply
              </span>
            </div>
            <OctButton
              variant="default"
              size="sm"
              className="group relative overflow-hidden rounded-xl transition-colors"
              onClick={() => onSimulate?.(simulationPrompt, 'deep')}
            >
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.07] to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
              <span className="relative flex items-center gap-2">
                <Zap size={14} className="mr-0.5" />
                Activate Deep Simulation
              </span>
            </OctButton>
          </div>
        </motion.div>
      )}

      {tier && (
        <span className="text-micro mt-1 ml-10 text-txt-tertiary">
          {tier === 'ink' ? 'Ink' : tier === 'deep' ? 'Deep' : 'Kraken'}
        </span>
      )}

      {disclaimer && <DisclaimerBanner text={disclaimer} className="mt-2 ml-10" />}
    </motion.div>
  );
}
