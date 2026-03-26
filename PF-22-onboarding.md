# PF-22 — Onboarding (Contextual, Zero-Wall)

## Context for AI

You are working on Octux AI — a Decision Operating System. Next.js 14 App Router + TypeScript + Tailwind CSS + shadcn/ui + Zustand + Lucide React + Framer Motion + Supabase.

**Ref:** Okara (zero walls before value — product IS the onboarding), Perplexity (no tutorial, just use it), Linear (subtle contextual tips, keyboard shortcut hints).

**Philosophy:** There is NO separate tutorial, walkthrough, or onboarding page. The user types a question and gets value. Tips appear AFTER the user does something — never before. Every tip is contextual, shows once, and is dismissible.

**What exists (PF-01 → PF-21):**
- Chat end-to-end (PF-08): user sends → receives → renders
- Simulation streaming (PF-09→PF-13): Deep Simulation runs with phases + agents
- VerdictCard (PF-14) with citations, risk matrix, action plan
- Auth modal (PF-20): user authenticates when needed
- Token billing (PF-21): user has tokens, can upgrade
- Zustand stores: app, chat, simulation, billing
- Supabase DB with `conversations`, `conversation_messages`, `simulations`

**What this prompt builds:**

1. `user_onboarding` DB table — milestones + dismissed tips
2. `useOnboarding` hook — tracks milestones, triggers tips
3. `MilestoneToast` — celebration popup (emoji + title, auto-dismiss 4s)
4. `ContextualTip` — subtle inline tip (accent border, dismiss X)
5. Integration into chat, simulation, verdict, sidebar

---

## Part A — Database Table

CREATE table in Supabase (run as SQL migration):

```sql
-- Onboarding milestones and tip tracking
CREATE TABLE IF NOT EXISTS user_onboarding (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Milestones (boolean flags)
  m_first_message BOOLEAN DEFAULT FALSE,
  m_first_simulation BOOLEAN DEFAULT FALSE,
  m_first_verdict BOOLEAN DEFAULT FALSE,
  m_first_refinement BOOLEAN DEFAULT FALSE,
  m_third_conversation BOOLEAN DEFAULT FALSE,
  m_first_agent_chat BOOLEAN DEFAULT FALSE,
  
  -- Dismissed tips (array of tip IDs)
  dismissed_tips TEXT[] DEFAULT '{}',
  
  -- Counters
  message_count INTEGER DEFAULT 0,
  simulation_count INTEGER DEFAULT 0,
  conversation_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own onboarding"
  ON user_onboarding FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding"
  ON user_onboarding FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding"
  ON user_onboarding FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Auto-create row on first auth
CREATE OR REPLACE FUNCTION create_onboarding_row()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_onboarding (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_onboarding'
  ) THEN
    CREATE TRIGGER on_auth_user_created_onboarding
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION create_onboarding_row();
  END IF;
END;
$$;
```

---

## Part B — API Route

CREATE `app/api/onboarding/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';

/**
 * GET /api/onboarding — fetch user's onboarding state
 * PATCH /api/onboarding — update milestones or dismiss tips
 */

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ data: null });

    const { data, error } = await supabase
      .from('user_onboarding')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code === 'PGRST116') {
      // Row doesn't exist yet — create it
      const { data: newRow } = await supabase
        .from('user_onboarding')
        .insert({ user_id: user.id })
        .select()
        .single();
      return NextResponse.json({ data: newRow });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ data: null });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await req.json();
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    // Milestone completion
    if (body.milestone) {
      const key = `m_${body.milestone}`;
      updates[key] = true;
    }

    // Increment counter
    if (body.increment) {
      // Use raw SQL for atomic increment
      const counterMap: Record<string, string> = {
        message: 'message_count',
        simulation: 'simulation_count',
        conversation: 'conversation_count',
      };
      const col = counterMap[body.increment];
      if (col) {
        await supabase.rpc('increment_onboarding_counter', {
          p_user_id: user.id,
          p_column: col,
        });
      }
    }

    // Dismiss tip
    if (body.dismissTip) {
      const { data: current } = await supabase
        .from('user_onboarding')
        .select('dismissed_tips')
        .eq('user_id', user.id)
        .single();

      const tips = current?.dismissed_tips || [];
      if (!tips.includes(body.dismissTip)) {
        updates.dismissed_tips = [...tips, body.dismissTip];
      }
    }

    // Apply milestone/tip updates
    if (Object.keys(updates).length > 1) {
      await supabase
        .from('user_onboarding')
        .update(updates)
        .eq('user_id', user.id);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
```

