'use client';

import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { OctButton } from '@/components/octux';
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
          className="min-w-0 flex-1 rounded-2xl rounded-bl-md bg-[#111118] border border-white/[0.06] text-sm text-txt-primary leading-relaxed shadow-sm shadow-black/20"
          style={{ padding: '12px 16px' }}
        >
          <MarkdownRenderer content={content} />
        </div>
      </div>

      {suggestSimulation && simulationPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.2, delay: 0.3 }}
          className="mt-3 ml-10 w-full max-w-[min(85%,42rem)]"
        >
          <div className="relative p-[1px] rounded-xl bg-gradient-to-r from-accent/40 via-accent/10 to-transparent overflow-hidden">
            <div className="rounded-xl bg-[#0e0e16] p-4">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Zap size={13} className="text-accent" />
                </div>
                <span className="text-xs font-medium text-accent/80">
                  This looks like a decision worth analyzing deeply
                </span>
              </div>
              <OctButton
                variant="default"
                size="sm"
                className="rounded-xl hover:shadow-lg hover:shadow-accent/20 transition-all duration-200"
                onClick={() => onSimulate?.(simulationPrompt, 'deep')}
              >
                <Zap size={14} className="mr-1.5" />
                Activate Deep Simulation
              </OctButton>
            </div>
          </div>
        </motion.div>
      )}

      {tier && (
        <span className="text-micro text-txt-disabled mt-1 ml-10">
          {tier === 'ink' ? 'Ink' : tier === 'deep' ? 'Deep' : 'Kraken'}
        </span>
      )}

      {disclaimer && <DisclaimerBanner text={disclaimer} className="mt-2 ml-10" />}
    </motion.div>
  );
}
