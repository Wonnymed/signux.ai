# PROMPT 58 — Onboarding Flow (The Product IS the Onboarding)

## Context for AI

You are working on Octux AI — a Decision Operating System built with Next.js 14 App Router + TypeScript + Tailwind CSS + Claude API + Supabase.

**What exists:**
- P44-P54: Complete frontend (design system, chat, simulation, verdict, citations, sidebar, command palette, shortcuts)
- P55: Landing page with functional hero input → redirects to auth with pre-filled question
- P56: Stripe billing with tier gating (Free: 3 Deep sims/month), UpgradePrompt component
- P57: Agent selection UI (auto-select, browser, templates, custom agents)
- Auth: Supabase Auth (Google + Magic Link)
- `user_subscriptions` table with usage tracking

**What is MISSING:**
New user signs up and lands on an empty `/c` with zero guidance. No contextual tips, no milestone celebration, no progressive disclosure of features, no behavioral profile teaser, no smooth path from "first question" to "power user". The onboarding principle: THE PRODUCT IS THE ONBOARDING. No separate tutorial page. No modal walkthrough. Features reveal themselves through use.

**What you will build (6 things):**

1. **`lib/onboarding/milestones.ts`** — Milestone definitions and tracking (first chat, first sim, first verdict, 3 conversations, etc.)
2. **`lib/hooks/useOnboarding.ts`** — Client hook that tracks user progress and triggers contextual tips
3. **`components/onboarding/ContextualTip.tsx`** — Subtle, dismissible tip component (not modal, not blocking)
4. **`components/onboarding/MilestoneToast.tsx`** — Celebration toast when user hits milestones
5. **`components/onboarding/OnboardingProvider.tsx`** — Provider that mounts listeners and tip triggers globally
6. **Database: `user_onboarding` table** — Tracks which milestones completed, tips dismissed

**Onboarding philosophy:**
- ZERO walls between user and product
- Tips appear AFTER the user does something (not before)
- Each tip appears ONCE, is dismissible, and never returns
- Milestones celebrate progress, not lecture
- The upgrade prompt is a natural milestone, not a paywall surprise
- Entity visual state changes ARE the onboarding animation

**Refs applied:** Okara #5 (frictionless — zero steps before value), Stripe #18 (progressive trust — earn right to upsell)

---

## Part A — Database Migration

```sql
CREATE TABLE IF NOT EXISTS user_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Milestone tracking
  milestones_completed TEXT[] NOT NULL DEFAULT '{}',
  tips_dismissed TEXT[] NOT NULL DEFAULT '{}',

  -- Usage counts (for milestone triggers)
  conversations_count INTEGER NOT NULL DEFAULT 0,
  simulations_count INTEGER NOT NULL DEFAULT 0,
  verdicts_seen INTEGER NOT NULL DEFAULT 0,
  agent_chats_count INTEGER NOT NULL DEFAULT 0,
  shares_count INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  first_conversation_at TIMESTAMPTZ,
  first_simulation_at TIMESTAMPTZ,
  first_verdict_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Auto-create on signup
CREATE OR REPLACE FUNCTION handle_new_user_onboarding()
RETURNS TRIGGER AS $
BEGIN
  INSERT INTO user_onboarding (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created_onboarding
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_onboarding();

-- RLS
ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own onboarding"
  ON user_onboarding FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding"
  ON user_onboarding FOR UPDATE
  USING (auth.uid() = user_id);
```

---

## Part B — Milestones & Tips Registry

CREATE `lib/onboarding/milestones.ts`:

```typescript
export type MilestoneId =
  | 'first_message'
  | 'first_simulation'
  | 'first_verdict'
  | 'first_agent_chat'
  | 'first_share'
  | 'third_conversation'
  | 'fifth_simulation'
  | 'first_refine'
  | 'free_limit_reached';

export type TipId =
  | 'tip_simulate'
  | 'tip_agent_perspectives'
  | 'tip_citations'
  | 'tip_expand_verdict'
  | 'tip_keyboard_shortcuts'
  | 'tip_decision_style'
  | 'tip_agent_chat'
  | 'tip_share';

export interface Milestone {
  id: MilestoneId;
  title: string;
  description: string;
  emoji: string;
  triggeredBy: string; // event name
  celebration: 'toast' | 'subtle' | 'none';
}

export interface Tip {
  id: TipId;
  text: string;
  triggeredAfter: MilestoneId; // show after this milestone
  position: 'bottom-center' | 'top-right' | 'inline'; // where to show
  dismissible: boolean;
  showOnce: boolean;
  delayMs: number; // delay after trigger before showing
}

// ═══ MILESTONES ═══

export const MILESTONES: Record<MilestoneId, Milestone> = {
  first_message: {
    id: 'first_message',
    title: 'First question asked',
    description: "You're on your way",
    emoji: '🐙',
    triggeredBy: 'octux:message-sent',
    celebration: 'none', // too early to celebrate
  },
  first_simulation: {
    id: 'first_simulation',
    title: 'First simulation launched',
    description: '10 specialists are debating your decision',
    emoji: '⚡',
    triggeredBy: 'octux:simulation-started',
    celebration: 'subtle',
  },
  first_verdict: {
    id: 'first_verdict',
    title: 'First verdict received',
    description: 'This is your first decision on Octux',
    emoji: '🎯',
    triggeredBy: 'octux:verdict-received',
    celebration: 'toast',
  },
  first_agent_chat: {
    id: 'first_agent_chat',
    title: 'First agent conversation',
    description: 'You went deeper with a specialist',
    emoji: '🗣️',
    triggeredBy: 'octux:agent-chat',
    celebration: 'subtle',
  },
  first_share: {
    id: 'first_share',
    title: 'First share',
    description: 'Your analysis is out in the world',
    emoji: '🔗',
    triggeredBy: 'octux:share',
    celebration: 'toast',
  },
  third_conversation: {
    id: 'third_conversation',
    title: 'Decision streak',
    description: 'Octux is learning your decision style',
    emoji: '🧠',
    triggeredBy: 'octux:conversation-count-3',
    celebration: 'toast',
  },
  fifth_simulation: {
    id: 'fifth_simulation',
    title: 'Power analyst',
    description: "You've run 5 simulations",
    emoji: '🏆',
    triggeredBy: 'octux:simulation-count-5',
    celebration: 'toast',
  },
  first_refine: {
    id: 'first_refine',
    title: 'First refinement',
    description: "You asked 'what if' — that's how better decisions happen",
    emoji: '🔀',
    triggeredBy: 'octux:refine-sent',
    celebration: 'subtle',
  },
  free_limit_reached: {
    id: 'free_limit_reached',
    title: 'Free simulations used',
    description: "You've used all 3 free simulations this month",
    emoji: '📊',
    triggeredBy: 'octux:free-limit-reached',
    celebration: 'none', // handled by UpgradePrompt
  },
};

// ═══ CONTEXTUAL TIPS ═══

export const TIPS: Record<TipId, Tip> = {
  tip_simulate: {
    id: 'tip_simulate',
    text: "💡 Type 'simulate' or click ⚡ for a Deep analysis with 10 specialists",
    triggeredAfter: 'first_message',
    position: 'bottom-center',
    dismissible: true,
    showOnce: true,
    delayMs: 2000, // 2s after first chat response
  },
  tip_agent_perspectives: {
    id: 'tip_agent_perspectives',
    text: '💡 Each specialist has a different perspective — expand their cards to see why',
    triggeredAfter: 'first_simulation',
    position: 'inline',
    dismissible: true,
    showOnce: true,
    delayMs: 5000, // 5s into simulation (when agents start appearing)
  },
  tip_citations: {
    id: 'tip_citations',
    text: '💡 Hover the numbered pills to see which agent made each claim',
    triggeredAfter: 'first_verdict',
    position: 'inline',
    dismissible: true,
    showOnce: true,
    delayMs: 3000,
  },
  tip_expand_verdict: {
    id: 'tip_expand_verdict',
    text: '💡 Click "Expand" to see the full agent scoreboard and risk matrix',
    triggeredAfter: 'first_verdict',
    position: 'inline',
    dismissible: true,
    showOnce: true,
    delayMs: 8000, // 8s after verdict — give time to read
  },
  tip_keyboard_shortcuts: {
    id: 'tip_keyboard_shortcuts',
    text: '💡 Press ? for keyboard shortcuts, ⌘K for command palette',
    triggeredAfter: 'third_conversation',
    position: 'bottom-center',
    dismissible: true,
    showOnce: true,
    delayMs: 1000,
  },
  tip_decision_style: {
    id: 'tip_decision_style',
    text: '🧠 Octux is learning your decision style → See your decision personality',
    triggeredAfter: 'third_conversation',
    position: 'top-right',
    dismissible: true,
    showOnce: true,
    delayMs: 5000,
  },
  tip_agent_chat: {
    id: 'tip_agent_chat',
    text: '💡 Click "Chat" on any agent to dig deeper into their analysis',
    triggeredAfter: 'first_verdict',
    position: 'inline',
    dismissible: true,
    showOnce: true,
    delayMs: 15000, // 15s after verdict
  },
  tip_share: {
    id: 'tip_share',
    text: '💡 Click "Share" to get a professional boardroom report link',
    triggeredAfter: 'first_verdict',
    position: 'inline',
    dismissible: true,
    showOnce: true,
    delayMs: 20000,
  },
};

/**
 * Get tips that should trigger after a milestone
 */
export function getTipsForMilestone(milestoneId: MilestoneId): Tip[] {
  return Object.values(TIPS).filter(t => t.triggeredAfter === milestoneId);
}
```

