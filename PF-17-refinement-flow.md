# PF-17 — Refinement Flow ("What if...?" End-to-End)

## Context for AI

You are working on Octux AI — a Decision Operating System. Next.js 14 App Router + TypeScript + Tailwind CSS + shadcn/ui + Zustand + Lucide React + Framer Motion.

**Ref:** Perplexity (follow-up refines the search), ChatGPT (edit message → re-run), Palantir (scenario modeling — "what if we change this variable?"). The refinement flow is what makes Octux a DECISION tool, not a chatbot. Users get a verdict, then ask "What if my budget was 2x?" and the system re-runs with the modification.

**What exists (PF-01 → PF-16):**
- `VerdictCard` (PF-14) with "What if...?" button that toggles `RefinementInput` (PF-14 Part C)
- `RefinementInput` component with quick chips + custom text input
- Backend `/api/c/[id]/chat` accepts `{ action: 'refine', simulationId, modification, tier }` — returns refined verdict
- `MessageRenderer` handles `message_type: 'refinement'` → currently renders `RefinementCardPlaceholder`
- `handleRefine` callback wired in conversation page
- `ChatMessage` type has `message_type: 'refinement'` with `structured_data` for refined result
- `FollowUpSuggestions` (PF-16) shows contextual chips after verdict

**What this prompt builds:**

1. `RefinementCard` — displays the refined verdict with comparison to original
2. `RefinementDiff` — visual diff showing what changed (probability, recommendation, risks)
3. Wire refinement end-to-end: click "What if...?" → input → API → render result
4. Replace `RefinementCardPlaceholder`

---

## Part A — RefinementCard Component

CREATE `components/verdict/RefinementCard.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCcw, ArrowRight, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { cn } from '@/lib/design/cn';
import { verdictColors, verdictLabels } from '@/lib/design/tokens';
import type { VerdictResult } from '@/lib/simulation/events';
import ProbabilityRing from './ProbabilityRing';
import RefinementDiff from './RefinementDiff';
import RefinementInput from './RefinementInput';

interface RefinementCardProps {
  data: {
    modification: string;
    original?: VerdictResult;
    refined: VerdictResult;
    refinedAssessment?: string;
    changesDetected?: string[];
  };
  simulationId: string | null;
  onRefineAgain?: (simulationId: string, modification: string) => void;
  className?: string;
}

export default function RefinementCard({
  data, simulationId, onRefineAgain, className,
}: RefinementCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showRefineAgain, setShowRefineAgain] = useState(false);

  if (!data?.refined) return null;

  const refined = data.refined;
  const original = data.original;
  const rec = refined.recommendation || 'proceed';
  const color = verdictColors[rec] || verdictColors.proceed;
  const label = verdictLabels[rec] || 'UNKNOWN';
  const prob = refined.probability || 0;

  // Calculate diff from original
  const probDiff = original ? prob - (original.probability || 0) : null;
  const recChanged = original ? rec !== original.recommendation : false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={cn('my-4', className)}
    >
      <div
        className="rounded-xl border-2 overflow-hidden"
        style={{ borderColor: `${color}25` }}
      >
        {/* ─── REFINEMENT HEADER ─── */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-accent-subtle/20 border-b border-border-subtle/50">
          <RefreshCcw size={13} className="text-accent" />
          <span className="text-xs font-medium text-accent">Refinement</span>
          <span className="text-micro text-txt-tertiary">·</span>
          <span className="text-xs text-txt-tertiary italic truncate">
            "{data.modification}"
          </span>
        </div>

        {/* ─── COMPACT VERDICT ─── */}
        <div className="p-4" style={{ backgroundColor: `${color}05` }}>
          <div className="flex items-start gap-4">
            {/* Probability ring */}
            <div className="relative shrink-0">
              <ProbabilityRing value={prob} color={color} size={56} strokeWidth={3.5} />
              {/* Diff badge */}
              {probDiff !== null && probDiff !== 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.3 }}
                  className={cn(
                    'absolute -top-1 -right-1 text-[9px] font-bold px-1 py-0.5 rounded-full',
                    probDiff > 0
                      ? 'bg-verdict-proceed/20 text-verdict-proceed'
                      : 'bg-verdict-abandon/20 text-verdict-abandon',
                  )}
                >
                  {probDiff > 0 ? '+' : ''}{probDiff}%
                </motion.span>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span
                  className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                  style={{ color, backgroundColor: `${color}15` }}
                >
                  {label}
                </span>
                <span className="text-lg font-light text-txt-primary tabular-nums">
                  {prob}%
                </span>
                {refined.grade && (
                  <span className="text-sm font-semibold px-1.5 py-0.5 rounded text-accent bg-accent/10">
                    {refined.grade}
                  </span>
                )}
                {recChanged && (
                  <motion.span
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-micro font-bold px-1.5 py-0.5 rounded bg-verdict-delay/15 text-verdict-delay"
                  >
                    CHANGED
                  </motion.span>
                )}
              </div>

              {/* One-liner */}
              {refined.one_liner && (
                <p className="text-sm text-txt-secondary leading-relaxed mb-1.5">
                  {refined.one_liner}
                </p>
              )}

              {/* Refined assessment (summary of what changed) */}
              {data.refinedAssessment && (
                <p className="text-xs text-txt-tertiary leading-relaxed">
                  {data.refinedAssessment}
                </p>
              )}
            </div>
          </div>

          {/* ─── ACTION BUTTONS ─── */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => setShowRefineAgain(!showRefineAgain)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle text-xs text-txt-secondary hover:text-txt-primary hover:border-border-default transition-colors"
            >
              <RefreshCcw size={11} />
              Refine again
            </button>

            <button
              onClick={() => setExpanded(!expanded)}
              className="ml-auto flex items-center gap-1 text-micro text-txt-tertiary hover:text-txt-secondary transition-colors"
            >
              {expanded ? 'Less' : 'Compare with original'}
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>
        </div>

        {/* ─── REFINE AGAIN INPUT ─── */}
        {showRefineAgain && simulationId && onRefineAgain && (
          <RefinementInput
            simulationId={simulationId}
            onRefine={(mod) => {
              onRefineAgain(simulationId, mod);
              setShowRefineAgain(false);
            }}
            onCancel={() => setShowRefineAgain(false)}
          />
        )}

        {/* ─── EXPANDED: DIFF VIEW ─── */}
        {expanded && original && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-border-subtle/50"
          >
            <RefinementDiff original={original} refined={refined} changesDetected={data.changesDetected} />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
```

