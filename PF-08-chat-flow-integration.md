# PF-08 — Chat Flow Integration (End-to-End)

## Context for AI

You are working on Octux AI — a Decision Operating System. Next.js 14 App Router + TypeScript + Tailwind CSS + shadcn/ui + Zustand + Lucide React + Framer Motion.

**THIS IS THE MOST IMPORTANT FRONTEND PROMPT.** After PF-08, a user can type a question, receive a response, and see it rendered in the chat. Everything before was setup. This is where it becomes a product.

**What this prompt wires together:**
1. Root page — new conversation flow (type → auth gate → create → redirect)
2. Conversation page — load messages, render them, send new ones
3. Auto-scroll, empty states, error recovery
4. Entity state changes based on chat activity
5. Sidebar updates when conversations change
6. Simulation trigger (from DecisionCard → SSE — placeholder until PF-09)

After this prompt: the chat works.
