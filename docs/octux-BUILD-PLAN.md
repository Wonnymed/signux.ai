# OCTUX AI — MASTER BUILD PLAN
# 31 References → 4 Phases → 1 Decision Operating System
# Arsenal FECHADO. Hora de construir.

---

# ═══════════════════════════════════════
# SECTION 0: EXECUTIVE SUMMARY
# ═══════════════════════════════════════

## What We Have
- 31 reverse engineering references covering 31 architectural layers
- 25 analysis documents totaling 12,291 lines of implementation patterns
- Canonical Product Memory (the constitution — 16 modules, UX doctrine)
- 3 build tools (Repomix, Context Engineering Kit, Bloomberg Terminal Clone)

## What We're Building
Frontend rebuild from scratch. Keep: API routes, Supabase schema, auth.
Rebuild: all components, layout, pages, CSS, streaming UX.

## The 4 Phases
- **PHASE 0 — SHELL + LANDING** (Week 1-2): Sidebar, homepage, landing sections
- **PHASE 1 — SIMULATION UX** (Week 3-4): Streaming, agent cards, verdict, citations
- **PHASE 2 — INTELLIGENCE** (Week 5-8): Memory, eval, follow-ups, threads
- **PHASE 3 — COMPOUNDING** (Month 3-6): Self-evolution, knowledge graph, calibration lab

---

# ═══════════════════════════════════════
# SECTION 1: TECH STACK (CONFIRMED)
# ═══════════════════════════════════════

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 14+ App Router | Keep existing |
| Language | TypeScript (strict) | Keep existing |
| Styling | Tailwind CSS + CSS variables | Rebuild with Linear tokens |
| Components | shadcn/ui (customized) | Rebuild with Octux tokens |
| State | Zustand | Lightweight, no Redux |
| Auth | Supabase Auth | Keep existing |
| Database | Supabase (Postgres + pgvector) | Keep existing |
| AI | Claude API (Sonnet 4 primary, Haiku 4.5 eval) | Keep existing |
| Hosting | Vercel | Keep existing |
| Icons | Lucide React | Keep existing |
| Animation | Framer Motion (minimal) | New — for agent cards, phase transitions |
| Streaming | Server-Sent Events (SSE) | New — Perplexity pattern |
| Font | Inter (Google Fonts) | Keep existing |

---

# ═══════════════════════════════════════
# SECTION 2: DESIGN SYSTEM (from Linear #17 + Stripe #18)
# ═══════════════════════════════════════

## 2.1 Design Tokens (globals.css)

```css
:root {
  /* SURFACES (Linear elevation system) */
  --surface-0: #FFFFFF;        /* main content bg */
  --surface-1: #F9F9F7;        /* sidebar, cards, panels */
  --surface-2: #F2F2EF;        /* hover states */
  --surface-3: #E8E8E3;        /* active states, borders */
  --surface-raised: #FFFFFF;    /* modals, dropdowns */

  /* TEXT (opacity hierarchy — NOT hardcoded grays) */
  --text-primary: rgba(0,0,0,0.90);
  --text-secondary: rgba(0,0,0,0.55);
  --text-tertiary: rgba(0,0,0,0.35);
  --text-disabled: rgba(0,0,0,0.20);

  /* ICONS */
  --icon-primary: rgba(0,0,0,0.70);
  --icon-secondary: rgba(0,0,0,0.45);
  --icon-disabled: rgba(0,0,0,0.20);

  /* ACCENT — Octux Purple (used SPARINGLY) */
  --accent: #7C3AED;
  --accent-hover: #6D28D9;
  --accent-muted: rgba(124,58,237,0.12);
  --accent-glow: rgba(124,58,237,0.06);

  /* ENGINE COLORS (fixed, semantic) */
  --engine-simulate: #7C3AED;
  --engine-build: #10B981;
  --engine-grow: #8B5CF6;
  --engine-hire: #F59E0B;
  --engine-protect: #EF4444;
  --engine-compete: #F97316;

  /* AGENT COLORS (10 agents, distinct) */
  --agent-base-rate: #6366F1;       /* indigo */
  --agent-unit-econ: #10B981;        /* emerald */
  --agent-demand: #F59E0B;           /* amber */
  --agent-competitive: #F97316;      /* orange */
  --agent-regulatory: #EF4444;       /* red */
  --agent-execution: #8B5CF6;        /* violet */
  --agent-capital: #06B6D4;          /* cyan */
  --agent-scenario: #EC4899;         /* pink */
  --agent-intervention: #14B8A6;     /* teal */
  --agent-chair: #7C3AED;            /* PURPLE */

  /* SPACING (4px base) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;
  --space-24: 96px;

  /* RADIUS */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 999px;

  /* TRANSITIONS */
  --transition-fast: 100ms ease-out;
  --transition-normal: 150ms ease-out;
  --transition-slow: 250ms ease-out;

  /* SIDEBAR */
  --sidebar-width-collapsed: 56px;
  --sidebar-width-expanded: 200px;
  --sidebar-bg: var(--surface-1);

  /* BORDERS */
  --border-subtle: rgba(0,0,0,0.06);
  --border-default: rgba(0,0,0,0.10);
  --border-strong: rgba(0,0,0,0.16);
}
```