---

## Part B — RefinementDiff (Comparison View)

CREATE `components/verdict/RefinementDiff.tsx`:

```typescript
'use client';

import { motion } from 'framer-motion';
import { ArrowRight, TrendingUp, TrendingDown, Minus, Shield, Target } from 'lucide-react';
import { cn } from '@/lib/design/cn';
import { verdictColors, verdictLabels } from '@/lib/design/tokens';
import type { VerdictResult } from '@/lib/simulation/events';

interface RefinementDiffProps {
  original: VerdictResult;
  refined: VerdictResult;
  changesDetected?: string[];
}

export default function RefinementDiff({ original, refined, changesDetected }: RefinementDiffProps) {
  const probDiff = (refined.probability || 0) - (original.probability || 0);
  const recChanged = refined.recommendation !== original.recommendation;
  const gradeChanged = refined.grade !== original.grade;
  const riskChanged = refined.main_risk !== original.main_risk;
  const actionChanged = refined.next_action !== original.next_action;

  return (
    <div className="p-4 space-y-3">
      <span className="text-micro font-medium text-txt-disabled uppercase tracking-wider">
        Comparison
      </span>

      {/* ─── PROBABILITY ─── */}
      <DiffRow
        label="Probability"
        before={`${original.probability || 0}%`}
        after={`${refined.probability || 0}%`}
        changed={probDiff !== 0}
        trend={probDiff > 0 ? 'up' : probDiff < 0 ? 'down' : 'same'}
        diffText={probDiff !== 0 ? `${probDiff > 0 ? '+' : ''}${probDiff}%` : null}
      />

      {/* ─── RECOMMENDATION ─── */}
      <DiffRow
        label="Recommendation"
        before={
          <span style={{ color: verdictColors[original.recommendation] }}>
            {verdictLabels[original.recommendation] || original.recommendation}
          </span>
        }
        after={
          <span style={{ color: verdictColors[refined.recommendation] }}>
            {verdictLabels[refined.recommendation] || refined.recommendation}
          </span>
        }
        changed={recChanged}
      />

      {/* ─── GRADE ─── */}
      {(original.grade || refined.grade) && (
        <DiffRow
          label="Grade"
          before={original.grade || '—'}
          after={refined.grade || '—'}
          changed={gradeChanged}
        />
      )}

      {/* ─── MAIN RISK ─── */}
      {riskChanged && (
        <DiffRow
          label="Main risk"
          before={<span className="text-verdict-abandon/80">{original.main_risk || 'None'}</span>}
          after={<span className="text-verdict-abandon">{refined.main_risk || 'None'}</span>}
          changed={true}
          icon={<Shield size={11} className="text-verdict-abandon" />}
        />
      )}

      {/* ─── NEXT ACTION ─── */}
      {actionChanged && (
        <DiffRow
          label="Next action"
          before={<span className="text-verdict-proceed/80">{original.next_action || 'None'}</span>}
          after={<span className="text-verdict-proceed">{refined.next_action || 'None'}</span>}
          changed={true}
          icon={<Target size={11} className="text-verdict-proceed" />}
        />
      )}

      {/* ─── CHANGES DETECTED ─── */}
      {changesDetected && changesDetected.length > 0 && (
        <div className="pt-2 border-t border-border-subtle/50">
          <span className="text-micro font-medium text-txt-disabled">Key changes:</span>
          <div className="mt-1.5 space-y-1">
            {changesDetected.map((change, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-2"
              >
                <ArrowRight size={10} className="text-accent shrink-0 mt-1" />
                <span className="text-xs text-txt-secondary">{change}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══ DIFF ROW ═══

function DiffRow({
  label, before, after, changed, trend, diffText, icon,
}: {
  label: string;
  before: React.ReactNode;
  after: React.ReactNode;
  changed: boolean;
  trend?: 'up' | 'down' | 'same';
  diffText?: string | null;
  icon?: React.ReactNode;
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div className="flex items-center gap-3">
      {/* Label */}
      <div className="w-24 shrink-0 flex items-center gap-1.5">
        {icon}
        <span className="text-micro text-txt-disabled">{label}</span>
      </div>

      {/* Before */}
      <span className={cn(
        'text-xs tabular-nums',
        changed ? 'text-txt-disabled line-through' : 'text-txt-secondary',
      )}>
        {before}
      </span>

      {/* Arrow */}
      {changed && (
        <ArrowRight size={10} className="text-txt-disabled shrink-0" />
      )}

      {/* After */}
      <span className={cn(
        'text-xs font-medium tabular-nums',
        changed ? 'text-txt-primary' : 'text-txt-secondary',
      )}>
        {after}
      </span>

      {/* Trend + diff */}
      {changed && trend && trend !== 'same' && (
        <div className={cn(
          'flex items-center gap-0.5 ml-1',
          trend === 'up' ? 'text-verdict-proceed' : 'text-verdict-abandon',
        )}>
          <TrendIcon size={11} />
          {diffText && <span className="text-micro font-bold">{diffText}</span>}
        </div>
      )}
    </div>
  );
}
```

