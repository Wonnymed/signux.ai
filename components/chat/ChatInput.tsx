'use client';

import { useRef, useEffect, useCallback, useState, type KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, Lock, Zap } from 'lucide-react';
import { cn } from '@/lib/design/cn';
import { useChatStore } from '@/lib/store/chat';
import { useBillingStore } from '@/lib/store/billing';
import { TIER_CONFIGS, type ModelTier } from '@/lib/chat/tiers';
import { TOKEN_COSTS } from '@/lib/billing/tiers';
import { SUGGESTION_CHIP_CONFIG } from '@/lib/design/suggestionChips';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/shadcn/tooltip';

interface ChatInputProps {
  /** Legacy prop — called on send if provided (used by pages that manage their own state) */
  onSend?: (message: string, options?: { tier?: string; simulate?: boolean }) => void;
  /** Zustand-connected: auto-sends via useChatStore.sendMessage */
  conversationId?: string;
  /** Show suggestion chips (for empty / new conversations) */
  showSuggestions?: boolean;
  /** @deprecated use showSuggestions */
  isNewConversation?: boolean;
  placeholder?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

const MAX_ROWS = 6;
const LINE_HEIGHT = 22;

export default function ChatInput({
  onSend,
  conversationId,
  showSuggestions,
  isNewConversation,
  placeholder = 'What decision are you facing?',
  loading: externalLoading,
  disabled = false,
  className,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectedTier = useChatStore((s) => s.selectedTier);
  const setSelectedTier = useChatStore((s) => s.setSelectedTier);
  const storeSending = useChatStore((s) => s.sending);
  const storeSendMessage = useChatStore((s) => s.sendMessage);

  const tokensRemaining = useBillingStore((s) => s.tokensRemaining);
  const canAfford = useBillingStore((s) => s.canAfford);

  const [value, setValue] = useState('');
  const [hasContent, setHasContent] = useState(false);
  const sending = externalLoading ?? storeSending;
  const chips = showSuggestions ?? isNewConversation ?? false;

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const maxHeight = LINE_HEIGHT * MAX_ROWS;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, []);

  useEffect(() => { autoResize(); }, [value, autoResize]);

  const handleSend = useCallback(() => {
    const message = value.trim();
    if (!message || sending || disabled) return;

    if (onSend) {
      onSend(message, { tier: selectedTier });
    } else if (conversationId) {
      storeSendMessage(conversationId, message);
    }

    setValue('');
    setHasContent(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, sending, disabled, selectedTier, onSend, conversationId, storeSendMessage]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleChipClick = useCallback(
    (text: string) => {
      if (sending) return;
      if (onSend) {
        onSend(text, { tier: selectedTier });
      } else {
        setValue(text);
        setHasContent(true);
        textareaRef.current?.focus();
      }
    },
    [selectedTier, onSend, sending],
  );

  const handleTierClick = useCallback(
    (tier: ModelTier) => {
      if (tier === 'ink') {
        setSelectedTier(tier);
        return;
      }
      const simType = tier === 'kraken' ? 'kraken' : 'deep';
      if (!canAfford(simType)) {
        window.dispatchEvent(
          new CustomEvent('octux:show-upgrade', {
            detail: {
              suggestedTier: tier === 'kraken' ? 'max' : 'pro',
              reason: `Need ${TOKEN_COSTS[simType]} token${TOKEN_COSTS[simType] > 1 ? 's' : ''} for ${TIER_CONFIGS[tier].label}`,
            },
          }),
        );
        return;
      }
      setSelectedTier(tier);
    },
    [canAfford, setSelectedTier],
  );

  useEffect(() => {
    const timer = setTimeout(() => textareaRef.current?.focus(), 200);
    return () => clearTimeout(timer);
  }, [conversationId]);

  return (
    <div className={cn('shrink-0 border-t border-border-subtle bg-surface-0', className)}>
      <AnimatePresence>
        {chips && !hasContent && !sending && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="px-4 pt-3 pb-0 max-w-3xl mx-auto w-full"
          >
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTION_CHIP_CONFIG.map((chip, i) => {
                const Icon = chip.Icon;
                return (
                  <motion.button
                    key={chip.text}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.04 }}
                    onClick={() => handleChipClick(chip.text)}
                    disabled={sending}
                    type="button"
                    className={cn(
                      'group flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-200',
                      'border-white/[0.06] bg-white/[0.02]',
                      'hover:bg-white/[0.05] hover:border-white/[0.12] active:scale-[0.98]',
                      'disabled:opacity-40 disabled:cursor-not-allowed',
                    )}
                  >
                    <Icon
                      size={13}
                      className="opacity-35 group-hover:opacity-100 transition-opacity shrink-0"
                      style={{ color: chip.color }}
                    />
                    <span className="text-[13px] text-white/50 group-hover:text-white/75 transition-colors">
                      {chip.text}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 max-w-3xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="space-y-2"
        >
          {/* Large input — primary focus */}
          <div
            className={cn(
              'relative rounded-2xl border transition-all duration-200',
              'bg-[#111118] border-white/[0.06]',
              'shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
              'focus-within:border-accent/30 focus-within:shadow-lg focus-within:shadow-accent/5',
              'hover:border-white/[0.10]',
              sending && 'opacity-70 pointer-events-none',
            )}
          >
            <textarea
              ref={textareaRef}
              data-chat-input
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                const newHas = e.target.value.trim().length > 0;
                if (newHas !== hasContent) setHasContent(newHas);
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={sending || disabled}
              rows={1}
              className={cn(
                'w-full min-h-[52px] max-h-[120px] resize-none bg-transparent',
                'px-5 py-3.5 pr-14 text-[15px] text-white/90 placeholder:text-white/25',
                'outline-none',
                'disabled:cursor-not-allowed disabled:opacity-50',
              )}
              style={{
                lineHeight: `${LINE_HEIGHT}px`,
                overflow: 'hidden',
              }}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!hasContent || sending || disabled}
              className={cn(
                'absolute right-3 bottom-3 w-8 h-8 rounded-xl flex items-center justify-center transition-colors',
                hasContent && !sending
                  ? 'bg-accent text-white hover:bg-accent-hover'
                  : 'bg-surface-2 text-txt-disabled',
                (sending || disabled) && 'opacity-50 cursor-not-allowed',
              )}
            >
              {sending ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Zap size={16} />
                </motion.div>
              ) : (
                <ArrowUp size={16} strokeWidth={2.5} />
              )}
            </button>
          </div>

          {/* Tier row — separate from input */}
          <TooltipProvider delayDuration={300}>
            <div className="flex items-center justify-center gap-1 flex-wrap">
              {(['ink', 'deep', 'kraken'] as const).map((tier) => {
                const config = TIER_CONFIGS[tier];
                const isActive = selectedTier === tier;
                const cost = tier === 'ink' ? 0 : TOKEN_COSTS[tier === 'kraken' ? 'kraken' : 'deep'];
                const locked = cost > 0 && !canAfford(tier === 'kraken' ? 'kraken' : 'deep');

                return (
                  <Tooltip key={tier}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => handleTierClick(tier)}
                        disabled={sending}
                        className={cn(
                          'flex items-center gap-1 px-3 py-1 rounded-full text-xs transition-all',
                          isActive
                            ? 'bg-white/[0.08] text-white/80'
                            : locked
                              ? 'text-white/20 cursor-not-allowed opacity-50'
                              : 'text-white/30 hover:text-white/50',
                        )}
                      >
                        {config.label}
                        {cost > 0 && (
                          <span className={cn('text-[10px] tabular-nums text-white/20', isActive && 'text-white/35')}>
                            {cost}t
                          </span>
                        )}
                        {locked && <Lock size={9} className="opacity-60" />}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs max-w-48">
                      <p className="font-medium">{config.label}</p>
                      <p className="text-txt-tertiary">{config.description}</p>
                      {locked && (
                        <p className="text-verdict-delay mt-1">
                          Need {cost} token{cost > 1 ? 's' : ''} · {tokensRemaining} remaining
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
        </motion.div>

        <div className="flex items-center justify-between mt-1.5 px-1">
          <span className="text-micro text-txt-disabled">
            Enter to send · Shift+Enter for new line
          </span>
          {selectedTier !== 'ink' && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1 text-micro text-txt-disabled"
            >
              <Zap size={9} className="text-accent" />
              {TOKEN_COSTS[selectedTier === 'kraken' ? 'kraken' : 'deep']} token
              {TOKEN_COSTS[selectedTier === 'kraken' ? 'kraken' : 'deep'] > 1 ? 's' : ''} per sim
            </motion.span>
          )}
        </div>
      </div>
    </div>
  );
}