## 2.2 Typography Scale

| Use | Size | Weight | Color | Line Height |
|-----|------|--------|-------|-------------|
| Page title | 28px | 300 (light) | --text-primary | 1.3 |
| Section heading | 20px | 500 (medium) | --text-primary | 1.4 |
| Card title | 15px | 500 | --text-primary | 1.4 |
| Body | 14px | 400 | --text-secondary | 1.6 |
| Small/meta | 12px | 400 | --text-tertiary | 1.5 |
| Micro | 11px | 400 | --text-tertiary | 1.4 |

## 2.3 Purple Gradient (Stripe-inspired, sparingly)

```css
/* Text gradient — logo, key headlines only */
.octux-gradient-text {
  background: linear-gradient(135deg, #7C3AED 0%, #E8D48E 50%, #7C3AED 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Subtle glow — hero section only */
.hero-glow {
  background: radial-gradient(ellipse at center, var(--accent-glow) 0%, transparent 70%);
}
```

---

# ═══════════════════════════════════════
# SECTION 3: COMPONENT INVENTORY
# ═══════════════════════════════════════

## 3.1 Shell Components (PHASE 0)

| Component | File | Ref Sources | Priority |
|-----------|------|-------------|----------|
| AppShell | `components/shell/AppShell.tsx` | Linear #17, Okara #5 | P0 |
| Sidebar | `components/shell/Sidebar.tsx` | Linear #17 (icon-only 56→200px) | P0 |
| SidebarItem | `components/shell/SidebarItem.tsx` | Linear #17 (opacity states) | P0 |
| TopBar | `components/shell/TopBar.tsx` | Okara #5 (login/signup right) | P0 |
| CommandPalette | `components/shell/CommandPalette.tsx` | Linear #17 (Cmd+K) | P1 |

## 3.2 Homepage Components (PHASE 0)

| Component | File | Ref Sources |
|-----------|------|-------------|
| HeroInput | `components/home/HeroInput.tsx` | Okara #5 (frictionless), Stripe #18 (hero=product) |
| EngineSelector | `components/home/EngineSelector.tsx` | v0 #6 (mode tabs) |
| SuggestionChips | `components/home/SuggestionChips.tsx` | v0 #6 (chips + refresh) |
| TrustStrip | `components/home/TrustStrip.tsx` | Stripe #18 (proof bar) |

## 3.3 Landing Sections (PHASE 0 — below fold)

| Component | File | Ref Sources |
|-----------|------|-------------|
| HowItWorks | `components/landing/HowItWorks.tsx` | Dify #15 (graph visual) |
| EngineCards | `components/landing/EngineCards.tsx` | Canonical PM (6 engines) |
| WhyDifferent | `components/landing/WhyDifferent.tsx` | ChatGPT+Claude #16 (comparison) |
| Architecture | `components/landing/Architecture.tsx` | Dify #15 (system diagram) |
| Pricing | `components/landing/Pricing.tsx` | Stripe #18 (GBB, dollar anchor) |
| Manifesto | `components/landing/Manifesto.tsx` | v0 #6 (editorial section) |

## 3.4 Simulation UX Components (PHASE 1)

| Component | File | Ref Sources |
|-----------|------|-------------|
| SimulationProgress | `components/sim/SimulationProgress.tsx` | Perplexity #14 (progressive disclosure) |
| AgentCard | `components/sim/AgentCard.tsx` | Perplexity #14 (sources strip adapted) |
| AgentCardStream | `components/sim/AgentCardStream.tsx` | Perplexity #14 (streaming) |
| ConfidenceBadge | `components/sim/ConfidenceBadge.tsx` | DeepEval #12 (scoring) |
| PositionBadge | `components/sim/PositionBadge.tsx` | AutoGen #9 (PROCEED/DELAY/ABANDON) |
| ConsensusTracker | `components/sim/ConsensusTracker.tsx` | Perplexity #14 (live dashboard) |
| DecisionObject | `components/sim/DecisionObject.tsx` | Palantir #4, OpenBB #20 (artifact) |
| InlineCitation | `components/sim/InlineCitation.tsx` | Perplexity #14 (hover = agent + confidence) |
| SimulationTrace | `components/sim/SimulationTrace.tsx` | Dify #15 (clickable trace graph) |
| AgentScorecard | `components/sim/AgentScorecard.tsx` | DeepEval #12 (per-agent eval) |
| FollowUpChips | `components/sim/FollowUpChips.tsx` | Perplexity #14 (related questions) |
| SimulationGrade | `components/sim/SimulationGrade.tsx` | DeepEval #12 (A-F grade card) |

## 3.5 Shared/UI Components

| Component | File | Notes |
|-----------|------|-------|
| SkeletonBlock | `components/ui/skeleton.tsx` | shadcn base, customized |
| HoverCard | `components/ui/hover-card.tsx` | For citations |
| Collapsible | `components/ui/collapsible.tsx` | For trace expansion |
| Dialog | `components/ui/dialog.tsx` | For command palette, auth |
| StreamingText | `components/ui/StreamingText.tsx` | Word-by-word render |

---

# ═══════════════════════════════════════
# SECTION 4: PAGE STRUCTURE
# ═══════════════════════════════════════

