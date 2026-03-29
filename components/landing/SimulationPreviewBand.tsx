'use client';

/**
 * Static CSS recreation of the dark specialist canvas (nodes + glow + particles).
 * Light landing → dark band for contrast; not the live SimulationCanvas.
 */
export default function SimulationPreviewBand() {
  const nodes = [
    { a: -90, r: 38, c: '#4ade80', g: 'rgba(74,222,128,0.12)' },
    { a: -54, r: 34, c: '#fbbf24', g: 'rgba(251,191,36,0.12)' },
    { a: -18, r: 36, c: '#4ade80', g: 'rgba(74,222,128,0.1)' },
    { a: 18, r: 32, c: '#f87171', g: 'rgba(248,113,113,0.12)' },
    { a: 54, r: 35, c: '#4ade80', g: 'rgba(74,222,128,0.1)' },
    { a: 90, r: 33, c: '#fbbf24', g: 'rgba(251,191,36,0.11)' },
    { a: 126, r: 31, c: '#4ade80', g: 'rgba(74,222,128,0.09)' },
    { a: 162, r: 36, c: '#fbbf24', g: 'rgba(251,191,36,0.1)' },
    { a: 198, r: 34, c: '#4ade80', g: 'rgba(74,222,128,0.1)' },
    { a: 234, r: 32, c: '#4ade80', g: 'rgba(74,222,128,0.09)' },
  ];

  const rad = (deg: number) => (deg * Math.PI) / 180;

  return (
    <div
      role="region"
      aria-label="Simulation dashboard preview"
      className="border-y border-white/[0.06] py-14 sm:py-20"
      style={{
        background: 'linear-gradient(180deg, #06060a 0%, #0c0c12 45%, #08080e 100%)',
      }}
    >
      <div className="mx-auto max-w-landing px-6">
        <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-white/35">
          Inside the product
        </p>
        <h2 className="mt-2 text-center text-xl font-medium text-white/90 sm:text-2xl">
          Not a chat thread — a live simulation canvas
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-white/45">
          Specialists position on a ring, edges show agreement and tension, and market voices animate in the background.
        </p>

        <div className="relative mx-auto mt-10 aspect-[16/10] w-full max-w-4xl overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0a0f] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          {/* Ambient particles */}
          <div className="pointer-events-none absolute inset-0">
            {Array.from({ length: 48 }).map((_, i) => (
              <span
                key={i}
                className="absolute rounded-full bg-white/[0.07]"
                style={{
                  width: 2 + (i % 4),
                  height: 2 + (i % 4),
                  left: `${(i * 17) % 100}%`,
                  top: `${(i * 23) % 100}%`,
                  opacity: 0.15 + (i % 5) * 0.08,
                }}
              />
            ))}
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            {/* Edges (decorative) */}
            <svg className="absolute h-[78%] w-[78%] text-white/[0.08]" viewBox="0 0 200 200" aria-hidden>
              <line x1="100" y1="100" x2="162" y2="38" stroke="currentColor" strokeWidth="0.6" />
              <line x1="100" y1="100" x2="38" y2="62" stroke="currentColor" strokeWidth="0.6" />
              <line x1="100" y1="100" x2="62" y2="162" stroke="currentColor" strokeWidth="0.5" />
              <line x1="100" y1="100" x2="168" y2="120" stroke="currentColor" strokeWidth="0.5" />
              <line x1="100" y1="100" x2="48" y2="118" stroke="rgba(248,113,113,0.25)" strokeWidth="0.5" />
            </svg>

            {/* Ring nodes */}
            {nodes.map((n, i) => {
              const x = 50 + Math.cos(rad(n.a)) * 32;
              const y = 50 + Math.sin(rad(n.a)) * 32;
              return (
                <div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: n.r,
                    height: n.r,
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: 'translate(-50%, -50%)',
                    background: `radial-gradient(circle at 30% 30%, ${n.c}, ${n.c}99)`,
                    boxShadow: `0 0 0 10px ${n.g}, 0 0 24px ${n.g}`,
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                />
              );
            })}

            {/* Center consensus */}
            <div
              className="relative flex h-[22%] min-h-[72px] w-[22%] min-w-[72px] items-center justify-center rounded-full"
              style={{
                background: 'radial-gradient(circle at 50% 40%, rgba(232,89,60,0.35), rgba(232,89,60,0.08))',
                boxShadow: '0 0 0 12px rgba(232,89,60,0.06), inset 0 0 20px rgba(232,89,60,0.15)',
                border: '1px solid rgba(232,89,60,0.25)',
              }}
            >
              <span className="text-lg font-semibold tabular-nums text-white/95 sm:text-xl">72%</span>
            </div>
          </div>

          <p className="absolute bottom-3 left-0 right-0 text-center text-[10px] uppercase tracking-wider text-white/30">
            Illustration — not live data
          </p>
        </div>
      </div>
    </div>
  );
}
