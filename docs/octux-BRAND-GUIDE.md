# OCTUX AI — BRAND GUIDE
# "Beyond chat. Beyond consulting. Octux turns uncertainty into structured decisions."
# Purple futuristic + minimalist octopus OX logo

---

# 1. BRAND IDENTITY

**Name:** Octux AI — pronounced "ock-tux"
**Tagline:** Decision Operating System
**Category:** "Beyond chat. Beyond consulting. Octux turns uncertainty into structured decisions."

**Why Octux:** An octopus has 9 brains — 1 central + 8 in each arm. Each arm decides independently while the central brain coordinates. That's Octux: 1 Decision Chair + specialist agents, thinking independently, debating adversarially, producing a verdict.

**Pitch Line:** "An octopus has 9 independent brains that debate every decision. So does Octux. 10 specialist agents. Adversarial debate. Structured verdict. In 60 seconds."

---

# 2. LOGO — THE OX MARK

**Concept:** Letters "OX" form a minimalist octopus. O = head/body (round). X = four pairs of tentacles crossing. Negative space creates the eye.

**Style:** Geometric, minimal, single-weight. NOT cartoon, NOT realistic, NOT cute — SLEEK and TECHNICAL. GitHub Octocat precision meets Linear icon refinement. Works at 16px (favicon) through 512px (marketing).

**Variants:** OX Mark alone (icon) | OX + OCTUX AI (full) | OX + OCTUX (casual)
**Colors:** Purple on white (primary) | White on purple/dark (inverse) | Black on white (mono)

---

# 3. COLOR SYSTEM

## Primary — Octux Purple
Electric violet — futuristic, premium, energetic. Unique in the space.

```css
--octux-purple:       #7C3AED;    /* primary */
--octux-purple-light: #8B5CF6;    /* hover */
--octux-purple-dark:  #6D28D9;    /* pressed */
--octux-purple-muted: rgba(124,58,237,0.12);  /* bg tints */
--octux-purple-glow:  rgba(124,58,237,0.06);  /* subtle glow */
```

Neighbors: Figma #A259FF (pinker) | Discord #5865F2 (bluer) | Twitch #9146FF (brighter) | **Octux #7C3AED (unique electric violet)**

## Full Design Tokens

```css
:root {
  /* SURFACES */
  --surface-0: #FFFFFF;
  --surface-1: #F9F9F8;
  --surface-2: #F3F2F7;        /* slight purple tint */
  --surface-3: #E9E5F0;        /* purple-tinted gray */
  --surface-raised: #FFFFFF;
  --surface-dark: #0F0A1A;     /* dark sections */

  /* TEXT (opacity hierarchy) */
  --text-primary: rgba(0,0,0,0.90);
  --text-secondary: rgba(0,0,0,0.55);
  --text-tertiary: rgba(0,0,0,0.35);
  --text-disabled: rgba(0,0,0,0.20);

  /* ICONS */
  --icon-primary: rgba(0,0,0,0.70);
  --icon-secondary: rgba(0,0,0,0.45);

  /* ACCENT */
  --accent: #7C3AED;
  --accent-hover: #6D28D9;
  --accent-light: #8B5CF6;
  --accent-muted: rgba(124,58,237,0.12);
  --accent-glow: rgba(124,58,237,0.06);

  /* ENGINE COLORS */
  --engine-simulate: #7C3AED;  /* flagship = brand color */
  --engine-build: #10B981;
  --engine-grow: #F59E0B;
  --engine-hire: #06B6D4;
  --engine-protect: #F43F5E;
  --engine-compete: #F97316;

  /* AGENT COLORS */
  --agent-chair: #7C3AED;       /* brand purple */
  --agent-base-rate: #6366F1;
  --agent-unit-econ: #10B981;
  --agent-demand: #F59E0B;
  --agent-competitive: #F97316;
  --agent-regulatory: #F43F5E;
  --agent-execution: #8B5CF6;
  --agent-capital: #06B6D4;
  --agent-scenario: #EC4899;
  --agent-intervention: #14B8A6;

  /* SPACING / RADIUS / TRANSITIONS (unchanged) */
  --space-1: 4px; --space-2: 8px; --space-3: 12px;
  --space-4: 16px; --space-6: 24px; --space-8: 32px;
  --radius-sm: 6px; --radius-md: 8px; --radius-lg: 12px;
  --transition-fast: 100ms ease-out;
  --transition-normal: 150ms ease-out;

  /* SIDEBAR */
  --sidebar-width-collapsed: 56px;
  --sidebar-width-expanded: 200px;
  --sidebar-bg: var(--surface-1);
}
```

