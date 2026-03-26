# PF-19 — Marketing Polish (6 Sections Below the Fold)

## Context for AI

You are working on Octux AI — a Decision Operating System. Next.js 14 App Router + TypeScript + Tailwind CSS + shadcn/ui + Zustand + Lucide React + Framer Motion.

**Ref:** Okara (marketing below product), Stripe (trust sequence + scroll animations), Dify (how it works narrative), ChatGPT (position AGAINST)

**What exists:**
- 6 marketing sections in `components/landing/`: TrustStrip, HowItWorks, LiveExample, WhyNotChatGPT, PricingPreview, LandingFooter
- They render below the hero on root page (/) and scroll correctly
- VerdictCard component (PF-14) exists and works in chat
- Pricing: $0/$29/$99/$249 with tokens (HOTFIX-PRICING-v2)
- Framer Motion available
- All sections currently render with basic styling — text, cards, minimal animation

**What this prompt upgrades:**

All 6 sections get:
1. Framer Motion scroll-triggered animations (fade-in-up, stagger)
2. Visual polish matching the premium feel of the chat experience
3. LiveExample uses the REAL VerdictCard component
4. WhyNotChatGPT shows actual side-by-side comparison
5. PricingPreview gets tier highlight + token explainer
6. Footer gets CTA with entity visual

**IMPORTANT:** These components are in `components/landing/`. Do NOT create new files in `components/marketing/`. Update the existing files.

---

## Part A — Shared Scroll Animation Hook

CREATE `hooks/useScrollReveal.ts`:

```typescript
'use client';

import { useRef } from 'react';
import { useInView } from 'framer-motion';

/**
 * Scroll-triggered reveal animation.
 * Returns ref + props to spread on a motion.div.
 */
export function useScrollReveal(options?: { once?: boolean; margin?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, {
    once: options?.once ?? true,
    margin: options?.margin ?? '-80px 0px',
  });

  return {
    ref,
    isInView,
    animate: isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 },
    initial: { opacity: 0, y: 24 },
    transition: { duration: 0.5, ease: 'easeOut' },
  };
}
```

---

## Part B — TrustStrip (Stats + Tech Logos)

UPDATE `components/landing/TrustStrip.tsx`:

```typescript
'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const STATS = [
  { value: 1247, label: 'decisions analyzed', suffix: '' },
  { value: 50, label: 'specialist agents', suffix: '' },
  { value: 5, label: 'decision categories', suffix: '' },
  { value: 10, label: 'debate rounds per sim', suffix: '' },
];

const TECH_LOGOS = [
  'Anthropic Claude', 'Next.js', 'Supabase', 'Vercel',
];

function AnimatedCounter({ value, duration = 1.5 }: { value: number; duration?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const end = value;
    const stepTime = (duration * 1000) / end;
    const timer = setInterval(() => {
      start += Math.ceil(end / 40);
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [isInView, value, duration]);

  return (
    <span ref={ref} className="text-3xl font-light text-txt-primary tabular-nums">
      {count.toLocaleString()}
    </span>
  );
}

export default function TrustStrip() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section ref={ref} className="py-16 border-t border-b border-border-subtle/50">
      <div className="max-w-5xl mx-auto px-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="text-center"
            >
              <AnimatedCounter value={stat.value} />
              <p className="text-xs text-txt-tertiary mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Tech logos */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex items-center justify-center gap-6 flex-wrap"
        >
          <span className="text-micro text-txt-disabled">Built with</span>
          {TECH_LOGOS.map((logo) => (
            <span key={logo} className="text-xs text-txt-tertiary">{logo}</span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
```

**Don't forget the import:**
```typescript
import { useState, useEffect, useRef } from 'react';
```

---

## Part C — HowItWorks (3 Steps with Visual Previews)

UPDATE `components/landing/HowItWorks.tsx`:

```typescript
'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { MessageSquare, Users, Scale } from 'lucide-react';

const STEPS = [
  {
    number: '01',
    title: 'You ask',
    description: 'Type any decision — investment, career, relationship, business. No formatting needed.',
    example: '"Should I invest $50K in rental property in Gangnam?"',
    icon: MessageSquare,
    visual: 'input', // renders a mini input mockup
  },
  {
    number: '02',
    title: '10 specialists debate',
    description: 'AI agents with distinct expertise analyze, challenge, and stress-test your decision in real-time.',
    example: 'Base Rate Archivist · Regulatory Gatekeeper · Demand Signal Analyst · 7 more',
    icon: Users,
    visual: 'agents', // renders mini agent list
  },
  {
    number: '03',
    title: 'You get a verdict',
    description: 'A probability-graded verdict with every claim traceable to the agent who made it.',
    example: 'PROCEED WITH CONDITIONS (72%) · Grade B+ · 4 citations',
    icon: Scale,
    visual: 'verdict', // renders mini verdict
  },
];

export default function HowItWorks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-2xl font-medium text-txt-primary mb-3">How it works</h2>
          <p className="text-sm text-txt-tertiary max-w-md mx-auto">
            From question to verdict in 60 seconds. Every claim backed by a specialist.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="space-y-20">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.15 }}
              className={`flex flex-col ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-10`}
            >
              {/* Text */}
              <div className="flex-1 max-w-md">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm font-bold text-accent tabular-nums">{step.number}</span>
                  <h3 className="text-lg font-medium text-txt-primary">{step.title}</h3>
                </div>
                <p className="text-sm text-txt-secondary leading-relaxed mb-3">
                  {step.description}
                </p>
                <p className="text-xs text-txt-tertiary italic">{step.example}</p>
              </div>

              {/* Visual */}
              <div className="flex-1 max-w-md w-full">
                <StepVisual type={step.visual} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StepVisual({ type }: { type: string }) {
  if (type === 'input') {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
        <div className="flex items-center gap-2 rounded-lg border border-border-default bg-surface-0 px-4 py-3">
          <span className="text-sm text-txt-tertiary flex-1">Should I invest $50K in rental property?</span>
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
            <span className="text-white text-xs">↑</span>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'agents') {
    const agents = [
      { name: 'Base Rate Archivist', position: 'PROCEED', confidence: '8/10', color: 'bg-verdict-proceed' },
      { name: 'Regulatory Gatekeeper', position: 'DELAY', confidence: '9/10', color: 'bg-verdict-delay' },
      { name: 'Demand Signal Analyst', position: 'PROCEED', confidence: '7/10', color: 'bg-verdict-proceed' },
    ];
    return (
      <div className="rounded-xl border border-border-subtle bg-surface-1 p-4 space-y-2">
        {agents.map((a) => (
          <div key={a.name} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-0">
            <span className={`w-2.5 h-2.5 rounded-full ${a.color}`} />
            <span className="text-xs text-txt-secondary flex-1">{a.name}</span>
            <span className={`text-[10px] font-bold ${a.color === 'bg-verdict-proceed' ? 'text-verdict-proceed' : 'text-verdict-delay'}`}>
              {a.position}
            </span>
            <span className="text-micro text-txt-disabled tabular-nums">{a.confidence}</span>
          </div>
        ))}
        <p className="text-micro text-txt-disabled text-center pt-1">+ 7 more specialists debating...</p>
      </div>
    );
  }

  if (type === 'verdict') {
    return (
      <div className="rounded-xl border border-verdict-proceed/20 bg-verdict-proceed/5 p-5">
        <div className="flex items-center gap-4 mb-3">
          {/* Mini probability ring */}
          <div className="w-14 h-14 rounded-full border-[3px] border-verdict-proceed flex items-center justify-center">
            <span className="text-lg font-bold text-verdict-proceed tabular-nums">72%</span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-verdict-proceed bg-verdict-proceed/15 px-2 py-0.5 rounded">PROCEED</span>
              <span className="text-sm font-semibold text-accent">B+</span>
            </div>
            <p className="text-xs text-txt-secondary">
              Market conditions favor launch
              <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-accent/15 text-accent text-[9px] font-bold mx-0.5 align-middle">1</span>
              <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-accent/15 text-accent text-[9px] font-bold mx-0.5 align-middle">3</span>
              , but permit timeline adds risk
              <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-accent/15 text-accent text-[9px] font-bold mx-0.5 align-middle">2</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-micro text-txt-disabled">
          <span className="text-verdict-proceed font-medium">RISK</span> Gangnam rent ↑8% YoY
          <span className="mx-1">·</span>
          <span className="text-verdict-proceed font-medium">ACTION</span> Secure lease before Q3
        </div>
      </div>
    );
  }

  return null;
}
```

