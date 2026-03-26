# PF-12 — Consensus Tracker (Live Debate Dashboard)

Live dashboard showing consensus forming in real-time: stacked bars (PROCEED/DELAY/ABANDON), round counter, confidence metrics, sparkline history, compact variant.

## Components
- ConsensusTracker (full + compact) — stacked animated bars, round counter, positions changed, confidence, key disagreement
- ConsensusSparkline — SVG mini sparkline of consensus history across rounds
- useConsensusHistory hook — accumulates consensus snapshots from store

## Dependencies
- useSimulationStore.consensus (ConsensusState)
- verdictColors from design tokens
- shadcn Tooltip
- Framer Motion for bar animations
