'use client';

import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '@/lib/design/cn';
import { Plus, ArrowUp, Paperclip, Camera, FolderPlus, Globe, Bot, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/shadcn/dropdown-menu';

type Tier = 'ink' | 'deep' | 'kraken';

const AGENT_CATEGORIES = [
  'Business',
  'Finance',
  'Operations',
  'Market',
  'Risk',
  'People',
] as const;

interface HomeComposerProps {
  onSend: (message: string, options?: { tier?: string; simulate?: boolean }) => void;
  loading?: boolean;
}

export default function HomeComposer({ onSend, loading = false }: HomeComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [tier, setTier] = useState<Tier>('ink');
  const [webSearch, setWebSearch] = useState(true);
  const [agentCategory, setAgentCategory] = useState<(typeof AGENT_CATEGORIES)[number]>('Business');

  const canSend = useMemo(() => message.trim().length > 0 && !loading, [message, loading]);

  function send() {
    if (!canSend) return;
    onSend(message.trim(), { tier });
    setMessage('');
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="mx-auto w-full max-w-[930px]">
      <input ref={fileInputRef} type="file" multiple className="hidden" />
      <div className="rounded-[22px] border border-border-subtle bg-surface-raised shadow-premium">
        <textarea
          data-chat-input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          placeholder="How can I help you today?"
          className="w-full resize-none rounded-t-[22px] bg-transparent px-7 pb-2 pt-6 text-[18px] leading-[1.5] text-txt-primary outline-none placeholder:text-txt-tertiary/90"
        />

        <div className="flex items-center justify-between px-5 pb-4 pt-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-radius-lg border border-border-subtle bg-surface-1 text-txt-secondary transition-colors hover:text-txt-primary"
                aria-label="Composer tools"
              >
                <Plus size={22} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              side="top"
              className="w-[320px] rounded-radius-xl border-border-default bg-surface-raised shadow-premium"
            >
              <DropdownMenuItem
                className="gap-2 text-sm"
                onSelect={(e) => {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }}
              >
                <Paperclip size={16} />
                Add files or photos
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-sm">
                <Camera size={16} />
                Take a screenshot
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-sm">
                <FolderPlus size={16} />
                Add to project
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-txt-tertiary">Research</DropdownMenuLabel>
              <DropdownMenuItem
                className="gap-2 text-sm"
                onSelect={(e) => {
                  e.preventDefault();
                  setWebSearch((v) => !v);
                }}
              >
                <Globe size={16} />
                Web search
                <span className="ml-auto text-xs text-txt-tertiary">{webSearch ? 'On' : 'Off'}</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-txt-tertiary">Agents</DropdownMenuLabel>
              {AGENT_CATEGORIES.map((cat) => (
                <DropdownMenuItem
                  key={cat}
                  className="gap-2 text-sm"
                  onSelect={(e) => {
                    e.preventDefault();
                    setAgentCategory(cat);
                  }}
                >
                  <Bot size={16} />
                  {cat}
                  {agentCategory === cat && <span className="ml-auto text-xs text-accent">Selected</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-radius-lg px-3 py-2 text-sm text-txt-secondary hover:text-txt-primary"
            >
              {tier === 'ink' ? 'Ink' : tier === 'deep' ? 'Deep' : 'Kraken'}
              <ChevronDown size={16} />
            </button>
            <div className="flex items-center rounded-radius-lg border border-border-subtle bg-surface-1 p-1">
              {(['ink', 'deep', 'kraken'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTier(t)}
                  className={cn(
                    'rounded-radius-md px-2.5 py-1 text-xs font-medium transition-colors',
                    tier === t ? 'bg-accent text-txt-on-accent' : 'text-txt-secondary hover:text-txt-primary',
                  )}
                >
                  {t === 'ink' ? 'Ink' : t === 'deep' ? 'Deep' : 'Kraken'}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={send}
              disabled={!canSend}
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-radius-lg transition-colors',
                canSend ? 'bg-accent text-txt-on-accent hover:bg-accent-hover' : 'bg-surface-2 text-txt-disabled',
              )}
              aria-label="Send message"
            >
              <ArrowUp size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
