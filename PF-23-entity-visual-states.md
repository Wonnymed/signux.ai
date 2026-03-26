# PF-23 — Entity Visual States (Framer Motion)

## Context for AI

You are working on Octux AI — a Decision Operating System. Next.js 14 App Router + TypeScript + Tailwind CSS + shadcn/ui + Zustand + Lucide React + Framer Motion.

**The entity 🐙 is the SOUL of Octux.** ChatGPT has a circle. Claude has initials. Perplexity has text. Octux has a living octopus that REACTS to what's happening. This is the single biggest differentiator in the product — when the octopus "dives" into a simulation, users feel something no other AI product gives them.

**What exists:**
- `components/entity/EntityVisual.tsx` — renders the 🐙 emoji with CSS gradient circle + basic breathing animation
- `stateMap` with entries for: `idle`, `chatting`, `diving`, `resting`, `dormant`, `active`, `thinking`
- `useChatStore` has `entityState` field that changes during chat/simulation lifecycle
- Entity renders at top of conversation page (32px when messages exist, larger on home)
- Entity renders centered on root page hero (~80px)
- Size props: `sm` (32px), `md` (80px), `lg` (96px)

**What this prompt builds:**

Complete rewrite of EntityVisual with 5 distinct Framer Motion states:

1. **DORMANT** — floating, breathing, eyes semi-closed. Default on root page.
2. **ACTIVE** — alert, eyes open, subtle glow pulse on each message.
3. **THINKING** — processing, gentle rotation, typing-like pulse.
4. **DIVING** — simulation active! Eyes glow purple, scale shifts, particles/bubbles.
5. **RESTING** — post-verdict calm, steady glow in verdict color (green/amber/red).

All using Framer Motion `variants` + CSS transforms + radial gradients. NO WebGL/Canvas/Three.js — pure CSS + Framer Motion. Ship now, enhance with R3F later (PF-23b future).

---

## Part A — EntityVisual Complete Rewrite

REPLACE `components/entity/EntityVisual.tsx`:

