# PF-32 — Performance Audit

## Context for AI

You are working on Octux AI — a Decision Operating System. Next.js 14 App Router + TypeScript + Tailwind CSS + shadcn/ui + Zustand + Lucide React + Framer Motion + Supabase.

**Ref:** Linear (sub-second navigations, no jank), Vercel best practices (ISR, edge functions, dynamic imports), web.dev Core Web Vitals.

**What exists:**
- All PF-01 → PF-31 deployed
- 6 marketing sections rendering on root page
- Framer Motion animations throughout
- SSE connections for simulation streaming
- Zustand stores (app, chat, simulation, billing, onboarding, agentSelection)
- Multiple event listeners registered globally
- shadcn/ui components (Radix UI underneath)

**What this prompt audits and fixes:**

1. Lazy loading: marketing sections + heavy components
2. Bundle analysis: identify large imports
3. Font loading: Inter via `next/font/google`
4. Image optimization: Next.js `<Image>`
5. Caching strategy: SWR for conversations list
6. SSE cleanup: verify EventSource close on unmount
7. Memory leak audit: Zustand cleanup, event listeners
8. Framer Motion optimization: `layout` prop costs, `will-change`
9. React rendering: unnecessary re-renders from Zustand selectors
10. Core Web Vitals targets

---

## Part A — Lazy Load Marketing Sections

The 6 marketing sections load on the root page even though they're below the fold. Lazy load them:

UPDATE `app/(shell)/page.tsx` (or wherever marketing sections are imported):

```typescript
// BEFORE (eager — loads everything upfront):
import TrustStrip from '@/components/landing/TrustStrip';
import HowItWorks from '@/components/landing/HowItWorks';
import LiveExample from '@/components/landing/LiveExample';
import WhyNotChatGPT from '@/components/landing/WhyNotChatGPT';
import PricingPreview from '@/components/landing/PricingPreview';
import LandingFooter from '@/components/landing/LandingFooter';

// AFTER (lazy — only loads when scrolled into view):
import dynamic from 'next/dynamic';

const TrustStrip = dynamic(() => import('@/components/landing/TrustStrip'), {
  loading: () => <SectionPlaceholder height={160} />,
});
const HowItWorks = dynamic(() => import('@/components/landing/HowItWorks'), {
  loading: () => <SectionPlaceholder height={600} />,
});
const LiveExample = dynamic(() => import('@/components/landing/LiveExample'), {
  loading: () => <SectionPlaceholder height={500} />,
});
const WhyNotChatGPT = dynamic(() => import('@/components/landing/WhyNotChatGPT'), {
  loading: () => <SectionPlaceholder height={400} />,
});
const PricingPreview = dynamic(() => import('@/components/landing/PricingPreview'), {
  loading: () => <SectionPlaceholder height={500} />,
});
const LandingFooter = dynamic(() => import('@/components/landing/LandingFooter'), {
  loading: () => <SectionPlaceholder height={300} />,
});

// Minimal placeholder to prevent layout shift:
function SectionPlaceholder({ height }: { height: number }) {
  return <div style={{ height }} className="bg-surface-0" />;
}
```

**Also lazy load heavy simulation components** (only needed when simulation runs):

```typescript
// In SimulationBlock or wherever these are imported:
const AgentCardsStream = dynamic(() => import('./AgentCardsStream'));
const ConsensusTracker = dynamic(() => import('./ConsensusTracker'));
const ConsensusSparkline = dynamic(() => import('./ConsensusSparkline'));
```

---

## Part B — Bundle Analysis Script

CREATE `scripts/analyze-bundle.sh`:

```bash
#!/bin/bash
# Run this locally to analyze the bundle

# 1. Build with analysis
ANALYZE=true npx next build

# 2. Check bundle sizes
echo "=== First Load JS ==="
cat .next/build-manifest.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(json.dumps({k: len(v) for k, v in data.get('pages', {}).items()}, indent=2))
"

# 3. Check for common large imports
echo ""
echo "=== Checking for large imports ==="
grep -rn "from 'lodash'" --include="*.ts" --include="*.tsx" app/ components/ lib/ && echo "⚠ lodash found — use lodash-es or specific imports"
grep -rn "from 'moment'" --include="*.ts" --include="*.tsx" app/ components/ lib/ && echo "⚠ moment.js found — use date-fns or dayjs"
grep -rn "import \* as" --include="*.ts" --include="*.tsx" app/ components/ lib/ | grep -v "react" | grep -v "framer" && echo "⚠ Wildcard imports found — use named imports"

echo ""
echo "=== Done ==="
```