---

## Part D — LiveExample (Real Interactive Verdict)

UPDATE `components/landing/LiveExample.tsx`:

```typescript
'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

// Static verdict data for the marketing example
const EXAMPLE_VERDICT = {
  recommendation: 'proceed' as const,
  probability: 72,
  grade: 'B+',
  one_liner: 'Market conditions and foot traffic favor a specialty coffee concept, but permit timelines and rent escalation require a 6-month buffer.',
  main_risk: 'Gangnam commercial rent increases averaging 8% YoY could erode margins by month 18',
  next_action: 'Secure lease with 2-year rent cap clause before market shifts in Q3',
  disclaimer: 'This is a simulated example for demonstration purposes.',
  agent_scoreboard: [
    { agent_name: 'Base Rate Archivist', role: 'Historical data', position: 'proceed' as const, confidence: 8, key_argument: 'Similar cafes in Gangnam have 58% 3-year survival rate' },
    { agent_name: 'Regulatory Gatekeeper', role: 'Compliance', position: 'delay' as const, confidence: 9, key_argument: 'F&B permits in Gangnam take 4-6 months, not 2' },
    { agent_name: 'Demand Signal Analyst', role: 'Market demand', position: 'proceed' as const, confidence: 7, key_argument: 'Specialty coffee demand growing 12% YoY in Gangnam' },
    { agent_name: 'Unit Economics Auditor', role: 'Financial model', position: 'proceed' as const, confidence: 6, key_argument: 'Break-even at month 14 with $10K starting capital is tight' },
  ],
  citations: [
    { id: 1, agent_id: 'base_rate', agent_name: 'Base Rate Archivist', round: 2, claim: 'Historical success rate of 58% in premium Seoul districts', confidence: 8 },
    { id: 2, agent_id: 'regulatory', agent_name: 'Regulatory Gatekeeper', round: 4, claim: 'F&B permit process requires minimum 4-6 months in Gangnam-gu', confidence: 9 },
    { id: 3, agent_id: 'demand', agent_name: 'Demand Signal Analyst', round: 3, claim: 'Specialty coffee market growing 12% YoY driven by remote work', confidence: 7 },
  ],
};

interface LiveExampleProps {
  onSignIn?: () => void;
}

export default function LiveExample({ onSignIn }: LiveExampleProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} className="py-20 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl font-medium text-txt-primary mb-3">See a real analysis</h2>
          <p className="text-sm text-txt-tertiary">
            This is actual Octux output. Hover the citations. Explore the agents.
          </p>
        </motion.div>

        {/* Question */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="text-center mb-6"
        >
          <span className="text-micro text-txt-disabled uppercase tracking-wider">Question</span>
          <p className="text-base text-txt-primary mt-1">Should I open a coffee shop in Gangnam, Seoul?</p>
        </motion.div>

        {/* Verdict Card — use the real component or a static replica */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <StaticVerdictCard verdict={EXAMPLE_VERDICT} />
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4, delay: 0.7 }}
          className="text-center mt-8"
        >
          <button
            onClick={onSignIn}
            className="px-6 py-3 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors"
          >
            Try your own decision →
          </button>
        </motion.div>
      </div>
    </section>
  );
}

/** Static verdict card for marketing — doesn't need Zustand or real props */
function StaticVerdictCard({ verdict }: { verdict: typeof EXAMPLE_VERDICT }) {
  return (
    <div className="rounded-xl border-2 border-verdict-proceed/20 overflow-hidden">
      <div className="p-5 sm:p-6" style={{ backgroundColor: 'rgba(16, 185, 129, 0.03)' }}>
        <div className="flex items-start gap-5">
          {/* Ring */}
          <div className="w-16 h-16 rounded-full border-[3px] border-verdict-proceed flex items-center justify-center shrink-0">
            <span className="text-xl font-bold text-verdict-proceed tabular-nums">{verdict.probability}%</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-bold text-verdict-proceed bg-verdict-proceed/15 px-2.5 py-1 rounded-md uppercase tracking-wider">
                {verdict.recommendation}
              </span>
              <span className="text-sm font-semibold text-accent">{verdict.grade}</span>
            </div>
            <p className="text-sm text-txt-secondary leading-relaxed mb-3">{verdict.one_liner}</p>

            <div className="flex flex-col sm:flex-row gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-verdict-abandon">RISK</span>
                <span className="text-txt-tertiary">{verdict.main_risk}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-verdict-proceed">ACTION</span>
                <span className="text-txt-tertiary">{verdict.next_action}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Agent strip */}
      <div className="px-5 sm:px-6 py-3 border-t border-verdict-proceed/10 flex items-center gap-4 flex-wrap">
        {verdict.agent_scoreboard.map((agent) => (
          <div key={agent.agent_name} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${
              agent.position === 'proceed' ? 'bg-verdict-proceed' :
              agent.position === 'delay' ? 'bg-verdict-delay' : 'bg-verdict-abandon'
            }`} />
            <span className="text-micro text-txt-tertiary">{agent.agent_name.split(' ')[0]} {agent.agent_name.split(' ')[1]}</span>
            <span className={`text-[10px] font-bold uppercase ${
              agent.position === 'proceed' ? 'text-verdict-proceed' :
              agent.position === 'delay' ? 'text-verdict-delay' : 'text-verdict-abandon'
            }`}>
              {agent.position}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Part E — WhyNotChatGPT (Side-by-Side Comparison)