```typescript
'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/design/cn';

export type EntityState = 'dormant' | 'active' | 'thinking' | 'diving' | 'resting';
export type EntitySize = 'sm' | 'md' | 'lg';

interface EntityVisualProps {
  state?: EntityState;
  size?: EntitySize;
  verdictColor?: string; // for resting state: 'proceed' | 'delay' | 'abandon'
  className?: string;
}

// ═══ SIZE CONFIG ═══

const SIZE_MAP: Record<EntitySize, { container: number; emoji: number; glow: number }> = {
  sm: { container: 40, emoji: 18, glow: 60 },
  md: { container: 80, emoji: 36, glow: 120 },
  lg: { container: 100, emoji: 44, glow: 160 },
};

// ═══ VERDICT COLOR MAP ═══

const VERDICT_GLOW: Record<string, string> = {
  proceed: 'rgba(16, 185, 129, 0.25)',   // green
  delay: 'rgba(245, 158, 11, 0.25)',     // amber
  abandon: 'rgba(239, 68, 68, 0.25)',    // red
};

// ═══ MAIN COMPONENT ═══

export default function EntityVisual({
  state = 'dormant',
  size = 'md',
  verdictColor,
  className,
}: EntityVisualProps) {
  const s = SIZE_MAP[size] || SIZE_MAP.md;

  const glowColor = useMemo(() => {
    if (state === 'resting' && verdictColor) {
      return VERDICT_GLOW[verdictColor] || VERDICT_GLOW.proceed;
    }
    if (state === 'diving') return 'rgba(124, 58, 237, 0.35)';
    if (state === 'active') return 'rgba(124, 58, 237, 0.15)';
    if (state === 'thinking') return 'rgba(124, 58, 237, 0.20)';
    return 'rgba(124, 58, 237, 0.08)';
  }, [state, verdictColor]);

  return (
    <div
      className={cn('relative flex items-center justify-center', className)}
      style={{ width: s.container, height: s.container }}
    >
      {/* ─── OUTER GLOW ─── */}
      <EntityGlow
        state={state}
        size={s.glow}
        color={glowColor}
      />

      {/* ─── PARTICLE RING (diving only) ─── */}
      <AnimatePresence>
        {state === 'diving' && size !== 'sm' && (
          <ParticleRing size={s.container} />
        )}
      </AnimatePresence>

      {/* ─── GRADIENT CIRCLE ─── */}
      <motion.div
        variants={circleVariants}
        animate={state}
        className="absolute rounded-full"
        style={{
          width: s.container * 0.85,
          height: s.container * 0.85,
          background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.6) 0%, rgba(6, 182, 212, 0.4) 100%)',
        }}
      />

      {/* ─── EMOJI ─── */}
      <motion.span
        variants={emojiVariants}
        animate={state}
        className="relative z-10 select-none"
        style={{ fontSize: s.emoji }}
        role="img"
        aria-label="Octux entity"
      >
        🐙
      </motion.span>

      {/* ─── EYE GLOW OVERLAY (diving/thinking) ─── */}
      <AnimatePresence>
        {(state === 'diving' || state === 'thinking') && size !== 'sm' && (
          <EyeGlow state={state} size={s.container} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════
// FRAMER MOTION VARIANTS
// ═══════════════════════════════════════

const circleVariants = {
  dormant: {
    scale: [1, 1.03, 1],
    opacity: 0.7,
    transition: {
      scale: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
      opacity: { duration: 0.5 },
    },
  },
  active: {
    scale: 1,
    opacity: 0.85,
    transition: { duration: 0.3 },
  },
  thinking: {
    scale: [1, 1.02, 0.98, 1],
    opacity: [0.8, 0.9, 0.8],
    transition: {
      scale: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
      opacity: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
    },
  },
  diving: {
    scale: [1, 1.08, 0.95, 1.05, 1],
    opacity: 1,
    transition: {
      scale: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
      opacity: { duration: 0.3 },
    },
  },
  resting: {
    scale: 0.97,
    opacity: 0.9,
    transition: { duration: 0.8, ease: 'easeOut' },
  },
};

const emojiVariants = {
  dormant: {
    scale: [1, 1.02, 1],
    y: [0, -1, 0],
    rotate: 0,
    transition: {
      scale: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
      y: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
    },
  },
  active: {
    scale: 1,
    y: 0,
    rotate: 0,
    transition: { duration: 0.2 },
  },
  thinking: {
    scale: [1, 1.03, 1],
    y: [0, -2, 0],
    rotate: [0, 2, -2, 0],
    transition: {
      scale: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' },
      y: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' },
      rotate: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
    },
  },
  diving: {
    scale: [1, 1.1, 0.95, 1.05],
    y: [0, -3, 1, -1],
    rotate: [0, -5, 5, 0],
    transition: {
      scale: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
      y: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
      rotate: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
    },
  },
  resting: {
    scale: 0.95,
    y: 1,
    rotate: 0,
    transition: { duration: 1, ease: 'easeOut' },
  },
};

// ═══════════════════════════════════════
// OUTER GLOW
// ═══════════════════════════════════════

function EntityGlow({
  state,
  size,
  color,
}: {
  state: EntityState;
  size: number;
  color: string;
}) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      }}
      variants={glowVariants}
      animate={state}
    />
  );
}

const glowVariants = {
  dormant: {
    scale: [1, 1.1, 1],
    opacity: [0.5, 0.7, 0.5],
    transition: {
      scale: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
      opacity: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
    },
  },
  active: {
    scale: 1,
    opacity: 0.7,
    transition: { duration: 0.3 },
  },
  thinking: {
    scale: [1, 1.15, 1],
    opacity: [0.6, 0.85, 0.6],
    transition: {
      scale: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
      opacity: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
    },
  },
  diving: {
    scale: [1, 1.3, 1],
    opacity: [0.7, 1, 0.7],
    transition: {
      scale: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
      opacity: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
    },
  },
  resting: {
    scale: 1.05,
    opacity: 0.8,
    transition: { duration: 1, ease: 'easeOut' },
  },
};

// ═══════════════════════════════════════
// PARTICLE RING (diving state only)
// ═══════════════════════════════════════

function ParticleRing({ size }: { size: number }) {
  const particles = useMemo(() => {
    return Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      angle: (i / 8) * 360,
      delay: i * 0.15,
      size: 2 + Math.random() * 2,
    }));
  }, []);

  const radius = size * 0.7;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute pointer-events-none"
      style={{ width: radius * 2, height: radius * 2 }}
    >
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full bg-accent"
          style={{
            width: p.size,
            height: p.size,
          }}
          initial={{
            x: radius + Math.cos((p.angle * Math.PI) / 180) * radius * 0.5 - p.size / 2,
            y: radius + Math.sin((p.angle * Math.PI) / 180) * radius * 0.5 - p.size / 2,
            opacity: 0,
          }}
          animate={{
            x: [
              radius + Math.cos((p.angle * Math.PI) / 180) * radius * 0.5 - p.size / 2,
              radius + Math.cos(((p.angle + 60) * Math.PI) / 180) * radius * 0.8 - p.size / 2,
              radius + Math.cos(((p.angle + 120) * Math.PI) / 180) * radius * 0.5 - p.size / 2,
            ],
            y: [
              radius + Math.sin((p.angle * Math.PI) / 180) * radius * 0.5 - p.size / 2,
              radius + Math.sin(((p.angle + 60) * Math.PI) / 180) * radius * 0.8 - p.size / 2,
              radius + Math.sin(((p.angle + 120) * Math.PI) / 180) * radius * 0.5 - p.size / 2,
            ],
            opacity: [0, 0.8, 0],
            scale: [0.5, 1.2, 0.5],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </motion.div>
  );
}

// ═══════════════════════════════════════
// EYE GLOW (diving + thinking overlay)
// ═══════════════════════════════════════

function EyeGlow({ state, size }: { state: EntityState; size: number }) {
  const glowSize = size * 0.3;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{
        opacity: state === 'diving' ? [0.3, 0.8, 0.3] : [0.2, 0.5, 0.2],
      }}
      exit={{ opacity: 0 }}
      transition={{
        opacity: {
          duration: state === 'diving' ? 1.5 : 2,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      }}
      className="absolute z-20 pointer-events-none rounded-full"
      style={{
        width: glowSize,
        height: glowSize * 0.6,
        background: state === 'diving'
          ? 'radial-gradient(ellipse, rgba(124, 58, 237, 0.6) 0%, transparent 70%)'
          : 'radial-gradient(ellipse, rgba(124, 58, 237, 0.3) 0%, transparent 70%)',
        top: '30%',
        left: '50%',
        transform: 'translateX(-50%)',
      }}
    />
  );
}
```

