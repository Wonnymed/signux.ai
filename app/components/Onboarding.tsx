"use client";
import { useState } from "react";
import { Rocket, Search, Zap, TrendingUp, Globe, MessageSquare, ChevronRight, Shield, Hammer, UserCheck, Swords } from "lucide-react";
import { SignuxIcon } from "./SignuxIcon";
import type { Mode } from "../lib/types";
import { ENGINES } from "../lib/engines";
import { updateProfile } from "../lib/profile";

type OnboardingProps = {
  onComplete: (mode: Mode, suggestedPrompt?: string) => void;
  onSkip: () => void;
};

const GOALS = [
  { label: "I'm starting a business", icon: Hammer, mode: "build" as Mode, color: ENGINES.build.color, challenge: "validation" },
  { label: "I need to make a decision", icon: Zap, mode: "simulate" as Mode, color: ENGINES.simulate.color, challenge: "decision" },
  { label: "I'm researching a market", icon: Swords, mode: "compete" as Mode, color: ENGINES.compete.color, challenge: "research" },
  { label: "I want to grow revenue", icon: TrendingUp, mode: "grow" as Mode, color: ENGINES.grow.color, challenge: "growth" },
  { label: "I'm evaluating a hire", icon: UserCheck, mode: "hire" as Mode, color: ENGINES.hire.color, challenge: "evaluation" },
  { label: "I need to protect my business", icon: Shield, mode: "protect" as Mode, color: ENGINES.protect.color, challenge: "protection" },
  { label: "Just exploring", icon: MessageSquare, mode: "chat" as Mode, color: "var(--text-tertiary)", challenge: "exploring" },
];

const INDUSTRIES = [
  { label: "Tech / SaaS", value: "tech" },
  { label: "E-commerce / Retail", value: "ecommerce" },
  { label: "Finance / Investing", value: "finance" },
  { label: "Services / Consulting", value: "services" },
  { label: "Food / Hospitality", value: "food" },
  { label: "Other", value: "other" },
];

const LEVELS = [
  { label: "First-time entrepreneur", value: "first-time" },
  { label: "Experienced founder", value: "experienced" },
  { label: "Corporate professional", value: "corporate" },
  { label: "Student / Learning", value: "student" },
];

const MODE_DESCRIPTIONS: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(ENGINES).map(([id, e]) => [id, e.subtitle])
  ),
  chat: "Chat is your open canvas — ask anything about business, strategy, or operations.",
};

const MODE_LABELS: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(ENGINES).map(([id, e]) => [id, e.name])
  ),
  chat: "Chat",
};

const CHALLENGE_SUGGESTIONS: Record<string, string> = {
  validation: "I have a business idea I want to test. Can you simulate whether it will work?",
  decision: "I need to make an important business decision. Help me analyze all angles.",
  research: "I need deep research on my market and competitors. What should I know?",
  growth: "I need to grow revenue faster. What are my best levers?",
  evaluation: "I'm evaluating a hire. Can you help me assess timing and fit?",
  protection: "What are the biggest risks to my business right now?",
  exploring: "",
};

