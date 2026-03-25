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
import { cn } from '@/lib/design/cn';

export default function HomePage() {
  const { user, isAuthenticated, isLoading, checkGuestLimit } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [visitorInput, setVisitorInput] = useState('');
  const [showConsent, setShowConsent] = useState(false);
  const router = useRouter();

  // Recover pending question after auth
  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    const pending = localStorage.getItem('octux_pending_question');
    if (pending) {
      localStorage.removeItem('octux_pending_question');
      setPendingQuestion(pending);
    }
  }, [isAuthenticated, isLoading]);

  // Auto-submit pending question
  useEffect(() => {
    if (pendingQuestion && isAuthenticated) {
      handleSend(pendingQuestion);
      setPendingQuestion(null);
    }
  }, [pendingQuestion, isAuthenticated]);

  const handleSend = async (message: string, options?: { tier?: string; simulate?: boolean }) => {
    if (!isAuthenticated) {
      // Store question and trigger auth
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

  const handleVisitorSubmit = () => {
    if (!visitorInput.trim()) return;
    if (!showConsent) {
      setShowConsent(true);
      return;
    }
    try { localStorage.setItem('octux_pending_question', visitorInput.trim().substring(0, 200)); } catch {}
    setShowAuth(true);
  };

  const handleAuthSuccess = () => {
    setShowAuth(false);
    router.refresh();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-dvh bg-surface-0">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent/80 to-entity-bioluminescent/60 animate-breathe entity-ring flex items-center justify-center">
          <span className="text-xl">🐙</span>
        </div>
      </div>
    );
  }

  // Authenticated → product view (inside ChatLayout from shell layout)
  if (isAuthenticated) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <EntityVisual state="idle" />
        </div>
        <ChatInput onSend={handleSend} loading={loading} isNewConversation />
      </div>
    );
  }

  // Visitor → unified landing + product
  return (
    <div className="min-h-screen bg-surface-0 text-txt-primary overflow-x-hidden">
      {/* Minimal header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-surface-0/80 backdrop-blur-md border-b border-border-subtle/30">
        <span className="text-sm font-light tracking-[0.15em] text-txt-secondary lowercase">octux</span>
        <button
          onClick={() => setShowAuth(true)}
          className="text-xs text-txt-tertiary hover:text-txt-primary transition-colors duration-normal"
        >
          Sign in
        </button>
      </header>

      {/* Above the fold: Entity + Input */}
      <section className="relative h-dvh flex flex-col items-center justify-center px-6 pt-20 pb-8">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 oct-entity-bg opacity-30" />
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-accent/[0.03] blur-[120px]" />
        </div>

        <div className="relative z-10 flex flex-col items-center flex-1 justify-center w-full max-w-2xl mx-auto">
          {/* Entity */}
          <div className="relative mb-8">
            <div className="absolute inset-0 oct-entity-bg scale-150 opacity-50" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-accent/80 to-entity-bioluminescent/60 animate-breathe entity-ring flex items-center justify-center">
              <span className="text-3xl">🐙</span>
            </div>
          </div>

          {/* Wordmark + tagline */}
          <h1 className="text-4xl sm:text-5xl text-txt-primary mb-3 font-light tracking-[0.15em] lowercase">octux</h1>
          <p className="text-lg sm:text-xl text-txt-secondary mb-10 font-light tracking-wide">
            Never decide alone again
          </p>

          {/* Functional input */}
          <div className="w-full max-w-lg">
            <div className={cn(
              'flex items-center rounded-xl border bg-surface-1 transition-all duration-normal',
              'focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/20',
              'border-border-default',
            )}>
              <input
                value={visitorInput}
                onChange={e => setVisitorInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleVisitorSubmit(); }}
                placeholder="What decision are you facing?"
                className={cn(
                  'flex-1 bg-transparent text-sm sm:text-base text-txt-primary placeholder:text-txt-disabled',
                  'outline-none py-3.5 px-5',
                )}
              />
              <button
                onClick={handleVisitorSubmit}
                disabled={!visitorInput.trim()}
                className={cn(
                  'mr-2 w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-normal shrink-0',
                  visitorInput.trim()
                    ? 'bg-accent text-white hover:bg-accent-hover'
                    : 'bg-surface-2 text-txt-disabled',
                )}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M7 12V2M3 6l4-4 4 4" />
                </svg>
              </button>
            </div>

            {/* Consent message */}
            {showConsent && (
              <p className="text-xs text-txt-secondary mt-3 text-center animate-fade-in">
                Press Enter to create a free account and start your analysis.
                <span className="text-txt-disabled"> No credit card required.</span>
              </p>
            )}
          </div>

          {/* Suggestion chips */}
          <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto mt-6">
            {[
              'Should I invest in NVIDIA?',
              'Time to break up or work on it?',
              'Quit my 9-5 for a startup?',
              'Open a restaurant in Gangnam?',
              'Move abroad or stay close to family?',
            ].map((chip, i) => (
              <button
                key={i}
                onClick={() => setVisitorInput(chip)}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-full border border-border-subtle',
                  'text-txt-tertiary hover:text-txt-secondary hover:border-border-default hover:bg-surface-1',
                  'transition-all duration-normal',
                  `stagger-${i + 1} animate-fade-in`,
                )}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Sub-tagline */}
          <p className="text-micro text-txt-disabled mt-8">
            10 AI specialists debate your decisions &middot; Free to start
          </p>
        </div>

        {/* Scroll indicator */}
        <div className="animate-float pb-4">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-txt-disabled">
            <path d="M10 4v12M6 12l4 4 4-4" />
          </svg>
        </div>
      </section>

      {/* Below the fold: Marketing sections */}
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
    </div>
  );
}
