"use client";
import { useState } from "react";

export type Template = {
  id: string;
  name: string;
  description: string;
  prompt: string;
  mode?: string;
  tool?: string;
};

const TEMPLATES: { category: string; icon: string; templates: Template[] }[] = [
  {
    category: "Due Diligence",
    icon: "\uD83D\uDD0D",
    templates: [
      {
        id: "dd-partnership",
        name: "Partnership Due Diligence",
        description: "Evaluate a potential partner or deal",
        prompt: "I'm evaluating a partnership with [COMPANY]. They offer [TERMS]. Help me run due diligence: check for red flags, assess alignment, evaluate the deal structure, and recommend go/no-go.",
        mode: "intel",
        tool: "xray",
      },
      {
        id: "dd-investment",
        name: "Investment Analysis",
        description: "Full analysis of an investment opportunity",
        prompt: "I'm considering investing [AMOUNT] in [OPPORTUNITY]. Analyze the expected ROI, risks, market conditions, and give me a professional investment recommendation.",
        mode: "invest",
      },
    ],
  },
  {
    category: "Competition",
    icon: "\u2694\uFE0F",
    templates: [
      {
        id: "comp-response",
        name: "Competitor Response Prediction",
        description: "Predict how competitors will react",
        prompt: "I'm planning to [YOUR ACTION]. My main competitors are [COMPETITORS]. Predict how each will respond and what I should prepare for.",
        mode: "simulate",
      },
      {
        id: "comp-wargame",
        name: "Competitive War Game",
        description: "Full competitive simulation",
        prompt: "Run a war game for my business [DESCRIPTION] against [COMPETITOR]. Simulate their likely moves for the next 6 months and recommend counter-strategies.",
        mode: "intel",
        tool: "wargame",
      },
    ],
  },
  {
    category: "Launch",
    icon: "\uD83D\uDE80",
    templates: [
      {
        id: "launch-validate",
        name: "Idea Validation",
        description: "Test if your business idea will work",
        prompt: "I want to start [BUSINESS IDEA] with a budget of [BUDGET]. Simulate whether this will work: test the market, find risks, estimate ROI, and give me a viability score.",
        mode: "simulate",
      },
      {
        id: "launch-pricing",
        name: "Pricing Strategy",
        description: "Find the optimal price for your product",
        prompt: "I'm launching [PRODUCT/SERVICE] targeting [AUDIENCE]. Similar products charge [COMPETITOR PRICES]. Help me find the optimal price point considering value, competition, and willingness to pay.",
        mode: "chat",
      },
    ],
  },
  {
    category: "Risk & Protection",
    icon: "\uD83D\uDEE1\uFE0F",
    templates: [
      {
        id: "risk-threat",
        name: "Threat Assessment",
        description: "Map all threats to your business",
        prompt: "My business is [DESCRIPTION] in the [INDUSTRY] sector. Map all current threats: market, regulatory, operational, cyber, and geopolitical. Rate severity of each.",
        mode: "intel",
        tool: "threats",
      },
      {
        id: "risk-negotiation",
        name: "Negotiation Prep",
        description: "Prepare for a critical negotiation",
        prompt: "I have a [TYPE] negotiation with [COUNTERPARTY] about [SUBJECT]. Their position is [THEIR STANCE]. My ideal outcome is [YOUR GOAL]. Prepare me with strategy, BATNA, and practice scenarios.",
        mode: "intel",
        tool: "negotiate",
      },
    ],
  },
  {
    category: "Growth",
    icon: "\uD83D\uDCC8",
    templates: [
      {
        id: "growth-market",
        name: "Market Entry Strategy",
        description: "Plan expansion into a new market",
        prompt: "I want to expand my [BUSINESS] into [NEW MARKET/COUNTRY]. Analyze the opportunity: market size, regulations, competition, entry strategy, and timeline.",
        mode: "simulate",
      },
      {
        id: "growth-scenario",
        name: "Scenario Planning",
        description: "Plan for multiple futures",
        prompt: "My business is [DESCRIPTION]. Create 4 scenarios for the next 12 months: best case, likely case, worst case, and black swan. For each, show what triggers it and how to respond.",
        mode: "intel",
        tool: "scenarios",
      },
    ],
  },
];

export default function TemplateLibrary({ onSelectTemplate }: { onSelectTemplate: (template: Template) => void }) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{
        display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12,
      }}>
        {TEMPLATES.map((cat) => (
          <button key={cat.category} onClick={() => setSelectedCategory(
            selectedCategory === cat.category ? null : cat.category
          )} style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "6px 12px", borderRadius: 50,
            border: `1px solid ${selectedCategory === cat.category ? "var(--accent)" : "var(--border-secondary)"}`,
            background: selectedCategory === cat.category ? "rgba(212,175,55,0.06)" : "transparent",
            color: selectedCategory === cat.category ? "var(--accent)" : "var(--text-secondary)",
            fontSize: 12, cursor: "pointer", transition: "all 150ms",
          }}
          onMouseEnter={e => { if (selectedCategory !== cat.category) e.currentTarget.style.borderColor = "var(--accent)"; }}
          onMouseLeave={e => { if (selectedCategory !== cat.category) e.currentTarget.style.borderColor = "var(--border-secondary)"; }}
          >
            {cat.icon} {cat.category}
          </button>
        ))}
      </div>

      {selectedCategory && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, animation: "fadeIn 0.15s ease" }}>
          {TEMPLATES.find(c => c.category === selectedCategory)?.templates.map((t) => (
            <button key={t.id} onClick={() => onSelectTemplate(t)} style={{
              textAlign: "left", padding: "10px 14px", borderRadius: 10,
              border: "1px solid var(--border-secondary)", background: "var(--card-bg)",
              cursor: "pointer", transition: "all 150ms",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.background = "var(--card-hover-bg)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "var(--border-secondary)";
              e.currentTarget.style.background = "var(--card-bg)";
            }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>
                {t.name}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                {t.description}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