```
app/
├── layout.tsx                  ← AppShell (sidebar + topbar + main)
├── page.tsx                    ← Homepage (guest: hero + landing | logged-in: hero + recent)
├── auth/
│   ├── login/page.tsx
│   └── signup/page.tsx
├── sim/
│   └── [id]/page.tsx           ← Simulation result (workspace view)
├── engine/
│   └── [engine]/page.tsx       ← Engine-specific landing (optional Phase 2)
├── settings/
│   └── page.tsx
├── pricing/
│   └── page.tsx                ← Full pricing page (Phase 1)
└── api/
    ├── simulate/
    │   └── stream/route.ts     ← SSE streaming endpoint
    ├── auth/
    │   └── [...supabase]/route.ts
    └── eval/
        └── route.ts            ← Auto-evaluation endpoint (Phase 2)
```

## Page Behaviors

### Guest Homepage (/)
```
┌─────────┬──────────────────────────────────────────────────┐
│ SIDEBAR  │  MAIN CONTENT                                   │
│ (open)   │                                                  │
│          │     S  OCTUX AI                                 │
│  🏠 Home │     "Turn uncertainty into structured decisions" │
│  ──      │                                                  │
│  ⚡ Sim  │     [Engine Tabs: Simulate | Build | Grow ...]   │
│  🔨 Build│     ┌──────────────────────────────────┐        │
│  📈 Grow │     │  What decision are you facing?    │        │
│  👤 Hire │     │  _________________________________│        │
│  🛡 Prot │     └──────────────────────────────────┘        │
│  ⚔ Comp │     [chip] [chip] [chip] [chip] 🔄              │
│          │                                                  │
│          │     "10 agents · 10 rounds · Decision-ready"     │
│          │                                                  │
│  ────    │  ═══════════ BELOW FOLD ═══════════              │
│  Log in  │  [How It Works graph]                            │
│  Sign up │  [6 Engine cards]                                │
│          │  [Why Octux vs ChatGPT comparison]              │
│          │  [Architecture visual]                           │
│          │  [Pricing: Free / Pro / Max]                     │
│          │  [Manifesto]                                     │
│          │  [Footer + CTA]                                  │
└─────────┴──────────────────────────────────────────────────┘
```

### Logged-in Homepage (/)
```
┌─────────┬──────────────────────────────────────────────────┐
│ SIDEBAR  │  MAIN CONTENT                                   │
│ (icon)   │                                                  │
│   S      │     [Engine Tabs]                                │
│   🏠     │     ┌──────────────────────────────────┐        │
│   ──     │     │  What decision are you facing?    │        │
│   ⚡     │     └──────────────────────────────────┘        │
│   🔨     │     [contextual chips] 🔄                       │
│   📈     │                                                  │
│   👤     │     RECENT DECISIONS                             │
│   🛡     │     ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│   ⚔     │     │ Gangnam │ │ VP Hire │ │ Pivot?  │       │
│          │     │ 62% ⚡  │ │ Delay 🔨│ │ 78% ⚡  │       │
│          │     └─────────┘ └─────────┘ └─────────┘       │
│   ⭐     │                                                  │
│   👤F    │     SAVED DECISIONS                              │
└─────────┴──────────────────────────────────────────────────┘
```

### Simulation Result (/sim/[id])
```
┌─────────┬──────────────────────────────────────────────────┐
│ SIDEBAR  │  WORKSPACE (OpenBB pattern — artifacts, not chat)│
│ (icon)   │                                                  │
│   S      │  ┌──────────────────┐  ┌────────────────────┐   │
│   🏠     │  │ DECISION OBJECT  │  │ CONSENSUS CHART    │   │
│   ──     │  │ PROCEED [1][3]   │  │ ██████░░░ 70% Proc │   │
│   ⚡     │  │ Prob: 62%        │  │ ███░░░░░░ 20% Delay│   │
│   🔨     │  │ Risk: Regulatory │  │ █░░░░░░░░ 10% Aband│   │
│   📈     │  │ Grade: B (78)    │  └────────────────────┘   │
│   👤     │  │ [Export][Share]   │                            │
│   🛡     │  └──────────────────┘  ┌────────────────────┐   │
│   ⚔     │                         │ AGENT SCORECARDS   │   │
│          │  ┌──────────────────┐  │ Base Rate: 8/10 ▲  │   │
│          │  │ SIMULATION TRACE │  │ Regulatory: 9/10 ▲ │   │
│          │  │ [expandable]     │  │ Unit Econ: 6/10 ▼  │   │
│   ⭐     │  └──────────────────┘  └────────────────────┘   │
│   👤F    │  [Follow-up chips] [Ask agent] [Re-run]          │
└─────────┴──────────────────────────────────────────────────┘
```

---

# ═══════════════════════════════════════
# SECTION 5: API ARCHITECTURE (from Semantic Kernel #19)
# ═══════════════════════════════════════

## 5.1 SimulationKernel (central orchestrator)

