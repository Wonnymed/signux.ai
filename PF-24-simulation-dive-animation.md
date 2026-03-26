# PF-24 — Simulation Dive Micro-Animation

## Context for AI

You are working on Octux AI — a Decision Operating System. Next.js 14 App Router + TypeScript + Tailwind CSS + shadcn/ui + Zustand + Lucide React + Framer Motion.

**THIS IS THE "WOW MOMENT."** When the user clicks "Activate Deep Simulation", the octopus DIVES. Eyes glow, it shrinks, rotates, and transitions INTO the simulation block. During the simulation it pulses in the header. On verdict it BURSTS back. This 3-second animation is the difference between "AI tool" and "something I've never seen before."

**Ref:** Apple product reveal animations (anticipation → action → settle), Stripe Checkout (button → expand → reveal), Linear (transitions between states feel physical)

**What exists (PF-23):**
- `EntityVisual` with 5 Framer Motion states: dormant, active, thinking, diving, resting
- Entity renders at top of conversation page (32px sm when messages exist)
- `SimulationBlock` (PF-13) renders inline in chat when simulation starts
- `useChatStore.entityState` controls entity state
- `useSimulationStream.triggerSimulation()` starts simulation
- DecisionCard has "Activate Deep Simulation" button that calls `onSimulate`

**What this prompt builds:**

A choreographed 6-step animation sequence triggered by "Activate Deep Simulation":

```
STEP 1 (0.0s): Eyes glow purple — entity anticipates
STEP 2 (0.3s): Scale 1.0 → 1.15 — entity "inhales"
STEP 3 (0.6s): Scale 1.15 → 0.5 + rotation -15° — entity "dives"
STEP 4 (0.9s): Entity fades, mini entity appears in SimulationBlock header
STEP 5 (ongoing): Mini entity pulses in sync with simulation phases
STEP 6 (verdict): Mini entity bursts (0.5 → 1.3 → 1.0) + entity at top returns
```

---

## Part A — useDiveAnimation Hook

CREATE `hooks/useDiveAnimation.ts`:

```typescript
'use client';

import { useState, useCallback, useRef } from 'react';

export type DivePhase =
  | 'idle'        // no animation
  | 'anticipate'  // eyes glow, slight scale up
  | 'inhale'      // scale to 1.15
  | 'dive'        // scale to 0.5, rotate, fade
  | 'submerged'   // entity hidden, mini entity in sim block
  | 'burst'       // verdict received, mini entity bursts
  | 'resurface';  // entity returns to normal

interface UseDiveAnimationReturn {
  divePhase: DivePhase;
  triggerDive: () => void;
  triggerBurst: () => void;
  reset: () => void;
}

/**
 * Orchestrates the 6-step dive animation sequence.
 * Timings are precise to create a fluid cinematic feel.
 */
export function useDiveAnimation(): UseDiveAnimationReturn {
  const [divePhase, setDivePhase] = useState<DivePhase>('idle');
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const schedule = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timeoutsRef.current.push(t);
    return t;
  };

  const triggerDive = useCallback(() => {
    clearTimeouts();

    // Step 1: anticipate (eyes glow)
    setDivePhase('anticipate');

    // Step 2: inhale (scale up)
    schedule(() => setDivePhase('inhale'), 300);

    // Step 3: dive (scale down + rotate)
    schedule(() => setDivePhase('dive'), 600);

    // Step 4: submerged (entity hidden, mini in sim block)
    schedule(() => setDivePhase('submerged'), 1100);
  }, []);

  const triggerBurst = useCallback(() => {
    clearTimeouts();

    // Step 6: burst (mini entity explodes)
    setDivePhase('burst');

    // Step 7: resurface (return to normal)
    schedule(() => setDivePhase('resurface'), 800);

    // Step 8: back to idle
    schedule(() => setDivePhase('idle'), 1600);
  }, []);

  const reset = useCallback(() => {
    clearTimeouts();
    setDivePhase('idle');
  }, []);

  return { divePhase, triggerDive, triggerBurst, reset };
}
```

---

## Part B — EntityDiveWrapper (wraps EntityVisual with dive animation)

CREATE `components/entity/EntityDiveWrapper.tsx`:

```typescript
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import EntityVisual, { type EntityState, type EntitySize } from './EntityVisual';
import type { DivePhase } from '@/hooks/useDiveAnimation';

interface EntityDiveWrapperProps {
  entityState: EntityState;
  size: EntitySize;
  divePhase: DivePhase;
  verdictColor?: string;
  className?: string;
}

/**
 * Wraps EntityVisual with the dive animation sequence.
 * During submerged phase, the main entity disappears.
 * The mini entity in SimulationBlock is handled separately.
 */
export default function EntityDiveWrapper({
  entityState,
  size,
  divePhase,
  verdictColor,
  className,
}: EntityDiveWrapperProps) {
  const isVisible = divePhase !== 'submerged';

  return (
    <div className={className}>
      <AnimatePresence mode="wait">
        {isVisible && (
          <motion.div
            key="entity-main"
            variants={diveVariants}
            initial="idle"
            animate={divePhase === 'idle' ? 'idle' : divePhase}
            exit="exit"
          >
            <EntityVisual
              state={getDiveEntityState(entityState, divePhase)}
              size={size}
              verdictColor={verdictColor}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dive trail effect */}
      <AnimatePresence>
        {divePhase === 'dive' && <DiveTrail />}
      </AnimatePresence>
    </div>
  );
}

/**
 * Map dive phase to entity visual state.
 * During anticipate/inhale, override entity state for visual effect.
 */
function getDiveEntityState(baseState: EntityState, divePhase: DivePhase): EntityState {
  switch (divePhase) {
    case 'anticipate':
    case 'inhale':
      return 'thinking'; // eyes glow, subtle pulse
    case 'dive':
      return 'diving';   // full diving animation
    case 'resurface':
      return 'active';   // calm return
    default:
      return baseState;
  }
}

// ═══ DIVE VARIANTS ═══

const diveVariants = {
  idle: {
    scale: 1,
    rotate: 0,
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
  anticipate: {
    scale: 1.05,
    rotate: 0,
    opacity: 1,
    y: -2,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  inhale: {
    scale: 1.15,
    rotate: 0,
    opacity: 1,
    y: -4,
    transition: { duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }, // spring overshoot
  },
  dive: {
    scale: 0.4,
    rotate: -15,
    opacity: 0.6,
    y: 40,
    transition: { duration: 0.5, ease: [0.55, 0, 0.1, 1] }, // fast start, ease out
  },
  burst: {
    scale: [0.5, 1.3, 1],
    rotate: [0, 10, 0],
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, times: [0, 0.4, 1], ease: 'easeOut' },
  },
  resurface: {
    scale: 1,
    rotate: 0,
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
  exit: {
    scale: 0.3,
    opacity: 0,
    y: 20,
    transition: { duration: 0.3 },
  },
};

// ═══ DIVE TRAIL EFFECT ═══

function DiveTrail() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 pointer-events-none flex items-center justify-center"
    >
      {/* Trail circles that expand and fade */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-accent/30"
          initial={{ scale: 0.5, opacity: 0.5 }}
          animate={{ scale: 2.5, opacity: 0 }}
          transition={{
            duration: 0.8,
            delay: i * 0.12,
            ease: 'easeOut',
          }}
          style={{ width: 30, height: 30 }}
        />
      ))}
    </motion.div>
  );
}
```

---

## Part C — SimulationBlock Mini Entity

UPDATE `components/simulation/SimulationBlock.tsx` — add a mini entity in the header that appears when the main entity is submerged.

Add a `divePhase` prop to `SimulationBlock`:

```typescript
interface SimulationBlockProps {
  question: string;
  streamUrl?: string;
  divePhase?: DivePhase;
  className?: string;
}
```

Update the `SimulationHeader` to include the mini entity:

```typescript
function SimulationHeader({
  question, status, elapsed, isActive, isComplete, expanded, onToggle, onCancel,
  divePhase,
}: {
  // ... existing props
  divePhase?: DivePhase;
}) {
  const showMiniEntity = divePhase === 'submerged' || isActive;

  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-3',
      isActive ? 'bg-accent-subtle/20' : 'bg-surface-1',
    )}>
      {showMiniEntity ? (
        <MiniEntity status={status} divePhase={divePhase} />
      ) : isActive ? (
        <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 2, repeat: Infinity }}>
          <Zap size={16} className="text-accent" />
        </motion.div>
      ) : (
        <Zap size={16} className="text-txt-tertiary" />
      )}

      {/* ... rest of header unchanged ... */}
    </div>
  );
}
```

Create `MiniEntity` inside `SimulationBlock.tsx`:

