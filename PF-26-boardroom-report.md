# PF-26 — Boardroom Report Page (Public Share View + OG Image)

## Context for AI

You are working on Octux AI — a Decision Operating System. Next.js 14 App Router + TypeScript + Tailwind CSS + shadcn/ui + Lucide React + Framer Motion.

**Ref:** Perplexity (share links with clean read-only view), OpenBB (boardroom-safe output), Stripe (OG cards that look premium in social feeds), Linear (public issue pages — clean, no clutter)

**What exists (PF-01 → PF-25):**
- Share system (PF-25) generates URLs like `/c/[id]/report?ref=userId`
- VerdictCard (PF-14) with full verdict rendering
- CitatedText (PF-15) with inline citations
- AgentScoreboard (PF-11) for agent summary
- ConsensusSparkline (PF-12) for debate history
- Database: `conversations`, `conversation_messages`, `simulations` tables
- `VerdictResult` type with all verdict data

**What this prompt builds:**

1. `/c/[id]/report` — public read-only page (no sidebar, no input, no auth required)
2. `/api/og/[id]` — generates 1200×630 OG image for social sharing
3. Dynamic `<meta>` tags for Twitter Card, OpenGraph, LinkedIn
4. Clean printable layout optimized for screenshots and PDF export
5. "Try Octux" CTA at bottom for conversion

---

## Part A — Report Page (Server Component)

CREATE `app/c/[id]/report/page.tsx`:

```typescript
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { createServerComponentClient } from '@/lib/supabase/server';
import ReportView from './ReportView';

interface ReportPageProps {
  params: { id: string };
  searchParams: { ref?: string };
}

/**
 * Public report page — no auth required.
 * Fetches conversation + verdict data server-side.
 * Renders a clean, read-only view optimized for sharing.
 */

// ─── DYNAMIC METADATA (OG tags) ───
export async function generateMetadata({ params }: ReportPageProps): Promise<Metadata> {
  const supabase = createServerComponentClient();

  const { data: convo } = await supabase
    .from('conversations')
    .select('title, latest_verdict, latest_verdict_probability')
    .eq('id', params.id)
    .single();

  if (!convo) {
    return { title: 'Report not found — Octux AI' };
  }

  const verdict = convo.latest_verdict?.toUpperCase() || 'ANALYSIS';
  const prob = convo.latest_verdict_probability || '';
  const probText = prob ? ` (${prob}%)` : '';
  const title = `${verdict}${probText} — ${convo.title || 'Decision Analysis'}`;
  const description = `10 AI specialists debated this decision. See the full verdict, agent scoreboard, and citations.`;
  const ogImageUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://signux-ai.vercel.app'}/api/og/${params.id}`;

  return {
    title: `${title} — Octux AI`,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      url: `${process.env.NEXT_PUBLIC_APP_URL}/c/${params.id}/report`,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      siteName: 'Octux AI',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

// ─── PAGE COMPONENT ───
export default async function ReportPage({ params, searchParams }: ReportPageProps) {
  const supabase = createServerComponentClient();

  // Fetch conversation
  const { data: convo } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!convo) notFound();

  // Fetch messages (to find the question + verdict)
  const { data: messages } = await supabase
    .from('conversation_messages')
    .select('*')
    .eq('conversation_id', params.id)
    .order('created_at', { ascending: true });

  // Find the original question (first user message)
  const questionMsg = messages?.find((m: any) => m.role === 'user');
  const question = questionMsg?.content || convo.title || 'Decision Analysis';

  // Find the verdict message
  const verdictMsg = messages?.find((m: any) => m.message_type === 'simulation_verdict');
  const verdict = verdictMsg?.structured_data || null;

  // Find the simulation start (for context)
  const simStartMsg = messages?.find((m: any) => m.message_type === 'simulation_start');

  // Track referral view
  if (searchParams.ref) {
    // Fire-and-forget: log referral view
    supabase
      .from('referral_views')
      .insert({
        conversation_id: params.id,
        referrer_id: searchParams.ref,
        viewed_at: new Date().toISOString(),
      })
      .then(() => {})
      .catch(() => {});
  }

  return (
    <ReportView
      conversationId={params.id}
      question={question}
      verdict={verdict}
      createdAt={convo.created_at}
      hasSimulation={convo.has_simulation}
    />
  );
}
```

---

## Part B — ReportView (Client Component)

CREATE `app/c/[id]/report/ReportView.tsx`:

```typescript
'use client';