---

## Part C — useOnboarding Hook

CREATE `lib/hooks/useOnboarding.ts`:

```typescript
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  type MilestoneId, type TipId, MILESTONES, TIPS,
  getTipsForMilestone,
} from '@/lib/onboarding/milestones';

interface OnboardingState {
  milestonesCompleted: Set<MilestoneId>;
  tipsDismissed: Set<TipId>;
  activeTip: TipId | null;
  activeMilestone: MilestoneId | null;
  conversationsCount: number;
  simulationsCount: number;
  loaded: boolean;
}

export function useOnboarding(userId: string | undefined) {
  const [state, setState] = useState<OnboardingState>({
    milestonesCompleted: new Set(),
    tipsDismissed: new Set(),
    activeTip: null,
    activeMilestone: null,
    conversationsCount: 0,
    simulationsCount: 0,
    loaded: false,
  });
  const tipTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Load onboarding state from DB
  useEffect(() => {
    if (!userId) return;

    fetch('/api/onboarding')
      .then(r => r.json())
      .then(data => {
        if (data.onboarding) {
          setState(prev => ({
            ...prev,
            milestonesCompleted: new Set(data.onboarding.milestones_completed || []),
            tipsDismissed: new Set(data.onboarding.tips_dismissed || []),
            conversationsCount: data.onboarding.conversations_count || 0,
            simulationsCount: data.onboarding.simulations_count || 0,
            loaded: true,
          }));
        } else {
          setState(prev => ({ ...prev, loaded: true }));
        }
      })
      .catch(() => setState(prev => ({ ...prev, loaded: true })));
  }, [userId]);

  /**
   * Complete a milestone
   */
  const completeMilestone = useCallback((milestoneId: MilestoneId) => {
    setState(prev => {
      if (prev.milestonesCompleted.has(milestoneId)) return prev;

      const next = {
        ...prev,
        milestonesCompleted: new Set([...prev.milestonesCompleted, milestoneId]),
      };

      const milestone = MILESTONES[milestoneId];

      // Show celebration
      if (milestone.celebration === 'toast' || milestone.celebration === 'subtle') {
        next.activeMilestone = milestoneId;
        // Auto-clear after 4s
        setTimeout(() => {
          setState(p => ({ ...p, activeMilestone: null }));
        }, 4000);
      }

      // Schedule tips triggered by this milestone
      const tips = getTipsForMilestone(milestoneId);
      for (const tip of tips) {
        if (!prev.tipsDismissed.has(tip.id) && tip.showOnce) {
          clearTimeout(tipTimerRef.current);
          tipTimerRef.current = setTimeout(() => {
            setState(p => {
              if (p.tipsDismissed.has(tip.id)) return p;
              return { ...p, activeTip: tip.id };
            });
          }, tip.delayMs);
          break; // only one tip at a time
        }
      }

      // Persist to DB
      persistMilestone(milestoneId);

      return next;
    });
  }, []);

  /**
   * Dismiss a tip
   */
  const dismissTip = useCallback((tipId: TipId) => {
    setState(prev => ({
      ...prev,
      tipsDismissed: new Set([...prev.tipsDismissed, tipId]),
      activeTip: prev.activeTip === tipId ? null : prev.activeTip,
    }));
    persistTipDismiss(tipId);
  }, []);

  /**
   * Increment a counter and check for count-based milestones
   */
  const incrementCounter = useCallback((type: 'conversation' | 'simulation' | 'verdict' | 'share') => {
    setState(prev => {
      const next = { ...prev };

      if (type === 'conversation') {
        next.conversationsCount = prev.conversationsCount + 1;
        if (next.conversationsCount >= 3 && !prev.milestonesCompleted.has('third_conversation')) {
          setTimeout(() => completeMilestone('third_conversation'), 500);
        }
      }
      if (type === 'simulation') {
        next.simulationsCount = prev.simulationsCount + 1;
        if (next.simulationsCount >= 5 && !prev.milestonesCompleted.has('fifth_simulation')) {
          setTimeout(() => completeMilestone('fifth_simulation'), 500);
        }
      }

      return next;
    });

    persistCounter(type);
  }, [completeMilestone]);

  // Listen for global events
  useEffect(() => {
    if (!state.loaded) return;

    const handlers: Record<string, () => void> = {
      'octux:message-sent': () => {
        if (!state.milestonesCompleted.has('first_message')) completeMilestone('first_message');
      },
      'octux:simulation-started': () => {
        if (!state.milestonesCompleted.has('first_simulation')) completeMilestone('first_simulation');
        incrementCounter('simulation');
      },
      'octux:verdict-received': () => {
        if (!state.milestonesCompleted.has('first_verdict')) completeMilestone('first_verdict');
        incrementCounter('verdict');
      },
      'octux:agent-chat-opened': () => {
        if (!state.milestonesCompleted.has('first_agent_chat')) completeMilestone('first_agent_chat');
      },
      'octux:share': () => {
        if (!state.milestonesCompleted.has('first_share')) completeMilestone('first_share');
        incrementCounter('share');
      },
      'octux:refine-sent': () => {
        if (!state.milestonesCompleted.has('first_refine')) completeMilestone('first_refine');
      },
      'octux:free-limit-reached': () => {
        if (!state.milestonesCompleted.has('free_limit_reached')) completeMilestone('free_limit_reached');
      },
      'octux:conversation-created': () => {
        incrementCounter('conversation');
      },
    };

    const listeners: [string, () => void][] = [];
    for (const [event, handler] of Object.entries(handlers)) {
      window.addEventListener(event, handler);
      listeners.push([event, handler]);
    }

    return () => {
      for (const [event, handler] of listeners) {
        window.removeEventListener(event, handler);
      }
      clearTimeout(tipTimerRef.current);
    };
  }, [state.loaded, state.milestonesCompleted, completeMilestone, incrementCounter]);

  return {
    ...state,
    completeMilestone,
    dismissTip,
    incrementCounter,
    isNewUser: state.loaded && state.conversationsCount === 0,
  };
}

// ═══ Persistence helpers ═══

async function persistMilestone(milestoneId: MilestoneId) {
  try {
    await fetch('/api/onboarding', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ milestone: milestoneId }),
    });
  } catch {}
}

async function persistTipDismiss(tipId: TipId) {
  try {
    await fetch('/api/onboarding', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dismissTip: tipId }),
    });
  } catch {}
}

async function persistCounter(type: string) {
  try {
    await fetch('/api/onboarding', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incrementCounter: type }),
    });
  } catch {}
}
```