```typescript
function MiniEntity({ status, divePhase }: { status: string; divePhase?: DivePhase }) {
  const isArriving = divePhase === 'submerged';

  return (
    <motion.div
      initial={isArriving ? { scale: 0.3, opacity: 0, y: -10 } : { scale: 1, opacity: 1 }}
      animate={
        divePhase === 'burst'
          ? { scale: [0.5, 1.3, 1], rotate: [0, 15, 0] }
          : { scale: 1, opacity: 1, y: 0 }
      }
      transition={
        isArriving
          ? { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }
          : divePhase === 'burst'
          ? { duration: 0.6, times: [0, 0.4, 1] }
          : { duration: 0.3 }
      }
      className="relative"
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.6) 0%, rgba(6, 182, 212, 0.4) 100%)',
        }}
      >
        <span className="text-[11px]">🐙</span>
      </div>

      {status !== 'complete' && status !== 'idle' && (
        <motion.div
          className="absolute inset-0 rounded-full border border-accent/40"
          animate={{
            scale: [1, 1.6, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: getPhaseSpeed(status),
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      )}
    </motion.div>
  );
}

function getPhaseSpeed(status: string): number {
  switch (status) {
    case 'planning': return 2.0;
    case 'opening': return 1.5;
    case 'adversarial': return 1.0;
    case 'converging': return 1.8;
    case 'verdict': return 2.5;
    default: return 1.5;
  }
}
```

---

## Part D — Wire into Conversation Page

UPDATE the conversation page to use the dive animation:

```typescript
import { useDiveAnimation } from '@/hooks/useDiveAnimation';
import EntityDiveWrapper from '@/components/entity/EntityDiveWrapper';

const { divePhase, triggerDive, triggerBurst, reset: resetDive } = useDiveAnimation();

<EntityDiveWrapper
  entityState={entityState}
  size={messages.length > 0 ? 'sm' : 'md'}
  divePhase={divePhase}
  verdictColor={latestVerdictColor}
/>
```

Update `handleSimulate` to trigger dive animation and start simulation after submerged timing:

```typescript
const handleSimulate = useCallback(
  (question: string, tier: string) => {
    triggerDive();
    setTimeout(() => {
      triggerSimulation(question, tier);
    }, 1100);
  },
  [triggerDive, triggerSimulation]
);
```

Trigger burst when verdict arrives:

```typescript
useEffect(() => {
  if (simStatus === 'complete' && divePhase === 'submerged') {
    triggerBurst();
  }
}, [simStatus, divePhase, triggerBurst]);
```

Pass `divePhase` into `SimulationBlock`:

```typescript
<SimulationBlock
  question={msg.content || ''}
  streamUrl={msg.structured_data?.streamUrl}
  divePhase={divePhase}
/>
```

---

## Part E — Accent Border Glow on SimulationBlock

When entity dives IN, make `SimulationBlock` flash a radial purple glow:

```typescript
<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
  className={cn(
    'my-4 rounded-xl border-2 overflow-hidden transition-all duration-300',
    isActive ? 'border-accent/25 shadow-md shadow-accent/5' : 'border-border-subtle',
  )}
>
  <AnimatePresence>
    {divePhase === 'submerged' && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.3, 0] }}
        transition={{ duration: 0.6 }}
        className="absolute inset-0 rounded-xl pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at top, rgba(124, 58, 237, 0.15) 0%, transparent 60%)',
        }}
      />
    )}
  </AnimatePresence>

  {/* ... rest of SimulationBlock ... */}
</motion.div>
```

---

## Part F — Export

UPDATE `components/entity/index.ts`:

```typescript
export { default as EntityVisual } from './EntityVisual';
export { default as EntityDiveWrapper } from './EntityDiveWrapper';
export type { EntityState, EntitySize } from './EntityVisual';
```

---

## Testing

### Test 1 — Full dive sequence:
Click "Activate Deep Simulation" → watch the 6-step sequence:
1. (0.0s) Entity eyes glow brighter, slight scale up (1.05)
2. (0.3s) Entity "inhales" to 1.15 with spring overshoot
3. (0.6s) Entity "dives" — shrinks to 0.4, rotates -15°, moves down 40px
4. (0.9s) Main entity disappears, trail rings expand and fade
5. (1.1s) Mini entity appears in SimulationBlock header with spring arrival (0.3 → 1.0)
6. SimulationBlock border glows briefly on entity arrival

### Test 2 — Mini entity pulses with phases:
During simulation → mini entity pulse ring speed changes per phase.

### Test 3 — Verdict burst:
Simulation completes → mini entity bursts (scale 0.5 → 1.3 → 1.0) → main entity at top reappears.

### Test 4 — Dive trail effect:
During dive phase → 3 concentric rings expand from entity position and fade.

### Test 5 — Arrival glow on SimulationBlock:
When entity arrives (submerged phase) → border flashes radial purple glow.

---

Manda pro Fernando. Quando o 🐙 mergulha e os anéis se expandem, é o momento que faz o user pensar "isso é diferente de tudo que eu já vi." Próximo é **PF-25** (Share System). 🐙

