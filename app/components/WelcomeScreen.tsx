"use client";
import { Zap, Shield, Rocket, Globe, TrendingUp } from "lucide-react";
import { t } from "../lib/i18n";
import { useIsMobile } from "../lib/useIsMobile";
import ChatInput, { type FileAttachment } from "./ChatInput";
import { SignuxIcon } from "./SignuxIcon";
import type { Mode } from "../lib/types";

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
  onSwitchMode?: (mode: Mode) => void;
  onOpenThreatRadar?: () => void;
  onOpenDealXRay?: () => void;
  onOpenWarGame?: () => void;
  onOpenCausalMap?: () => void;
  onOpenScenarios?: () => void;
  lang?: string;
};

/* ═══ Particles ═══ */
const PARTICLES = [
  { top: "15%", left: "20%", size: 1.5, anim: "float1", dur: "8s", delay: "0s" },
  { top: "30%", left: "78%", size: 1, anim: "float2", dur: "10s", delay: "1s" },
  { top: "60%", left: "12%", size: 1.5, anim: "float1", dur: "12s", delay: "2s" },
  { top: "55%", left: "88%", size: 1, anim: "float2", dur: "9s", delay: "3s" },
  { top: "82%", left: "42%", size: 1, anim: "float1", dur: "11s", delay: "1.5s" },
];

const MODE_BANNERS: {
  key: Mode; icon: any; label: string; desc: string;
  color: string; bg: string; border: string;
}[] = [
  { key: "simulate", icon: Zap, label: "Simulate", desc: "Stress-test with AI agents", color: "#D4AF37", bg: "rgba(212,175,55,0.04)", border: "rgba(212,175,55,0.12)" },
  { key: "intel", icon: Shield, label: "Intel", desc: "Operational intelligence", color: "#DC2626", bg: "rgba(220,38,38,0.04)", border: "rgba(220,38,38,0.12)" },
  { key: "launchpad", icon: Rocket, label: "Launchpad", desc: "Zero to business", color: "#14B8A6", bg: "rgba(20,184,166,0.04)", border: "rgba(20,184,166,0.12)" },
  { key: "globalops", icon: Globe, label: "Global Ops", desc: "Cross-border intel", color: "#22C55E", bg: "rgba(34,197,94,0.04)", border: "rgba(34,197,94,0.12)" },
  { key: "invest", icon: TrendingUp, label: "Invest", desc: "Quantitative deals", color: "#A855F7", bg: "rgba(168,85,247,0.04)", border: "rgba(168,85,247,0.12)" },
];

