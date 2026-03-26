'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { cn } from '@/lib/design/cn';

type Score = 'strong' | 'partial' | 'weak';

const ROWS = [
  {
    feature: 'Analysts on your decision',
    chatgpt: '1 generic model',
    consultants: '1–2 junior associates',
    octux: '10 specialist agents',
    chatgptScore: 'weak' as Score,
    consultantsScore: 'partial' as Score,
    octuxScore: 'strong' as Score,
  },
  {
    feature: 'Time to actionable verdict',
    chatgpt: '~10 seconds of opinions',
    consultants: '2–4 weeks of meetings',
    octux: '60 seconds, probability-graded',
    chatgptScore: 'partial' as Score,
    consultantsScore: 'weak' as Score,
    octuxScore: 'strong' as Score,
  },
  {
    feature: 'Cost per decision',
    chatgpt: '$20/mo subscription',
    consultants: '$2,000–$10,000 per engagement',
    octux: 'Free to start, $29/mo Pro',
    chatgptScore: 'partial' as Score,
    consultantsScore: 'weak' as Score,
    octuxScore: 'strong' as Score,
  },
  {
    feature: 'Probability & confidence score',
    chatgpt: 'Never provided',
    consultants: 'Rarely quantified',
    octux: 'Every verdict, every agent',
    chatgptScore: 'weak' as Score,
    consultantsScore: 'weak' as Score,
    octuxScore: 'strong' as Score,
  },
  {
    feature: 'Source traceability',
    chatgpt: 'No citations whatsoever',
    consultants: 'Cherry-picked to support thesis',
    octux: 'Every claim linked to its agent',
    chatgptScore: 'weak' as Score,
    consultantsScore: 'partial' as Score,
    octuxScore: 'strong' as Score,
  },
  {
    feature: 'Adversarial stress-testing',
    chatgpt: 'Agrees with whatever you say',
    consultants: 'Tends to confirm your hypothesis',
    octux: "Devil's Advocate built into every simulation",
    chatgptScore: 'weak' as Score,
    consultantsScore: 'partial' as Score,
    octuxScore: 'strong' as Score,
  },
  {
    feature: 'Risk & downside analysis',
    chatgpt: 'Not structured',
    consultants: 'Delivered weeks later as PDF',
    octux: 'Auto-generated risk matrix, instant',
    chatgptScore: 'weak' as Score,
    consultantsScore: 'partial' as Score,
    octuxScore: 'strong' as Score,
  },
  {
    feature: 'Getting a second opinion',
    chatgpt: 'Re-prompt and hope for different output',
    consultants: 'Hire another firm for another $5K',
    octux: '10 independent perspectives in one simulation',
    chatgptScore: 'weak' as Score,
    consultantsScore: 'weak' as Score,
    octuxScore: 'strong' as Score,
  },
  {
    feature: 'Bias protection',
    chatgpt: 'Sycophantic by design',
    consultants: 'Anchored to their framework',
    octux: "Adversarial agents cancel each other's bias",
    chatgptScore: 'weak' as Score,
    consultantsScore: 'partial' as Score,
    octuxScore: 'strong' as Score,
  },
  {
    feature: 'Learns from your past decisions',
    chatgpt: 'Forgets between sessions',
    consultants: 'Starts from zero every engagement',
    octux: 'Compound memory across every decision',
    chatgptScore: 'weak' as Score,
    consultantsScore: 'weak' as Score,
    octuxScore: 'strong' as Score,
  },
];

