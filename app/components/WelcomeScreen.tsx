"use client";
import { Zap, Search, ChevronRight } from "lucide-react";
import { t } from "../lib/i18n";
import { useIsMobile } from "../lib/useIsMobile";
import ChatInput, { type FileAttachment } from "./ChatInput";
import { SignuxIcon } from "./SignuxIcon";

type WelcomeScreenProps = {
  profileName: string;
  input: string;
  setInput: (v: string) => void;
  onSend: (text?: string) => void;
  loading: boolean;
  attachments: FileAttachment[];
  onAttachmentsChange: (atts: FileAttachment[]) => void;
  onToast?: (msg: string, type: "success" | "error" | "info") => void;
  onSwitchToSimulate?: () => void;
  onSwitchToResearch?: () => void;
};

const PARTICLES = [
  { top: "18%", left: "22%", size: 1.5, anim: "float1", dur: "8s", delay: "0s" },
  { top: "35%", left: "75%", size: 1, anim: "float2", dur: "10s", delay: "1s" },
  { top: "65%", left: "15%", size: 1.5, anim: "float1", dur: "12s", delay: "2s" },
  { top: "50%", left: "85%", size: 1, anim: "float2", dur: "9s", delay: "3s" },
  { top: "80%", left: "45%", size: 1, anim: "float1", dur: "11s", delay: "1.5s" },
];

const CAPABILITIES = [
  "Offshore structures",
  "China operations",
  "Crypto compliance",
  "Tax optimization",
  "Trade logistics",
];

