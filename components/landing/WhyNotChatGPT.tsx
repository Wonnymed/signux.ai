'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

export default function WhyNotChatGPT() {
  const ref = useRef<HTMLElement | null>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section ref={ref} className="px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-[920px]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="text-center"
        >
          <h2 className="text-2xl font-medium tracking-tight text-txt-primary sm:text-3xl">
            Why not just use ChatGPT?
          </h2>
          <p className="mx-auto mt-4 max-w-[580px] text-pretty text-sm leading-relaxed text-txt-secondary sm:text-base">
            Because ChatGPT is a chatbot. Sukgo is a simulation engine. They&apos;re different categories.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.08, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mt-12 flex flex-col items-center gap-6 lg:flex-row lg:items-stretch lg:justify-center"
        >
          <div className="flex w-full max-w-md flex-1 flex-col items-center lg:max-w-none">
            <article
              className="w-full rounded-2xl border border-border-subtle bg-surface-1/80 p-6 text-left opacity-50 shadow-[0_2px_24px_rgba(15,23,42,0.04)] sm:p-7"
              aria-label="Chatbot category"
            >
              <p className="text-sm font-semibold text-txt-tertiary">💬 Chatbot</p>
              <p className="mt-4 text-sm leading-relaxed text-txt-secondary">
                One opinion. No debate. No stress test. You hope it&apos;s right.
              </p>
            </article>
          </div>

          <div className="shrink-0 py-2 text-center text-sm font-medium text-txt-disabled lg:py-0 lg:pt-24">vs.</div>

          <div className="flex w-full max-w-md flex-1 flex-col items-center lg:max-w-none">
            <article
              className="w-full rounded-2xl border-2 border-[#c9a96e]/55 bg-[rgba(201,169,110,0.03)] p-6 text-left shadow-[0_4px_32px_rgba(201,169,110,0.12)] sm:p-7"
              aria-label="Simulation engine category"
            >
              <p className="text-sm font-semibold text-[#c9a96e]">🔬 Simulation engine</p>
              <p className="mt-4 text-sm leading-relaxed text-txt-primary">
                Structured verdict, confidence scores, risk map — you KNOW before you invest.
              </p>
            </article>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
