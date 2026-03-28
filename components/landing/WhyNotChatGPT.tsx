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
            &ldquo;Why not just use ChatGPT?&rdquo;
          </h2>
          <p className="mx-auto mt-4 max-w-[580px] text-pretty text-sm leading-relaxed text-txt-secondary sm:text-base">
            Because ChatGPT is a chatbot. Sukgo is a simulation engine.
            <br />
            They&apos;re different categories.
            <br />
            <br />
            ChatGPT gives you one voice, one opinion, one perspective.
            <br />
            Sukgo gives you a boardroom.
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
              className="w-full rounded-2xl border border-border-subtle bg-surface-1/80 p-6 text-left opacity-40 shadow-[0_2px_24px_rgba(15,23,42,0.04)] sm:p-7"
              aria-label="Chatbot category"
            >
              <p className="text-sm font-semibold text-txt-tertiary">💬 Chatbot</p>
              <p className="mt-4 text-sm leading-relaxed text-txt-secondary">
                &ldquo;I think opening a café in Gangnam could work because…&rdquo;
              </p>
              <ul className="mt-5 space-y-2 text-sm text-txt-tertiary">
                <li>→ 1 opinion</li>
                <li>→ No debate</li>
                <li>→ No stress test</li>
                <li>→ No crowd validation</li>
                <li>→ You hope it&apos;s right</li>
              </ul>
            </article>
          </div>

          <div className="shrink-0 py-2 text-center text-sm font-medium text-txt-disabled lg:py-0 lg:pt-24">vs.</div>

          <div className="flex w-full max-w-md flex-1 flex-col items-center lg:max-w-none">
            <article
              className="w-full rounded-2xl border-2 p-6 text-left shadow-[0_4px_32px_rgba(232,89,60,0.12)] sm:p-7"
              style={{ borderColor: 'rgba(232, 89, 60, 0.55)', background: 'var(--surface-1)' }}
              aria-label="Simulation engine category"
            >
              <p className="text-sm font-semibold text-accent">🔬 Simulation engine</p>
              <p className="mt-4 text-sm font-medium leading-relaxed text-txt-primary">
                10 specialists argue FOR and AGAINST your decision.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-txt-secondary">1,000 voices validate demand.</p>
              <p className="mt-2 text-sm leading-relaxed text-txt-secondary">4 modes test every angle.</p>
              <ul className="mt-5 space-y-2 text-sm text-txt-secondary">
                <li>→ Structured verdict</li>
                <li>→ Confidence scores</li>
                <li>→ Risk map</li>
                <li>→ You KNOW before you invest</li>
              </ul>
            </article>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
