# OCTUX AI — CURSOR STARTER PROMPT
# Cola este prompt INTEIRO no Cursor Composer (Cmd+I) para iniciar Phase 0
# Garante que os dois docs estão em /docs/ antes de rodar

---

## PROMPT 1: Setup + Design Tokens + Shell

Read @docs/octux-BUILD-PLAN.md and @docs/octux-BRAND-GUIDE.md completely before starting.

This is Octux AI — a Decision Operating System. We're rebuilding the frontend from scratch while KEEPING all API routes, supabase config, and auth.

DO THIS IN ORDER:

### Step 1: Clean slate
- Do NOT delete /app/api/ — keep all API routes
- Do NOT delete lib/ — keep supabase client, utils, types
- Do NOT delete .env.local, next.config.js, tsconfig.json, package.json
- DELETE: /app/chat/ directory (old UI)
- DELETE: all files in /components/ (we rebuild everything)
- KEEP app/layout.tsx and app/page.tsx but we will REWRITE them completely

### Step 2: Install dependencies (if not present)
```bash
npm install framer-motion lucide-react @radix-ui/react-hover-card @radix-ui/react-collapsible @radix-ui/react-dialog
```

### Step 3: Create app/globals.css with full Octux design tokens
Use EXACTLY these values from the Brand Guide:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* SURFACES */
  --surface-0: #FFFFFF;
  --surface-1: #F9F9F8;
  --surface-2: #F3F2F7;
  --surface-3: #E9E5F0;
  --surface-raised: #FFFFFF;
  --surface-dark: #0F0A1A;

  /* TEXT (opacity hierarchy) */
  --text-primary: rgba(0,0,0,0.90);
  --text-secondary: rgba(0,0,0,0.55);
  --text-tertiary: rgba(0,0,0,0.35);
  --text-disabled: rgba(0,0,0,0.20);

  /* ICONS */
  --icon-primary: rgba(0,0,0,0.70);
  --icon-secondary: rgba(0,0,0,0.45);
  --icon-disabled: rgba(0,0,0,0.20);

  /* ACCENT — Octux Purple */
  --accent: #7C3AED;
  --accent-hover: #6D28D9;
  --accent-light: #8B5CF6;
  --accent-muted: rgba(124,58,237,0.12);
  --accent-glow: rgba(124,58,237,0.06);

  /* ENGINE COLORS */
  --engine-simulate: #7C3AED;
  --engine-build: #10B981;
  --engine-grow: #F59E0B;
  --engine-hire: #06B6D4;
  --engine-protect: #F43F5E;
  --engine-compete: #F97316;

  /* AGENT COLORS */
  --agent-chair: #7C3AED;
  --agent-base-rate: #6366F1;
  --agent-unit-econ: #10B981;
  --agent-demand: #F59E0B;
  --agent-competitive: #F97316;
  --agent-regulatory: #F43F5E;
  --agent-execution: #8B5CF6;
  --agent-capital: #06B6D4;
  --agent-scenario: #EC4899;
  --agent-intervention: #14B8A6;

  /* SPACING */
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
  --border-subtle: rgba(124,58,237,0.06);
  --border-default: rgba(0,0,0,0.10);
  --border-strong: rgba(0,0,0,0.16);
  --border-accent: rgba(124,58,237,0.30);
}

body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background: var(--surface-0);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
}
```

### Step 4: Create the AppShell layout (app/layout.tsx)
The shell wraps the entire app: Sidebar (left) + Main content (right).

Structure:
```
┌──────────┬──────────────────────────────────────┐
│ Sidebar  │  Main Content                        │
│ 56px     │  (children)                          │
│ collapsed│                                      │
│          │                                      │
│ expands  │                                      │
│ to 200px │                                      │
│ on hover │                                      │
└──────────┴──────────────────────────────────────┘
```

- Import Inter from next/font/google
- Sidebar is position fixed left, main content has margin-left
- Main content scrolls, sidebar doesn't

### Step 5: Create Sidebar component (components/shell/Sidebar.tsx)
Following Linear design principles:

- Collapsed: 56px width, icon-only, centered icons
- Expanded: 200px width on hover (CSS transition 150ms ease-out)
- Background: var(--surface-1) — dimmer than main content
- Icons: 18px, opacity 0.45 default
- Hover: opacity 0.7, subtle bg var(--surface-2)
- Active: opacity 1.0, icon turns ENGINE COLOR (not bg fill)
- Divider between Home and engines: 1px, opacity 0.06

Items top to bottom:
1. OX Logo (just text "OX" in purple bold for now — we'll add SVG later)
2. Home icon (House from lucide-react)
3. --- subtle divider ---
4. Simulate (Zap) — purple when active
5. Build (Hammer) — emerald when active
6. Grow (TrendingUp) — amber when active
7. Hire (UserCheck) — cyan when active
8. Protect (Shield) — rose when active
9. Compete (Swords) — orange when active
10. --- spacer (flex-1) ---
11. Upgrade (Sparkles) — purple accent
12. Profile (User avatar circle) — bottom

Use lucide-react for all icons. Use Zustand for active engine state.
Use framer-motion for expand/collapse animation.
NO scroll in sidebar — everything visible at once.

### Step 6: Create Homepage above fold (app/page.tsx)
The homepage IS the product. No marketing wall.

Guest view (centered, clean):
```
        [OX]  OCTUX AI
        (gradient text tagline)

  [Simulate | Build | Grow | Hire | Protect | Compete]

  ┌──────────────────────────────────┐
  │  What decision are you facing?    │
  └──────────────────────────────────┘

  [chip] [chip] [chip] [chip] 🔄

  "10 agents · adversarial debate · 60 seconds"
```

Components needed:
- HeroInput: textarea with border, purple bottom-border on focus, send button
- EngineSelector: horizontal tabs, purple underline on active, engine colors on hover
- SuggestionChips: 4 chips (rounded-full, border, hover purple), refresh button
  - Different chips per engine (hardcoded for now)
- TrustStrip: centered text, text-tertiary, subtle

The input should be vertically centered on the page (or slight upper-third).
Light, airy, lots of whitespace. Premium feel.

Make sure the page WORKS visually before moving to landing sections.
Focus on getting Shell + Homepage looking PREMIUM first.