---

## Part D — ContextualTip

CREATE `components/onboarding/ContextualTip.tsx`:

```typescript
'use client';

import { cn } from '@/lib/design/cn';
import { TIPS, type TipId } from '@/lib/onboarding/milestones';

interface ContextualTipProps {
  tipId: TipId | null;
  position?: 'bottom-center' | 'top-right' | 'inline';
  onDismiss: (tipId: TipId) => void;
  className?: string;
}

export default function ContextualTip({ tipId, position, onDismiss, className }: ContextualTipProps) {
  if (!tipId) return null;

  const tip = TIPS[tipId];
  if (!tip) return null;

  const pos = position || tip.position;

  const positionClass = {
    'bottom-center': 'fixed bottom-20 left-1/2 -translate-x-1/2 z-[80]',
    'top-right': 'fixed top-16 right-6 z-[80]',
    'inline': 'relative',
  }[pos];

  return (
    <div className={cn(
      'animate-slide-in-up',
      positionClass,
      className,
    )}>
      <div className={cn(
        'flex items-center gap-2.5 px-4 py-2.5 rounded-lg',
        'bg-surface-raised border border-accent/20 shadow-lg',
        'max-w-md',
      )}>
        <p className="text-xs text-txt-secondary flex-1">{tip.text}</p>
        {tip.dismissible && (
          <button
            onClick={() => onDismiss(tipId)}
            className="shrink-0 p-1 text-icon-secondary hover:text-icon-primary transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 2l6 6M8 2l-6 6" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Inline variant for embedding within chat flow
 */
export function InlineTip({ tipId, onDismiss }: { tipId: TipId | null; onDismiss: (tipId: TipId) => void }) {
  if (!tipId) return null;
  const tip = TIPS[tipId];
  if (!tip || tip.position !== 'inline') return null;

  return (
    <div className="px-4 max-w-3xl mx-auto w-full mb-3 animate-fade-in">
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-accent-subtle/30 border border-accent/10">
        <p className="text-micro text-txt-secondary flex-1">{tip.text}</p>
        <button onClick={() => onDismiss(tipId)} className="text-icon-secondary hover:text-icon-primary p-0.5">
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M1 1l6 6M7 1l-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
```

