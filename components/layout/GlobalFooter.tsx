'use client';

import { cn } from '@/lib/design/cn';

interface GlobalFooterProps {
  className?: string;
  ctaLabel?: string;
  ctaHref?: string;
  /** When set, CTA is a button (e.g. open auth) instead of a link. */
  onCtaClick?: () => void;
  /** Logged-out landing: app links (Agent Lab, Dashboard) open auth instead of navigating. */
  onAppLinkClick?: () => void;
  oneLiner?: string;
  compact?: boolean;
}

const groups = [
  {
    title: 'Produto',
    links: [
      { label: 'Home', href: '/' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Agent Lab', href: '/agents' },
    ],
  },
  {
    title: 'Recursos',
    links: [
      { label: 'Dashboard', href: '/' },
      { label: 'Agent Lab', href: '/agents' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '#' },
      { label: 'Terms', href: '#' },
      { label: 'Security', href: '#' },
    ],
  },
  {
    title: 'Redes',
    links: [
      { label: 'X / Twitter', href: '#' },
      { label: 'LinkedIn', href: '#' },
      { label: 'GitHub', href: 'https://github.com/Wonnymed/octux.ai' },
    ],
  },
] as const;

function isAppLink(href: string) {
  return href === '/agents' || href === '/projects';
}

export default function GlobalFooter({
  className,
  ctaLabel = 'View pricing',
  ctaHref = '/pricing',
  onCtaClick,
  onAppLinkClick,
  oneLiner = 'Business simulation engine — 10 specialists stress-testing your decisions in seconds.',
  compact = false,
}: GlobalFooterProps) {
  const linkClass = 'block text-sm text-txt-secondary hover:text-txt-primary';

  const renderLink = (label: string, href: string) => {
    if (onAppLinkClick && isAppLink(href)) {
      return (
        <button key={label} type="button" onClick={onAppLinkClick} className={cn(linkClass, 'w-full text-left')}>
          {label}
        </button>
      );
    }
    return (
      <a key={label} href={href} className={linkClass}>
        {label}
      </a>
    );
  };

  return (
    <footer className={cn('border-t border-border-subtle bg-surface-1/50', className)}>
      <div className="mx-auto w-full max-w-landing px-6 py-10">
        <div className="mb-8 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-accent">Sukgo</p>
            <p className="mt-1 max-w-reading text-sm text-txt-secondary">{oneLiner}</p>
          </div>
          {onCtaClick ? (
            <button
              type="button"
              onClick={onCtaClick}
              className="rounded-radius-md bg-accent px-4 py-2 text-sm font-medium text-txt-on-accent transition-colors hover:bg-accent-hover"
            >
              {ctaLabel}
            </button>
          ) : (
            <a
              href={ctaHref}
              className="rounded-radius-md bg-accent px-4 py-2 text-sm font-medium text-txt-on-accent transition-colors hover:bg-accent-hover"
            >
              {ctaLabel}
            </a>
          )}
        </div>

        {!compact && (
          <>
            <div className="hidden grid-cols-4 gap-8 border-t border-border-subtle/70 pt-8 md:grid">
              {groups.map((group) => (
                <div key={group.title}>
                  <p className="mb-2 text-xs uppercase tracking-[0.08em] text-txt-tertiary">{group.title}</p>
                  <div className="space-y-1">
                    {group.links.map((link) => renderLink(link.label, link.href))}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border-subtle/70 pt-5 md:hidden">
              <div className="space-y-2">
                {groups.map((group) => (
                  <details key={group.title} className="rounded-radius-md border border-border-subtle bg-surface-0/50 px-3 py-2">
                    <summary className="cursor-pointer list-none text-sm font-medium text-txt-primary">{group.title}</summary>
                    <div className="mt-2 space-y-1">
                      {group.links.map((link) => renderLink(link.label, link.href))}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="mt-8 flex flex-col items-start justify-between gap-2 border-t border-border-subtle/70 pt-4 text-xs text-txt-disabled sm:flex-row sm:items-center">
          <div className="space-y-1">
            <p>© 2026 Sukgo AI · The world&apos;s first AI business simulation engine</p>
            <p className="text-[11px] italic text-txt-tertiary/80">
              숙고 (sukgo) — the Korean practice of deep deliberation before an important decision.
            </p>
          </div>
          <p className="flex items-center gap-2">
            <span>Infra:</span>
            <a href="https://supabase.com" className="hover:text-txt-tertiary">Supabase</a>
            <span>·</span>
            <a href="https://vercel.com" className="hover:text-txt-tertiary">Vercel</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