export default function WhyNotChatGPT() {
  const ref = useRef<HTMLElement | null>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section ref={ref} className="px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">

        {/* ─── HEADER ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16 text-center sm:mb-20"
        >
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.15em] text-accent">
            The honest comparison
          </p>
          <h2 className="mb-4 text-3xl font-medium tracking-tight text-txt-primary sm:text-4xl">
            Three ways to make a decision.
          </h2>
          <p className="mx-auto max-w-xl text-base leading-relaxed text-txt-tertiary sm:text-lg">
            Ask a chatbot. Hire a consultant. Or let 10 specialists debate it.
          </p>
        </motion.div>

        {/* ─── COLUMN HEADERS (desktop) ─── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="mb-1 hidden grid-cols-[1fr_200px_200px_220px] gap-0 lg:grid"
        >
          <div />
          <ColumnHeader label="ChatGPT" sublabel="The chatbot" />
          <ColumnHeader label="Consultants" sublabel="The $500/hr firm" />
          <ColumnHeader label="Octux" sublabel="Decision OS" highlighted />
        </motion.div>

        {/* ─── TABLE ROWS (desktop) ─── */}
        <div className="hidden lg:block">
          {ROWS.map((row, i) => (
            <motion.div
              key={row.feature}
              initial={{ opacity: 0, y: 6 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.35, delay: 0.2 + i * 0.04, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                'grid grid-cols-[1fr_200px_200px_220px] gap-0',
                'border-t border-border-subtle/60',
                i === ROWS.length - 1 && 'border-b border-border-subtle/60',
              )}
            >
              <div className="flex items-start px-5 py-5">
                <span className="text-sm font-medium leading-snug text-txt-primary">
                  {row.feature}
                </span>
              </div>
              <ComparisonCell text={row.chatgpt} score={row.chatgptScore} />
              <ComparisonCell text={row.consultants} score={row.consultantsScore} />
              <ComparisonCell text={row.octux} score={row.octuxScore} winner />
            </motion.div>
          ))}
        </div>

        {/* ─── MOBILE CARDS ─── */}
        <div className="space-y-4 lg:hidden">
          {ROWS.map((row, i) => (
            <motion.div
              key={row.feature}
              initial={{ opacity: 0, y: 8 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.35, delay: 0.15 + i * 0.04 }}
              className="overflow-hidden rounded-xl border border-border-subtle"
            >
              <div className="border-b border-border-subtle/60 px-4 py-3">
                <span className="text-sm font-medium text-txt-primary">{row.feature}</span>
              </div>
              <div className="divide-y divide-border-subtle/40">
                <MobileRow label="ChatGPT" text={row.chatgpt} score={row.chatgptScore} />
                <MobileRow label="Consultants" text={row.consultants} score={row.consultantsScore} />
                <MobileRow label="Octux" text={row.octux} score={row.octuxScore} winner />
              </div>
            </motion.div>
          ))}
        </div>

        {/* ─── BOTTOM STATEMENT ─── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mt-16 sm:mt-20"
        >
          {/* Three verdict cards */}
          <div className="mb-12 grid gap-4 sm:grid-cols-3 sm:gap-5">
            <OutcomeVerdictCard
              icon="💬"
              label="The Chatbot"
              quote="Here's a paragraph of opinions. Good luck!"
            />
            <OutcomeVerdictCard
              icon="👔"
              label="The Consultant"
              quote="Here's a PDF. That'll be $5,000. See you in 3 weeks."
            />
            <OutcomeVerdictCard
              icon="🐙"
              label="Octux"
              quote="PROCEED at 72% confidence. 10 specialists debated it. Every claim traceable. 60 seconds."
              highlighted
            />
          </div>

          {/* Final tagline */}
          <div className="text-center">
            <p className="text-base leading-relaxed text-txt-tertiary sm:text-lg">
              One gives you an opinion. One gives you an invoice.
            </p>
            <p className="mt-1 text-base font-medium text-txt-primary sm:text-lg">
              Octux gives you a decision framework.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ═══ COLUMN HEADER ═══

function ColumnHeader({
  label, sublabel, highlighted = false,
}: {
  label: string; sublabel: string; highlighted?: boolean;
}) {
  return (
    <div className={cn(
      'px-5 py-4 text-center',
      highlighted && 'rounded-t-xl bg-accent-subtle',
    )}>
      <span className={cn(
        'block text-sm font-semibold',
        highlighted ? 'text-accent' : 'text-txt-disabled',
      )}>
        {label}
      </span>
      <span className="mt-0.5 block text-[11px] text-txt-disabled">{sublabel}</span>
    </div>
  );
}

// ═══ COMPARISON CELL ═══

function ComparisonCell({
  text, score, winner = false,
}: {
  text: string; score: Score; winner?: boolean;
}) {
  return (
    <div className={cn(
      'flex items-start gap-2.5 border-l px-5 py-5',
      winner ? 'border-accent/10 bg-accent-subtle' : 'border-border-subtle/40',
    )}>
      <ScoreDot score={score} />
      <span className={cn(
        'text-[13px] leading-relaxed',
        winner ? 'text-txt-primary' :
        score === 'strong' ? 'text-txt-secondary' :
        score === 'partial' ? 'text-txt-tertiary' : 'text-txt-disabled',
      )}>
        {text}
      </span>
    </div>
  );
}

// ═══ SCORE DOT — 6px. Bloomberg uses dots. So do we. ═══

function ScoreDot({ score }: { score: Score }) {
  return (
    <span className={cn(
      'mt-[7px] h-[6px] w-[6px] shrink-0 rounded-full',
      score === 'strong' && 'bg-verdict-proceed',
      score === 'partial' && 'bg-verdict-delay',
      score === 'weak' && 'bg-verdict-abandon/60',
    )} />
  );
}

// ═══ MOBILE ROW ═══

function MobileRow({
  label, text, score, winner = false,
}: {
  label: string; text: string; score: Score; winner?: boolean;
}) {
  return (
    <div className={cn(
      'flex items-start gap-3 px-4 py-3',
      winner && 'bg-accent-subtle',
    )}>
      <ScoreDot score={score} />
      <div className="min-w-0 flex-1">
        <span className={cn(
          'mb-0.5 block text-[10px] font-medium uppercase tracking-wider',
          winner ? 'text-accent' : 'text-txt-disabled',
        )}>
          {label}
        </span>
        <span className={cn(
          'block text-[13px] leading-relaxed',
          winner ? 'text-txt-primary' :
          score === 'strong' ? 'text-txt-secondary' :
          score === 'partial' ? 'text-txt-tertiary' : 'text-txt-disabled',
        )}>
          {text}
        </span>
      </div>
    </div>
  );
}

// ═══ OUTCOME VERDICT CARDS (landing — not simulation VerdictCard) ═══

function OutcomeVerdictCard({
  icon, label, quote, highlighted = false,
}: {
  icon: string; label: string; quote: string; highlighted?: boolean;
}) {
  return (
    <div className={cn(
      'flex flex-col rounded-xl p-5 transition-all duration-200 sm:p-6',
      highlighted
        ? 'border border-accent/12 bg-accent-subtle shadow-md shadow-accent/5'
        : 'border border-border-subtle bg-surface-1 hover:border-border-default',
    )}>
      <div className="mb-4 flex items-center gap-2.5">
        <span className="text-lg">{icon}</span>
        <span className={cn(
          'text-xs font-medium uppercase tracking-wider',
          highlighted ? 'text-accent' : 'text-txt-disabled',
        )}>
          {label}
        </span>
      </div>
      <p className={cn(
        'flex-1 text-sm leading-relaxed',
        highlighted ? 'text-txt-primary' : 'text-txt-tertiary',
      )}>
        &ldquo;{quote}&rdquo;
      </p>
    </div>
  );
}
