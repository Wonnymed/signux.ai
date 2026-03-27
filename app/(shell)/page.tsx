'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/auth/AuthProvider';
import { useAppStore } from '@/lib/store/app';
import ChatInput from '@/components/chat/ChatInput';
import AuthModal from '@/components/auth/AuthModal';
// Marketing sections (below the fold)
import TrustStrip from '@/components/landing/TrustStrip';
import HowItWorks from '@/components/landing/HowItWorks';
import LiveExample from '@/components/landing/LiveExample';
import WhyNotChatGPT from '@/components/landing/WhyNotChatGPT';
import PricingPreview from '@/components/landing/PricingPreview';

export default function HomePage() {
  const { isAuthenticated, isLoading, checkGuestLimit } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const router = useRouter();
  const addConversation = useAppStore((s) => s.addConversation);

  // Recover pending question after auth
  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    const pending = localStorage.getItem('octux_pending_question');
    if (pending) {
      localStorage.removeItem('octux_pending_question');
      handleSend(pending);
    }
  }, [isAuthenticated, isLoading]);

  const handleSend = async (message: string, options?: { tier?: string; simulate?: boolean }) => {
    if (!message.trim() || loading) return;

    // Auth gate
    if (!isAuthenticated) {
      try { localStorage.setItem('octux_pending_question', message.substring(0, 200)); } catch {}
      if (!checkGuestLimit()) return;
      setShowAuth(true);
      return;
    }

    setLoading(true);
    try {
      // 1. Create conversation
      const res = await fetch('/api/c', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstMessage: message }),
      });
      const data = await res.json();
      const id = data.id || data.conversation?.id;
      if (!id) throw new Error('No conversation created');

      // 2. Add to sidebar immediately (optimistic)
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

      // 3. Send first message (fire and forget — conversation page will show response)
      fetch(`/api/c/${id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          action: options?.simulate ? 'simulate' : 'chat',
          tier: options?.tier || 'ink',
        }),
      }).catch(() => {});

      // 4. Navigate to conversation
      router.push(`/c/${id}`);
    } catch (err) {
      console.error('Failed to create conversation:', err);
      setLoading(false);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuth(false);
    router.refresh();
  };

  return (
    <>
      {/* ═══ MAIN CHAT VIEW ═══ */}
      <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-x-hidden px-4 pb-8 pt-4 sm:px-6 sm:pb-12 sm:pt-8">
        <div className="relative z-10 mx-auto w-full max-w-3xl text-center">
          {/* Large Logo + Branding */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-8 flex flex-col items-center"
          >
            <div className="relative mb-4">
              <div className="absolute inset-0 oct-entity-bg scale-150 opacity-50" />
              <div className="relative w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br from-accent/80 to-entity-bioluminescent/60 animate-breathe entity-ring">
                <span className="text-3xl">🐙</span>
              </div>
            </div>
            <h1 className="text-2xl font-light tracking-[0.15em] text-txt-primary lowercase">
              octux
            </h1>
            <p className="mt-2 max-w-2xl text-base text-txt-secondary sm:text-lg">
              Transforme incerteza em decisao estruturada.
            </p>
            <p className="mt-1 text-sm text-txt-tertiary">
              10 perspectivas · dados citados · perfil que evolui com o tempo.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span className="rounded-radius-pill border border-border-subtle bg-surface-1 px-2.5 py-1 text-micro text-txt-tertiary">
                10 especialistas
              </span>
              <span className="rounded-radius-pill border border-border-subtle bg-surface-1 px-2.5 py-1 text-micro text-txt-tertiary">
                60s para veredito
              </span>
              <span className="rounded-radius-pill border border-border-subtle bg-surface-1 px-2.5 py-1 text-micro text-txt-tertiary">
                Risco + proxima acao
              </span>
            </div>
          </motion.div>

          {/* Input */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
          >
            <ChatInput
              onSend={handleSend}
              loading={loading}
              showSuggestions
              placeholder="What decision are you facing?"
            />
            <p className="text-micro mt-4 text-center text-txt-tertiary">
              10 AI specialists debate your decisions · Free to start
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <a
                href="#live-example"
                className="rounded-radius-md border border-border-default px-4 py-2 text-sm text-txt-secondary transition-colors hover:bg-surface-1 hover:text-txt-primary"
              >
                Ver exemplo
              </a>
              <a
                href="/pricing"
                className="rounded-radius-md bg-accent px-4 py-2 text-sm font-medium text-txt-on-accent transition-colors hover:bg-accent-hover"
              >
                Ver planos
              </a>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ═══ MARKETING (below the fold) ═══ */}
      <TrustStrip />
      <HowItWorks />
      <LiveExample onSignIn={() => setShowAuth(true)} />
      <WhyNotChatGPT />
      <PricingPreview onSignIn={() => setShowAuth(true)} />

      {/* Auth modal */}
      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </>
  );
}