```typescript
// lib/kernel.ts — THE SINGLE ENTRY POINT
type OctuxKernel = {
  llm: ClaudeClient;                    // claude-sonnet-4 (agents)
  evalLlm: ClaudeClient;               // claude-haiku-4.5 (evals, extraction)
  agents: Map<string, AgentPlugin>;     // 10 specialist agents
  inputFilters: InputFilter[];          // guardrails before sim
  outputFilters: OutputFilter[];        // quality check after sim
  agentFilters: AgentFilter[];          // per-agent validation
  simulationConfig: SimulationConfig;
};
```

## 5.2 SSE Streaming Protocol (from Perplexity #14 + OpenBB #20)

```typescript
// Endpoint: POST /api/simulate/stream
// Returns: text/event-stream

type OctuxSSE =
  | { event: 'phase_start'; data: { phase: string; status: string } }
  | { event: 'plan_complete'; data: SimulationPlan }
  | { event: 'agent_token'; data: { agent_id: string; token: string } }
  | { event: 'agent_complete'; data: { agent_id: string; report: AgentReport } }
  | { event: 'consensus_update'; data: ConsensusState }
  | { event: 'verdict_token'; data: { token: string } }
  | { event: 'verdict_artifact'; data: DecisionObject }
  | { event: 'citation_collection'; data: Citation[] }
  | { event: 'evaluation_artifact'; data: SimulationEvaluation }
  | { event: 'followup_suggestions'; data: string[] }
  | { event: 'complete'; data: { simulation_id: string } };
```

## 5.3 Core Types

```typescript
// lib/types.ts

type DecisionObject = {
  recommendation: 'proceed' | 'proceed_with_conditions' | 'delay' | 'abandon';
  probability: number;           // 0-100
  main_risk: string;
  leverage_point: string;
  next_action: string;
  grade: string;                 // A-F
  grade_score: number;           // 0-100
  citations: Citation[];
};

type Citation = {
  id: number;                    // [1], [2], [3]
  agent_id: string;
  agent_name: string;
  round: number;
  claim: string;
  confidence: number;
};

type AgentReport = {
  agent_id: string;
  position: 'proceed' | 'delay' | 'abandon';
  confidence: number;            // 1-10
  key_argument: string;
  evidence: string[];
  risks_identified: string[];
  changed_mind: boolean;
  change_reason?: string;
};

type SimulationPlan = {
  tasks: { description: string; assigned_agent: string }[];
  estimated_rounds: number;
  estimated_duration_seconds: number;
};
```

---

# ═══════════════════════════════════════
# SECTION 6: DATABASE SCHEMA (Supabase)
# ═══════════════════════════════════════

## 6.1 Existing tables (KEEP)
- users, profiles, auth (Supabase Auth)

## 6.2 New/Updated tables

