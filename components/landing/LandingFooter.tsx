import GlobalFooter from '@/components/layout/GlobalFooter';
import { openAuthModal } from '@/lib/auth/openAuthModal';

export default function LandingFooter() {
  return (
    <GlobalFooter
      ctaLabel="Run a simulation"
      onCtaClick={() => openAuthModal({ tab: 'signup' })}
      onAppLinkClick={() => openAuthModal({ tab: 'signup' })}
      oneLiner="Business simulation engine — 10 specialists debating your decisions in seconds."
    />
  );
}