export default function WelcomeScreen({
  input, setInput, onSend, loading, attachments, onAttachmentsChange,
  onToast, onSwitchMode, onOpenThreatRadar, onOpenDealXRay, onOpenWarGame, onOpenCausalMap, onOpenScenarios, lang,
}: WelcomeScreenProps) {
  const isMobile = useIsMobile();
  const particleCount = isMobile ? 3 : 5;

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", flex: 1, minHeight: 0,
      padding: isMobile ? "24px 16px" : "40px 24px",
      position: "relative", overflow: "hidden",
    }}>
      {/* Particles */}
      {PARTICLES.slice(0, particleCount).map((p, i) => (
        <div key={`p-${i}`} style={{
          position: "absolute", top: p.top, left: p.left,
          width: p.size, height: p.size, borderRadius: "50%",
          background: "var(--particle-color)", pointerEvents: "none",
          animation: `${p.anim} ${p.dur} ease-in-out infinite`,
          animationDelay: p.delay,
        }} />
      ))}

      {/* Radial glow */}
      <div style={{
        position: "absolute", top: "30%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 700, height: 700,
        background: "radial-gradient(circle, var(--glow-color) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{
        maxWidth: 680, width: "100%", position: "relative", zIndex: 1,
        display: "flex", flexDirection: "column", alignItems: "center",
      }}>

        {/* Logo row */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{
              position: "absolute", inset: -6, borderRadius: "50%",
              border: "1px solid rgba(212,175,55,0.06)",
              animation: "ringPulse 4s ease-in-out infinite",
            }} />
            <SignuxIcon variant="gold" size={44} />
          </div>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <span style={{ fontFamily: "var(--font-brand)", fontSize: isMobile ? 36 : 40, fontWeight: 700, letterSpacing: 5, color: "var(--text-primary)" }}>
              SIGNUX
            </span>
            <span style={{ fontFamily: "var(--font-brand)", fontSize: isMobile ? 36 : 40, fontWeight: 300, letterSpacing: 3, color: "var(--text-primary)", opacity: 0.22, marginLeft: 8 }}>
              AI
            </span>
          </div>
        </div>

        {/* Tagline */}
        <p style={{
          fontSize: 14, color: "var(--text-secondary)", maxWidth: 380,
          textAlign: "center", lineHeight: 1.5, marginBottom: 36,
        }}>
          Think through any business decision before you make it
        </p>

        {/* Input */}
        <div style={{ width: "100%", marginBottom: 8 }}>
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={() => onSend()}
            loading={loading}
            showDisclaimer={false}
            attachments={attachments}
            onAttachmentsChange={onAttachmentsChange}
            onToast={onToast}
            placeholder={t("chat.placeholder")}
          />
        </div>

        {/* Mode banners — grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5, 1fr)",
          gap: 6, width: "100%", marginTop: 20,
        }}>
          {MODE_BANNERS.map(m => {
            const Icon = m.icon;
            return (
              <button key={m.key} onClick={() => onSwitchMode?.(m.key)} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 10px", borderRadius: 10, cursor: "pointer",
                border: `1px solid ${m.border}`, background: m.bg,
                transition: "all 200ms", textAlign: "left",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = m.color; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = m.border; }}
              >
                <Icon size={14} style={{ color: m.color, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)" }}>{m.label}</div>
                  <div style={{ fontSize: 9, color: "var(--text-tertiary)", marginTop: 1 }}>{m.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Domain-powered templates */}
        <div style={{ width: "100%", marginTop: 12 }}>
          <div style={{
            fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1.5,
            textTransform: "uppercase", color: "var(--text-tertiary)",
            marginBottom: 8, opacity: 0.5,
          }}>
            Quick starts powered by intelligence
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 6,
          }}>
            {([
              { q: "Is this deal legit? I need to evaluate a partnership offer", domains: "deception detection · risk intel", color: "#F59E0B" },
              { q: "How will my competitors react if I launch this?", domains: "game theory · competitive intel", color: "#8B5CF6" },
              { q: "What's the biggest threat to my business right now?", domains: "threat modeling · cybersecurity · geopolitics", color: "#DC2626" },
              { q: "My revenue dropped — was it the price change or something else?", domains: "causal reasoning · pricing economics", color: "#06B6D4" },
              { q: "I have a funding meeting tomorrow. Help me prepare.", domains: "negotiation warfare · BATNA · game theory", color: "#F97316" },
              { q: "What could happen to my market in the next 12 months?", domains: "scenario planning · geopolitics · risk intel", color: "#22C55E" },
            ] as const).map((tmpl, i) => (
              <button
                key={i}
                onClick={() => onSend(tmpl.q)}
                style={{
                  display: "flex", flexDirection: "column", gap: 4,
                  padding: "10px 12px", borderRadius: 8,
                  border: "1px solid var(--card-border)", background: "var(--card-bg)",
                  cursor: "pointer", textAlign: "left",
                  transition: "border-color 200ms",
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = `${tmpl.color}40`)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--card-border)")}
              >
                <span style={{ fontSize: 12, color: "var(--text-primary)", lineHeight: 1.4 }}>
                  {tmpl.q}
                </span>
                <span style={{
                  fontSize: 9, color: tmpl.color, fontFamily: "var(--font-mono)",
                  letterSpacing: 0.5, opacity: 0.7,
                }}>
                  {tmpl.domains}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 20, opacity: 0.5, textAlign: "center" }}>
          Always verify critical decisions with qualified professionals.
        </p>
      </div>
    </div>
  );
}
