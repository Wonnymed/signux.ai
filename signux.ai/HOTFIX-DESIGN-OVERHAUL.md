# HOTFIX-DESIGN-OVERHAUL — From Wireframe to Premium Product

## Context for AI

You are working on Octux AI — a Decision Operating System. The site is FULLY FUNCTIONAL (PF-01 → PF-33 all deployed) but looks like a **developer prototype, not a designed product**. Everything works — chat, simulation, verdict, marketing, sidebar, auth — but the visual execution is amateur compared to Claude.ai, ChatGPT, Perplexity, or Okara.

**The goal of this prompt is NOT to rebuild components.** It's to apply VISUAL POLISH to what exists. Think of it as painting a house that has all the rooms built but bare drywall.

## Implementation status

Applied in-repo: `globals.css` depth/noise/vars; `ChatInput` tier row below large input; `UserMessage`/`AssistantMessage`/`DecisionCard` avatars and premium surfaces; `HeroSection` + `SUGGESTION_CHIP_CONFIG`; `LandingPage` alternating sections; `Sidebar` active + upgrade card polish; `HowItWorks` marketing heading + divider.

See git history for file-level diffs.

---

(Root cause analysis, priority table, and original CSS/JSX reference blocks were preserved in the authoring prompt — consult repo history or design tokens in `app/globals.css` for the canonical styles.)
