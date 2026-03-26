'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
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
    // Auth gate — triggers on action, not on page load
    if (!isAuthenticated) {
      try { localStorage.setItem('octux_pending_question', message.substring(0, 200)); } catch {}
      if (!checkGuestLimit()) return;
      setShowAuth(true);
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

      await fetch(`/api/c/${id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          action: options?.simulate ? 'simulate' : 'chat',
          tier: options?.tier || 'ink',
        }),
      });

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
      {/* ABOVE THE FOLD — the product */}
      <div className="h-dvh flex flex-col shrink-0">
        {/* Center: Entity */}
        <div className="flex-1 flex items-center justify-center">
          <EntityVisual state="idle" />
        </div>

        {/* Bottom: ChatInput — real, functional, for everyone */}
        <ChatInput onSend={handleSend} loading={loading} isNewConversation />
      </div>

      {/* BELOW THE FOLD — marketing (scroll to see) */}
      <TrustStrip />
      <HowItWorks />
      <LiveExample onSignIn={() => setShowAuth(true)} />
      <WhyNotChatGPT />
      <PricingPreview onSignIn={() => setShowAuth(true)} />
      <LandingFooter onSignIn={() => setShowAuth(true)} />

      {/* Auth modal — only appears when user tries to send without auth */}
      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </>
  );
}