import { motion } from 'framer-motion';
import {
  Scale, Users, FileText, Shield, Target,
  ArrowRight, ExternalLink, Printer,
} from 'lucide-react';
import { cn } from '@/lib/design/cn';
import type { VerdictResult } from '@/lib/simulation/events';

interface ReportViewProps {
  conversationId: string;
  question: string;
  verdict: VerdictResult | null;
  createdAt: string;
  hasSimulation: boolean;
}

export default function ReportView({
  conversationId, question, verdict, createdAt, hasSimulation,
}: ReportViewProps) {
  const rec = verdict?.recommendation || 'unknown';
  const prob = verdict?.probability || 0;
  const grade = verdict?.grade || '?';
  const color = getVerdictColor(rec);
  const date = new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="min-h-dvh bg-surface-0 text-txt-primary">
      {/* ─── HEADER BAR ─── */}
      <header className="sticky top-0 z-50 bg-surface-0/90 backdrop-blur-md border-b border-border-subtle/50">
        <div className="max-w-3xl mx-auto px-6 h-12 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-txt-secondary hover:text-txt-primary transition-colors">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent/80 to-entity-bioluminescent/60 flex items-center justify-center">
              <span className="text-[10px]">🐙</span>
            </div>
            <span className="text-sm font-light tracking-[0.1em] lowercase">octux</span>
          </a>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-txt-tertiary hover:text-txt-secondary hover:bg-surface-2 transition-colors"
            >
              <Printer size={13} />
              Print
            </button>
            
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-accent text-white hover:bg-accent-hover transition-colors"
            >
              Try Octux
              <ArrowRight size={12} />
            </a>
          </div>
        </div>
      </header>

      {/* ─── MAIN CONTENT ─── */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Question */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <span className="text-micro text-txt-disabled uppercase tracking-wider">Decision Analysis</span>
          <h1 className="text-xl font-medium text-txt-primary mt-2 mb-2">{question}</h1>
          <p className="text-micro text-txt-disabled">{date} · Octux AI Deep Simulation</p>
        </motion.div>

        {/* ─── VERDICT SECTION ─── */}
        {verdict ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="mt-10"
          >
            {/* Verdict hero */}
            <div
              className="rounded-xl border-2 p-6 sm:p-8"
              style={{ borderColor: `${color}30`, backgroundColor: `${color}03` }}
            >
              <div className="flex items-start gap-5 sm:gap-6">
                {/* Probability ring */}
                <div
                  className="w-20 h-20 rounded-full border-[3px] flex items-center justify-center shrink-0"
                  style={{ borderColor: color }}
                >
                  <span className="text-2xl font-bold tabular-nums" style={{ color }}>{prob}%</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                    <span
                      className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-md"
                      style={{ color, backgroundColor: `${color}15` }}
                    >
                      {rec}
                    </span>
                    <span className="text-lg font-semibold text-accent">{grade}</span>
                  </div>

                  {verdict.one_liner && (
                    <p className="text-sm text-txt-secondary leading-relaxed">{verdict.one_liner}</p>
                  )}
                </div>
              </div>

              {/* Risk + Action */}
              <div className="grid sm:grid-cols-2 gap-4 mt-6 pt-5 border-t" style={{ borderColor: `${color}15` }}>
                {verdict.main_risk && (
                  <div className="flex items-start gap-2.5">
                    <Shield size={15} className="text-verdict-abandon shrink-0 mt-0.5" />
                    <div>
                      <span className="text-micro font-medium text-verdict-abandon uppercase">Primary Risk</span>
                      <p className="text-xs text-txt-secondary mt-0.5 leading-relaxed">{verdict.main_risk}</p>
                    </div>
                  </div>
                )}
                {verdict.next_action && (
                  <div className="flex items-start gap-2.5">
                    <Target size={15} className="text-verdict-proceed shrink-0 mt-0.5" />
                    <div>
                      <span className="text-micro font-medium text-verdict-proceed uppercase">Next Action</span>
                      <p className="text-xs text-txt-secondary mt-0.5 leading-relaxed">{verdict.next_action}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ─── AGENT SCOREBOARD ─── */}
            {verdict.agent_scoreboard && verdict.agent_scoreboard.length > 0 && (
              <Section title="Agent Scoreboard" icon={Users} delay={0.3}>
                <div className="space-y-2">
                  {verdict.agent_scoreboard.map((agent, i) => {
                    const posColor = getVerdictColor(agent.position);
                    return (
                      <div key={i} className="flex items-center gap-3 py-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: posColor }} />
                        <span className="text-sm text-txt-secondary flex-1 min-w-0">{agent.agent_name}</span>
                        {agent.role && <span className="text-micro text-txt-disabled hidden sm:block">{agent.role}</span>}
                        <span className="text-xs font-bold uppercase shrink-0" style={{ color: posColor }}>
                          {agent.position}
                        </span>
                        <span className="text-micro text-txt-disabled tabular-nums w-10 text-right shrink-0">
                          {agent.confidence}/10
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* ─── CITATIONS ─── */}
            {verdict.citations && verdict.citations.length > 0 && (
              <Section title="Evidence & Citations" icon={FileText} delay={0.4}>
                <div className="space-y-3">
                  {verdict.citations.map((cite, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="text-micro font-bold text-accent bg-accent/10 w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5">
                        {cite.id || i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-medium text-txt-primary">{cite.agent_name}</span>
                          <span className="text-micro text-txt-disabled tabular-nums">{cite.confidence}/10</span>
                          <span className="text-micro text-txt-disabled">Round {cite.round}</span>
                        </div>
                        <p className="text-xs text-txt-secondary leading-relaxed">{cite.claim}</p>
                        {cite.supporting_data && (
                          <p className="text-micro text-txt-disabled mt-1 border-l-2 border-accent/15 pl-2">
                            {cite.supporting_data}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Other sections omitted for brevity */}
          </motion.div>
        ) : (
          <div className="mt-10 text-center py-16">
            <Scale size={32} className="text-txt-disabled mx-auto mb-4" />
            <p className="text-sm text-txt-tertiary">This conversation hasn't been simulated yet.</p>
            <a
              href={`/c/${conversationId}`}
              className="inline-flex items-center gap-1.5 mt-4 text-xs text-accent hover:text-accent-hover transition-colors"
            >
              Open in Octux <ExternalLink size={12} />
            </a>
          </div>
        )}

        {/* ─── CTA ─── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-16 pt-8 border-t border-border-subtle/50 text-center"
        >
          <p className="text-sm text-txt-tertiary mb-4">
            Want your own decision analyzed by 10 AI specialists?
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors"
          >
            Try Octux — it's free
            <ArrowRight size={14} />
          </a>
          <p className="text-micro text-txt-disabled mt-3">
            No credit card required · 1 free simulation token
          </p>
        </motion.div>

        {/* ─── FOOTER ─── */}
        <footer className="mt-12 pt-6 border-t border-border-subtle/30 text-center">
          <p className="text-micro text-txt-disabled">
            Generated by <a href="/" className="text-txt-tertiary hover:text-accent transition-colors">Octux AI</a> · Never decide alone again
          </p>
        </footer>
      </main>
    </div>
  );
}

function Section({ title, icon: Icon, delay, children }: {
  title: string;
  icon: any;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="mt-8"
    >
      <div className="flex items-center gap-2 mb-4">
        <Icon size={15} className="text-txt-tertiary" />
        <h2 className="text-sm font-medium text-txt-primary">{title}</h2>
      </div>
      {children}
    </motion.div>
  );
}

function getVerdictColor(rec: string): string {
  switch (rec?.toLowerCase()) {
    case 'proceed': return '#10b981';
    case 'delay': return '#f59e0b';
    case 'abandon': return '#ef4444';
    default: return '#7C3AED';
  }
}
```

---

## Part C — OG Image Generator

CREATE `app/api/og/[id]/route.tsx`:

```typescript
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';

export const runtime = 'edge';

/**
 * GET /api/og/[id] — generates 1200×630 OG image for social cards.
 * Purple gradient bg + question + verdict + probability + grade.
 * Cached 24h on CDN.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createRouteClient();

    // Fetch conversation data
    const { data: convo } = await supabase
      .from('conversations')
      .select('title, latest_verdict, latest_verdict_probability')
      .eq('id', params.id)
      .single();

    const title = convo?.title || 'Decision Analysis';
    const verdict = convo?.latest_verdict?.toUpperCase() || 'ANALYSIS';
    const prob = convo?.latest_verdict_probability || '';
    const verdictColor = getColor(convo?.latest_verdict);

    // Fetch verdict one_liner if available
    const { data: messages } = await supabase
      .from('conversation_messages')
      .select('structured_data')
      .eq('conversation_id', params.id)
      .eq('message_type', 'simulation_verdict')
      .limit(1);

    const oneLiner = messages?.[0]?.structured_data?.one_liner || '';

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '60px',
            background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1028 50%, #0a0a0f 100%)',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {/* Top: octux branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(124,58,237,0.8), rgba(6,182,212,0.6))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
              }}
            >
              🐙
            </div>
            <span
              style={{
                fontSize: '20px',
                letterSpacing: '0.15em',
                color: 'rgba(255,255,255,0.6)',
                fontWeight: 300,
              }}
            >
              octux
            </span>
          </div>

          {/* Middle: question + verdict */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Question */}
            <p
              style={{
                fontSize: '32px',
                color: 'rgba(255,255,255,0.92)',
                fontWeight: 500,
                lineHeight: 1.3,
                maxWidth: '900px',
              }}
            >
              {title.length > 80 ? title.substring(0, 77) + '...' : title}
            </p>

            {/* Verdict bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* Probability circle */}
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  border: `3px solid ${verdictColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: '22px', fontWeight: 700, color: verdictColor }}>
                  {prob ? `${prob}%` : '—'}
                </span>
              </div>

              {/* Verdict badge */}
              <div
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  backgroundColor: `${verdictColor}22`,
                  border: `1px solid ${verdictColor}44`,
                }}
              >
                <span style={{ fontSize: '16px', fontWeight: 700, color: verdictColor, letterSpacing: '0.05em' }}>
                  {verdict}
                </span>
              </div>

              {/* One-liner */}
              {oneLiner && (
                <p
                  style={{
                    fontSize: '16px',
                    color: 'rgba(255,255,255,0.55)',
                    flex: 1,
                    maxWidth: '600px',
                    lineHeight: 1.4,
                  }}
                >
                  {oneLiner.length > 100 ? oneLiner.substring(0, 97) + '...' : oneLiner}
                </p>
              )}
            </div>
          </div>

          {/* Bottom: CTA */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.35)' }}>
              10 AI specialists debated this decision
            </span>
            <span style={{ fontSize: '14px', color: 'rgba(124,58,237,0.8)' }}>
              octux.ai — Never decide alone again
            </span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        },
      }
    );
  } catch {
    // Fallback: generic Octux OG image
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1028 50%, #0a0a0f 100%)',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🐙</div>
          <span style={{ fontSize: '32px', color: 'rgba(255,255,255,0.8)', letterSpacing: '0.15em', fontWeight: 300 }}>
            octux
          </span>
          <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>
            Never decide alone again
          </span>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }
}

function getColor(verdict?: string): string {
  switch (verdict?.toLowerCase()) {
    case 'proceed': return '#10b981';
    case 'delay': return '#f59e0b';
    case 'abandon': return '#ef4444';
    default: return '#7C3AED';
  }
}
```

---

## Part D — Not Found Page

CREATE `app/c/[id]/report/not-found.tsx`:

```typescript
import Link from 'next/link';

export default function ReportNotFound() {
  return (
    <div className="min-h-dvh bg-surface-0 flex items-center justify-center">
      <div className="text-center px-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-accent/80 to-entity-bioluminescent/60 flex items-center justify-center">
          <span className="text-2xl">🐙</span>
        </div>
        <h1 className="text-lg font-medium text-txt-primary mb-2">Report not found</h1>
        <p className="text-sm text-txt-tertiary mb-6">
          This analysis may have been removed or the link is incorrect.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors"
        >
          Go to Octux
        </Link>
      </div>
    </div>
  );
}
```

---

## Part E — Referral Views Table (optional, for PF-27)

```sql
-- Track share link views for referral system
CREATE TABLE IF NOT EXISTS referral_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  referrer_id TEXT, -- userId of the person who shared
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- No RLS needed — server-side only inserts
CREATE INDEX idx_referral_views_referrer ON referral_views(referrer_id);
```

---

## Testing

### Test 1 — Report page loads:
Navigate to `/c/[conversation-id]/report` → clean page loads with: octux header, question title, date, verdict card with probability ring + recommendation + grade.

### Test 2 — No auth required:
Open in incognito browser → report still loads. No login prompt.

### Test 3 — Agent scoreboard section:
If verdict has `agent_scoreboard` → shows all agents with colored dots, positions, confidence. Summary row with counts + average.

### Test 4 — Citations section:
If verdict has `citations` → numbered list with agent name, confidence, claim, supporting data.

### Test 5 — Risk matrix:
If verdict has `risk_matrix` → severity badges (HIGH/MEDIUM/LOW) with risk descriptions.

### Test 6 — Action plan:
If verdict has `action_plan` → numbered steps (01, 02, 03...) with action descriptions.

### Test 7 — OG image generates:
Visit `/api/og/[conversation-id]` → returns 1200×630 PNG image with purple gradient, question text, probability ring, verdict badge.

### Test 8 — OG meta tags:
View page source → `<meta property="og:image"` points to `/api/og/[id]`. Twitter card is `summary_large_image`.

### Test 9 — Social preview:
Share URL on Twitter/LinkedIn → shows rich card with OG image, title including verdict, description mentioning 10 agents.

### Test 10 — Print layout:
Click "Print" → print preview shows clean layout: white background, no header nav, no CTA buttons. Readable in B&W.

### Test 11 — No verdict fallback:
If conversation has no simulation → shows "This conversation hasn't been simulated yet" with link to open in Octux.

### Test 12 — CTA conversion:
Bottom of report has: "Want your own decision analyzed?" + "Try Octux — it's free" button → links to `/`.

### Test 13 — 404 page:
Navigate to `/c/[invalid-id]/report` → shows "Report not found" with octux branding and "Go to Octux" link.

### Test 14 — OG image cache:
`Cache-Control: public, max-age=86400` → CDN caches for 24h. No regeneration on every request.

---

## Files Created

```
CREATED:
  app/c/[id]/report/page.tsx — server component (data fetch + metadata)
  app/c/[id]/report/ReportView.tsx — client component (full report UI)
  app/c/[id]/report/not-found.tsx — 404 fallback
  app/api/og/[id]/route.tsx — OG image generator (Edge runtime)
  SQL migration — referral_views table

NO MODIFICATIONS to existing files.
```

---

Manda pro Fernando. O report page é o que aparece quando alguém clica num link compartilhado no Twitter/LinkedIn. Tem que ser bonito o suficiente pra fazer a pessoa querer experimentar o Octux. Próximo é **PF-27** (Referral System). 🐙

