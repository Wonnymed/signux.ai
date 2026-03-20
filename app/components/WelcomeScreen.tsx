"use client";
import { Zap, Shield, Rocket, Globe, TrendingUp, ChevronDown } from "lucide-react";
import { t } from "../lib/i18n";
import { useIsMobile } from "../lib/useIsMobile";
import ChatInput, { type FileAttachment } from "./ChatInput";
import { SignuxIcon } from "./SignuxIcon";
import type { Mode } from "../lib/types";
import TemplateLibrary from "./TemplateLibrary";

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

const MODE_BANNERS: {
  key: Mode; icon: any; label: string; desc: string;
  color: string; bg: string; border: string;
}[] = [
  { key: "simulate", icon: Zap, label: "Simulate", desc: "See what happens before it happens", color: "#D4AF37", bg: "rgba(212,175,55,0.04)", border: "rgba(212,175,55,0.12)" },
  { key: "intel", icon: Shield, label: "Intel", desc: "Know what others don't", color: "#DC2626", bg: "rgba(220,38,38,0.04)", border: "rgba(220,38,38,0.12)" },
  { key: "launchpad", icon: Rocket, label: "Launchpad", desc: "Build in 90 days", color: "#14B8A6", bg: "rgba(20,184,166,0.04)", border: "rgba(20,184,166,0.12)" },
  { key: "globalops", icon: Globe, label: "Global Ops", desc: "Expand anywhere", color: "#22C55E", bg: "rgba(34,197,94,0.04)", border: "rgba(34,197,94,0.12)" },
  { key: "invest", icon: TrendingUp, label: "Invest", desc: "Get the real numbers", color: "#A855F7", bg: "rgba(168,85,247,0.04)", border: "rgba(168,85,247,0.12)" },
];

export default function WelcomeScreen({
  input, setInput, onSend, loading, attachments, onAttachmentsChange,
  onToast, onSwitchMode, lang,
}: WelcomeScreenProps) {
  const isMobile = useIsMobile();

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center",
      minHeight: isMobile ? "calc(100vh - 52px)" : "calc(100vh - 20px)",
      padding: isMobile ? "24px 16px 16px" : "40px 24px 24px",
      position: "relative",
    }}>
      <div className="temporal-grid" />
      <div className="prediction-horizon" />
      {/* Radial glow */}
      <div style={{
        position: "absolute", top: "30%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 600, height: 600,
        background: "radial-gradient(circle, var(--glow-color) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{
        maxWidth: 640, width: "100%", position: "relative", zIndex: 1,
        display: "flex", flexDirection: "column", alignItems: "center",
      }}>

        {/* Logo row */}
        <div style={{
          display: "flex", alignItems: "center", gap: isMobile ? 10 : 14,
          marginBottom: isMobile ? 8 : 14,
        }}>
          <SignuxIcon variant="gold" size={isMobile ? 22 : 28} />
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <span style={{
              fontFamily: "var(--font-brand)", fontSize: isMobile ? 16 : 22,
              fontWeight: 700, letterSpacing: isMobile ? 3 : 5, color: "var(--text-primary)",
            }}>
              SIGNUX
            </span>
            <span style={{
              fontFamily: "var(--font-brand)", fontSize: isMobile ? 16 : 22,
              fontWeight: 300, letterSpacing: isMobile ? 2 : 3,
              color: "var(--text-primary)", opacity: 0.22, marginLeft: 6,
            }}>
              AI
            </span>
          </div>
        </div>

        {/* Tagline — hero element */}
        <p style={{
          fontSize: isMobile ? 22 : 32, color: "var(--text-primary)",
          maxWidth: isMobile ? 300 : 500,
          textAlign: "center", lineHeight: 1.3, marginBottom: isMobile ? 16 : 28,
          fontFamily: "var(--font-accent)", fontStyle: "italic",
          fontWeight: 400,
        }}>
          See what happens before it happens
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

        {/* Mode banners */}
        <div style={{
          display: "flex", gap: 6, width: "100%",
          marginTop: isMobile ? 10 : 16,
          overflowX: isMobile ? "auto" : undefined,
          WebkitOverflowScrolling: isMobile ? "touch" : undefined,
          scrollbarWidth: "none",
          paddingBottom: isMobile ? 4 : 0,
          ...(isMobile ? {} : {
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
          }),
        }}>
          {MODE_BANNERS.map(m => {
            const Icon = m.icon;
            return (
              <button key={m.key} onClick={() => onSwitchMode?.(m.key)} className="predict-button" style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: isMobile ? "8px 12px" : "10px 10px",
                borderRadius: 10, cursor: "pointer",
                border: `1px solid ${m.border}`, background: m.bg,
                textAlign: "left",
                minHeight: 44, whiteSpace: "nowrap",
                flex: isMobile ? "0 0 auto" : undefined,
                overflow: "hidden",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = m.color; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = m.border; }}
                onMouseMove={e => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty("--mouse-x", `${((e.clientX - rect.left) / rect.width) * 100}%`);
                  e.currentTarget.style.setProperty("--mouse-y", `${((e.clientY - rect.top) / rect.height) * 100}%`);
                }}
              >
                <Icon size={14} style={{ color: m.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)" }}>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Template Library */}
        <div style={{ width: "100%" }}>
          <TemplateLibrary onSelectTemplate={(template) => {
            setInput(template.prompt);
            if (template.mode && onSwitchMode) onSwitchMode(template.mode as Mode);
          }} />
        </div>

        {/* Trust line */}
        <p style={{
          fontSize: 11, color: "var(--text-tertiary)", marginTop: isMobile ? 14 : 24,
          opacity: 0.5, textAlign: "center",
        }}>
          Free to start · No credit card required
        </p>

        {/* Scroll down arrow */}
        <button
          onClick={() => {
            document.getElementById("landing-start")?.scrollIntoView({ behavior: "smooth" });
          }}
          style={{
            marginTop: isMobile ? 12 : 20,
            width: 36, height: 36, borderRadius: "50%",
            border: "1px solid var(--border-secondary)",
            background: "transparent", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--text-tertiary)",
            animation: "bounce 2s ease-in-out infinite",
          }}
        >
          <ChevronDown size={16} />
        </button>
      </div>
    </div>
  );
}