```sql
-- SIMULATIONS (core data)
CREATE TABLE simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  engine TEXT NOT NULL,                    -- 'simulate' | 'build' | etc
  question TEXT NOT NULL,
  plan JSONB,                              -- SimulationPlan
  debate JSONB,                            -- full debate history
  verdict JSONB,                           -- DecisionObject
  evaluation JSONB,                        -- SimulationEvaluation
  citations JSONB,                         -- Citation[]
  trace JSONB,                             -- SimulationTrace
  follow_ups TEXT[],
  status TEXT DEFAULT 'running',           -- running | complete | failed
  total_tokens INT,
  total_cost_usd DECIMAL(10,4),
  duration_ms INT,
  outcome JSONB,                           -- user-reported later
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- USER FACTS (Mem0 pattern — persistent memory)
CREATE TABLE user_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  confidence FLOAT DEFAULT 0.8,
  evidence_count INT DEFAULT 1,
  source_simulation UUID REFERENCES simulations(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON user_facts USING ivfflat (embedding vector_cosine_ops);

-- DECISION PROFILES (async-generated user summaries)
CREATE TABLE decision_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  profile_text TEXT,
  key_facts JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AGENT PROMPT VERSIONS (self-evolving prompts)
CREATE TABLE agent_prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  version INT NOT NULL,
  prompt TEXT NOT NULL,
  eval_score FLOAT,
  simulations_run INT DEFAULT 0,
  promoted_from INT,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SIMULATION REFLECTIONS (post-sim learning)
CREATE TABLE simulation_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id UUID REFERENCES simulations(id),
  overall_quality FLOAT,
  what_went_well TEXT[],
  what_went_wrong TEXT[],
  agent_issues JSONB,
  lessons TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

# ═══════════════════════════════════════
# SECTION 7: PHASED IMPLEMENTATION PLAN
# ═══════════════════════════════════════

## ══════════════════════════════════════
## PHASE 0 — SHELL + LANDING (Week 1-2)
## ══════════════════════════════════════

**Goal:** Rebuild the frontend shell and homepage so the product
LOOKS like a $100B product before any simulation logic runs.
The homepage IS the landing page. Product = hero.

### Week 1: Shell + Above Fold

**Day 1-2: Design System + Shell**
- [ ] Create globals.css with all design tokens (Section 2.1)
- [ ] Build AppShell (sidebar + topbar + main content area)
- [ ] Build Sidebar (icon-only 56px, expand on hover 200px)
  - Linear principles: dimmer than content, opacity states
  - 6 engine icons with engine colors on active
  - Bottom: Upgrade + Profile (always visible)
  - Transition: 150ms ease-out
- [ ] Build TopBar (guest: Login/Signup right | logged-in: minimal)

**Day 3-4: Homepage Above Fold**
- [ ] Build HeroInput (centered input box with border, no bg fill)
- [ ] Build EngineSelector (tab-style, 6 engines, purple active underline)
- [ ] Build SuggestionChips (4 contextual + 🔄 refresh button)
  - Chips contextual per engine (different suggestions per engine)
  - Rounded-full, border, hover purple
- [ ] Build TrustStrip ("10 agents · 10 rounds · Decision-ready")
  - Subtle, centered, text-tertiary, below chips

**Day 5: Polish + Auth Modal**
- [ ] Auth modal (not full page — modal over homepage)
  - Supabase Auth UI, branded with purple accent
  - "Continue with Google" + email/password
- [ ] Skeleton states for all loading
- [ ] Hover states audit (every interactive element)
- [ ] 150ms transitions everywhere

**Refs driving this week:**
Linear #17 (sidebar, tokens, polish), Okara #5 (shell discipline),
v0 #6 (chips, engine tabs), Stripe #18 (hero=product)

### Week 2: Below-Fold Landing Sections

**Day 1: How It Works**
- [ ] Build HowItWorks graph (SVG, animated, interactive)
  - 6 nodes: Question → Plan → Opening → Adversarial → Convergence → Verdict
  - Auto-animate: nodes highlight sequentially (2s each)
  - Click node → detail panel below with description + agent list
  - Dify #15 visual language applied

**Day 2: Engine Cards + Comparison**
- [ ] Build EngineCards (6 cards, colored accent, icon, 1-line description)
- [ ] Build WhyDifferent comparison table
  - 3 columns: ChatGPT | Claude | Octux
  - Rows: Agents, Output, Self-eval, Audit, Progress, Learning
  - Octux column highlighted with purple border
  - Copy from ChatGPT+Claude #16 positioning

**Day 3: Architecture + Pricing**
- [ ] Build Architecture visual (SVG diagram of the Octux system)
  - Nodes: Input → Planning → Debate Engine → Memory → Verdict
  - Connected by animated edges
  - Hover → tooltips with descriptions
- [ ] Build Pricing section
  - 3 tiers: Free ($0) / Pro ($29) / Max ($99)
  - Pro: purple border, "Most Popular" badge, elevated shadow
  - Dollar anchor: "$50K McKinsey engagement in 60 seconds"
  - Toggle: Monthly / Annual (save 20%)

**Day 4: Manifesto + Footer**
- [ ] Build Manifesto section
  - Centered, narrow max-width (600px)
  - Editorial feel: "We believe decisions deserve..."
  - v0 #6 manifesto pattern
- [ ] Build Footer
  - Links: Product, Company, Legal
  - CTA: "Start deciding" button (purple)
  - Copyright + social links

**Day 5: Integration + Responsive**
- [ ] Wire all sections into homepage
- [ ] Guest vs logged-in detection (sidebar open vs collapsed)
- [ ] Logged-in: replace below-fold with Recent + Saved decisions
- [ ] Responsive breakpoints (mobile: no sidebar, stack layout)
- [ ] Performance audit: LCP < 2s, no layout shift

**PHASE 0 DELIVERABLE:**
Homepage that looks like a premium product. Guest can see the product,
understand it, and convert. No simulation logic yet — just the shell.

---

## ══════════════════════════════════════
## PHASE 1 — SIMULATION UX (Week 3-4)
## ══════════════════════════════════════

**Goal:** Wire the simulation streaming UX so users SEE agents debating
in real-time. The experience that makes people go "WHOA."

### Week 3: Streaming Infrastructure + Components

**Day 1-2: SSE Streaming Endpoint**
- [ ] Build POST /api/simulate/stream
  - Accept: question, engine, userId
  - Return: text/event-stream
  - Events: phase_start, plan_complete, agent_token, agent_complete,
    consensus_update, verdict_token, verdict_artifact, citations,
    evaluation, followups, complete
- [ ] Build useSimulationStream hook (frontend)
  - Manages: phases[], agents Map, verdict, citations, evaluation
  - EventSource connection with reconnection logic
  - Cleanup on unmount

**Day 3: Simulation Progress + Agent Cards**
- [ ] Build SimulationProgress component
  - 5 phases: Plan ✅ → Opening ⏳ → Adversarial ○ → Convergence ○ → Verdict ○
  - Expandable: click phase → see agent assignments/details
  - Active phase: purple border + pulsing loader
  - Complete phase: green check
  - Perplexity #14 progressive disclosure
- [ ] Build AgentCard component
  - Avatar (colored circle with icon)
  - Name + role label
  - ConfidenceBadge (X/10, colored by level)
  - PositionBadge (PROCEED green / DELAY amber / ABANDON red)
  - Key argument text (streaming or complete)
  - Expandable → full AgentReport

**Day 4: StreamingText + Agent Animations**
- [ ] Build StreamingText (word-by-word rendering, smooth)
- [ ] Agent cards appear ONE BY ONE with framer-motion
  - initial: { opacity: 0, y: 20 }
  - animate: { opacity: 1, y: 0 }
- [ ] ConsensusTracker (horizontal bar chart, real-time)
  - PROCEED / DELAY / ABANDON percentages
  - Avg confidence, trending indicator
  - Updates as agents report

**Day 5: Verdict + Citations**
- [ ] Build DecisionObject widget (the core artifact)
  - Card with: recommendation, probability, risk, leverage, action, grade
  - Purple border on top
  - Export button (JSON/PDF/Markdown)
  - Share button (generate public link)
  - Re-run button
- [ ] Build InlineCitation component
  - [1][2][3] badges in verdict text
  - HoverCard: agent avatar + name + confidence + claim + round
  - Purple bg/10 styling

### Week 4: Result Page + Follow-ups

**Day 1: Simulation Result Page (/sim/[id])**
- [ ] Build workspace layout (OpenBB #20 pattern)
  - Grid: DecisionObject (large) + ConsensusChart (medium)
  - Below: SimulationTrace (full width, expandable)
  - Right or below: AgentScorecards (scrollable)
- [ ] Load completed simulation from Supabase
- [ ] Loading state: skeleton blocks in workspace grid

**Day 2: Simulation Trace**
- [ ] Build SimulationTrace (expandable step-by-step)
  - Each step: icon + summary + duration + tokens
  - Click → expand → full agent response
  - Color-coded by type (plan, agent, chair, phase, verdict)
  - Dify #15 node visual language applied

**Day 3: Follow-ups + Grade**
- [ ] Build FollowUpChips (4 contextual suggestions post-sim)
  - Generated by Claude after verdict
  - Click → new simulation in same thread
- [ ] Build SimulationGrade card
  - Letter grade (A-F) with color
  - Score breakdown (5 metrics)
  - Confidence calibration indicator
- [ ] Wire follow-up to trigger new simulation with thread context

**Day 4-5: Thread History + Persistence**
- [ ] Save simulation results to Supabase
- [ ] Build thread view (series of simulations on same topic)
- [ ] Recent decisions on logged-in homepage
- [ ] Simulation sharing (public link /sim/[id])
  - Read-only view, Octux branding, CTA to sign up
  - OpenBB #20 shareable reports pattern

**PHASE 1 DELIVERABLE:**
Full simulation experience. User types question → sees agents debating
in real-time → gets structured Decision Object with citations → can
share and follow up. This is the D2SF demo.

---

## ══════════════════════════════════════
## PHASE 2 — INTELLIGENCE (Week 5-8)
## ══════════════════════════════════════

**Goal:** Add the systems that make Octux SMARTER over time.
Memory, evaluation, self-refinement. The compounding moat begins.

### Week 5-6: Memory + Personalization

- [ ] Implement user fact extraction (Mem0 #21 pattern)
  - After each sim, Haiku extracts facts asynchronously
  - ADD/UPDATE/DELETE/NOOP consolidation
  - Store in user_facts table with embeddings
- [ ] Implement memory scoring (relevance × recency × importance)
  - Top 15 memories injected into simulation context
- [ ] Implement Decision Profile (async summary of user)
  - Updated after every 3 simulations
  - Injected into every simulation system prompt
- [ ] Build "Octux remembers" indicator (subtle badge showing memory active)

### Week 7: Auto-Evaluation + Reflection

- [ ] Implement post-simulation auto-evaluation (DeepEval #12)
  - 5 simulation metrics: debate_quality, agent_diversity,
    evidence_quality, verdict_coherence, actionability
  - 6 per-agent metrics: argument_quality, evidence_use,
    confidence_calibration, position_consistency, unique_value, rebut_quality
  - Grade A-F with breakdown
- [ ] Implement Reflexion loop (Self-Evolving #13)
  - Post-sim reflection generated by Claude
  - What went well, what went wrong, agent-specific issues
  - Stored in simulation_reflections table
  - Top 3 relevant reflections injected into next similar sim
- [ ] Implement Self-Refine on verdict (Self-Evolving #13)
  - Generate → Critique → Refine (1-2 iterations)
  - Quality threshold: skip if critique passes
  - PRO feature: "Deep Analysis" toggle

### Week 8: Thread Continuity + Command Palette

- [ ] Implement thread context accumulation
  - Each follow-up inherits previous simulation summaries
  - Semantic search for relevant past decisions
- [ ] Build Command Palette (Cmd+K)
  - Recent simulations, Actions, Engines
  - Searchable, keyboard navigable
  - Linear #17 pattern
- [ ] Build keyboard shortcuts
  - G+H=Home, G+1-6=Engines, C=New sim, ?=Show all
- [ ] Implement "Ask This Agent" (post-sim chat with specific agent)
  - MiroFish #1 pattern
  - Side panel, conversational, references debate

**PHASE 2 DELIVERABLE:**
System that remembers users, evaluates itself, learns from mistakes,
and accumulates knowledge. Each simulation is better than the last.

---

## ══════════════════════════════════════
## PHASE 3 — COMPOUNDING (Month 3-6)
## ══════════════════════════════════════

**Goal:** The systems that create an UNCOPYABLE moat.
52 weeks of compounding = no competitor can replicate.

### Month 3: Prompt Evolution + Agent ELO

- [ ] Implement prompt evolution (Self-Evolving #13 + DSPy #23)
  - Weekly: collect reflections + evals → identify weakest agents
  - Generate improved prompts → benchmark → promote if better
  - Rollback threshold: -10% auto-reverts
  - Store in agent_prompt_versions table
- [ ] Implement Agent ELO scoring (DeepEval #12)
  - After each sim, update agent ELO based on eval scores
  - Dashboard: "Base Rate Archivist v12 — ELO 1450 (+12 this week)"
- [ ] Implement Agent Tournament (Self-Evolving #13)
  - A/B test prompt versions on synthetic questions
  - Promote winners automatically

### Month 4: Knowledge Graph + Outcome Tracking

- [ ] Implement entity-relationship graph (Mem0 #21 + Graphiti #27)
  - Extract entities and relationships from simulations
  - Store in entity_relations table (simplified, not Neo4j)
  - Multi-hop reasoning for context building
- [ ] Implement outcome tracking
  - User reports: "It worked!" / "It failed" / "Ongoing"
  - Updates Brier scores, agent calibration
  - Enriches Cultural Knowledge (agent-level memory)
- [ ] Implement temporal knowledge (Graphiti #27)
  - Bi-temporal: when fact was TRUE vs when we LEARNED it
  - Contradiction resolution (newer overrides older)

### Month 5: Observability + HITL

- [ ] Implement simulation telemetry (LangSmith #24 + Phoenix #25)
  - Per-sim: tokens, cost, duration, grade, errors
  - Per-agent: ELO trend, accuracy, common weaknesses
  - Internal dashboard (Nando-only)
- [ ] Implement HITL mid-simulation (Dify #15)
  - Pro/Max: user can intervene during simulation
  - "Provide context" → agents recalibrate
  - User input becomes node in trace graph
- [ ] Implement What-If scenarios (LangGraph #2)
  - "What if budget was 2× larger?" → fork simulation
  - Compare two verdicts side-by-side

### Month 6: Enterprise + Calibration Lab

- [ ] Build Calibration Lab dashboard (Module 16)
  - Shows: system accuracy over time, agent ELO trends
  - Brier scores, prediction calibration
  - "Memory of misses" — what the system got wrong
- [ ] Implement eval-gated deployment (Braintrust #30)
  - Prompt changes only deploy if eval scores improve
  - Automated regression testing on prompt updates
- [ ] Enterprise trust signals (Stripe #18)
  - Data processing section, security section
  - API documentation (public)
  - SOC 2 preparation (if applicable)

---

# ═══════════════════════════════════════
# SECTION 8: THE MOAT EQUATION
# ═══════════════════════════════════════

```
Week 1:   Shell looks premium (Linear + Stripe)
Week 2:   Landing converts visitors (Stripe + Positioning)
Week 4:   Simulation streams beautifully (Perplexity + OpenBB)
Week 8:   System remembers and evaluates (Mem0 + DeepEval)
Month 3:  Agents evolve automatically (DSPy + Self-Evolving)
Month 6:  Knowledge compounds across users (Graphiti + GraphRAG)
Month 12: Full self-evolving system

