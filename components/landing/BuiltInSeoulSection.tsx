'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

export default function BuiltInSeoulSection() {
  const ref = useRef<HTMLElement | null>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <section
      ref={ref}
      className="border-y border-white/[0.06] bg-[#0a0a0f] px-6 py-14 sm:py-16"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto max-w-[520px] text-center"
      >
        <p className="text-[20px] font-medium text-white/70">Built in Seoul. Powered by Claude.</p>
        <p className="mt-3 text-[14px] leading-relaxed text-white/35">
          Sukgo runs on Anthropic&apos;s Claude — the same AI trusted by Amazon, Notion, and DuckDuckGo.
        </p>
      </motion.div>
    </section>
  );
}