**Also create the RPC function for atomic increment:**

```sql
CREATE OR REPLACE FUNCTION increment_onboarding_counter(
  p_user_id UUID,
  p_column TEXT
)
RETURNS VOID AS $$
BEGIN
  EXECUTE format(
    'UPDATE user_onboarding SET %I = %I + 1, updated_at = NOW() WHERE user_id = $1',
    p_column, p_column
  ) USING p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Part C — Onboarding Store

CREATE `lib/store/onboarding.ts`:

```typescript
import { create } from 'zustand';

export interface OnboardingState {
  // Milestones
  milestones: {
    first_message: boolean;
    first_simulation: boolean;
    first_verdict: boolean;
    first_refinement: boolean;
    third_conversation: boolean;
    first_agent_chat: boolean;
  };

  // Dismissed tips
  dismissedTips: string[];

  // Counters
  messageCount: number;
  simulationCount: number;
  conversationCount: number;

  // Loading
  loaded: boolean;

  // Actions
  load: () => Promise<void>;
  completeMilestone: (milestone: string) => void;
  dismissTip: (tipId: string) => void;
  incrementCounter: (counter: 'message' | 'simulation' | 'conversation') => void;
  isTipDismissed: (tipId: string) => boolean;
  isMilestoneComplete: (milestone: string) => boolean;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  milestones: {
    first_message: false,
    first_simulation: false,
    first_verdict: false,
    first_refinement: false,
    third_conversation: false,
    first_agent_chat: false,
  },
  dismissedTips: [],
  messageCount: 0,
  simulationCount: 0,
  conversationCount: 0,
  loaded: false,

  load: async () => {
    try {
      const res = await fetch('/api/onboarding');
      const { data } = await res.json();
      if (data) {
        set({
          milestones: {
            first_message: data.m_first_message || false,
            first_simulation: data.m_first_simulation || false,
            first_verdict: data.m_first_verdict || false,
            first_refinement: data.m_first_refinement || false,
            third_conversation: data.m_third_conversation || false,
            first_agent_chat: data.m_first_agent_chat || false,
          },
          dismissedTips: data.dismissed_tips || [],
          messageCount: data.message_count || 0,
          simulationCount: data.simulation_count || 0,
          conversationCount: data.conversation_count || 0,
          loaded: true,
        });
      }
    } catch {
      set({ loaded: true });
    }
  },

  completeMilestone: (milestone) => {
    const state = get();
    const key = milestone as keyof typeof state.milestones;
    if (state.milestones[key]) return; // Already complete

    set((s) => ({
      milestones: { ...s.milestones, [key]: true },
    }));

    // Fire and forget to API
    fetch('/api/onboarding', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ milestone }),
    }).catch(() => {});
  },

  dismissTip: (tipId) => {
    set((s) => ({
      dismissedTips: [...s.dismissedTips, tipId],
    }));

    fetch('/api/onboarding', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dismissTip: tipId }),
    }).catch(() => {});
  },

  incrementCounter: (counter) => {
    const key = `${counter}Count` as 'messageCount' | 'simulationCount' | 'conversationCount';
    set((s) => ({ [key]: (s[key] || 0) + 1 }));

    fetch('/api/onboarding', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ increment: counter }),
    }).catch(() => {});
  },

  isTipDismissed: (tipId) => get().dismissedTips.includes(tipId),
  isMilestoneComplete: (milestone) => {
    const key = milestone as keyof typeof get().milestones;
    return get().milestones[key] || false;
  },
}));
```

---

## Part D — MilestoneToast Component

CREATE `components/onboarding/MilestoneToast.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface MilestoneToastProps {
  emoji: string;
  title: string;
  description?: string;
  duration?: number; // auto-dismiss in ms
  onDismiss?: () => void;
}

