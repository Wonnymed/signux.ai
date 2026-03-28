'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

export default function NewCategorySection() {
  const ref = useRef<HTMLElement | null>(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <section
      ref={ref}
      className="border-y border-white/[0.06] px-6 py-20 sm:py-[80px]"
      style={{
        background: 'linear-gradient(180deg, #07070c 0%, #0a0a10 50%, #07070c 100%)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto max-w-[640px] text-center"
      >
        <p className="text-[24px] italic leading-snug text-white/40">We didn&apos;t improve an existing tool.</p>
        <p className="mt-3 text-[28px] font-medium leading-snug text-white">We created a new category.</p>
        <p className="mt-6 text-[15px] leading-[1.7] text-white/50">
          AI business simulation didn&apos;t exist before Sukgo. There was no way to test a business decision against
          multiple expert perspectives, stress-test it under worst-case scenarios, or hear 1,000 simulated market
          voices — all before spending a single dollar.
        </p>
        <p className="mt-6 text-lg font-medium text-white/80">Now there is.</p>
      </motion.div>
    </section>
  );
}