---

## Part E — MilestoneToast

CREATE `components/onboarding/MilestoneToast.tsx`:

```typescript
'use client';

import { cn } from '@/lib/design/cn';
import { MILESTONES, type MilestoneId } from '@/lib/onboarding/milestones';

interface MilestoneToastProps {
  milestoneId: MilestoneId | null;
}

export default function MilestoneToast({ milestoneId }: MilestoneToastProps) {
  if (!milestoneId) return null;

  const milestone = MILESTONES[milestoneId];
  if (!milestone || milestone.celebration === 'none') return null;

  const isToast = milestone.celebration === 'toast';

  return (
    <div className={cn(
      'fixed z-[90] animate-slide-in-up',
      isToast ? 'bottom-6 left-1/2 -translate-x-1/2' : 'bottom-6 right-6',
    )}>
      <div className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl',
        'bg-surface-raised border',
        isToast ? 'border-accent/20' : 'border-border-subtle',
      )}>
        <span className="text-xl shrink-0">{milestone.emoji}</span>
        <div>
          <p className={cn(
            'text-sm font-medium',
            isToast ? 'text-accent' : 'text-txt-primary',
          )}>
            {milestone.title}
          </p>
          <p className="text-micro text-txt-tertiary">{milestone.description}</p>
        </div>
      </div>
    </div>
  );
}
```

---

## Part F — OnboardingProvider

CREATE `components/onboarding/OnboardingProvider.tsx`:

```typescript
'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useOnboarding } from '@/lib/hooks/useOnboarding';
import ContextualTip from './ContextualTip';
import MilestoneToast from './MilestoneToast';
import type { MilestoneId, TipId } from '@/lib/onboarding/milestones';

interface OnboardingContextValue {
  milestonesCompleted: Set<MilestoneId>;
  activeTip: TipId | null;
  dismissTip: (tipId: TipId) => void;
  isNewUser: boolean;
  conversationsCount: number;
  simulationsCount: number;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function useOnboardingContext() {
  return useContext(OnboardingContext);
}

interface OnboardingProviderProps {
  userId: string | undefined;
  children: ReactNode;
}

export default function OnboardingProvider({ userId, children }: OnboardingProviderProps) {
  const onboarding = useOnboarding(userId);

  return (
    <OnboardingContext.Provider value={{
      milestonesCompleted: onboarding.milestonesCompleted,
      activeTip: onboarding.activeTip,
      dismissTip: onboarding.dismissTip,
      isNewUser: onboarding.isNewUser,
      conversationsCount: onboarding.conversationsCount,
      simulationsCount: onboarding.simulationsCount,
    }}>
      {children}

      {/* Global tip overlay (bottom-center and top-right positions) */}
      <ContextualTip
        tipId={onboarding.activeTip}
        onDismiss={onboarding.dismissTip}
      />

      {/* Milestone celebration toast */}
      <MilestoneToast milestoneId={onboarding.activeMilestone} />
    </OnboardingContext.Provider>
  );
}
```

---

## Part G — Onboarding API

