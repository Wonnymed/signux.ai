'use client';

import { useState } from 'react';
import { cn } from '@/lib/design/cn';

const SUGGESTION_CHIPS = [
  'Should I invest in NVIDIA?',
  'Time to break up or work on it?',
  'Quit my 9-5 for a startup?',
  'Open a restaurant in Gangnam?',
  'Move abroad or stay close to family?',
];

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

    // Save question as backup
    try { localStorage.setItem('octux_pending_question', input.trim().substring(0, 200)); } catch {}
    onSignIn();
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-20 pb-16">
      {/* Background: subtle neural pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 oct-entity-bg opacity-30" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-accent/[0.03] blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto text-center">
        {/* Entity visual */}
        <div className="relative mb-8 flex justify-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent/80 to-entity-bioluminescent/60 animate-breathe entity-ring flex items-center justify-center">
            <span className="text-3xl">&#x1F419;</span>
          </div>
        </div>

        {/* Wordmark */}
        <h1 className="text-4xl sm:text-5xl text-txt-primary mb-3 font-light tracking-[0.15em] lowercase">octux</h1>

        {/* Tagline */}
        <p className="text-lg sm:text-xl text-txt-secondary mb-10 font-light tracking-wide">
          Never decide alone again
        </p>

        {/* Functional input */}
        <div className="max-w-lg mx-auto mb-6">
          <div className={cn(
            'flex items-center rounded-xl border bg-surface-1 transition-all duration-normal',
            'focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/20',
            'border-border-default',
          )}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
              placeholder="What decision are you facing?"
              className={cn(
                'flex-1 bg-transparent text-sm sm:text-base text-txt-primary placeholder:text-txt-disabled',
                'outline-none py-3.5 px-5',
              )}
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim()}
              className={cn(
                'mr-2 w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-normal shrink-0',
                input.trim()
                  ? 'bg-accent text-white hover:bg-accent-hover'
                  : 'bg-surface-2 text-txt-disabled',
              )}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M7 12V2M3 6l4-4 4 4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Consent message */}
        {showConsent && (
          <p className="text-xs text-txt-secondary mb-4 animate-fade-in">
            Press Enter to create a free account and start your analysis.
            <span className="text-txt-disabled"> No credit card required.</span>
          </p>
        )}

        {/* Suggestion chips */}
        <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
          {SUGGESTION_CHIPS.map((chip, i) => (
            <button
              key={i}
              onClick={() => setInput(chip)}
              className={cn(
                'px-3 py-1.5 text-xs rounded-full border border-border-subtle',
                'text-txt-tertiary hover:text-txt-secondary hover:border-border-default hover:bg-surface-1',
                'transition-all duration-normal',
                `stagger-${i + 1} animate-fade-in`,
              )}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Sub-tagline */}
        <p className="text-micro text-txt-disabled mt-8">
          10 AI specialists debate your decisions &middot; Free to start
        </p>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-txt-disabled">
          <path d="M10 4v12M6 12l4 4 4-4" />
        </svg>
      </div>
    </section>
  );
}
