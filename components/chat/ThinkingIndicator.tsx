'use client';

import { motion } from 'framer-motion';

export default function ThinkingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
      className="flex items-start mb-4 max-w-[88%]"
    >
      <div className="rounded-2xl rounded-bl-md bg-[#1a1a28] border border-white/[0.08] flex items-center gap-2 shadow-sm shadow-white/[0.02]" style={{ padding: '12px 16px' }}>
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-accent"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
        <span className="text-xs text-txt-tertiary">Thinking...</span>
      </div>
    </motion.div>
  );
}