---

## Part C — Wire into MessageRenderer

UPDATE `components/chat/MessageRenderer.tsx`:

**Replace placeholder import:**

```typescript
// BEFORE:
import RefinementCardPlaceholder from './placeholders/RefinementCardPlaceholder';

// AFTER:
import RefinementCard from '@/components/verdict/RefinementCard';
```

**Update the refinement case:**

```typescript
case 'refinement':
  return (
    <RefinementCard
      key={msg.id}
      data={msg.structured_data}
      simulationId={msg.simulation_id}
      onRefineAgain={onRefine}
    />
  );
```

---

## Part D — Ensure handleRefine Works End-to-End

In the conversation page (`app/(shell)/c/[id]/page.tsx`), verify `handleRefine` is wired correctly:

```typescript
const handleRefine = useCallback(
  async (simulationId: string, modification: string) => {
    try {
      // Show user's refinement as a message
      useChatStore.getState().addMessage({
        id: `refine-q-${Date.now()}`,
        message_type: 'text',
        role: 'user',
        content: `What if ${modification}`,
        structured_data: null,
        model_tier: 'deep',
        simulation_id: simulationId,
        created_at: new Date().toISOString(),
      });

      // Set entity state
      useChatStore.getState().setEntityState('thinking');

      const res = await fetch(`/api/c/${conversationId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refine', simulationId, modification, tier: 'deep' }),
      });

      if (!res.ok) throw new Error('Refinement failed');
      const data = await res.json();

      // Add refinement result message
      useChatStore.getState().addMessage({
        id: `refine-${Date.now()}`,
        message_type: 'refinement',
        role: 'assistant',
        content: null,
        structured_data: {
          modification,
          original: data.original || null,
          refined: data.refined || data,
          refinedAssessment: data.refinedAssessment || data.summary || null,
          changesDetected: data.changesDetected || data.changes || [],
        },
        model_tier: 'deep',
        simulation_id: simulationId,
        created_at: new Date().toISOString(),
      });

      useChatStore.getState().setEntityState('active');
    } catch (error) {
      console.error('Refinement failed:', error);
      useChatStore.getState().addMessage({
        id: `refine-err-${Date.now()}`,
        message_type: 'text',
        role: 'assistant',
        content: 'Refinement failed. Please try again.',
        structured_data: null,
        model_tier: 'deep',
        simulation_id: null,
        created_at: new Date().toISOString(),
        _error: true,
      });
      useChatStore.getState().setEntityState('active');
    }
  },
  [conversationId]
);
```

---

## Part E — Delete Placeholder

```
DELETE:
  components/chat/placeholders/RefinementCardPlaceholder.tsx