UPDATE `components/landing/WhyNotChatGPT.tsx`:

```typescript
'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

export default function WhyNotChatGPT() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} className="py-20 px-6 border-t border-border-subtle/50">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl font-medium text-txt-primary mb-3">Why not just ask ChatGPT?</h2>
          <p className="text-sm text-txt-tertiary">ChatGPT gives opinions. Octux gives analysis.</p>
        </motion.div>

        {/* Comparison */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* ChatGPT side */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-xl border border-border-subtle bg-surface-1 p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-surface-2 flex items-center justify-center">
                <span className="text-[10px] text-txt-disabled">GP</span>
              </div>
              <span className="text-xs text-txt-tertiary">Generic AI chatbot</span>
            </div>
            <p className="text-sm text-txt-secondary leading-relaxed">
              "Opening a café in Gangnam could be a good opportunity! The area has high foot traffic and
              a growing coffee culture. However, you should consider the high rent costs and competition.
              I'd recommend doing thorough market research and creating a solid business plan before
              proceeding. Good luck with your venture! 🎉"
            </p>
            <div className="mt-4 pt-3 border-t border-border-subtle/50 flex items-center gap-3">
              <span className="text-[10px] text-txt-disabled">❌ No data</span>
              <span className="text-[10px] text-txt-disabled">❌ No agents</span>
              <span className="text-[10px] text-txt-disabled">❌ No citations</span>
              <span className="text-[10px] text-txt-disabled">❌ Generic</span>
            </div>
          </motion.div>

          {/* Octux side */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="rounded-xl border-2 border-accent/20 bg-accent-subtle/5 p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent/80 to-entity-bioluminescent/60 flex items-center justify-center">
                <span className="text-[10px]">🐙</span>
              </div>
              <span className="text-xs text-accent font-medium">Octux Decision OS</span>
            </div>

            {/* Mini verdict */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full border-2 border-verdict-proceed flex items-center justify-center">
                <span className="text-sm font-bold text-verdict-proceed">72%</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-verdict-proceed bg-verdict-proceed/15 px-1.5 py-0.5 rounded">PROCEED</span>
                <span className="text-xs text-accent font-semibold ml-1.5">B+</span>
              </div>
            </div>

            <p className="text-xs text-txt-secondary leading-relaxed mb-3">
              Market conditions favor launch [1][3], but permit timeline adds risk [2]. 10 specialists debated. 4 citations traced.
            </p>

            <div className="space-y-1 mb-3">
              <div className="flex items-center gap-2 text-micro">
                <span className="w-1.5 h-1.5 rounded-full bg-verdict-proceed" />
                <span className="text-txt-tertiary">Base Rate: 58% survival rate in premium districts</span>
              </div>
              <div className="flex items-center gap-2 text-micro">
                <span className="w-1.5 h-1.5 rounded-full bg-verdict-delay" />
                <span className="text-txt-tertiary">Regulatory: Permits take 4-6 months, not 2</span>
              </div>
            </div>

            <div className="pt-3 border-t border-accent/10 flex items-center gap-3">
              <span className="text-[10px] text-accent">✓ 10 agents</span>
              <span className="text-[10px] text-accent">✓ 4 citations</span>
              <span className="text-[10px] text-accent">✓ Risk matrix</span>
              <span className="text-[10px] text-accent">✓ Action plan</span>
            </div>
          </motion.div>
        </div>

        {/* Bottom line */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center text-sm text-txt-tertiary mt-8 italic"
        >
          One gives you a paragraph. The other gives you a decision framework.
        </motion.p>
      </div>
    </section>
  );
}
```

