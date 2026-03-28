'use client';

import HeroSection from '@/components/landing/HeroSection';
import NewCategorySection from '@/components/landing/NewCategorySection';
import SimulationPreviewBand from '@/components/landing/SimulationPreviewBand';
import SimulationModes from '@/components/landing/SimulationModes';
import TrustStrip from '@/components/landing/TrustStrip';
import HowItWorks from '@/components/landing/HowItWorks';
import LiveExample from '@/components/landing/LiveExample';
import WhyNotChatGPT from '@/components/landing/WhyNotChatGPT';
import PricingPreview from '@/components/landing/PricingPreview';
import BuiltInSeoulSection from '@/components/landing/BuiltInSeoulSection';
import { LandingFooterLoggedIn } from '@/components/landing/LandingFooter';

/**
 * Marketing landing for logged-in users (e.g. /home inside dashboard shell).
 * No auth CTAs; primary action is "Start a simulation" → /.
 */
export default function LandingContent() {
  return (
    <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-surface-0 text-txt-primary">
      <HeroSection forLoggedInUser />
      <NewCategorySection />
      <SimulationPreviewBand />
      <TrustStrip />
      <SimulationModes forLoggedInUser />
      <BuiltInSeoulSection />
      <LiveExample forLoggedInUser />
      <HowItWorks />
      <WhyNotChatGPT />
      <PricingPreview forLoggedInUser />
      <LandingFooterLoggedIn />
    </div>
  );
}
