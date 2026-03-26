# PF-15 — Citation System (Inline Agent References)

## Context for AI

You are working on Octux AI — a Decision Operating System. Next.js 14 App Router + TypeScript + Tailwind CSS + shadcn/ui + Zustand + Lucide React + Framer Motion.

**Ref:** Perplexity — inline [1][2][3] numbers in text. Hover = tooltip with source. Click = jump to source. Adapted for Octux: citations reference AGENTS, not URLs. Every claim in the verdict is traceable to the agent who made it.

**"Trust through traceability."** Without citations: "Probability: 62%" → user thinks "says who?" With citations: "Probability: 62% [1][3]" → hover → "Based on Base Rate's historical analysis (confidence 8/10) and Demand Signal's market data (7/10)" → user thinks "I understand where this comes from."

**What exists (PF-01 → PF-14):**
- `Citation` type in `lib/simulation/events.ts`: `{ id, agent_id, agent_name, round, claim, confidence, supporting_data }`
- `VerdictCard` (PF-14) with Evidence tab showing citations in a list
- `VerdictResult.citations` array populated by backend
- shadcn/ui: `HoverCard`, `HoverCardTrigger`, `HoverCardContent`, `Tooltip`, `Badge`
- Design tokens: `getConfidenceLevel`, `getConfidenceColor`, `verdictColors`

**What this prompt builds:**

1. `CitationPill` — the inline [N] badge that appears inside verdict text
2. `CitationHoverContent` — the hover card showing agent + claim + confidence
3. `CitatedText` — parser that finds [N] patterns in text and wraps them in CitationPills
4. Integration into VerdictCard so the one-liner and summary show inline citations

---

## Part A — CitationPill Component

CREATE `components/citation/CitationPill.tsx`:

```typescript
'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/design/cn';

interface CitationPillProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  index: number;
  active?: boolean;
  size?: 'sm' | 'md';
}

/**
 * Inline citation badge: [1], [2], [3]
 * Appears inside text, superscript-aligned.
 * Triggers HoverCard on hover, scrolls to evidence on click.
 */
const CitationPill = forwardRef<HTMLButtonElement, CitationPillProps>(
  ({ index, active, size = 'sm', className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded font-bold cursor-pointer transition-all duration-100',
          'hover:scale-110 active:scale-95',
          size === 'sm' && 'w-4 h-4 text-[9px] align-super mx-0.5 -mt-1',
          size === 'md' && 'w-5 h-5 text-[10px] align-middle mx-0.5',
          active
            ? 'bg-accent text-white shadow-sm shadow-accent/30'
            : 'bg-accent/10 text-accent hover:bg-accent/20',
          className,
        )}
        {...props}
      >
        {index}
      </button>
    );
  }
);
CitationPill.displayName = 'CitationPill';

export default CitationPill;
```

---

## Part B — CitationHoverContent Component

CREATE `components/citation/CitationHoverContent.tsx`:

```typescript
'use client';

import { cn } from '@/lib/design/cn';
import { getConfidenceLevel, getConfidenceColor } from '@/lib/design/tokens';
import type { Citation } from '@/lib/simulation/events';

interface CitationHoverContentProps {
  citation: Citation;
}

const AVATAR_COLORS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-indigo-500 to-blue-600',
  'from-lime-500 to-green-600',
  'from-fuchsia-500 to-purple-600',
  'from-sky-500 to-blue-600',
  'from-red-500 to-rose-600',
];

function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name.split(/[\s_-]+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

export default function CitationHoverContent({ citation }: CitationHoverContentProps) {
  const confLevel = getConfidenceLevel(citation.confidence);
  const confColor = getConfidenceColor(citation.confidence);

  const levelLabel = {
    strong: 'High confidence',
    moderate: 'Moderate confidence',
    contested: 'Contested',
  }[confLevel];

  return (
    <div className="w-72 space-y-2.5">
      {/* Agent header */}
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-bold bg-gradient-to-br shrink-0',
            getAvatarColor(citation.agent_id),
          )}
        >
          {getInitials(citation.agent_name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-txt-primary truncate">
              {citation.agent_name}
            </span>
            <span
              className="text-micro font-bold tabular-nums"
              style={{ color: confColor }}
            >
              {citation.confidence}/10
            </span>
          </div>
          <span className="text-micro text-txt-disabled">
            Round {citation.round} · {levelLabel}
          </span>
        </div>
      </div>

      {/* Claim */}
      <p className="text-xs text-txt-secondary leading-relaxed">
        {citation.claim}
      </p>

      {/* Supporting data */}
      {citation.supporting_data && (
        <div className="border-l-2 border-accent/20 pl-2.5">
          <p className="text-micro text-txt-tertiary leading-relaxed">
            {citation.supporting_data}
          </p>
        </div>
      )}

      {/* Confidence bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full bg-surface-2 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${(citation.confidence / 10) * 100}%`,
              backgroundColor: confColor,
            }}
          />
        </div>
        <span className="text-micro text-txt-disabled tabular-nums">
          {citation.confidence}/10
        </span>
      </div>
    </div>
  );
}
```

---

## Part C — CitatedText Parser Component

CREATE `components/citation/CitatedText.tsx`:

```typescript
'use client';