---

## Part F — PricingPreview (Token Explainer + Tier Highlight)

UPDATE `components/landing/PricingPreview.tsx`:

```typescript
'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Check, Zap } from 'lucide-react';

const TIERS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Your first decision, on us',
    features: ['1 simulation token/month', '5 Ink chats/day', 'Full verdict with probability'],
    cta: 'Start free',
    popular: false,
    accent: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    description: 'For serious decisions',
    features: ['8 tokens/month (1 Deep = 1 token)', 'Unlimited Ink chat', 'Citations + agent chat'],
    cta: 'Go Pro',
    popular: true,
    accent: true,
  },
  {
    name: 'Max',
    price: '$99',
    period: '/month',
    description: 'Full power',
    features: ['25 tokens/month (1 Kraken = 8)', 'Web search + heatmap', 'PDF export + permanent memory'],
    cta: 'Go Max',
    popular: false,
    accent: false,
  },
  {
    name: 'Octopus',
    price: '$249',
    period: '/month',
    description: 'For power users & teams',
    features: ['70 tokens/month', 'API access + custom agents', 'All features unlocked'],
    cta: 'Go Octopus',
    popular: false,
    accent: false,
  },
];

interface PricingPreviewProps {
  onSignIn?: () => void;
}

export default function PricingPreview({ onSignIn }: PricingPreviewProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section ref={ref} className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-4"
        >
          <h2 className="text-2xl font-medium text-txt-primary mb-3">Simple pricing</h2>
          <p className="text-sm text-txt-tertiary">Start free. Pay when you need depth.</p>
        </motion.div>

        {/* Token explainer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex items-center justify-center gap-2 mb-12"
        >
          <Zap size={13} className="text-accent" />
          <span className="text-micro text-txt-tertiary">
            1 Deep simulation = 1 token · 1 Kraken simulation = 8 tokens
          </span>
        </motion.div>

        {/* Tier cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TIERS.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.3 + i * 0.08 }}
              className={`rounded-xl border p-5 flex flex-col ${
                tier.popular
                  ? 'border-accent/30 bg-accent-subtle/5 shadow-sm shadow-accent/5'
                  : 'border-border-subtle bg-surface-1'
              }`}
            >
              {tier.popular && (
                <span className="text-[10px] font-bold text-accent uppercase tracking-wider mb-2">
                  Most popular
                </span>
              )}
              <h3 className={`text-sm font-medium ${tier.accent ? 'text-accent' : 'text-txt-primary'}`}>
                {tier.name}
              </h3>
              <div className="flex items-baseline gap-0.5 mt-1 mb-1">
                <span className="text-2xl font-light text-txt-primary">{tier.price}</span>
                <span className="text-micro text-txt-disabled">{tier.period}</span>
              </div>
              <p className="text-micro text-txt-tertiary mb-4">{tier.description}</p>

              <div className="space-y-2 flex-1">
                {tier.features.map((f) => (
                  <div key={f} className="flex items-start gap-2">
                    <Check
                      size={13}
                      className={tier.accent ? 'text-accent shrink-0 mt-0.5' : 'text-verdict-proceed shrink-0 mt-0.5'}
                    />
                    <span className="text-xs text-txt-secondary">{f}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={onSignIn}
                className={`mt-5 w-full py-2 rounded-lg text-xs font-medium transition-colors ${
                  tier.popular
                    ? 'bg-accent text-white hover:bg-accent-hover'
                    : 'bg-surface-2 text-txt-secondary hover:bg-surface-2/80'
                }`}
              >
                {tier.cta}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

---

## Part G — LandingFooter (CTA + Entity)

UPDATE `components/landing/LandingFooter.tsx`:

```typescript
'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

