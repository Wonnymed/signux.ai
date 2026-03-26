'use client';

import { useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/design/cn';
import { SUGGESTION_CHIP_CONFIG } from '@/lib/design/suggestionChips';

interface HeroSectionProps {
  onSignIn: () => void;
}

export default function HeroSection({ onSignIn }: HeroSectionProps) {
  const [input, setInput] = useState('');
  const [showConsent, setShowConsent] = useState(false);

  const handleSubmit = () => {
    if (!input.trim()) return;

    if (!showConsent) {
      setShowConsent(true);
      return;
    }

    try { localStorage.setItem('octux_pending_question', input.trim().substring(0, 200)); } catch {}
    onSignIn();
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-20 pb-24">
      <div className="hero-glow" aria-hidden />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 oct-entity-bg opacity-30" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-accent/[0.03] blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto text-center">
        <div className="relative mb-10 flex justify-center">
          <div className="absolute inset-0 rounded-full bg-accent/10 blur-2xl scale-150 animate-pulse pointer-events-none" aria-hidden />
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-accent/70 via-purple-500/50 to-cyan-500/30 p-[2px] shadow-lg shadow-black/30">
            <div className="w-full h-full rounded-full bg-[var(--surface-0)] flex items-center justify-center">
              <span className="text-3xl">&#x1F419;</span>
            </div>
          </div>
        </div>

        <h1 className="text-4xl sm:text-5xl text-txt-primary mb-3 font-light tracking-[0.15em] lowercase">octux</h1>

        <p className="text-lg sm:text-xl text-txt-secondary mb-10 font-light tracking-wide">
          Never decide alone again
        </p>

        <div className="max-w-lg mx-auto mb-6">
          <div
            className={cn(
              'relative rounded-2xl border transition-all duration-200',
              'bg-[#111118] border-white/[0.06]',
              'shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
              'focus-within:border-accent/30 focus-within:shadow-lg focus-within:shadow-accent/5',
              'hover:border-white/[0.10]',
            )}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
              placeholder="What decision are you facing?"
              className={cn(
                'w-full bg-transparent text-sm sm:text-[15px] text-white/90 placeholder:text-white/25',
                'outline-none py-3.5 pl-5 pr-14 rounded-2xl',
              )}
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!input.trim()}
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-normal',
                input.trim()
                  ? 'bg-accent text-white hover:bg-accent-hover'
                  : 'bg-surface-2 text-txt-disabled',
              )}
            >
              <ArrowUp size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {showConsent && (
          <p className="text-xs text-txt-secondary mb-4 animate-fade-in">
            Press Enter to create a free account and start your analysis.
            <span className="text-txt-disabled"> No credit card required.</span>
          </p>
        )}

        <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
          {SUGGESTION_CHIP_CONFIG.map((chip, i) => {
            const Icon = chip.Icon;
            return (
              <button
                key={chip.text}
                type="button"
                onClick={() => setInput(chip.text)}
                className={cn(
                  'group flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-200',
                  'border-white/[0.06] bg-white/[0.02]',
                  'hover:bg-white/[0.05] hover:border-white/[0.12]',
                  `stagger-${i + 1} animate-fade-in`,
                )}
              >
                <Icon size={13} className="opacity-35 group-hover:opacity-100 transition-opacity shrink-0" style={{ color: chip.color }} />
                <span className="text-[13px] text-white/50 group-hover:text-white/75 text-left">
                  {chip.text}
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-micro text-txt-disabled mt-10">
          10 AI specialists debate your decisions &middot; Free to start
        </p>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-txt-disabled">
          <path d="M10 4v12M6 12l4 4 4-4" />
        </svg>
      </div>
    </section>
  );
}
