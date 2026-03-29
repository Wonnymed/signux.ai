'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

export default function BuiltInSeoulSection() {
  const ref = useRef<HTMLElement | null>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <section ref={ref} className="border-y border-border-subtle/40 bg-surface-0 px-6 py-14 sm:py-16">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto max-w-[520px] text-center"
      >
        <p className="text-xl font-medium text-txt-secondary sm:text-[20px]">Built in Seoul. Powered by Claude.</p>
        <p className="mt-3 text-sm leading-relaxed text-txt-tertiary sm:text-[14px]">
          Sukgo runs on Anthropic&apos;s Claude — the same AI trusted by Amazon, Notion, and DuckDuckGo. Our multi-agent
          orchestration adds structured debate, crowd simulation, and memory on top.
        </p>
        <p className="mt-4 text-xs text-txt-disabled">Powered by Claude</p>
      </motion.div>
    </section>
  );
}