---

## Part B — Wire Entity State from Chat Store

The `useChatStore` already has `entityState`. Verify the conversation page passes it correctly:

```typescript
// In the conversation page (app/(shell)/c/[id]/page.tsx):
const entityState = useChatStore((s) => s.entityState) || 'dormant';

<EntityVisual
  state={entityState}
  size={messages.length > 0 ? 'sm' : 'md'}
  verdictColor={latestVerdictColor}  // optional: pass if last message was verdict
/>
```

The entity state should change automatically via these events:
- Page loads → `dormant`
- User sends message → `active`
- Waiting for response → `thinking`
- Simulation starts → `diving`
- Simulation completes → `resting` (with verdict color)
- User sends follow-up → `active`

**If the chat store doesn't set these states automatically, add them:**

```typescript
// In useChatStore.sendMessage:
set({ entityState: 'active' });
// ... after fetch starts:
set({ entityState: 'thinking' });
// ... after response received:
set({ entityState: 'active' });

// In useSimulationStream.triggerSimulation:
useChatStore.getState().setEntityState('diving');

// In useSimulationStream completion effect:
useChatStore.getState().setEntityState('resting');
```

---

## Part C — Root Page Entity State

On the root page, the entity should be in `dormant` state (large, breathing, floating):

```typescript
// In the root page hero:
<EntityVisual state="dormant" size="lg" />
```

When user hovers the input or starts typing, it could shift to `active`:

