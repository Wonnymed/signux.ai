'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { useAppStore } from '@/lib/store/app';
import DashboardHome from '@/components/dashboard/DashboardHome';
import LandingPage from '@/components/landing/LandingPage';
import { pendingFirstMessageKey, pendingSimulationKey } from '@/lib/chat/firstMessageBootstrap';
import {
  dashboardModeToChargeType,
  useDashboardUiStore,
  type DashboardMode,
  type DashboardTier,
} from '@/lib/store/dashboard-ui';
import { useBillingStore } from '@/lib/store/billing';
import { frameQuestionForMode } from '@/lib/simulation/mode-framing';
import { HERO_QUESTION_KEY, openAuthModal } from '@/lib/auth/openAuthModal';

function parseSukgoPendingQuestion(raw: string):
  | { kind: 'dashboard'; question: string; mode?: DashboardMode; tier?: DashboardTier }
  | { kind: 'plain'; text: string } {
  const t = raw.trim();
  if (t.startsWith('{')) {
    try {
      const o = JSON.parse(t) as Record<string, unknown>;
      const q = o.question;
      if (typeof q === 'string' && q.trim()) {
        const m = o.mode;
        const tr = o.tier;
        const mode =
          typeof m === 'string' && ['simulate', 'compare', 'stress', 'premortem'].includes(m)
            ? (m as DashboardMode)
            : undefined;
        const tier =
          tr === 'swarm' || tr === 'specialist' ? (tr as DashboardTier) : undefined;
        return { kind: 'dashboard', question: q, mode, tier };
      }
    } catch {
      /* fall through */
    }
  }
  return { kind: 'plain', text: raw };
}

function HomeLoadingSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-[#0a0a0f]" aria-busy aria-label="Loading">
      <div className="mx-auto max-w-3xl px-6 pt-28">
        <div className="h-10 w-4/5 max-w-xl animate-pulse rounded-lg bg-white/[0.06]" />
        <div className="mt-4 h-4 w-full max-w-lg animate-pulse rounded bg-white/[0.04]" />
        <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-white/[0.04]" />
        <div className="mt-10 h-32 animate-pulse rounded-2xl bg-white/[0.05]" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const addConversation = useAppStore((s) => s.addConversation);

  const handleSend = useCallback(
    async (message: string) => {
      if (!message.trim() || loading) return;

      if (!isAuthenticated) {
        try {
          sessionStorage.setItem(HERO_QUESTION_KEY, message.trim());
        } catch {}
        openAuthModal({ tab: 'signup' });
        return;
      }

      setLoading(true);
      try {
        const res = await fetch('/api/c', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firstMessage: message }),
        });
        const data = await res.json();
        const id = data.id || data.conversation?.id;
        if (!id) throw new Error('No conversation created');

        addConversation({
          id,
          title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
          domain: 'general',
          has_simulation: false,
          latest_verdict: null,
          latest_verdict_probability: null,
          is_pinned: false,
          message_count: 1,
          simulation_count: 0,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });

        try {
          sessionStorage.setItem(pendingFirstMessageKey(id), message);
        } catch {
          /* private mode / quota */
        }

        router.push(`/c/${id}`);
      } catch (err) {
        console.error('Failed to create conversation:', err);
      } finally {
        setLoading(false);
      }
    },
    [loading, isAuthenticated, addConversation, router],
  );

  // After sign-in: hero question → dashboard input; then Agent Lab / legacy pending localStorage.
  useEffect(() => {
    if (!isAuthenticated || isLoading) return;

    try {
      const hero = sessionStorage.getItem(HERO_QUESTION_KEY);
      if (hero?.trim()) {
        useDashboardUiStore.getState().setInputA(hero.trim());
        sessionStorage.removeItem(HERO_QUESTION_KEY);
      }
    } catch {
      /* private mode */
    }

    const raw = localStorage.getItem('sukgo_pending_question');
    if (!raw) return;
    localStorage.removeItem('sukgo_pending_question');

    const parsed = parseSukgoPendingQuestion(raw);
    if (parsed.kind === 'dashboard') {
      const { setActiveMode, setActiveTier, setInputA } = useDashboardUiStore.getState();
      if (parsed.mode) setActiveMode(parsed.mode);
      if (parsed.tier) setActiveTier(parsed.tier);
      setInputA(parsed.question);
      return;
    }

    void handleSend(parsed.text);
  }, [isAuthenticated, isLoading, handleSend]);

  const handleDashboardRun = useCallback(async () => {
    const { activeMode, activeTier, inputA, inputB } = useDashboardUiStore.getState();
    if (activeMode === 'compare' && (!inputA.trim() || !inputB.trim())) return;

    const effectiveTier =
      activeMode === 'stress' || activeMode === 'premortem' ? 'specialist' : activeTier;
    const chargeType = dashboardModeToChargeType(activeMode, effectiveTier);
    if (!useBillingStore.getState().canAffordMode(chargeType)) return;

    const framed = frameQuestionForMode(activeMode, inputA, inputB);
    const titleSeed =
      activeMode === 'compare'
        ? `${inputA.trim().slice(0, 24)} vs ${inputB.trim().slice(0, 24)}`
        : inputA.trim().slice(0, 80);

    setLoading(true);
    try {
      const res = await fetch('/api/c', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstMessage: titleSeed }),
      });
      const data = await res.json();
      const id = data.id || data.conversation?.id;
      if (!id) throw new Error('No conversation created');

      const displayTitle =
        titleSeed.length > 50 ? `${titleSeed.slice(0, 47)}...` : titleSeed;

      addConversation({
        id,
        title: displayTitle,
        domain: 'general',
        has_simulation: false,
        latest_verdict: null,
        latest_verdict_probability: null,
        is_pinned: false,
        message_count: 0,
        simulation_count: 0,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });

      try {
        sessionStorage.setItem(
          pendingSimulationKey(id),
          JSON.stringify({ question: framed, simMode: chargeType, panelTier: effectiveTier }),
        );
      } catch {
        /* private mode */
      }

      void useAppStore.getState().fetchConversations({ silent: true });
      router.push(`/c/${id}`);
    } catch (err) {
      console.error('Failed to start simulation:', err);
    } finally {
      setLoading(false);
    }
  }, [addConversation, router]);

  if (isLoading) {
    return <HomeLoadingSkeleton />;
  }

  if (isAuthenticated) {
    return <DashboardHome onRunDashboard={handleDashboardRun} loading={loading} />;
  }

  return <LandingPage loading={loading} />;
}
