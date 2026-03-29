import GlobalFooter from '@/components/layout/GlobalFooter';
import { openAuthModal } from '@/lib/auth/openAuthModal';

export default function LandingFooter({ className }: { className?: string }) {
  return (
    <GlobalFooter
      className={className}
      ctaLabel="Run a simulation"
      onCtaClick={() => openAuthModal({ tab: 'signup' })}
      onAppLinkClick={() => openAuthModal({ tab: 'signup' })}
      oneLiner="Business simulation engine — 10 specialists debating your decisions in seconds."
    />
  );
}

/** Logged-in /home: CTA goes to dashboard; footer links navigate normally (no auth wall). */
export function LandingFooterLoggedIn() {
  return (
    <GlobalFooter
      ctaLabel="Start a simulation"
      ctaHref="/"
      oneLiner="Business simulation engine — 10 specialists debating your decisions in seconds."
    />
  );
}