```typescript
// Optional enhancement — entity reacts to focus:
const [heroEntityState, setHeroEntityState] = useState<EntityState>('dormant');

// On input focus:
<ChatInput
  onFocus={() => setHeroEntityState('active')}
  onBlur={() => setHeroEntityState('dormant')}
/>

<EntityVisual state={heroEntityState} size="lg" />
```

---

## Part D — Pulse on New Message

Add a brief "pulse" when a new message arrives. This is a one-shot animation that overlays the current state:

```typescript
// In the conversation page, add a pulse trigger:
const [pulse, setPulse] = useState(false);

// When messages change:
useEffect(() => {
  if (messages.length > 0) {
    setPulse(true);
    const timer = setTimeout(() => setPulse(false), 600);
    return () => clearTimeout(timer);
  }
}, [messages.length]);

// Pass to entity:
<div className="relative">
  <EntityVisual state={entityState} size={entitySize} />
  <AnimatePresence>
    {pulse && (
      <motion.div
        initial={{ scale: 0.8, opacity: 0.6 }}
        animate={{ scale: 1.5, opacity: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="absolute inset-0 rounded-full bg-accent/20 pointer-events-none"
      />
    )}
  </AnimatePresence>
</div>
```

---

## Part E — Export

UPDATE `components/entity/index.ts` (create if doesn't exist):

```typescript
export { default as EntityVisual } from './EntityVisual';
export type { EntityState, EntitySize } from './EntityVisual';
```

---

## Testing

### Test 1 — Dormant state (root page):
Open `/` → entity floats: scale 1→1.03→1 over 4s, glow pulses, emoji bobs slightly up and down. Feels alive but calm.

### Test 2 — Active state (conversation, messages exist):
Open a conversation → entity at 32px, stable scale 1.0, brighter glow. No floating animation.

### Test 3 — Thinking state (waiting for response):
Send a message → entity shifts to thinking: gentle rotation ±2°, scale pulses 1→1.03→1 faster (1.2s), glow intensifies.

### Test 4 — Diving state (simulation active):
Click "Activate Deep Simulation" → entity enters diving: larger scale pulse (1→1.1→0.95), rotation ±5°, glow MUCH stronger (30% opacity), 8 particle dots orbit around the entity. Most dramatic state.

### Test 5 — Resting state (verdict received):
Simulation completes with PROCEED → entity calms: scale 0.97, steady green glow. If DELAY → amber glow. If ABANDON → red glow.

### Test 6 — Pulse on new message:
Each new message arrival → brief ring pulse expands outward from entity and fades (0.6s).

### Test 7 — Size transitions:
Navigate from root (lg: 100px) → conversation (sm: 40px) → entity smoothly shrinks via CSS transition.

### Test 8 — Particle ring only during diving:
Particles appear when state = diving, disappear with fade when state changes. Only render at md/lg sizes (not sm — too small).

### Test 9 — Eye glow overlay:
During diving: purple elliptical glow overlays the top 30% of entity (where the octopus "eyes" are). Pulses between 30% and 80% opacity.

### Test 10 — No performance regression:
All animations are CSS transforms + opacity (GPU-accelerated). No layout shifts. Entity renders in <16ms per frame.

### Test 11 — Fallback for unknown states:
If `state` is undefined or unrecognized → falls back to `dormant`.

### Test 12 — Compact mode works:
At `sm` (40px): no particles, no eye glow. Just the circle + emoji + subtle breathing. Clean and minimal.

---

## Files Created/Modified

```
REPLACED:
  components/entity/EntityVisual.tsx — complete rewrite with 5 Framer Motion states

CREATED (if not exists):
  components/entity/index.ts — barrel export

VERIFIED (no changes needed):
  lib/store/chat.ts — entityState field already exists
  hooks/useSimulationStream.ts — already sets entity states
  app/(shell)/c/[id]/page.tsx — already passes entityState to EntityVisual
```

---

Manda pro Fernando. Quando o 🐙 "mergulha" na simulação, o user vai SENTIR que algo poderoso tá acontecendo. Esse é o moment that makes people screenshot and share. 🐙