## Purple Gradient

```css
.octux-gradient-text {
  background: linear-gradient(135deg, #7C3AED 0%, #A78BFA 50%, #7C3AED 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.hero-glow {
  background: radial-gradient(ellipse at center, rgba(124,58,237,0.08) 0%, transparent 70%);
}
.dark-section {
  background: linear-gradient(180deg, #0F0A1A 0%, #1A0F2E 100%);
}
.card-hover-glow:hover {
  box-shadow: 0 0 24px rgba(124,58,237,0.10);
  border-color: rgba(124,58,237,0.30);
}
```

---

# 4. ENGINE COLORS (recalibrated)

| Engine | Color | Hex | Why |
|--------|-------|-----|-----|
| Simulate | **Octux Purple** | #7C3AED | Flagship = brand color |
| Build | Emerald | #10B981 | Construction = green |
| Grow | Amber | #F59E0B | Growth = warm energy |
| Hire | Cyan | #06B6D4 | People = cool trust |
| Protect | Rose | #F43F5E | Shield/danger |
| Compete | Orange | #F97316 | Battle fire |

---

# 5. SIDEBAR (purple active states)

## Collapsed (56px)
```
┌────────┐
│  [OX]  │  Purple OX mark
│   🏠   │  Gray default → purple when active
│   ──   │  
│   ⚡   │  → purple (brand) when active
│   🔨   │  → emerald when active
│   📈   │  → amber when active
│   👤   │  → cyan when active
│   🛡   │  → rose when active
│   ⚔   │  → orange when active
│        │
│   ⭐   │  Upgrade (purple glow)
│  [av]  │  Profile
└────────┘
```

---

# 6. LANDING PAGE (light/dark rhythm)

```
[LIGHT] Above fold — OX + input + chips (purple accents on white)
[LIGHT] Engine cards — 6 colored cards
[DARK]  How Octux Works — graph with purple nodes GLOWING on dark
[LIGHT] Why Octux vs ChatGPT — comparison, purple column
[DARK]  Architecture — diagram, purple edges on dark bg
[LIGHT] Pricing — Pro tier purple border
[DARK]  Manifesto — white text on dark purple gradient
[LIGHT] Footer + purple CTA button
```

Dark sections = purple GLOWS. Killer advantage over gold/white-only.

---

# 7. VIRALITY STRATEGY

**Why creatures viral:** MiroFish, Clawd Bot, Octocat, Duolingo Owl — mascots with PERSONALITY.

**Octux Personality (copy):**
- Loading: "The octopus is thinking..."
- Empty: "Feed the octopus a question."
- Error: "Even octopuses need a moment."
- 404: "This tentacle doesn't reach that far."
- Good grade: "The octopus approves. ✓"

**Shareable Verdict Cards:**
- Auto-generated purple cards after each sim
- "Octux says: PROCEED (62%)" — one-click share
- OX watermark, verdict summary, agent count
- Twitter/LinkedIn optimized dimensions

---

# 8. SIMULATION UX

- Phase active: purple border + purple loader
- Phase complete: green ✅
- Decision Object: 3px purple top border
- Citations [1][2][3]: purple bg/10
- Grade badge: purple for A/B, amber C, rose D/F
- Consensus bars: green PROCEED / amber DELAY / rose ABANDON
- Agent cards: colored by agent, Chair = purple

---

# 9. WHAT CHANGES vs BUILD PLAN

## Replace everywhere:
- "Signux" → "Octux" | "signux" → "octux"
- #C8A84E → #7C3AED (gold → purple)
- Logo "S" → Logo "OX"

## Unchanged:
- All 31 references + patterns
- All 16 modules + components + API + DB
- All 4 phases + 10 build steps
- Linear principles + Inter font + spacing/radius
- Light mode default
- UX doctrine (tool-first above fold)

## Gets BETTER with purple:
- Dark sections (purple GLOWS — gold was flat on dark)
- Gradient text (more vibrant)
- Favicon (purple OX > gold S at 16px)
- Social sharing (purple pops in feeds)
- Viral potential (octopus mascot > abstract letter)

---

# 10. D2SF PITCH (updated)

"An octopus has 9 independent brains. When it hunts, each arm processes information autonomously while the central brain coordinates strategy.

We built Octux the same way.

10 specialist agents. Adversarial debate. Structured verdict — probability, risk, next action. Every claim traceable. System evaluates itself, learns, compounds knowledge.

ChatGPT gives one opinion. McKinsey gives a $50K invoice. Octux gives 10 specialists debating in 60 seconds. Starting free."
