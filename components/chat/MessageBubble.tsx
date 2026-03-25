'use client';

import { cn } from '@/lib/design/cn';
import { OctAvatar, OctBadge } from '@/components/ui';

interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  tier?: string;
  agentName?: string;
  agentCategory?: string;
  agentIndex?: number;
  streaming?: boolean;
  timestamp?: string;
}

export default function MessageBubble({
  role, content, tier, agentName, agentCategory, agentIndex,
  streaming = false, timestamp,
}: MessageBubbleProps) {
  if (role === 'user') {
    return (
      <div className="flex justify-end mb-4 animate-fade-in">
        <div className="max-w-[85%] flex flex-col items-end gap-1">
          <div className={cn(
            'px-4 py-2.5 rounded-2xl rounded-br-md',
            'bg-accent text-white text-sm leading-relaxed',
          )}>
            <MessageContent content={content} />
          </div>
          {tier && tier !== 'ink' && (
            <OctBadge tier={tier as any} size="xs">{tier}</OctBadge>
          )}
        </div>
      </div>
    );
  }

  if (role === 'system') {
    return (
      <div className="flex justify-center mb-3 animate-fade-in">
        <span className="text-micro text-txt-disabled bg-surface-1 px-3 py-1 rounded-full">
          {content}
        </span>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex gap-3 mb-4 animate-fade-in">
      <div className="shrink-0 mt-1">
        {agentName ? (
          <OctAvatar
            type="agent"
            category={(agentCategory as any) || 'life'}
            agentIndex={agentIndex || 0}
            name={agentName}
            size="sm"
          />
        ) : (
          <OctAvatar type="entity" state="dormant" size="sm" />
        )}
      </div>
      <div className="min-w-0 max-w-[85%]">
        {agentName && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-txt-primary">{agentName}</span>
          </div>
        )}
        <div className={cn(
          'text-sm text-txt-primary leading-relaxed',
          'prose prose-sm prose-invert max-w-none',
          'prose-p:my-1.5 prose-headings:text-txt-primary prose-strong:text-txt-primary',
          'prose-code:text-accent prose-code:bg-surface-2 prose-code:px-1 prose-code:rounded-sm prose-code:text-xs',
          'prose-a:text-accent prose-a:no-underline hover:prose-a:underline',
        )}>
          <MessageContent content={content} />
          {streaming && <span className="inline-block w-0.5 h-4 bg-accent animate-pulse-accent ml-0.5 align-text-bottom" />}
        </div>
      </div>
    </div>
  );
}

// Simple markdown-ish rendering (bold, code, links)
function MessageContent({ content }: { content: string }) {
  // Basic rendering — full markdown can be added via react-markdown later
  const parts = content.split(/(\*\*.*?\*\*|`.*?`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return <code key={i} className="bg-surface-2 px-1 rounded-sm text-xs text-accent">{part.slice(1, -1)}</code>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