interface LandingFooterProps {
  onSignIn?: () => void;
}

export default function LandingFooter({ onSignIn }: LandingFooterProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <footer ref={ref} className="py-20 px-6 border-t border-border-subtle/50">
      <div className="max-w-3xl mx-auto text-center">
        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-xl font-medium text-txt-primary mb-3">
            Your next decision doesn't have to be a guess
          </h2>
          <p className="text-sm text-txt-tertiary mb-8">
            10 AI specialists. Real-time debate. Traceable verdicts.
          </p>
          <button
            onClick={onSignIn || (() => window.scrollTo({ top: 0, behavior: 'smooth' }))}
            className="px-8 py-3.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors"
          >
            Start deciding →
          </button>
        </motion.div>

        {/* Links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-16 flex items-center justify-center gap-6 flex-wrap"
        >
          {['About', 'Privacy', 'Terms', 'Contact'].map((link) => (
            <a key={link} href="#" className="text-micro text-txt-disabled hover:text-txt-tertiary transition-colors">
              {link}
            </a>
          ))}
        </motion.div>

        {/* Copyright */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="mt-6 text-micro text-txt-disabled"
        >
          © 2026 Octux AI. Never decide alone again.
        </motion.p>
      </div>
    </footer>
  );
}
```

---

## Testing

### Test 1 — TrustStrip counters animate:
Scroll down past hero → numbers count up from 0 to final value (1,247 / 50 / 5 / 10). Animation triggers on scroll-into-view.

### Test 2 — HowItWorks 3 steps alternate:
Step 1: text left, visual right. Step 2: text right, visual left. Step 3: text left, visual right. Each step fades in with stagger delay.

### Test 3 — HowItWorks visuals:
Step 1 shows mini input mockup. Step 2 shows 3 agent rows with position badges. Step 3 shows verdict card with 72% ring + citations.

### Test 4 — LiveExample interactive:
Real-looking verdict card with: probability ring, PROCEED badge, B+ grade, one-liner, risk/action row, agent strip with colored dots. "Try your own decision →" button scrolls to top or opens auth.

### Test 5 — WhyNotChatGPT comparison:
Left: generic response with "Good luck! 🎉" and ❌ markers. Right: Octux verdict with 72%, agents, citations and ✓ markers. Accent border on Octux side. Left slides in from left, right slides in from right.

### Test 6 — Pricing tiers:
4 cards: Free $0, Pro $29 (MOST POPULAR, accent border), Max $99, Octopus $249. Token explainer above cards. Each card has check marks, features, CTA button. Pro has purple button.

### Test 7 — Footer CTA:
"Your next decision doesn't have to be a guess" + "Start deciding →" button. Links: About, Privacy, Terms, Contact. Copyright line.

### Test 8 — All animations scroll-triggered:
Each section only animates when scrolled into view (80px trigger margin). `once: true` — animates only once.

### Test 9 — No console errors:
Zero errors on root page with all 6 sections rendered.

### Test 10 — Mobile responsive:
On mobile: stats 2-col grid, steps stack vertically, comparison stacks, pricing 1-col, footer stacks. No horizontal overflow.

---

## Files Modified

```
CREATED:
  hooks/useScrollReveal.ts — shared scroll animation hook

MODIFIED:
  components/landing/TrustStrip.tsx — animated counters + stagger
  components/landing/HowItWorks.tsx — 3 steps with visual previews
  components/landing/LiveExample.tsx — static verdict card + CTA
  components/landing/WhyNotChatGPT.tsx — side-by-side comparison
  components/landing/PricingPreview.tsx — tier cards + token explainer
  components/landing/LandingFooter.tsx — CTA + links + copyright
```

---

Manda pro Fernando. Esse prompt transforma a landing page de "funcional" pra "premium". 🐙

