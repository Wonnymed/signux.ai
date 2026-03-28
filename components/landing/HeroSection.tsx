'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/design/cn';
import { openAuthModal, HERO_QUESTION_KEY } from '@/lib/auth/openAuthModal';

const TRY_CHIPS = [
  'Open a café in Gangnam',
  'Import electronics from Shenzhen',
  'Launch a SaaS in Latin America',
] as const;

interface HeroSectionProps {
  /** When false, submit runs a simulation. When true, all actions open sign-up and optional question is stored for the dashboard. */
  requireAuth?: boolean;
  /** Logged-in marketing (/home): headline + CTA to dashboard only — no hero input. */
  forLoggedInUser?: boolean;
  onSubmit?: (message: string) => void;
  loading?: boolean;
}

export default function HeroSection({
  requireAuth = false,
  forLoggedInUser = false,
  onSubmit,
  loading = false,
}: HeroSectionProps) {
  const [input, setInput] = useState('');
  const sectionRef = useRef<HTMLElement>(null);
  const heroInView = useInView(sectionRef, { once: true, margin: '-40px' });

  const run = () => {
    if (loading) return;
    if (requireAuth) {
      const t = input.trim();
      try {
        if (t) sessionStorage.setItem(HERO_QUESTION_KEY, t);
      } catch {
        /* private mode */
      }
      openAuthModal({ tab: 'signup' });
      return;
    }
    const t = input.trim();
    if (!t) return;
    onSubmit?.(t);
    setInput('');
  };

  const runChip = (chip: string) => {
    if (loading) return;
    if (requireAuth) {
      try {
        sessionStorage.setItem(HERO_QUESTION_KEY, chip);
      } catch {
        /* private mode */
      }
      openAuthModal({ tab: 'signup' });
      return;
    }
    setInput(chip);
  };

  return (
    <motion.section
      ref={sectionRef}
      initial={{ opacity: 0, y: 16 }}
      animate={heroInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-x-hidden px-4 pb-16 pt-20 sm:px-8 sm:pt-24"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/4 h-[min(520px,70vw)] w-[min(520px,70vw)] -translate-x-1/2 rounded-full bg-accent/[0.06] blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[min(100%,800px)] text-center">
        <h1 className="text-balance text-[2rem] font-semibold leading-[1.1] tracking-[-0.03em] text-txt-primary sm:text-5xl lg:text-[3.5rem] lg:leading-[1.08]">
          The world&apos;s first AI business simulation engine.
        </h1>

        <p className="mx-auto mt-5 max-w-[640px] text-pretty text-lg leading-relaxed text-txt-secondary sm:text-xl">
          Before Sukgo, you either asked one AI for one opinion — or spent thousands on consultants. We built a third
          option.
        </p>

        <p className="mx-auto mt-4 max-w-[500px] text-pretty text-sm leading-relaxed text-txt-tertiary sm:text-base">
          10 AI specialists debate your decision. 1,000 market voices validate demand. 4 simulation modes. Structured
          verdict in 60 seconds.
        </p>

        {forLoggedInUser ? (
          <div className="mx-auto mt-10">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-txt-on-accent transition-colors hover:bg-accent-hover"
            >
              Start a simulation
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        ) : null}

        {!forLoggedInUser ? (
          <>
            <div className="mx-auto mt-10 w-full max-w-lg">
              <label htmlFor="hero-decision" className="sr-only">
                What business decision are you facing?
              </label>
              <div
                className={cn(
                  'rounded-2xl border border-border-subtle bg-surface-raised shadow-[0_2px_20px_rgba(15,23,42,0.06)]',
                  'focus-within:border-accent/35 focus-within:ring-2 focus-within:ring-accent/15',
                )}
              >
                <textarea
                  id="hero-decision"
                  rows={3}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      run();
                    }
                  }}
                  placeholder="What business decision are you facing?"
                  disabled={loading}
                  className="w-full resize-none rounded-t-2xl bg-transparent px-5 py-4 text-[15px] leading-relaxed text-txt-primary outline-none placeholder:text-txt-tertiary/90 disabled:opacity-60"
                />
                <div className="flex flex-col gap-2 border-t border-border-subtle/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    type="button"
                    onClick={run}
                    disabled={loading || (!requireAuth && !input.trim())}
                    className={cn(
                      'inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors sm:w-auto',
                      (requireAuth || input.trim()) && !loading
                        ? 'bg-accent text-txt-on-accent hover:bg-accent-hover'
                        : 'cursor-not-allowed bg-surface-2 text-txt-disabled',
                    )}
                  >
                    {loading ? 'Starting…' : 'Simulate free →'}
                    {!loading && <ArrowRight className="h-4 w-4" aria-hidden />}
                  </button>
                </div>
              </div>
            </div>

            <p className="mt-6 text-xs text-txt-tertiary">
              Try:{' '}
              {TRY_CHIPS.map((chip, i) => (
                <span key={chip}>
                  {i > 0 && ' · '}
                  <button
                    type="button"
                    className="text-txt-secondary underline decoration-border-subtle underline-offset-2 transition-colors hover:text-accent"
                    onClick={() => runChip(chip)}
                  >
                    &ldquo;{chip}&rdquo;
                  </button>
                </span>
              ))}
            </p>
          </>
        ) : null}
      </div>

      {!forLoggedInUser ? (
      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-txt-tertiary"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle bg-surface-1/90">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 4v12M6 12l4 4 4-4" />
          </svg>
        </div>
      </motion.div>
      ) : null}
    </motion.section>
  );
}