import { useMemo, Fragment } from 'react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import CitationPill from './CitationPill';
import CitationHoverContent from './CitationHoverContent';
import type { Citation } from '@/lib/simulation/events';

interface CitatedTextProps {
  text: string;
  citations?: Citation[];
  onCitationClick?: (citationId: number) => void;
  className?: string;
}

/**
 * Parses text containing [N] patterns and replaces them with
 * interactive CitationPill components with HoverCard tooltips.
 *
 * Example:
 *   text: "Market conditions favor launch [1][3], but permits add risk [2]"
 *   citations: [{ id: 1, ... }, { id: 2, ... }, { id: 3, ... }]
 *
 * Renders: "Market conditions favor launch <Pill 1><Pill 3>, but permits add risk <Pill 2>"
 */
export default function CitatedText({
  text,
  citations,
  onCitationClick,
  className,
}: CitatedTextProps) {
  const citationMap = useMemo(() => {
    if (!citations) return new Map<number, Citation>();
    return new Map(citations.map((c) => [c.id, c]));
  }, [citations]);

  const parts = useMemo(() => parseCitations(text), [text]);

  if (!citations || citations.length === 0 || parts.length <= 1) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.type === 'text') {
          return <Fragment key={i}>{part.content}</Fragment>;
        }

        // Citation reference
        const citationId = part.id!;
        const citation = citationMap.get(citationId);

        if (!citation) {
          // Citation referenced but not in data — render as plain text
          return <Fragment key={i}>[{citationId}]</Fragment>;
        }

        return (
          <HoverCard key={i} openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>
              <CitationPill
                index={citationId}
                onClick={(e) => {
                  e.stopPropagation();
                  onCitationClick?.(citationId);
                }}
              />
            </HoverCardTrigger>
            <HoverCardContent
              side="top"
              align="center"
              className="p-3 bg-surface-raised border-border-subtle shadow-xl"
            >
              <CitationHoverContent citation={citation} />
            </HoverCardContent>
          </HoverCard>
        );
      })}
    </span>
  );
}

// ═══ PARSER ═══

interface ParsedPart {
  type: 'text' | 'citation';
  content?: string;
  id?: number;
}

/**
 * Parse text with [N] citation markers.
 * Handles: [1], [2], [13], consecutive [1][2], with/without spaces.
 */
function parseCitations(text: string): ParsedPart[] {
  if (!text) return [];

  const parts: ParsedPart[] = [];
  const regex = /\[(\d+)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Text before citation
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }

    // Citation
    parts.push({
      type: 'citation',
      id: parseInt(match[1], 10),
    });

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  return parts;
}
```

---

## Part D — CitationList (Evidence panel variant)

CREATE `components/citation/CitationList.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/design/cn';
import { getConfidenceLevel, getConfidenceColor } from '@/lib/design/tokens';
import type { Citation } from '@/lib/simulation/events';

interface CitationListProps {
  citations: Citation[];
  activeCitationId?: number | null;
  onCitationClick?: (id: number) => void;
  className?: string;
}

/**
 * Full citation list for the Evidence tab in VerdictCard.
 * Each citation is a card with agent info, claim, confidence bar.
 * Highlights the active citation (clicked from inline pill).
 */
