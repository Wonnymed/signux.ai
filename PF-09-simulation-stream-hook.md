# PF-09 — useSimulationStream Hook + SSE Integration

## Context for AI

You are working on Octux AI — a Decision Operating System. Next.js 14 App Router + TypeScript + Tailwind CSS + shadcn/ui + Zustand + Lucide React + Framer Motion.

**THIS BEGINS FASE 4 — THE HEART OF OCTUX.** This is where the product transforms from "chatbot" to "Decision Operating System." Users will SEE 10 agents debating in real-time.

**What this prompt adds:**
1. hooks/useSimulationStream.ts — orchestration hook bridging stores
2. lib/simulation/events.ts — typed SSE event definitions
3. lib/simulation/phases.ts — phase configuration and mapping
4. Upgrade conversation page to use the hook
5. Proper cleanup, timeout, error recovery
