# PF-03 — Zustand Global Store

## Context for AI

You are working on Octux AI — a Decision Operating System. Next.js 14 App Router + TypeScript + Tailwind CSS + shadcn/ui + Supabase + Claude API.

**Ref:** Canonical tech stack says "Zustand + Server Actions." Replaces scattered useState across components.

**What exists (confirmed PF-01, PF-02):**
- Design tokens in `globals.css` + `lib/design/tokens.ts`
- shadcn/ui installed with 16 components + Octux wrappers
- `lib/design/cn.ts` (className utility)
- Backend APIs: `/api/c` (list/create conversations), `/api/c/[id]` (load/update/delete), `/api/c/[id]/chat` (send message, trigger simulation, refine)
- `/api/simulate/stream` (SSE simulation streaming)
- `/api/billing/balance` (GET token balance)
- Types: `Conversation`, `ConversationMessage` in `lib/conversation/manager.ts`

**Problem being solved:**
Currently the frontend uses scattered `useState` in each component:
- `ConversationSidebar` has its own `conversations` state + fetch
- `ConversationPage` has its own `messages`, `loading`, `octopusState` state
- `ChatInput` has its own `input`, `tier` state
- No shared state between sidebar ↔ chat ↔ simulation ↔ billing
- When a simulation completes, the sidebar doesn't know → no verdict badge update
- When tokens are consumed, the input doesn't know → no token display update

**What this prompt does (4 stores, 1 hook):**

1. `lib/store/app.ts` — sidebar state, active conversation, theme
2. `lib/store/chat.ts` — messages, send, receive, optimistic updates
3. `lib/store/simulation.ts` — SSE state machine, agents, phases, verdict
4. `lib/store/billing.ts` — tier, tokens, usage check
5. `hooks/useHydrate.ts` — hydrate stores on mount
