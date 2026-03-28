'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/design/cn';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Lightweight Markdown renderer for assistant messages.
 * Handles: **bold**, *italic*, `code`, ```code blocks```, - lists, 1. ordered lists, [links](url), headings
 *
 * Does NOT use react-markdown (heavy dependency). Can upgrade later if needed.
 */
export default function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const html = useMemo(() => parseMarkdown(content), [content]);

  return (
    <div
      className={cn('octux-markdown', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function parseMarkdown(text: string): string {
  if (!text) return '';

  let html = escapeHtml(text);

  // Horizontal rules: --- or *** or ___ (on their own line)
  html = html.replace(/^---\s*$/gm, '<hr class="my-4 border-t border-border-subtle" />');
  html = html.replace(/^\*\*\*\s*$/gm, '<hr class="my-4 border-t border-border-subtle" />');
  html = html.replace(/^___\s*$/gm, '<hr class="my-4 border-t border-border-subtle" />');

  // Code blocks (```...```)
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_match, _lang, code) => {
    return `<pre class="my-2 overflow-x-auto rounded-lg border border-border-subtle bg-surface-2 p-3"><code class="text-xs font-mono text-txt-primary">${code.trim()}</code></pre>`;
  });

  // Inline code (`...`)
  html = html.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-surface-2 text-xs font-mono text-accent">$1</code>');

  // Bold (**...**)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-txt-primary">$1</strong>');

  // Italic (*...*)
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em class="italic text-txt-secondary">$1</em>');

  // Links [text](url) — only allow http/https
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-accent hover:underline">$1</a>');

  // Headings (### → h4, ## → h3, # → h2)
  html = html.replace(/^### (.+)$/gm, '<h4 class="font-medium text-txt-primary mt-2 mb-1 text-sm">$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3 class="font-semibold text-txt-primary mt-3 mb-1.5 text-sm">$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h2 class="font-semibold text-txt-primary mt-4 mb-2 text-base">$1</h2>');

  // Unordered lists (- item)
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-txt-primary">$1</li>');

  // Ordered lists (1. item)
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-txt-primary">$1</li>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li[^>]*>.*<\/li>\s*)+)/g, '<ul class="my-2 space-y-0.5">$1</ul>');

  // Paragraphs (double newline)
  html = html.replace(/\n\n/g, '</p><p class="mb-2 text-txt-primary">');

  // Single newlines
  html = html.replace(/\n/g, '<br />');

  // Wrap in paragraph if not already wrapped
  if (!html.startsWith('<')) {
    html = `<p class="mb-2 text-txt-primary">${html}</p>`;
  }

  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