**Common large imports to check and fix:**

```typescript
// ❌ BAD — imports entire library:
import _ from 'lodash';
import * as Icons from 'lucide-react';

// ✅ GOOD — tree-shakeable:
import { debounce } from 'lodash-es';
import { Zap, Users, Scale } from 'lucide-react';
```

---

## Part C — Font Loading Optimization

UPDATE `app/layout.tsx` — ensure Inter loads via `next/font` (not CDN):

```typescript
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',          // Show fallback font immediately, swap when loaded
  variable: '--font-inter',
  preload: true,             // Preload font files
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="font-sans antialiased bg-surface-0 text-txt-primary">
        {children}
      </body>
    </html>
  );
}
```

**Verify in `tailwind.config.ts`:**

```typescript
theme: {
  fontFamily: {
    sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
  },
}
```

---

## Part D — Conversations List Caching (SWR Pattern)

The sidebar fetches conversations on every page navigation. Add stale-while-revalidate:

CREATE `hooks/useConversations.ts`:

```typescript
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/lib/store/app';

const STALE_TIME = 30_000; // 30 seconds — data is "fresh" for this long
const CACHE_KEY = 'octux:conversations-cache';

/**
 * SWR-like pattern for conversations list.
 * Shows cached data immediately, revalidates in background.
 */
export function useConversations(isLoggedIn: boolean) {
  const setConversations = useAppStore((s) => s.setConversations);
  const fetchConversations = useAppStore((s) => s.fetchConversations);
  const lastFetchRef = useRef<number>(0);

  // Load from localStorage cache immediately
  useEffect(() => {
    if (!isLoggedIn) return;

    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (data && Array.isArray(data)) {
          setConversations(data);
          lastFetchRef.current = timestamp;
        }
      }
    } catch {}
  }, [isLoggedIn, setConversations]);

  // Revalidate if stale
  const revalidate = useCallback(async () => {
    if (!isLoggedIn) return;

    const now = Date.now();
    if (now - lastFetchRef.current < STALE_TIME) return; // Still fresh

    try {
      const convos = await fetchConversations();
      lastFetchRef.current = now;

      // Cache in localStorage
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: convos,
        timestamp: now,
      }));
    } catch {}
  }, [isLoggedIn, fetchConversations]);

  // Revalidate on mount and on focus
  useEffect(() => {
    revalidate();

    const handleFocus = () => revalidate();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [revalidate]);

  // Revalidate when conversation created/deleted
  useEffect(() => {
    const handler = () => {
      lastFetchRef.current = 0; // Force stale
      revalidate();
    };
    window.addEventListener('octux:conversation-created', handler);
    window.addEventListener('octux:conversation-deleted', handler);
    return () => {
      window.removeEventListener('octux:conversation-created', handler);
      window.removeEventListener('octux:conversation-deleted', handler);
    };
  }, [revalidate]);

  return { revalidate };
}
```

**Wire into ShellClient:**

```typescript
import { useConversations } from '@/hooks/useConversations';

// Inside ShellClient:
useConversations(isLoggedIn);
```

---

## Part E — SSE Cleanup Verification

The simulation stream uses EventSource. Verify proper cleanup:

**Check `lib/store/simulation.ts` (or wherever SSE connects):**

```typescript
// The store should have a cleanup method:
stopSimulation: () => {
  const state = get();
  if (state.eventSource) {
    state.eventSource.close();  // ← CRITICAL — must call .close()
    set({ eventSource: null, status: 'idle' });
  }
},

// The startSimulation should close any existing connection first:
startSimulation: (url: string) => {
  // Close existing connection if any
  const existing = get().eventSource;
  if (existing) {
    existing.close();
  }

  const es = new EventSource(url);
  set({ eventSource: es, status: 'connecting' });

  // ... event handlers ...

  // Set error handler to clean up
  es.onerror = () => {
    es.close();
    set({ eventSource: null, status: 'error' });
  };
},
```

