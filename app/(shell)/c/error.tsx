'use client';

import { useEffect } from 'react';

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
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#7c3aed]/80 to-[#00e5ff]/60 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🐙</span>
        </div>
        <h1 className="text-xl font-medium text-white/90 mb-2">Something went wrong</h1>
        <p className="text-sm text-white/50 mb-6">
          {error.message || 'An unexpected error occurred.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded-lg bg-[#7c3aed] text-white text-sm font-medium hover:bg-[#6d28d9] transition-colors"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="px-5 py-2.5 rounded-lg bg-white/10 text-white/70 text-sm hover:bg-white/15 transition-colors"
          >
            Go home
          </button>
        </div>
      </div>
    </div>
  );
}
