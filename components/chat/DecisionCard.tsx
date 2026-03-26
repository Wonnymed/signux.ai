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
      className="flex flex-col items-start mb-4 max-w-[88%]"
    >
      <div className="rounded-2xl rounded-bl-md bg-[#1a1a28] border border-white/[0.08] text-sm text-txt-primary leading-relaxed shadow-sm shadow-white/[0.02]" style={{ padding: '12px 16px' }}>
        <MarkdownRenderer content={content} />
      </div>

      {suggestSimulation && simulationPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.2, delay: 0.3 }}
          className="mt-2 ml-1 p-3 rounded-xl border border-accent/20 bg-accent-subtle/30"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 rounded-md bg-accent/15 flex items-center justify-center">
              <Zap size={11} className="text-accent" />
            </div>
            <span className="text-xs font-medium text-accent">
              This looks like a decision worth analyzing deeply
            </span>
          </div>
          <OctButton
            variant="default"
            size="sm"
            onClick={() => onSimulate?.(simulationPrompt, 'deep')}
          >
            <Zap size={13} className="mr-1.5" />
            Activate Deep Simulation
          </OctButton>
        </motion.div>
      )}

      {tier && (
        <span className="text-micro text-txt-disabled mt-1 ml-2">
          {tier === 'ink' ? 'Ink' : tier === 'deep' ? 'Deep' : 'Kraken'}
        </span>
      )}

      {disclaimer && <DisclaimerBanner text={disclaimer} className="mt-2" />}
    </motion.div>
  );
}
