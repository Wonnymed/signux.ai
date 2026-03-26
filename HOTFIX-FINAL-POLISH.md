# HOTFIX — Final Visual Polish (5 fixes in 1)

## Context for AI

You are working on Octux AI. The core product is now functional and visually acceptable. These are the LAST visual fixes before continuing the roadmap.

**Current state (confirmed via Chrome DevTools):**
- ✅ Chat end-to-end works
- ✅ Assistant bubble visible with bg + border + padding
- ✅ Marketing sections scroll below fold
- ✅ Hero above the fold with chips + input
- ✅ Sidebar with conversations

**5 remaining issues to fix:**

---

## FIX 1 — Wordmark: "OCTUX AI" → "octux" lowercase + tagline

The hero shows "OCTUX AI" in large bold uppercase. It should be:
- "octux" — lowercase, light font weight, letter-spacing
- Below it: "Never decide alone again" — small, tertiary color

Find the wordmark in the hero section of the root page component (`app/(shell)/page.tsx` or wherever the hero renders).

**BEFORE:**
```
OCTUX AI
```

**AFTER:**
```
octux
Never decide alone again
```

**Code change:**

```typescript
// Find the heading/title that says "OCTUX AI" and replace with:
<h1 className="text-2xl font-light tracking-[0.15em] text-txt-primary lowercase">
  octux
</h1>
<p className="text-sm text-txt-tertiary mt-1">
  Never decide alone again
</p>
```

If the current code has something like:
```typescript
<h1 className="text-3xl font-bold ...">OCTUX AI</h1>
```

Replace with the lighter, lowercase version above.

---

## FIX 2 — Sidebar conversation icons: □ → proper indicators

Sidebar conversation items show □ (empty square outlines from Lucide `Square` icon). They should show:

- Chat-only conversations: `MessageSquare` icon (Lucide), dimmed
- Conversations with verdict: colored dot (🟢🟡🔴 as CSS circles, NOT emojis)
- Pinned: `Pin` icon (Lucide)

Find the sidebar conversation item renderer. Look for where the icon/indicator is rendered next to conversation titles.

**Replace the icon logic:**

```typescript
import { MessageSquare, Pin } from 'lucide-react';

function ConversationIcon({ convo }: { convo: any }) {
  // Pinned
  if (convo.is_pinned) {
    return <Pin size={14} className="text-accent shrink-0" />;
  }
  
  // Has simulation with verdict → colored dot
  if (convo.has_simulation && convo.latest_verdict) {
    const colorMap: Record<string, string> = {
      proceed: 'bg-verdict-proceed',
      delay: 'bg-verdict-delay',
      abandon: 'bg-verdict-abandon',
    };
    return (
      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${colorMap[convo.latest_verdict] || 'bg-txt-disabled'}`} />
    );
  }
  
  // Chat only → message icon
  return <MessageSquare size={14} className="text-icon-secondary opacity-50 shrink-0" />;
}
```

**Search for the current icon code:**
```bash
grep -rn "Square\|□\|convo.*icon\|conversation.*icon" components/sidebar/ components/chat/ConversationSidebar
```

If it's using `Square` from Lucide, replace with `MessageSquare`.
If it's using a `<span>` with □ character, replace with the logic above.

---

## FIX 3 — Markdown `---` as `<hr>` separator

The markdown parser doesn't handle horizontal rules. Find the markdown renderer:

```bash
grep -rn "parseMarkdown\|MarkdownRenderer\|octux-markdown" components/chat/
```

**Add horizontal rule parsing BEFORE the paragraph processing:**

```typescript
// Add this line in the parseMarkdown function:
// BEFORE any other replacements that deal with newlines:

// Horizontal rules: --- or *** or ___ (on their own line)
html = html.replace(/^---\s*$/gm, '<hr class="my-4 border-t border-border-subtle" />');
html = html.replace(/^\*\*\*\s*$/gm, '<hr class="my-4 border-t border-border-subtle" />');
html = html.replace(/^___\s*$/gm, '<hr class="my-4 border-t border-border-subtle" />');
```

**Add CSS for hr inside markdown blocks. In `globals.css`:**

```css
.octux-markdown hr {
  margin: 16px 0;
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
```

---

## FIX 4 — Sub-tagline under input missing

The root page used to show "10 AI specialists debate your decisions · Free to start" below the input bar. Restore it:

Find the input area in the root page hero and add below the input bar:

```typescript
{/* After the ChatInput component and its "Enter to send" hint: */}
<p className="text-center text-micro text-txt-disabled mt-4">
  10 AI specialists debate your decisions · Free to start
</p>
```

If it already exists but is hidden, check for `hidden` or `display: none` classes.

---

## FIX 5 — Conversation page: entity too large at top

In the conversation page `/c/[id]`, the entity visual at the top takes too much space when messages exist. It should shrink when there are messages:

```typescript
// In the conversation page, the entity section should be:
<div className={cn(
  'flex justify-center shrink-0 transition-all duration-300',
  messages.length > 0 ? 'py-2' : 'py-6',  // smaller padding when messages exist
)}>
  <EntityVisual 
    state={entityState} 
    size={messages.length > 0 ? 'sm' : 'md'}  // shrink when messages
  />
</div>
```

If the `size` prop doesn't control the actual visual size, find the EntityVisual component and ensure `sm` renders at ~40px and `md` at ~80px:

```typescript
const sizeMap = {
  sm: 'w-10 h-10',   // 40px — compact, in conversation with messages
  md: 'w-20 h-20',   // 80px — medium, conversation empty
  lg: 'w-24 h-24',   // 96px — large, hero page
};
```

---

## Summary

```
FIX │ WHAT                              │ WHERE
────┼───────────────────────────────────┼──────────────────────
 1  │ "OCTUX AI" → "octux" + tagline   │ Root page hero
 2  │ □ → MessageSquare / colored dots  │ Sidebar conversation items
 3  │ "---" → <hr> in markdown          │ MarkdownRenderer
 4  │ Restore sub-tagline under input   │ Root page hero
 5  │ Shrink entity in conversation     │ Conversation page /c/[id]
```

All 5 are small, independent fixes. Can be done in one commit.

## Testing

1. **Root page (/):** Shows "octux" lowercase + "Never decide alone again" + sub-tagline below input
2. **Sidebar:** Chat conversations show MessageSquare icon (not □). If any had verdicts, would show colored dots.
3. **Chat response:** Any "---" in AI response renders as horizontal line separator
4. **Conversation page:** Entity is small when messages exist (~40px), doesn't waste vertical space

---

Manda pro Fernando. Esses 5 fixes finalizam o visual polish. Depois disso estamos prontos pra continuar no **PF-15** (Citation System). 🐙