export default function Onboarding({ onComplete, onSkip }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState<typeof GOALS[number] | null>(null);
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");

  const finish = () => {
    localStorage.setItem("signux_onboarded", "true");
    if (selectedLevel) localStorage.setItem("signux_experience", selectedLevel);

    // Merge into existing profile without overwriting
    const industryLabel = INDUSTRIES.find(i => i.value === selectedIndustry)?.label || selectedIndustry;
    const challengeLabel = selectedGoal?.label || "";
    updateProfile({
      operations: [selectedIndustry].filter(Boolean),
      aboutYou: [
        industryLabel ? `Industry: ${industryLabel}` : "",
        challengeLabel ? `Primary goal: ${challengeLabel}` : "",
        selectedLevel ? `Experience: ${LEVELS.find(l => l.value === selectedLevel)?.label || selectedLevel}` : "",
      ].filter(Boolean).join(". "),
    });

    const suggestion = CHALLENGE_SUGGESTIONS[selectedGoal?.challenge || ""] || "";
    onComplete(selectedGoal?.mode || "chat", suggestion);
  };

  const totalSteps = 4;

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "40px 20px", minHeight: 0,
      animation: "fadeIn 0.3s ease-out",
    }}>
      <div style={{ maxWidth: 520, width: "100%", position: "relative" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <SignuxIcon variant="gold" size={36} />
        </div>

        {/* Step 0: Goal */}
        {step === 0 && (
          <div style={{ animation: "fadeIn 0.25s ease-out" }}>
            <div style={{
              fontSize: 22, fontWeight: 600, color: "var(--text-primary)",
              textAlign: "center", marginBottom: 8, lineHeight: 1.3,
            }}>
              What brings you here?
            </div>
            <div style={{
              fontSize: 13, color: "var(--text-secondary)",
              textAlign: "center", marginBottom: 28,
            }}>
              This helps us recommend the right starting point.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {GOALS.map(g => {
                const Icon = g.icon;
                const selected = selectedGoal?.challenge === g.challenge;
                return (
                  <button
                    key={g.challenge}
                    onClick={() => { setSelectedGoal(g); setStep(1); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "14px 16px", borderRadius: 10,
                      border: selected ? `1px solid ${g.color}` : "1px solid var(--card-border)",
                      background: selected ? `${g.color}08` : "var(--card-bg)",
                      cursor: "pointer", transition: "all 150ms",
                      textAlign: "left",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = g.color; }}
                    onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = "var(--card-border)"; }}
                  >
                    <Icon size={16} style={{ color: g.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 14, color: "var(--text-primary)", flex: 1 }}>{g.label}</span>
                    <ChevronRight size={14} style={{ color: "var(--text-tertiary)" }} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 1: Industry */}
        {step === 1 && (
          <div style={{ animation: "fadeIn 0.25s ease-out" }}>
            <div style={{
              fontSize: 22, fontWeight: 600, color: "var(--text-primary)",
              textAlign: "center", marginBottom: 8, lineHeight: 1.3,
            }}>
              What&apos;s your industry?
            </div>
            <div style={{
              fontSize: 13, color: "var(--text-secondary)",
              textAlign: "center", marginBottom: 28,
            }}>
              We&apos;ll personalize examples and insights for you.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {INDUSTRIES.map(ind => {
                const selected = selectedIndustry === ind.value;
                return (
                  <button
                    key={ind.value}
                    onClick={() => { setSelectedIndustry(ind.value); setStep(2); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "14px 16px", borderRadius: 10,
                      border: selected ? "1px solid var(--accent)" : "1px solid var(--card-border)",
                      background: selected ? "var(--accent-bg)" : "var(--card-bg)",
                      cursor: "pointer", transition: "all 150ms",
                      textAlign: "left",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                    onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = "var(--card-border)"; }}
                  >
                    <span style={{ fontSize: 14, color: "var(--text-primary)" }}>{ind.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Experience */}
        {step === 2 && (
          <div style={{ animation: "fadeIn 0.25s ease-out" }}>
            <div style={{
              fontSize: 22, fontWeight: 600, color: "var(--text-primary)",
              textAlign: "center", marginBottom: 8, lineHeight: 1.3,
            }}>
              One more thing
            </div>
            <div style={{
              fontSize: 13, color: "var(--text-secondary)",
              textAlign: "center", marginBottom: 28,
            }}>
              What&apos;s your experience level?
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {LEVELS.map(l => {
                const selected = selectedLevel === l.value;
                return (
                  <button
                    key={l.value}
                    onClick={() => { setSelectedLevel(l.value); setStep(3); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "14px 16px", borderRadius: 10,
                      border: selected ? "1px solid var(--accent)" : "1px solid var(--card-border)",
                      background: selected ? "var(--accent-bg)" : "var(--card-bg)",
                      cursor: "pointer", transition: "all 150ms",
                      textAlign: "left",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                    onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = "var(--card-border)"; }}
                  >
                    <span style={{ fontSize: 14, color: "var(--text-primary)" }}>{l.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Recommendation */}
        {step === 3 && selectedGoal && (
          <div style={{ animation: "fadeIn 0.25s ease-out", textAlign: "center" }}>
            <div style={{
              fontSize: 22, fontWeight: 600, color: "var(--text-primary)",
              marginBottom: 8, lineHeight: 1.3,
            }}>
              You&apos;re all set
            </div>
            <div style={{
              fontSize: 13, color: "var(--text-secondary)",
              marginBottom: 32,
            }}>
              Based on your answers, we recommend:
            </div>

            <div style={{
              padding: 24, borderRadius: 14,
              border: `1px solid ${selectedGoal.color}`,
              background: `${selectedGoal.color}08`,
              marginBottom: 28,
            }}>
              {(() => { const Icon = selectedGoal.icon; return <Icon size={28} style={{ color: selectedGoal.color, marginBottom: 12 }} />; })()}
              <div style={{
                fontFamily: "var(--font-brand)", fontSize: 20, fontWeight: 700,
                letterSpacing: 2, color: "var(--text-primary)", marginBottom: 8,
              }}>
                {MODE_LABELS[selectedGoal.mode]}
              </div>
              <div style={{
                fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6,
              }}>
                {MODE_DESCRIPTIONS[selectedGoal.mode]}
              </div>
            </div>

            <button
              onClick={finish}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "14px 36px", borderRadius: 50,
                background: "var(--accent)", color: "var(--bg-primary)",
                fontFamily: "var(--font-brand)", fontWeight: 600, fontSize: 14,
                letterSpacing: 2, textTransform: "uppercase",
                border: "none", cursor: "pointer", transition: "all 200ms",
              }}
              onMouseEnter={e => { e.currentTarget.style.filter = "brightness(1.1)"; }}
              onMouseLeave={e => { e.currentTarget.style.filter = "none"; }}
            >
              Let&apos;s go
            </button>
          </div>
        )}

        {/* Step dots + Skip */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 8, marginTop: 32,
        }}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} style={{
              width: step === i ? 16 : 6, height: 6, borderRadius: 3,
              background: step === i ? "var(--accent)" : "var(--card-border)",
              transition: "all 200ms",
            }} />
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button
            onClick={() => {
              localStorage.setItem("signux_onboarded", "true");
              onSkip();
            }}
            style={{
              background: "none", border: "none",
              fontSize: 12, color: "var(--text-tertiary)", cursor: "pointer",
              textDecoration: "underline", textUnderlineOffset: 2,
            }}
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
