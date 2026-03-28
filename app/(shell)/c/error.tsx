'use client';

import { useEffect } from 'react';
import { Sparkles } from 'lucide-react';

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Chat error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1A1815]/80 to-[#4BBEAB]/60 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="text-white/90" size={28} strokeWidth={1.5} aria-hidden />
        </div>
        <h1 className="text-xl font-medium text-white/90 mb-2">Something went wrong</h1>
        <p className="text-sm text-txt-tertiary mb-6">
          {error.message || 'An unexpected error occurred.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded-lg bg-[#1A1815] text-white text-sm font-medium hover:bg-[#1A1815] transition-colors"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="px-5 py-2.5 rounded-lg bg-white/10 text-txt-secondary text-sm hover:bg-white/15 transition-colors"
          >
            Go home
          </button>
        </div>
      </div>
    </div>
  );
}
