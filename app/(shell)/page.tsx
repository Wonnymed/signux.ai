'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/auth/AuthProvider';
import { useAppStore } from '@/lib/store/app';
import EntityVisual from '@/components/chat/EntityVisual';
import ChatInput from '@/components/chat/ChatInput';
import TrustStrip from '@/components/landing/TrustStrip';
import HowItWorks from '@/components/landing/HowItWorks';
import LiveExample from '@/components/landing/LiveExample';
import WhyNotChatGPT from '@/components/landing/WhyNotChatGPT';
import PricingPreview from '@/components/landing/PricingPreview';
import LandingFooter from '@/components/landing/LandingFooter';
import AuthModal from '@/components/auth/AuthModal';

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
      {/* ═══ ABOVE THE FOLD — Product ═══ */}
      <div className="min-h-dvh flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 relative">
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-accent/[0.03] blur-[100px]" />
          </div>

          <div className="relative z-10 max-w-2xl mx-auto text-center w-full">
            {/* Entity */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="mb-2"
            >
              <EntityVisual state="idle" />
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
            </motion.div>

            {/* Sub-tagline */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.5 }}
              className="text-micro text-txt-disabled mt-4"
            >
              10 AI specialists debate your decisions · Free to start
            </motion.p>
          </div>
        </div>
      </div>

      {/* ═══ BELOW THE FOLD — Marketing ═══ */}
      <TrustStrip />
      <HowItWorks />
      <LiveExample onSignIn={() => setShowAuth(true)} />
      <WhyNotChatGPT />
      <PricingPreview onSignIn={() => setShowAuth(true)} />
      <LandingFooter onSignIn={() => setShowAuth(true)} />

      {/* Auth modal */}
      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </>
  );
}
