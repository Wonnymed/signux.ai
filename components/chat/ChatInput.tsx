'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/design/cn';
import { OctTooltip } from '@/components/ui';

interface ChatInputProps {
  onSend: (message: string, options?: { tier?: string; simulate?: boolean }) => void;
  placeholder?: string;
  loading?: boolean;
  disabled?: boolean;
  isNewConversation?: boolean;
}

const SUGGESTION_CHIPS = [
  { text: 'Should I invest in NVIDIA?', category: 'investment' },
  { text: 'Time to break up or work on it?', category: 'relationships' },
  { text: 'Quit my 9-5 for a startup?', category: 'career' },
  { text: 'Open a restaurant in Gangnam?', category: 'business' },
  { text: 'Move abroad or stay close to family?', category: 'life' },
];

export default function ChatInput({ onSend, placeholder, loading = false, disabled = false, isNewConversation = false }: ChatInputProps) {
  const [value, setValue] = useState('');
  const [tier, setTier] = useState<'ink' | 'deep' | 'kraken'>('ink');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const maxH = 160;
    el.style.height = `${Math.min(el.scrollHeight, maxH)}px`;
    el.style.overflowY = el.scrollHeight > maxH ? 'auto' : 'hidden';
  }, [value]);

  const handleSend = () => {
    if (!value.trim() || loading || disabled) return;
    onSend(value.trim(), { tier });
    setValue('');
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChipClick = (text: string) => {
    setValue(text);
    textareaRef.current?.focus();
  };

  const showChips = !value && !loading && isNewConversation;

  return (
    <div className="shrink-0 border-t border-border-subtle bg-surface-0">
      {/* Suggestion chips (only when empty) */}
      {showChips && (
        <div className="px-4 pt-3 pb-0 max-w-3xl mx-auto w-full">
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTION_CHIPS.map((chip, i) => (
              <button
                key={i}
                onClick={() => handleChipClick(chip.text)}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-full border border-border-subtle',
                  'text-txt-tertiary hover:text-txt-secondary hover:border-border-default hover:bg-surface-1',
                  'transition-all duration-normal ease-out',
                  `stagger-${i + 1} animate-fade-in`,
                )}
              >
                {chip.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="p-4 max-w-3xl mx-auto w-full">
        <div className={cn(
          'flex items-end gap-2 rounded-xl border bg-surface-1 transition-all duration-normal',
          'focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/20',
          loading ? 'border-border-subtle opacity-70' : 'border-border-default',
        )}>
          {/* Tier selector */}
          <div className="pl-3 pb-2.5 pt-2.5 shrink-0">
            <TierPills tier={tier} onChange={setTier} disabled={loading} />
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            data-chat-input
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || 'What decision are you facing?'}
            disabled={loading || disabled}
            rows={1}
            className={cn(
              'flex-1 bg-transparent text-sm text-txt-primary placeholder:text-txt-disabled',
              'outline-none resize-none py-2.5 min-h-[20px]',
              'disabled:cursor-not-allowed',
            )}
          />

          {/* Send / Simulate buttons */}
          <div className="pr-2 pb-2 flex items-center gap-1 shrink-0">
            {tier !== 'ink' && value.trim() && (
              <OctTooltip content={`Run ${tier === 'deep' ? 'Deep' : 'Kraken'} Simulation`} placement="top">
                <button
                  onClick={() => { if (value.trim()) onSend(value.trim(), { tier, simulate: true }); setValue(''); }}
                  disabled={loading}
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-normal',
                    tier === 'deep' ? 'bg-accent-muted text-accent hover:bg-accent-glow' : 'bg-tier-kraken/15 text-tier-kraken hover:bg-tier-kraken/25',
                    loading && 'opacity-40 pointer-events-none',
                  )}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                    <path d="M7 1L2 4v4l5 3 5-3V4L7 1z" opacity="0.3" />
                    <path d="M7 3L4 5v3l3 2 3-2V5L7 3z" />
                  </svg>
                </button>
              </OctTooltip>
            )}

            <button
              onClick={handleSend}
              disabled={!value.trim() || loading}
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-normal',
                value.trim() && !loading
                  ? 'bg-accent text-white hover:bg-accent-hover'
                  : 'bg-surface-2 text-txt-disabled',
              )}
            >
              {loading ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                  <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M7 12V2M3 6l4-4 4 4" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Bottom hint */}
        <div className="flex items-center justify-center mt-2">
          <span className="text-micro text-txt-disabled">
            Enter to send · Shift+Enter for new line{tier !== 'ink' && ' · ⚡ to simulate'}
          </span>
        </div>
      </div>
    </div>
  );
}

// --- Tier selector pills ---
function TierPills({ tier, onChange, disabled }: { tier: string; onChange: (t: 'ink' | 'deep' | 'kraken') => void; disabled: boolean }) {
  const tiers = [
    { id: 'ink' as const, label: 'Ink', tooltip: 'Quick chat (Haiku)' },
    { id: 'deep' as const, label: 'Deep', tooltip: '10 agents debate (Sonnet)' },
    { id: 'kraken' as const, label: 'Kraken', tooltip: '3 scenarios + crowd (Opus)' },
  ];

  return (
    <div className="flex items-center gap-0.5 p-0.5 bg-surface-2 rounded-md">
      {tiers.map(t => (
        <OctTooltip key={t.id} content={t.tooltip} placement="top" delay={400}>
          <button
            onClick={() => !disabled && onChange(t.id)}
            disabled={disabled}
            className={cn(
              'px-2.5 py-1 text-xs font-medium rounded-sm transition-all duration-normal',
              tier === t.id
                ? t.id === 'ink' ? 'bg-surface-raised text-txt-primary shadow-xs'
                  : t.id === 'deep' ? 'bg-accent-muted text-accent shadow-xs'
                  : 'bg-[#00e5ff]/10 text-[#00e5ff] shadow-xs'
                : 'text-txt-tertiary hover:text-txt-secondary',
            )}
          >
            {t.label}
          </button>
        </OctTooltip>
      ))}
    </div>
  );
}