**Check conversation page cleanup:**

```typescript
// In app/(shell)/c/[id]/page.tsx useEffect cleanup:
useEffect(() => {
  // ... load conversation ...

  return () => {
    // MUST clean up SSE on unmount
    const simStore = useSimulationStore.getState();
    if (simStore.eventSource) {
      simStore.eventSource.close();
    }
    simStore.reset();
  };
}, [conversationId]);
```

**Create a verification script:**

CREATE `scripts/verify-sse-cleanup.sh`:

```bash
#!/bin/bash
echo "=== Checking SSE cleanup ==="

# Check EventSource creation
echo "EventSource created in:"
grep -rn "new EventSource" --include="*.ts" --include="*.tsx" lib/ hooks/ app/ components/

# Check .close() calls
echo ""
echo "EventSource .close() calls:"
grep -rn "\.close()" --include="*.ts" --include="*.tsx" lib/ hooks/ app/ components/ | grep -i "event\|source\|sse\|stream"

# Check cleanup in useEffect returns
echo ""
echo "useEffect cleanup with simulation:"
grep -rn "return.*=>" --include="*.tsx" app/\(shell\)/c/ | head -10

echo ""
echo "=== If .close() count < new EventSource count, there's a leak ==="
```

---

## Part F — Event Listener Cleanup Audit

Multiple components register global event listeners. Verify all are cleaned up:

**Checklist of global listeners to audit:**

```bash
# Find all addEventListener calls
grep -rn "addEventListener" --include="*.ts" --include="*.tsx" hooks/ components/ app/ | grep -v node_modules | grep -v "removeEventListener"

# Find all removeEventListener calls
grep -rn "removeEventListener" --include="*.ts" --include="*.tsx" hooks/ components/ app/ | grep -v node_modules

# Count — they should be equal (every add has a remove)
echo "Add count:"
grep -rn "addEventListener" --include="*.ts" --include="*.tsx" hooks/ components/ app/ | grep -v node_modules | grep -v "removeEventListener" | wc -l

echo "Remove count:"
grep -rn "removeEventListener" --include="*.ts" --include="*.tsx" hooks/ components/ app/ | grep -v node_modules | wc -l
```

**Common pattern to enforce:**

```typescript
// ✅ CORRECT — cleanup in useEffect return:
useEffect(() => {
  const handler = () => { ... };
  window.addEventListener('octux:event', handler);
  return () => window.removeEventListener('octux:event', handler);
}, []);

// ❌ WRONG — no cleanup:
useEffect(() => {
  window.addEventListener('octux:event', () => { ... });
}, []);

// ❌ WRONG — different function reference:
useEffect(() => {
  window.addEventListener('octux:event', handler);
  return () => window.removeEventListener('octux:event', differentHandler);
}, []);
```

---

## Part G — Zustand Selector Optimization

Zustand re-renders components when ANY state changes if using broad selectors. Fix:

```typescript
// ❌ BAD — re-renders on ANY store change:
const store = useChatStore();
// Uses: store.messages, store.sending, store.entityState
// Re-renders when: ANY field changes, including unrelated ones

// ✅ GOOD — only re-renders when specific values change:
const messages = useChatStore((s) => s.messages);
const sending = useChatStore((s) => s.sending);
const entityState = useChatStore((s) => s.entityState);
// Re-renders when: only these 3 fields change
```

**Audit script:**

```bash
# Find broad store usage (entire store destructured):
grep -rn "useAppStore()" --include="*.tsx" --include="*.ts" components/ app/
grep -rn "useChatStore()" --include="*.tsx" --include="*.ts" components/ app/
grep -rn "useSimulationStore()" --include="*.tsx" --include="*.ts" components/ app/
grep -rn "useBillingStore()" --include="*.tsx" --include="*.ts" components/ app/

# These should return 0 results. Every usage should have a selector:
# ✅ useChatStore((s) => s.messages)
# ❌ useChatStore()
```

**Fix any broad selectors found:**

```typescript
// BEFORE:
const { messages, sending } = useChatStore();

// AFTER:
const messages = useChatStore((s) => s.messages);
const sending = useChatStore((s) => s.sending);
```