CREATE `app/api/onboarding/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('user_onboarding')
    .select('*')
    .eq('user_id', session.user.id)
    .single();

  return NextResponse.json({ onboarding: data });
}

export async function PATCH(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const userId = session.user.id;

  if (body.milestone) {
    // Add milestone to completed array
    await supabase.rpc('add_onboarding_milestone', {
      p_user_id: userId,
      p_milestone: body.milestone,
    });

    // Set timestamp for key milestones
    const timestampField: Record<string, string> = {
      first_message: 'first_conversation_at',
      first_simulation: 'first_simulation_at',
      first_verdict: 'first_verdict_at',
    };
    if (timestampField[body.milestone]) {
      await supabase
        .from('user_onboarding')
        .update({ [timestampField[body.milestone]]: new Date().toISOString() })
        .eq('user_id', userId);
    }
  }

  if (body.dismissTip) {
    await supabase.rpc('add_onboarding_tip_dismissed', {
      p_user_id: userId,
      p_tip: body.dismissTip,
    });
  }

  if (body.incrementCounter) {
    const counterField: Record<string, string> = {
      conversation: 'conversations_count',
      simulation: 'simulations_count',
      verdict: 'verdicts_seen',
      share: 'shares_count',
    };
    const field = counterField[body.incrementCounter];
    if (field) {
      await supabase.rpc('increment_onboarding_counter', {
        p_user_id: userId,
        p_field: field,
      });
    }
  }

  return NextResponse.json({ success: true });
}
```

Add RPC functions:

```sql
CREATE OR REPLACE FUNCTION add_onboarding_milestone(p_user_id UUID, p_milestone TEXT)
RETURNS VOID AS $
BEGIN
  UPDATE user_onboarding
  SET milestones_completed = array_append(milestones_completed, p_milestone),
      updated_at = NOW()
  WHERE user_id = p_user_id
    AND NOT (p_milestone = ANY(milestones_completed));
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION add_onboarding_tip_dismissed(p_user_id UUID, p_tip TEXT)
RETURNS VOID AS $
BEGIN
  UPDATE user_onboarding
  SET tips_dismissed = array_append(tips_dismissed, p_tip),
      updated_at = NOW()
  WHERE user_id = p_user_id
    AND NOT (p_tip = ANY(tips_dismissed));
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_onboarding_counter(p_user_id UUID, p_field TEXT)
RETURNS VOID AS $
BEGIN
  EXECUTE format(
    'UPDATE user_onboarding SET %I = %I + 1, updated_at = NOW() WHERE user_id = $1',
    p_field, p_field
  ) USING p_user_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Part H — Mount Globally

UPDATE `app/c/layout.tsx`:

```typescript
import ChatLayout from '@/components/chat/ChatLayout';
import CommandProvider from '@/components/command/CommandProvider';
import ShortcutOverlay from '@/components/ui/ShortcutOverlay';
import ShortcutToast from '@/components/ui/ShortcutToast';
import OnboardingProvider from '@/components/onboarding/OnboardingProvider';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export default async function CLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  return (
    <OnboardingProvider userId={session?.user?.id}>
      <CommandProvider>
        <ChatLayout>{children}</ChatLayout>
        <ShortcutOverlay />
        <ShortcutToast />
      </CommandProvider>
    </OnboardingProvider>
  );
}
```

---

## Part I — Dispatch Events from Existing Components

Add event dispatches to existing components so onboarding can listen:

```typescript
// In ChatInput.tsx — when user sends message:
window.dispatchEvent(new CustomEvent('octux:message-sent'));

// In app/c/[id]/page.tsx — when conversation created:
window.dispatchEvent(new CustomEvent('octux:conversation-created'));

// In SimulationBlock.tsx — when simulation starts:
window.dispatchEvent(new CustomEvent('octux:simulation-started'));

// In VerdictCard.tsx — when verdict renders:
window.dispatchEvent(new CustomEvent('octux:verdict-received'));

// In VerdictCard.tsx — when share clicked:
window.dispatchEvent(new CustomEvent('octux:share'));

// In VerdictCard.tsx — when refine clicked:
window.dispatchEvent(new CustomEvent('octux:refine-sent'));

