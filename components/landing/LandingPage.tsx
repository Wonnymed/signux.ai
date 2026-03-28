'use client';

import HeroSection from './HeroSection';
import NewCategorySection from './NewCategorySection';
import SimulationPreviewBand from './SimulationPreviewBand';
import SimulationModes from './SimulationModes';
import TrustStrip from './TrustStrip';
import HowItWorks from './HowItWorks';
import LiveExample from './LiveExample';
import WhyNotChatGPT from './WhyNotChatGPT';
import PricingPreview from './PricingPreview';
import BuiltInSeoulSection from './BuiltInSeoulSection';
import LandingFooter from './LandingFooter';
import { openAuthModal } from '@/lib/auth/openAuthModal';
import SukgoLogo from '@/components/brand/SukgoLogo';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface-0 text-txt-primary overflow-x-hidden">
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-surface-0/80 backdrop-blur-md border-b border-border-subtle/30">
        <SukgoLogo variant="light" size="md" showWordmark />
        <button
          type="button"
          onClick={() => openAuthModal({ tab: 'signin' })}
          className="rounded-md px-2 py-1 text-xs text-txt-tertiary transition-colors duration-normal ease-out hover:text-txt-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0"
        >
          Sign in
        </button>
      </header>

      <HeroSection requireAuth />

      <NewCategorySection />

      <div className="landing-marketing-stack">
        <SimulationPreviewBand />
        <TrustStrip />
        <SimulationModes />
        <BuiltInSeoulSection />
        <LiveExample />
        <HowItWorks />
        <WhyNotChatGPT />
        <PricingPreview />
        <LandingFooter />
      </div>
    </div>
  );
}
