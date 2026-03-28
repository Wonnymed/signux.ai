/** Shared verdict panel primitives (no hooks). */

export const VERDICT_HEADER = 'text-[10px] font-medium uppercase tracking-[0.2em] text-white/25';

export function VerdictSources({ sources }: { sources?: { title: string; url: string }[] }) {
  if (!sources?.length) return null;
  return (
    <div className="border-t border-white/[0.06] pt-4">
      <p className={VERDICT_HEADER}>Sources</p>
      <ul className="mt-3 space-y-1.5">
        {sources.map((src, i) => (
          <li key={`${src.url}-${i}`}>
            <a
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate text-[12px] text-white/40 transition-colors hover:text-white/65"
            >
              → {src.title || src.url}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function VerdictSectionRule() {
  return <div className="my-5 border-t border-white/[0.08]" aria-hidden />;
}