// In billing/usage.ts — when free limit hit:
// (server-side: return this in the 403 response, client dispatches event)
window.dispatchEvent(new CustomEvent('octux:free-limit-reached'));
```

---

## Part J — Barrel Export

CREATE `components/onboarding/index.ts`:

```typescript
export { default as OnboardingProvider, useOnboardingContext } from './OnboardingProvider';
export { default as ContextualTip, InlineTip } from './ContextualTip';
export { default as MilestoneToast } from './MilestoneToast';
```

---

## Testing

### Test 1 — New user flow (0 → first verdict):
Sign up → land on /c → type question → send. After response: tip appears "Type 'simulate' or click ⚡ for Deep analysis" (2s delay). Trigger sim → subtle celebration "First simulation launched". Verdict arrives → toast "🎯 First verdict received — This is your first decision on Octux".

### Test 2 — Tips show once:
See "tip_simulate" → dismiss (click X). Navigate away and back. Tip never appears again. Persisted in DB.

### Test 3 — Tips don't stack:
Multiple milestones hit quickly → only one tip shows at a time. Next tip waits until current is dismissed or auto-cleared.

### Test 4 — Third conversation milestone:
Create 3 conversations → toast "🧠 Decision streak — Octux is learning your decision style". After 5s: tip "Press ? for keyboard shortcuts".

### Test 5 — Free limit milestone:
Use 3/3 free sims → UpgradePrompt appears (from P56). Onboarding tracks this as `free_limit_reached` milestone. No separate onboarding popup — the UpgradePrompt IS the natural nudge.

### Test 6 — Inline tips in chat:
After first verdict, within the chat thread: inline tip "Hover the numbered pills to see which agent made each claim". Appears below verdict card, not as floating overlay.

### Test 7 — Milestone toast auto-clears:
Toast appears → visible for 4 seconds → fades. No action required from user.

### Test 8 — Persistence across sessions:
Complete milestones → refresh page → milestones still completed (loaded from DB). Tips already dismissed stay dismissed.

### Test 9 — No onboarding for returning users:
User with 10+ conversations → no tips show. All milestones already completed. Zero onboarding noise.

### Test 10 — Zero walls:
New user: landing → type → auth → /c with question → chat response. ZERO modals, ZERO profile setup, ZERO email verification wall between landing and first value.

---

## Architecture Summary

```
BEFORE P58:
  New user → empty /c → no guidance → confusion → churn
  No milestone tracking, no tips, no celebration

AFTER P58:
  THE PRODUCT IS THE ONBOARDING:

  0s:  Landing hero input → type question → auth → /c with question
  2s:  First chat response + tip: "Click ⚡ for Deep analysis"
  30s: First simulation + tip: "Each specialist has a different perspective"
  90s: First verdict + toast: "🎯 This is your first decision on Octux"
       + tip: "Hover citations" (3s) → "Click Expand" (8s)
  5m:  Third conversation → "🧠 Octux is learning your decision style"
  10m: Free limit reached → UpgradePrompt (natural, not paywall)

  9 MILESTONES:
    first_message → first_simulation → first_verdict
    first_agent_chat → first_share → first_refine
    third_conversation → fifth_simulation → free_limit_reached

  8 CONTEXTUAL TIPS:
    tip_simulate → tip_agent_perspectives → tip_citations
    tip_expand_verdict → tip_keyboard_shortcuts → tip_decision_style
    tip_agent_chat → tip_share

  RULES:
    ✓ Tips appear AFTER the user does something
    ✓ Each tip shows ONCE, is dismissible
    ✓ Milestone celebrations auto-clear (4s)
    ✓ Persisted across sessions
    ✓ Zero separate onboarding page
    ✓ Zero mandatory steps before value

  FILES:
    lib/onboarding/milestones.ts        — milestone + tip registry
    lib/hooks/useOnboarding.ts          — client hook (track + trigger)
    components/onboarding/ContextualTip.tsx    — tip component
    components/onboarding/MilestoneToast.tsx   — celebration toast
    components/onboarding/OnboardingProvider.tsx — global provider
    app/api/onboarding/route.ts         — persistence API
    user_onboarding table + RPC functions
```

---

P58 completo. Salva como `PROMPT-58-onboarding-flow.md`.

**Phase 5 COMPLETA.** P55-P58 = Landing + Pricing + Agent Selection + Onboarding. Conversion & Monetization engine done.

Próximo: **Phase 6 (P59-P61) — Viral & Share.** 🐙
