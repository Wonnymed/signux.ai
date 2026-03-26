'use client';

import { useState } from 'react';
import HeroSection from './HeroSection';
import TrustStrip from './TrustStrip';
import HowItWorks from './HowItWorks';
import LiveExample from './LiveExample';
import WhyNotChatGPT from './WhyNotChatGPT';
import PricingPreview from './PricingPreview';
import LandingFooter from './LandingFooter';
import AuthModal from '@/components/auth/AuthModal';

export default function LandingPage() {
  const [showAuth, setShowAuth] = useState(false);

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

      <HeroSection onSignIn={() => setShowAuth(true)} />

      <div className="landing-marketing-stack">
        <TrustStrip />
        <HowItWorks />
        <LiveExample onSignIn={() => setShowAuth(true)} />
        <WhyNotChatGPT />
        <PricingPreview onSignIn={() => setShowAuth(true)} />
        <LandingFooter onSignIn={() => setShowAuth(true)} />
      </div>

      {/* Auth modal */}
      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        onAuthSuccess={() => setShowAuth(false)}
      />
    </div>
  );
}