export default function CitationList({
  citations,
  activeCitationId,
  onCitationClick,
  className,
}: CitationListProps) {
  if (!citations || citations.length === 0) {
    return (
      <p className="text-xs text-txt-disabled py-4 text-center">
        No citations available. Citations are generated during Deep and Kraken simulations.
      </p>
    );
  }

  // Group by agent
  const byAgent = citations.reduce<Record<string, Citation[]>>((acc, c) => {
    const key = c.agent_name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  return (
    <div className={cn('space-y-2', className)}>
      {citations.map((cite, i) => {
        const isActive = activeCitationId === cite.id;
        const confColor = getConfidenceColor(cite.confidence);

        return (
          <motion.div
            key={cite.id || i}
            id={`citation-${cite.id}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => onCitationClick?.(cite.id)}
            className={cn(
              'flex items-start gap-3 p-2.5 rounded-lg border transition-all duration-normal cursor-pointer',
              isActive
                ? 'border-accent/30 bg-accent-subtle/20 shadow-sm shadow-accent/5'
                : 'border-border-subtle/50 bg-surface-2/30 hover:border-border-default',
            )}
          >
            {/* Number */}
            <span
              className={cn(
                'text-micro font-bold w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5',
                isActive
                  ? 'bg-accent text-white'
                  : 'bg-accent/10 text-accent',
              )}
            >
              {cite.id}
            </span>

            <div className="flex-1 min-w-0">
              {/* Agent + confidence */}
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-medium text-txt-primary truncate">
                  {cite.agent_name}
                </span>
                <span
                  className="text-micro font-bold tabular-nums"
                  style={{ color: confColor }}
                >
                  {cite.confidence}/10
                </span>
                <span className="text-micro text-txt-disabled ml-auto shrink-0">
                  Round {cite.round}
                </span>
              </div>

              {/* Claim */}
              <p className="text-xs text-txt-secondary leading-relaxed">{cite.claim}</p>

              {/* Supporting data */}
              {cite.supporting_data && (
                <p className="text-micro text-txt-disabled mt-1.5 border-l-2 border-accent/15 pl-2">
                  {cite.supporting_data}
                </p>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
```

---

## Part E — Integrate into VerdictCard

UPDATE `components/verdict/VerdictCard.tsx`:

**Import CitatedText:**

```typescript
import CitatedText from '@/components/citation/CitatedText';
import CitationList from '@/components/citation/CitationList';
```

**Replace plain text one-liner with CitatedText:**

Find the one-liner section in the compact view and update:

```typescript
// BEFORE:
{verdict.one_liner && (
  <p className="text-sm text-txt-secondary leading-relaxed mb-2">
    {verdict.one_liner}
  </p>
)}

// AFTER:
{verdict.one_liner && (
  <p className="text-sm text-txt-secondary leading-relaxed mb-2">
    <CitatedText
      text={verdict.one_liner}
      citations={verdict.citations}
      onCitationClick={(id) => {
        // Expand verdict and scroll to citation
        setExpanded(true);
        setTimeout(() => {
          document.getElementById(`citation-${id}`)?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
          setActiveCitation(id);
        }, 300);
      }}
    />
  </p>
)}
```

**Add activeCitation state:**

```typescript
const [activeCitation, setActiveCitation] = useState<number | null>(null);
```

**Replace Evidence tab content with CitationList:**

Find the Evidence `TabsContent` in `ExpandedAnalysis` and update:

```typescript
// BEFORE:
<TabsContent value="evidence" className="mt-3">
  {verdict.citations && verdict.citations.length > 0 ? (
    <div className="space-y-2.5">
      {verdict.citations.map((cite, i) => (
        <CitationRow key={i} citation={cite} index={i} />
      ))}
    </div>
  ) : (
    <p className="text-xs text-txt-disabled">No citations available.</p>
  )}
</TabsContent>

// AFTER:
<TabsContent value="evidence" className="mt-3">
  <CitationList
    citations={verdict.citations || []}
    activeCitationId={activeCitation}
    onCitationClick={(id) => setActiveCitation(id === activeCitation ? null : id)}
  />
</TabsContent>
```

**Pass activeCitation to ExpandedAnalysis:**

You'll need to pass `activeCitation` and `setActiveCitation` as props to `ExpandedAnalysis`, or lift the state. The cleanest approach is to add them to the `ExpandedAnalysis` props:

```typescript
// Update ExpandedAnalysis signature:
function ExpandedAnalysis({
  verdict,
  onAgentChat,
  activeCitation,
  setActiveCitation,
}: {
  verdict: VerdictResult;
  onAgentChat?: (agentName: string) => void;
  activeCitation: number | null;
  setActiveCitation: (id: number | null) => void;
}) {
```

**Delete the old `CitationRow` function** from VerdictCard.tsx since `CitationList` replaces it.

---

## Part F — Export

CREATE `components/citation/index.ts`:

```typescript
export { default as CitationPill } from './CitationPill';
export { default as CitationHoverContent } from './CitationHoverContent';
export { default as CitatedText } from './CitatedText';
export { default as CitationList } from './CitationList';
```

---

## Testing

### Test 1 — CitatedText parses [N] patterns:
```tsx
<CitatedText
  text="Market conditions favor launch [1][3], but permit timeline adds risk [2]."
  citations={[
    { id: 1, agent_id: 'base_rate', agent_name: 'Base Rate Archivist', round: 2, claim: 'Historical success rate of 58%', confidence: 8 },
    { id: 2, agent_id: 'regulatory', agent_name: 'Regulatory Gatekeeper', round: 4, claim: 'Permit process requires 4-6 months', confidence: 9 },
    { id: 3, agent_id: 'demand', agent_name: 'Demand Signal Analyst', round: 3, claim: 'Market growing 12% YoY in Gangnam', confidence: 7 },
  ]}
/>
```
Shows: "Market conditions favor launch `[1]``[3]`, but permit timeline adds risk `[2]`." where each number is an interactive pill.

### Test 2 — Hover shows agent card:
Hover [1] → HoverCard appears with: Base Rate Archivist avatar + 8/10 confidence + "Round 2 · High confidence" + claim text + confidence bar.

### Test 3 — Click pill scrolls to evidence:
Click [2] → VerdictCard expands → Evidence tab activates → scrolls to citation #2 → highlights it with accent border.

### Test 4 — Consecutive citations:
Text: "data supports this [1][2][3]" → renders three pills next to each other with minimal spacing (mx-0.5).

### Test 5 — Missing citation graceful:
Text: "claim [99]" but no citation with id 99 → renders as plain text "[99]".

### Test 6 — No citations graceful:
Text: "no brackets here" → renders as plain span, no parsing overhead.

### Test 7 — CitationPill hover scale:
Hover pill → scales to 110%. Click → scales to 95% (spring back). Smooth 100ms transition.

### Test 8 — CitationList highlights active:
Click citation #2 in list → #2 gets accent border + shadow. Click again → deactivates. Only one active at a time.

### Test 9 — Confidence colors in hover:
- 8/10 → green bar + "High confidence"
- 5/10 → amber bar + "Moderate confidence"
- 2/10 → pink bar + "Contested"

### Test 10 — Avatar colors match agent cards:
Same `getAvatarColor` function as PF-11 — Base Rate always gets same gradient in citation hover AND in agent card.

### Test 11 — Supporting data renders:
Citation with `supporting_data` → shows indented quote with accent left border below claim.

### Test 12 — Superscript alignment:
Pills align as superscript (`align-super`, `-mt-1`) — slightly above the text baseline, like academic references.

---

## Files Created/Modified

```
CREATED:
  components/citation/CitationPill.tsx         — inline [N] badge
  components/citation/CitationHoverContent.tsx  — hover card with agent details
  components/citation/CitatedText.tsx           — parser + renderer
  components/citation/CitationList.tsx          — full evidence list
  components/citation/index.ts                  — barrel export

MODIFIED:
  components/verdict/VerdictCard.tsx            — use CitatedText in one-liner, CitationList in Evidence tab

DELETED:
  CitationRow function from VerdictCard.tsx     — replaced by CitationList
```

---

Manda pro Fernando. Próximo é **PF-16** (Follow-up Suggestions) — chips contextuais que aparecem depois do verdict pra manter o user engajado. 🐙
