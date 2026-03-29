'use client';

import HeroSection from '@/components/landing/HeroSection';
import NewCategorySection from '@/components/landing/NewCategorySection';
import WhyNotChatGPT from '@/components/landing/WhyNotChatGPT';
import SimulationModes from '@/components/landing/SimulationModes';
import BuiltInSeoulSection from '@/components/landing/BuiltInSeoulSection';
import PricingPreview from '@/components/landing/PricingPreview';
import LandingFooter from '@/components/landing/LandingFooter';

/**
 * Product landing: dark canvas, gold accent, embedded hero simulation input.
 * Shown at `/` for logged-out users only.
 */
export default function LandingPage({ loading = false }: { loading?: boolean }) {
  return (
    <div className="dark min-h-screen overflow-x-hidden bg-[#0a0a0f] text-[#f5f5f0] antialiased">
      <HeroSection requireAuth loading={loading} />
      <NewCategorySection />
      <WhyNotChatGPT />
      <SimulationModes />
      <BuiltInSeoulSection />
      <PricingPreview />
      <LandingFooter className="border-white/[0.06] bg-[#0a0a0f]" />
    </div>
  );
}