export default function WelcomeScreen({
  input, setInput, onSend, loading, attachments, onAttachmentsChange,
  onToast, onSwitchToSimulate, onSwitchToResearch,
}: WelcomeScreenProps) {
  const isMobile = useIsMobile();
  const particleCount = isMobile ? 3 : 5;

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", flex: 1,
      minHeight: "calc(100vh - 60px)",
      padding: isMobile ? "32px 16px 24px" : "40px 32px",
      position: "relative", overflow: "hidden",
    }}>
      {/* Floating particles */}
      {PARTICLES.slice(0, particleCount).map((p, i) => (
        <div key={`p-${i}`} style={{
          position: "absolute", top: p.top, left: p.left,
          width: p.size, height: p.size, borderRadius: "50%",
          background: "rgba(255,255,255,0.15)",
          pointerEvents: "none",
          animation: `${p.anim} ${p.dur} ease-in-out infinite`,
          animationDelay: p.delay,
        }} />
      ))}

      {/* Radial glow */}
      <div style={{
        position: "absolute", top: "30%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 600, height: 600,
        background: "radial-gradient(circle, rgba(212,175,55,0.015) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ maxWidth: 680, width: "100%", position: "relative", zIndex: 1 }}>

        {/* ── HEADER ── */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          marginBottom: 52, animation: "fadeIn 0.4s ease-out",
        }}>
          {/* Logo row */}
          <div style={{
            display: "flex", alignItems: "center",
            gap: isMobile ? 12 : 16,
          }}>
            {/* Icon with ring */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{
                position: "absolute", inset: -8, borderRadius: "50%",
                border: "1px solid rgba(212,175,55,0.06)",
                animation: "ringPulse 4s ease-in-out infinite",
              }} />
              <SignuxIcon variant="gold" size={isMobile ? 44 : 52} />
            </div>

            {/* Text */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 0 }}>
              <span style={{
                fontFamily: "var(--font-brand)",
                fontSize: isMobile ? 40 : 48,
                fontWeight: 700, letterSpacing: 6,
                color: "#fff",
              }}>
                SIGNUX
              </span>
              <span style={{
                fontFamily: "var(--font-brand)",
                fontSize: isMobile ? 40 : 48,
                fontWeight: 300, letterSpacing: 4,
                color: "#fff", opacity: 0.25,
                marginLeft: 8,
              }}>
                AI
              </span>
            </div>
          </div>

          {/* Tagline */}
          <div style={{
            marginTop: 16, fontSize: 13,
            color: "rgba(255,255,255,0.3)",
            letterSpacing: 0.5,
          }}>
            Operational intelligence for global operators
          </div>
        </div>

        {/* ── INPUT ── */}
        <div style={{
          width: "100%", marginBottom: 16,
          animation: "fadeIn 0.5s ease-out",
        }}>
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={() => onSend()}
            loading={loading}
            showDisclaimer={false}
            attachments={attachments}
            onAttachmentsChange={onAttachmentsChange}
            onToast={onToast}
            placeholder="Ask about structures, regulations, crypto, logistics, tax optimization..."
          />
        </div>

        {/* ── BANNERS ── */}
        <div style={{
          display: "flex", flexDirection: "column", gap: 8,
          width: "100%", maxWidth: 680,
          animation: "fadeIn 0.6s ease-out",
        }}>
          {/* Simulate banner */}
          {onSwitchToSimulate && (
            <button
              onClick={onSwitchToSimulate}
              style={{
                width: "100%", padding: "14px 18px",
                background: "linear-gradient(135deg, rgba(212,175,55,0.03), rgba(212,175,55,0.01))",
                border: "1px solid rgba(212,175,55,0.08)",
                borderRadius: 14, display: "flex", alignItems: "center", gap: 14,
                cursor: "pointer", transition: "all 200ms", textAlign: "left",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "rgba(212,175,55,0.18)";
                e.currentTarget.style.background = "rgba(212,175,55,0.05)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "rgba(212,175,55,0.08)";
                e.currentTarget.style.background = "linear-gradient(135deg, rgba(212,175,55,0.03), rgba(212,175,55,0.01))";
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "rgba(212,175,55,0.08)", display: "flex",
                alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <Zap size={18} style={{ color: "#D4AF37" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>
                  Ecosystem Simulation
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", lineHeight: 1.4 }}>
                  Stress-test your operation with 15 specialist agents
                </div>
              </div>
              <ChevronRight size={16} style={{ color: "rgba(255,255,255,0.15)", flexShrink: 0 }} />
            </button>
          )}

          {/* Research banner */}
          {onSwitchToResearch && (
            <button
              onClick={onSwitchToResearch}
              style={{
                width: "100%", padding: "14px 18px",
                background: "linear-gradient(135deg, rgba(107,138,255,0.03), rgba(107,138,255,0.01))",
                border: "1px solid rgba(107,138,255,0.08)",
                borderRadius: 14, display: "flex", alignItems: "center", gap: 14,
                cursor: "pointer", transition: "all 200ms", textAlign: "left",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "rgba(107,138,255,0.18)";
                e.currentTarget.style.background = "rgba(107,138,255,0.05)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "rgba(107,138,255,0.08)";
                e.currentTarget.style.background = "linear-gradient(135deg, rgba(107,138,255,0.03), rgba(107,138,255,0.01))";
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "rgba(107,138,255,0.08)", display: "flex",
                alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <Search size={18} style={{ color: "#6B8AFF" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>
                  Deep Research
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", lineHeight: 1.4 }}>
                  Multi-source intelligence synthesis with citations
                </div>
              </div>
              <ChevronRight size={16} style={{ color: "rgba(255,255,255,0.15)", flexShrink: 0 }} />
            </button>
          )}
        </div>

        {/* ── CAPABILITY TAGS ── */}
        <div style={{
          display: "flex", flexWrap: "wrap", justifyContent: "center",
          gap: isMobile ? 16 : 24,
          marginTop: 32,
          animation: "fadeIn 0.7s ease-out",
        }}>
          {CAPABILITIES.map(cap => (
            <div key={cap} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 3, height: 3, borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
              }} />
              <span style={{
                fontSize: 11, color: "rgba(255,255,255,0.2)",
                letterSpacing: 0.3,
              }}>
                {cap}
              </span>
            </div>
          ))}
        </div>

        {/* ── DISCLAIMER ── */}
        <div style={{
          textAlign: "center", marginTop: 20,
          fontSize: 11, color: "rgba(255,255,255,0.12)",
          animation: "fadeIn 0.8s ease-out",
        }}>
          {t("common.disclaimer")}
        </div>

      </div>
    </div>
  );
}