---

## Part H — Framer Motion Optimization

Framer Motion `layout` prop triggers layout recalculations. Use sparingly:

```typescript
// ❌ EXPENSIVE — layout prop on frequently-changing elements:
<motion.div layout>
  {messages.map(msg => <Message key={msg.id} />)}
</motion.div>

// ✅ CHEAP — layout only on the entity (changes rarely):
<motion.div layout>
  <EntityVisual />
</motion.div>

// ✅ Use layoutId instead of layout for shared transitions:
<motion.div layoutId={`entity-${conversationId}`}>
```

**Also add `will-change` for animated elements:**

```css
/* In globals.css — hint browser about animated elements */
[data-framer-motion] {
  will-change: transform, opacity;
}
```

**Reduce animation on low-power devices:**

```typescript
// Create a hook for reduced motion preference:
// hooks/useReducedMotion.ts
'use client';
import { useReducedMotion as useFramerReducedMotion } from 'framer-motion';

export function useReducedMotion() {
  return useFramerReducedMotion();
}

// Usage in components:
const prefersReduced = useReducedMotion();

<motion.div
  animate={prefersReduced ? {} : { scale: [1, 1.1, 1] }}
  transition={prefersReduced ? { duration: 0 } : { duration: 2, repeat: Infinity }}
/>
```

---

## Part I — Image Optimization

If any `<img>` tags exist, replace with Next.js `<Image>`:

```bash
# Find raw img tags:
grep -rn "<img " --include="*.tsx" components/ app/
```

**Replace with:**

```typescript
import Image from 'next/image';

// BEFORE:
<img src="/logo.png" alt="Octux" width={32} height={32} />

// AFTER:
<Image src="/logo.png" alt="Octux" width={32} height={32} priority />
```

