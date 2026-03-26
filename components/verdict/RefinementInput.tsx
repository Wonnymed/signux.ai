'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, X } from 'lucide-react';
import { cn } from '@/lib/design/cn';

interface RefinementInputProps {
  simulationId: string;
  onRefine: (modification: string) => void;
  onCancel: () => void;
}

const QUICK_REFINEMENTS = [
  'What if budget was 2x larger?',
  'What if timeline was 6 months shorter?',
  'What if I had a co-founder?',
  'What about a different location?',
];

export default function RefinementInput({ onRefine, onCancel }: RefinementInputProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    if (!input.trim()) return;
    onRefine(input.trim());
    setInput('');
  };

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="border-t border-border-subtle"
    >
      <div className="p-3 sm:p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-txt-secondary">What if...?</span>
          <button onClick={onCancel} className="p-1 rounded hover:bg-surface-2 text-txt-disabled hover:text-txt-tertiary transition-colors">
            <X size={13} />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {QUICK_REFINEMENTS.map((q, i) => (
            <button
              key={i}
              onClick={() => onRefine(q)}
              className="text-micro px-2 py-1 rounded-md border border-border-subtle text-txt-tertiary hover:text-accent hover:border-accent/30 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            placeholder="Describe a change to test..."
            className="flex-1 h-8 px-3 text-xs bg-surface-2 rounded-md text-txt-primary placeholder:text-txt-disabled outline-none border border-transparent focus:border-accent/30"
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim()}
            className={cn(
              'h-8 px-3 rounded-md text-xs font-medium flex items-center gap-1 transition-colors',
              input.trim()
                ? 'bg-accent text-white hover:bg-accent-hover'
                : 'bg-surface-2 text-txt-disabled cursor-default',
            )}
          >
            Refine
            <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