RESULT: 52 weeks of accumulated optimization
        NO COMPETITOR CAN REPLICATE without starting from scratch
```

The compounding formula:
```
DeepEval (WHAT to measure)
+ DSPy (HOW to optimize)
+ LangSmith/Phoenix/Braintrust (WHAT HAPPENED)
+ Mem0/Hindsight (REMEMBER per user)
+ Cognee/Graphiti/GraphRAG (UNDERSTAND the domain)
+ LangMem (PROCEDURAL learning)
+ OpenClaw (PROACTIVE surfacing)
= COMPOUNDING SYSTEM
```

---

# ═══════════════════════════════════════
# SECTION 9: NAVER D2SF PITCH ALIGNMENT
# ═══════════════════════════════════════

## What to DEMO (Phase 0+1 = 4 weeks)

1. **Homepage**: Type a question → show the product is the hero
2. **Streaming**: Watch 10 agents debate in real-time
3. **Decision Object**: Structured verdict with probability, risk, action
4. **Citations**: Hover [1][2][3] → see which agent said what
5. **Trace**: Click through the full debate path
6. **Grade**: System knows its own quality level
7. **Sharing**: Public link to decision report

## Pitch Narrative

"ChatGPT gives you one AI's opinion. Octux gives you 10 specialists debating.

Every decision goes through adversarial pressure testing — opening analysis,
challenge rounds, convergence — producing a structured verdict with probability,
risk, and next action. All traceable to specific agent arguments.

The system evaluates itself, learns from mistakes, and compounds knowledge.
Day 365 is fundamentally better than Day 1.

This is not a chatbot. This is a Decision Operating System."

## Competitive Moat for NAVER

1. **Multi-agent adversarial** — not single-model like ChatGPT/Claude
2. **Structured output** — Decision Object, not paragraphs
3. **Self-evaluation** — knows when its own analysis is weak
4. **Self-evolution** — prompts improve automatically
5. **Memory** — accumulates knowledge per user
6. **Calibration** — tracks accuracy with Brier scores
7. **Compounding** — 52 weeks of optimization = unreplicable

---

# ═══════════════════════════════════════
# SECTION 10: 31 REFERENCES → WHERE EACH LIVES
# ═══════════════════════════════════════

| # | Reference | Layer | Lives In |
|---|-----------|-------|----------|
| 1 | MiroFish+Dexter | PERCEPTION+INTELLIGENCE | Phase 2: Ask This Agent, task decomposition |
| 2 | LangGraph | ARCHITECTURE | Phase 1-2: State management, HITL, branching |
| 3 | AutoGen (orig) | DEBATE FLOW | Phase 1: 3-phase debate, speaker selection |
| 4 | Palantir AIP | CATEGORY | Phase 1: Decision Object schema, audit trail |
| 5 | Okara.ai | UX | Phase 0: Shell discipline, frictionless entry |
| 6 | v0.app | DESIGN | Phase 0: Chips, engine tabs, manifesto |
| 7 | CrewAI | AGENT DESIGN | Phase 1: Role-goal-backstory per agent |
| 8 | OpenAI Agents SDK | RUNTIME | Phase 1: Guardrails, handoffs |
| 9 | AutoGen FULL | ORCHESTRATION | Phase 1: Dual ledger, termination |
| 10 | MetaGPT | STRUCTURE | Phase 1: SOP-as-prompt, structured output |
| 11 | Agno | PRODUCTION | Phase 1-2: Memory levels, parallel exec |
| 12 | DeepEval | CALIBRATION | Phase 2: G-Eval, ELO, grade A-F |
| 13 | Self-Evolving | EVOLUTION | Phase 2-3: Reflexion, self-refine, prompt evolution |
| 14 | Perplexity | PRESENTATION | Phase 1: Progressive disclosure, streaming, citations |
| 15 | Dify | VISUALIZATION | Phase 0-1: How It Works graph, trace visual |
| 16 | ChatGPT+Claude | POSITIONING | Phase 0: Comparison table, anti-pattern avoidance |
| 17 | Linear | CRAFT | Phase 0: Design tokens, sidebar, shortcuts, polish |
| 18 | Stripe | CONVERSION | Phase 0: Landing trust sequence, pricing, gradient |
| 19 | Semantic Kernel | ENTERPRISE | Phase 1-2: Kernel pattern, plugins, filters |
| 20 | OpenBB | OUTPUT | Phase 1: Artifacts as widgets, workspace layout |
| 21 | Mem0 | MEMORY | Phase 2: Fact extraction, scoring, consolidation |
| 22 | Cognee | KNOWLEDGE | Phase 3: Graph construction concepts |
| 23 | DSPy | OPTIMIZATION | Phase 3: GEPA prompt evolution |
| 24 | LangSmith | OBSERVABILITY (trace) | Phase 3: Trace, monitor, cluster |
| 25 | Arize Phoenix | OBSERVABILITY (experiment) | Phase 3: Dataset, experiment, playground |
| 26 | OpenClaw | COMPOUNDING | Phase 3: Proactive surfacing, 250K patterns |
| 27 | Graphiti | TEMPORAL KNOWLEDGE | Phase 3: Bi-temporal knowledge graph |
| 28 | Hindsight | INSTITUTIONAL MEMORY | Phase 2-3: 4-network memory (91.4% SOTA) |
| 29 | LangMem | PROCEDURAL MEMORY | Phase 3: Conversation→gradient→metaprompt |
| 30 | Braintrust | EVAL-DRIVEN DEV | Phase 3: Eval-gated deployment |
| 31 | GraphRAG | HIERARCHICAL REASONING | Phase 3: Community detection, global queries |

---

# ═══════════════════════════════════════
# SECTION 11: BUILD ORDER (START HERE)
# ═══════════════════════════════════════

## STEP 1: globals.css + design tokens
Copy Section 2.1 into your project. This is the foundation.

## STEP 2: AppShell + Sidebar
Build the shell that wraps everything. Linear principles.
Test: sidebar collapsed 56px, expands 200px, 150ms transition.

## STEP 3: Homepage above fold
HeroInput + EngineSelector + SuggestionChips + TrustStrip.
Test: guest sees product immediately, no marketing wall.

## STEP 4: Landing sections (below fold)
HowItWorks → EngineCards → WhyDifferent → Architecture → Pricing → Manifesto.
Test: scroll experience answers every objection.

## STEP 5: Auth + route protection
Supabase Auth modal, guest vs logged-in behavior.
Test: guest can see and use homepage, logged-in gets persistence.

## STEP 6: SSE streaming endpoint
/api/simulate/stream with event types.
Test: can stream events from backend to frontend.

## STEP 7: Simulation UX components
SimulationProgress + AgentCards + ConsensusTracker.
Test: user SEES debate happening step-by-step.

## STEP 8: Decision Object + Citations
DecisionObject widget + InlineCitation hovers.
Test: structured verdict is scannable in 5 seconds.

## STEP 9: Result page + sharing
Workspace layout + persistence + public sharing.
Test: /sim/[id] renders full artifact workspace.

## STEP 10: Memory + Eval (Phase 2 begins)
Fact extraction + scoring + evaluation + reflection.
Test: simulation #15 is noticeably better than #1.

---

# ═══════════════════════════════════════
# END OF BUILD PLAN
# ═══════════════════════════════════════

31 references. 31 layers. 12,291 lines of analysis.
1 build plan. 4 phases. 10 steps to start.

The research is over. The building begins.

— Arsenal fechado, março 2026.