**For the entity emoji — no image optimization needed** (it's text/emoji, not an image file).

---

## Part J — API Route Response Caching

Add cache headers to frequently-called read-only API routes:

```typescript
// GET /api/c (conversation list) — cache 10s, revalidate:
export async function GET(req: NextRequest) {
  // ... fetch logic ...

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'private, max-age=10, stale-while-revalidate=30',
    },
  });
}

// GET /api/billing/balance — cache 30s:
export async function GET(req: NextRequest) {
  // ... fetch logic ...

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
    },
  });
}

// GET /api/onboarding — cache 60s:
// ... same pattern
```

**NEVER cache mutation routes (POST, PATCH, DELETE).**

---

## Part K — Core Web Vitals Targets

Run Lighthouse after all fixes:

```
TARGET SCORES:
  Performance:    > 85
  Accessibility:  > 90
  Best Practices: > 90
  SEO:           > 90

CORE WEB VITALS:
  LCP (Largest Contentful Paint):  < 2.5s  (hero entity + wordmark)
  FID (First Input Delay):         < 100ms (input ready immediately)
  CLS (Cumulative Layout Shift):   < 0.1   (no layout shifts from lazy loads)
  INP (Interaction to Next Paint):  < 200ms (clicks respond instantly)
```

**Common LCP fixes:**

```typescript
// Preload the entity gradient (it's the LCP element):
// In app/layout.tsx <head>:
<link rel="preload" as="style" href="..." /> // if entity uses external CSS

// Or ensure the entity renders SSR (not client-only):
// EntityVisual should render its base HTML server-side
```

**CLS prevention:**

```typescript
// Every lazy-loaded section needs explicit height in placeholder:
<SectionPlaceholder height={500} />

// Every image needs width/height:
<Image width={100} height={100} ... />

// Font loading uses display: 'swap' (already done in Part C)
```

---

## Part L — Performance Monitoring (Optional)

ADD to `app/layout.tsx` for ongoing monitoring:

```typescript
// Vercel Speed Insights (free):
import { SpeedInsights } from '@vercel/speed-insights/next';

// In the body:
<SpeedInsights />
```

Or manual Web Vitals reporting:

CREATE `lib/utils/reportWebVitals.ts`:

```typescript
import type { Metric } from 'web-vitals';

export function reportWebVitals(metric: Metric) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vital] ${metric.name}: ${metric.value.toFixed(1)}ms (${metric.rating})`);
  }

  // Send to analytics in production (optional)
  if (process.env.NODE_ENV === 'production') {
    // Could send to Vercel Analytics, Google Analytics, etc.
    const body = {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
    };

    // Beacon API (non-blocking):
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/vitals', JSON.stringify(body));
    }
  }
}
```

---

## Testing

### Test 1 — Marketing sections lazy load:
Open `/` → check Network tab → marketing JS chunks should NOT load until user scrolls. Scroll down → chunks load on demand.

### Test 2 — Font loading:
Open `/` → text renders immediately with system font → Inter loads and swaps within ~200ms. No FOIT (flash of invisible text).

### Test 3 — Bundle size:
Run `npx next build` → check "First Load JS" for root page → should be < 150KB gzipped. Total shared chunks < 300KB.

### Test 4 — Conversations cache:
Load sidebar → conversations appear instantly (from localStorage cache). Background revalidation fetches fresh data.

### Test 5 — SSE cleanup:
Open conversation → trigger simulation → navigate away mid-simulation → check: no EventSource connections remain open (DevTools → Network → filter EventStream).

### Test 6 — Event listener count:
Open DevTools → `getEventListeners(window)` → count listeners. Navigate between pages → count should NOT increase. If it grows, there's a leak.

### Test 7 — Zustand selectors:
Use React DevTools Profiler → send a message → only MessageRenderer and ChatInput should re-render. Sidebar, marketing sections, and unrelated components should NOT re-render.

### Test 8 — Reduced motion:
Enable "Reduce motion" in OS accessibility settings → Framer Motion animations should be disabled or minimal. No jarring movements.

### Test 9 — Lighthouse audit:
Run Lighthouse on `/` → Performance > 85, Accessibility > 90, LCP < 2.5s, CLS < 0.1.

### Test 10 — No console errors:
Navigate through all pages (/, /c/[id], /c/[id]/report, /invite/[code]) → zero console errors.

### Test 11 — Memory stability:
Open conversation → send 20 messages → run simulations → check Chrome Task Manager → memory should stabilize (not grow indefinitely).

### Test 12 — API cache headers:
`curl -I /api/c` → shows `Cache-Control: private, max-age=10, stale-while-revalidate=30`.

---

## Files Created/Modified

```
CREATED:
  scripts/analyze-bundle.sh — bundle analysis script
  scripts/verify-sse-cleanup.sh — SSE cleanup verification
  hooks/useConversations.ts — SWR-like caching for conversations
  hooks/useReducedMotion.ts — reduced motion preference
  lib/utils/reportWebVitals.ts — Core Web Vitals reporting

MODIFIED:
  app/(shell)/page.tsx — lazy load marketing sections with dynamic()
  app/layout.tsx — verify font loading, add SpeedInsights
  tailwind.config.ts — verify font-family config
  globals.css — add will-change hint
  lib/store/simulation.ts — verify SSE .close() in all paths
  app/(shell)/c/[id]/page.tsx — verify SSE cleanup on unmount
  app/(shell)/ShellClient.tsx — wire useConversations
  API routes (GET handlers) — add Cache-Control headers
```

---

## Audit Summary Checklist

```
CHECK │ STATUS │ FIX
──────┼────────┼──────────────────────────────────
 A    │   □    │ Marketing sections lazy loaded (dynamic import)
 B    │   □    │ Bundle analysis run, no large imports
 C    │   □    │ Inter font via next/font with display: swap
 D    │   □    │ Conversations list cached (SWR pattern)
 E    │   □    │ SSE EventSource .close() on ALL paths
 F    │   □    │ addEventListener count == removeEventListener count
 G    │   □    │ Zero broad Zustand selectors (no store() without selector)
 H    │   □    │ Framer Motion layout prop used sparingly
 I    │   □    │ No raw <img> tags (all use next/image)
 J    │   □    │ API GET routes have Cache-Control headers
 K    │   □    │ Lighthouse Performance > 85
 L    │   □    │ SpeedInsights or web-vitals reporting active
```

---

Manda pro Fernando. Com PF-32 feito, faltam só **PF-17 (Refinement Flow), PF-18 (Agent Chat), PF-21 (Token Billing)** pra completar 100% do roadmap. Quer que eu gere os 3 finais? 🐙
