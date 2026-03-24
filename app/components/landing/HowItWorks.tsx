"use client";

import {
  MessageCircle,
  FileSearch,
  Users,
  GitMerge,
  Target,
} from "lucide-react";
import type { ComponentType } from "react";

type Step = {
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  title: string;
  description: string;
};

const STEPS: Step[] = [
  {
    icon: MessageCircle,
    title: "Your Question",
    description: "Type any business decision",
  },
  {
    icon: FileSearch,
    title: "Research Plan",
    description: "Chair decomposes into sub-tasks",
  },
  {
    icon: Users,
    title: "Agent Debate",
    description: "10 specialists debate adversarially",
  },
  {
    icon: GitMerge,
    title: "Convergence",
    description: "Final positions declared",
  },
  {
    icon: Target,
    title: "Decision Object",
    description: "Probability, risk, action — all cited",
  },
];

export default function HowItWorks() {
  return (
    <section
      className="how-it-works"
      style={{
        width: "100%",
        background: "linear-gradient(180deg, #0F0A1A 0%, #1A0F2E 100%)",
        padding: "96px 24px",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 64 }}>
        <h2
          style={{
            fontSize: 28,
            fontWeight: 300,
            color: "#FFFFFF",
            lineHeight: 1.3,
            margin: 0,
          }}
        >
          How Octux Works
        </h2>
        <p
          style={{
            fontSize: 14,
            fontWeight: 400,
            color: "rgba(255,255,255,0.60)",
            marginTop: 12,
          }}
        >
          From question to structured decision in 60 seconds
        </p>
      </div>

      {/* Steps */}
      <div className="how-it-works-steps">
        {STEPS.map((step, i) => (
          <div key={step.title} style={{ display: "contents" }}>
            {/* Step node */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                minWidth: 120,
                maxWidth: 140,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "rgba(124,58,237,0.20)",
                  border: "1px solid rgba(124,58,237,0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#A78BFA",
                  flexShrink: 0,
                }}
              >
                <step.icon size={20} strokeWidth={1.5} />
              </div>
              <div style={{ textAlign: "center" }}>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: "#FFFFFF",
                    margin: 0,
                    lineHeight: 1.4,
                  }}
                >
                  {step.title}
                </p>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 400,
                    color: "rgba(255,255,255,0.50)",
                    margin: "4px 0 0",
                    lineHeight: 1.5,
                  }}
                >
                  {step.description}
                </p>
              </div>
            </div>

            {/* Arrow */}
            {i < STEPS.length - 1 && (
              <div className="how-it-works-arrow">
                <span className="arrow-h">→</span>
                <span className="arrow-v">↓</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <style>{`
        .how-it-works-steps {
          display: flex;
          align-items: flex-start;
          justify-content: center;
          max-width: 900px;
          margin: 0 auto;
        }
        .how-it-works-arrow {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 48px;
          padding: 0 8px;
          color: rgba(255,255,255,0.30);
          font-size: 18px;
          flex-shrink: 0;
          align-self: flex-start;
        }
        .arrow-v { display: none; }
        .arrow-h { display: inline; }

        @media (max-width: 640px) {
          .how-it-works-steps {
            flex-direction: column !important;
            align-items: center !important;
          }
          .how-it-works-arrow {
            height: auto;
            padding: 8px 0;
          }
          .arrow-h { display: none; }
          .arrow-v { display: inline; }
        }
      `}</style>
    </section>
  );
}