```

Also clean up `components/chat/placeholders/` directory — if `SimulationBlockPlaceholder.tsx` and `VerdictCardPlaceholder.tsx` were already deleted (PF-13, PF-14), remove the folder if empty.

---

## Part F — Update Exports

UPDATE `components/verdict/index.ts`:

```typescript
export { default as VerdictCard } from './VerdictCard';
export { default as ProbabilityRing } from './ProbabilityRing';
export { default as RefinementInput } from './RefinementInput';
export { default as RefinementCard } from './RefinementCard';
export { default as RefinementDiff } from './RefinementDiff';
```

---

## Testing

### Test 1 — Refinement flow end-to-end:
In a conversation with a verdict → click "What if...?" on the VerdictCard → type "my budget was 2x larger" → click "Refine" → user message appears "What if my budget was 2x larger" → entity goes to thinking → RefinementCard appears with refined verdict.

### Test 2 — Probability diff badge:
Original: 72% PROCEED. Refined: 81% PROCEED. → RefinementCard shows probability ring at 81% with green "+9%" badge at top-right corner.

### Test 3 — Recommendation change highlighted:
Original: DELAY. Refined: PROCEED. → "CHANGED" badge appears in amber. Diff view shows "DELAY ~~→~~ PROCEED" with strikethrough on old value.

### Test 4 — Quick chips work:
Click "What if...?" → 4 quick refinement chips appear → click "What if budget was 2x larger?" → sends refinement request.

### Test 5 — Custom text input:
Click "What if...?" → type "I had a co-founder with restaurant experience" → press Enter → refinement triggers.

### Test 6 — Compare with original (expanded):
Click "Compare with original" → expands diff view showing: probability (72% → 81% ↑+9%), recommendation, grade, risk change, action change. Strikethrough on old values, bold on new.

### Test 7 — Refine again:
On the RefinementCard → click "Refine again" → new input appears → submit → another RefinementCard appears below with the new modification.

### Test 8 — Changes detected list:
If backend returns `changesDetected: ["Budget increase allows premium location", "Margin improves by 12%"]` → shows as bullet list with arrow icons.

### Test 9 — Refinement header shows modification:
Header shows: `🔄 Refinement · "my budget was 2x larger"` — italic, truncated if long.

### Test 10 — Error handling:
If refinement API fails → error message appears in chat → entity returns to active state.

### Test 11 — Multiple refinements in thread:
User refines twice → 2 RefinementCards in the thread, each with their own modification text and diff.

### Test 12 — Entrance animation:
RefinementCard slides up with slight scale from 0.98 → 1.0 over 0.35s. Diff badge springs in with 0.3s delay.

---

## Files Created/Modified

```
CREATED:
  components/verdict/RefinementCard.tsx   — refinement result with comparison
  components/verdict/RefinementDiff.tsx    — side-by-side diff view

MODIFIED:
  components/chat/MessageRenderer.tsx     — import RefinementCard, replace placeholder
  app/(shell)/c/[id]/page.tsx             — ensure handleRefine wired correctly
  components/verdict/index.ts             — add new exports

DELETED:
  components/chat/placeholders/RefinementCardPlaceholder.tsx
  components/chat/placeholders/ (folder, if empty)
```

---

Manda pro Fernando. Próximo é **PF-18** (Agent Chat — talk directly to individual agents from the verdict card). 🐙