export default function MilestoneToast({
  emoji, title, description, duration = 4000, onDismiss,
}: MilestoneToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.95 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed top-4 right-4 z-[300] max-w-xs"
        >
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-surface-raised border border-accent/20 shadow-lg shadow-accent/5">
            <span className="text-lg shrink-0 mt-0.5">{emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-txt-primary">{title}</p>
              {description && (
                <p className="text-xs text-txt-tertiary mt-0.5">{description}</p>
              )}
            </div>
            <button
              onClick={() => { setVisible(false); onDismiss?.(); }}
              className="p-0.5 rounded text-txt-disabled hover:text-txt-tertiary transition-colors shrink-0"
            >
              <X size={13} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

---

## Part E — ContextualTip Component

CREATE `components/onboarding/ContextualTip.tsx`:

```typescript
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/design/cn';
import { useOnboardingStore } from '@/lib/store/onboarding';

interface ContextualTipProps {
  tipId: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Subtle inline tip that appears once and is dismissible.
 * Renders nothing if already dismissed.
 */
export default function ContextualTip({ tipId, children, className }: ContextualTipProps) {
  const isDismissed = useOnboardingStore((s) => s.isTipDismissed(tipId));
  const dismissTip = useOnboardingStore((s) => s.dismissTip);

  if (isDismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'flex items-start gap-2.5 px-3 py-2.5 rounded-lg',
          'bg-accent/5 border border-accent/10',
          className,
        )}
      >
        <Lightbulb size={13} className="text-accent shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 text-xs text-txt-secondary leading-relaxed">
          {children}
        </div>
        <button
          onClick={() => dismissTip(tipId)}
          className="p-0.5 rounded text-txt-disabled hover:text-txt-tertiary transition-colors shrink-0"
        >
          <X size={12} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
```

---

## Part F — useOnboardingTriggers Hook

CREATE `hooks/useOnboardingTriggers.ts`:

```typescript
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useOnboardingStore } from '@/lib/store/onboarding';

interface ToastConfig {
  emoji: string;
  title: string;
  description?: string;
}

/**
 * Monitors chat/simulation events and triggers milestone toasts.
 * Place this in the ShellClient or conversation page.
 */
export function useOnboardingTriggers(
  onToast: (config: ToastConfig) => void,
) {
  const loaded = useOnboardingStore((s) => s.loaded);
  const milestones = useOnboardingStore((s) => s.milestones);
  const conversationCount = useOnboardingStore((s) => s.conversationCount);
  const completeMilestone = useOnboardingStore((s) => s.completeMilestone);
  const incrementCounter = useOnboardingStore((s) => s.incrementCounter);

  const firedRef = useRef<Set<string>>(new Set());

  const fire = useCallback((milestone: string, toast: ToastConfig) => {
    if (firedRef.current.has(milestone)) return;
    firedRef.current.add(milestone);
    completeMilestone(milestone);
    onToast(toast);
  }, [completeMilestone, onToast]);

  // Listen for custom events from the chat/simulation system
  useEffect(() => {
    if (!loaded) return;

    const handleMessage = () => {
      incrementCounter('message');

      if (!milestones.first_message) {
        fire('first_message', {
          emoji: '🎉',
          title: 'First question asked!',
          description: 'You have 1 free simulation token. Make it count.',
        });
      }
    };

    const handleSimulation = () => {
      incrementCounter('simulation');

      if (!milestones.first_simulation) {
        fire('first_simulation', {
          emoji: '🐙',
          title: 'Deep Simulation activated!',
          description: 'Watch 10 specialists debate your decision in real-time.',
        });
      }
    };

    const handleVerdict = () => {
      if (!milestones.first_verdict) {
        fire('first_verdict', {
          emoji: '⚖️',
          title: 'Your first verdict!',
          description: 'Hover citations to see which agent made each claim.',
        });
      }
    };

    const handleConversation = () => {
      incrementCounter('conversation');

      const newCount = conversationCount + 1;
      if (newCount >= 3 && !milestones.third_conversation) {
        fire('third_conversation', {
          emoji: '⌨️',
          title: 'Power user unlocked!',
          description: 'Press ? for keyboard shortcuts.',
        });
      }
    };

    const handleRefinement = () => {
      if (!milestones.first_refinement) {
        fire('first_refinement', {
          emoji: '🔄',
          title: 'First refinement!',
          description: '"What if" scenarios test your decision from new angles.',
        });
      }
    };

    const handleAgentChat = () => {
      if (!milestones.first_agent_chat) {
        fire('first_agent_chat', {
          emoji: '💬',
          title: 'Agent conversation started!',
          description: 'You can challenge any agent directly on their analysis.',
        });
      }
    };

    // Register event listeners
    window.addEventListener('octux:message-sent', handleMessage);
    window.addEventListener('octux:simulation-started', handleSimulation);
    window.addEventListener('octux:verdict-received', handleVerdict);
    window.addEventListener('octux:conversation-created', handleConversation);
    window.addEventListener('octux:refinement-sent', handleRefinement);
    window.addEventListener('octux:agent-chat-started', handleAgentChat);

    return () => {
      window.removeEventListener('octux:message-sent', handleMessage);
      window.removeEventListener('octux:simulation-started', handleSimulation);
      window.removeEventListener('octux:verdict-received', handleVerdict);
      window.removeEventListener('octux:conversation-created', handleConversation);
      window.removeEventListener('octux:refinement-sent', handleRefinement);
      window.removeEventListener('octux:agent-chat-started', handleAgentChat);
    };
  }, [loaded, milestones, conversationCount, fire, incrementCounter]);
}
```

---

## Part G — OnboardingProvider (in ShellClient)

CREATE `components/onboarding/OnboardingProvider.tsx`:

```typescript
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useOnboardingStore } from '@/lib/store/onboarding';
import { useOnboardingTriggers } from '@/hooks/useOnboardingTriggers';
import MilestoneToast from './MilestoneToast';

interface ToastConfig {
  emoji: string;
  title: string;
  description?: string;
}

export default function OnboardingProvider({ isLoggedIn }: { isLoggedIn: boolean }) {
  const load = useOnboardingStore((s) => s.load);
  const [toast, setToast] = useState<ToastConfig | null>(null);

  // Load onboarding state on mount
  useEffect(() => {
    if (isLoggedIn) {
      load();
    }
  }, [isLoggedIn, load]);

  // Handle milestone toasts
  const handleToast = useCallback((config: ToastConfig) => {
    setToast(config);
  }, []);

  useOnboardingTriggers(handleToast);

  return (
    <>
      {toast && (
        <MilestoneToast
          emoji={toast.emoji}
          title={toast.title}
          description={toast.description}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  );
}
```

---

## Part H — Dispatch Events from Chat/Simulation

The onboarding triggers listen for custom events. These need to be dispatched from the relevant components. Add these dispatches:

**In chat store or conversation page (when message is sent):**
```typescript
window.dispatchEvent(new CustomEvent('octux:message-sent'));
```

**In useSimulationStream (when simulation starts):**
```typescript
window.dispatchEvent(new CustomEvent('octux:simulation-started'));
```

**In useSimulationStream (when verdict received):**
```typescript
window.dispatchEvent(new CustomEvent('octux:verdict-received'));
```

**In root page (when conversation created):**
```typescript
window.dispatchEvent(new CustomEvent('octux:conversation-created'));
```

**In VerdictCard (when refinement submitted):**
```typescript
window.dispatchEvent(new CustomEvent('octux:refinement-sent'));
```

**In future PF-18 agent chat:**
```typescript
window.dispatchEvent(new CustomEvent('octux:agent-chat-started'));
```

---

## Part I — Contextual Tips Placement

Place `ContextualTip` components in strategic locations:

1. After first chat response (in conversation page): tip-free token.
2. During first simulation.
3. After first verdict.
4. In sidebar (after 3 conversations).

---

## Part J — Wire into ShellClient

UPDATE `app/(shell)/ShellClient.tsx` to include OnboardingProvider:

```typescript
import OnboardingProvider from '@/components/onboarding/OnboardingProvider';

return (
  <div className="flex h-dvh bg-surface-0">
    <Sidebar />
    <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
      {children}
    </main>
    <CommandPalette />
    <OnboardingProvider isLoggedIn={isLoggedIn} />
  </div>
);
```

---

## Part K — Export

CREATE `components/onboarding/index.ts`:

```typescript
export { default as MilestoneToast } from './MilestoneToast';
export { default as ContextualTip } from './ContextualTip';
export { default as OnboardingProvider } from './OnboardingProvider';
```

---

## Testing

### Test 1 — First message milestone:
New user → sends first message → toast appears top-right: "🎉 First question asked! You have 1 free simulation token." Auto-dismisses after 4s.

### Test 2 — First simulation milestone:
User clicks "Activate Deep Simulation" for first time → toast: "🐙 Deep Simulation activated! Watch 10 specialists debate." Appears during simulation.

### Test 3 — First verdict milestone:
Simulation completes → toast: "⚖️ Your first verdict! Hover citations to see which agent made each claim."

### Test 4 — Third conversation milestone:
User creates 3rd conversation → toast: "⌨️ Power user unlocked! Press ? for keyboard shortcuts."

### Test 5 — Tip appears once:
After first message → ContextualTip shows. Click X → tip dismissed. Reload page → tip does NOT reappear.

### Test 6 — Tip persisted in DB:
Dismiss tip → check `user_onboarding.dismissed_tips` in Supabase → contains tip ID.

### Test 7 — Milestones persisted:
Complete milestone → reload → milestone still marked complete (fetched from API).

---

Manda pro Fernando. Depois do PF-22, o próximo sprint é **FASE 9 — Entity + Share** (PF-23 → PF-27). Quer PF-23 (Entity Animation States)? 🐙

