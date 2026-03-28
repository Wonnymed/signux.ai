'use client';

import Link from 'next/link';

/**
 * Top bar for logged-out desktop shell: full-width landing, no sidebar (FIX G).
 */
export default function LandingNav() {
  return (
    <header
      className="sticky top-0 z-40 w-full px-6 py-4 sm:px-8"
      style={{
        background: 'linear-gradient(to bottom, rgba(13,13,12,0.92) 0%, rgba(13,13,12,0.65) 70%, transparent 100%)',
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-white/90 transition-opacity hover:opacity-90">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{
              backgroundColor: '#e8593c',
              boxShadow: '0 0 12px rgba(232,89,60,0.55)',
            }}
          />
          <span className="text-[15px] font-medium tracking-tight">Octux</span>
        </Link>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(new CustomEvent('octux:show-auth', { detail: { mode: 'login' } }))
            }
            className="px-3 py-2 text-[13px] font-medium text-white/75 transition-colors hover:text-white sm:px-4"
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(new CustomEvent('octux:show-auth', { detail: { mode: 'signup' } }))
            }
            className="rounded-lg bg-[#e8593c] px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-[#d64d32] sm:px-5"
          >
            Get started
          </button>
        </div>
      </div>
    </header>
  );
}
