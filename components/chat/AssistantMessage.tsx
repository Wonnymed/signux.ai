'use client';

import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/design/cn';
import MarkdownRenderer from './MarkdownRenderer';
import DisclaimerBanner from './DisclaimerBanner';

interface AssistantMessageProps {
  content: string;
  tier?: string;
  disclaimer?: string;
  isCode?: boolean;
}

export default function AssistantMessage({ content, disclaimer, isCode }: AssistantMessageProps) {
  return (
    <div className="mb-4 flex w-full flex-col items-start">
      <div className="flex items-start gap-3 max-w-[min(85%,42rem)] w-full">
        <div
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border-default bg-gradient-to-br from-surface-3 to-surface-2 shadow-sm shadow-black/20"
          aria-hidden
        >
          <Sparkles className="h-3.5 w-3.5 text-txt-secondary" strokeWidth={2} aria-hidden />
        </div>
        <div
          className={cn(
            'min-w-0 flex-1 rounded-2xl rounded-bl-sm border border-border-subtle px-4 py-3',
            'bg-surface-raised text-[14px] leading-relaxed text-txt-primary shadow-sm shadow-black/20 dark:bg-surface-1',
          )}
        >
          {isCode ? (
            <pre className="text-xs text-txt-secondary font-mono whitespace-pre-wrap overflow-x-auto">
              {content}
            </pre>
          ) : (
            <MarkdownRenderer content={content} />
          )}
        </div>
      </div>

      {disclaimer && <DisclaimerBanner text={disclaimer} className="mt-2 ml-10" />}
    </div>
  );
}
