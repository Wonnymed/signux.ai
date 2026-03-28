'use client';

export default function ConversationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent/80 to-entity-bioluminescent/60 flex items-center justify-center">
        <span className="text-2xl">🐙</span>
      </div>
      <h2 className="text-lg font-medium text-txt-primary">Something went wrong</h2>
      <p className="text-sm text-txt-tertiary max-w-sm text-center">
        {error.message || 'An unexpected error occurred'}
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors"
        >
          Try again
        </button>
        <a
          href="/"
          className="px-4 py-2 rounded-lg bg-surface-2 text-txt-secondary text-sm font-medium hover:bg-surface-2/80 transition-colors"
        >
          Go home
        </a>
      </div>
    </div>
  );
}
