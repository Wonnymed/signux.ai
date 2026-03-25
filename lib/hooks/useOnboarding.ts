'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  type MilestoneId, type TipId, MILESTONES,
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
  const tipTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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
