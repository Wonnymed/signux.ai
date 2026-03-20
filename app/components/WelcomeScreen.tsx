"use client";
import { Zap, Shield, Rocket, Globe, TrendingUp, ChevronDown } from "lucide-react";
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

const MODE_ICONS: { mode: Mode; icon: typeof Zap; color: string; tooltip: string }[] = [
  { mode: "simulate", icon: Zap, color: "#D4AF37", tooltip: "Simulate" },
  { mode: "intel", icon: Shield, color: "#EF4444", tooltip: "Intel" },
  { mode: "launchpad", icon: Rocket, color: "#14B8A6", tooltip: "Launchpad" },
  { mode: "globalops", icon: Globe, color: "#8B5CF6", tooltip: "Global Ops" },
  { mode: "invest", icon: TrendingUp, color: "#3B82F6", tooltip: "Invest" },
];

export default function WelcomeScreen({
  input, setInput, onSend, loading, attachments, onAttachmentsChange,
  onToast, onSwitchMode,
}: WelcomeScreenProps) {
  const isMobile = useIsMobile();

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: isMobile ? "calc(100vh - 52px)" : "calc(100vh - 60px)",
      padding: isMobile ? "0 16px" : "0 24px",
      maxWidth: 720,
      margin: "0 auto",
      width: "100%",
      position: "relative",
    }}>

      {/* ===== Spacer top (40/60 split) ===== */}
      <div style={{ flex: 0.4 }} />

      {/* ===== 1. LOGO ===== */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: isMobile ? 8 : 12,
        marginBottom: isMobile ? 36 : 48,
      }}>
        <SignuxIcon size={isMobile ? 44 : 64} />
        <div style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
        }}>
          <span style={{
            fontFamily: "var(--font-brand)",
            fontSize: isMobile ? 28 : 40,
            fontWeight: 800,
            letterSpacing: 8,
            color: "var(--text-primary)",
          }}>
            SIGNUX
          </span>
          <span style={{
            fontFamily: "var(--font-brand)",
            fontSize: isMobile ? 28 : 40,
            fontWeight: 300,
            letterSpacing: 8,
            color: "var(--text-tertiary)",
            opacity: 0.3,
          }}>
            AI
          </span>
        </div>
      </div>

      {/* ===== 2. INPUT — max 640px ===== */}
      <div style={{
        width: "100%",
        maxWidth: 640,
        marginBottom: 20,
      }}>
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={() => onSend()}
          loading={loading}
          showDisclaimer={false}
          showVoice={false}
          attachments={attachments}
          onAttachmentsChange={onAttachmentsChange}
          onToast={onToast}
          placeholder="Ask anything about your business..."
        />
      </div>

      {/* ===== 3. MODE ICONS — gold idle ===== */}
      <div style={{
        display: "flex",
        gap: isMobile ? 8 : 10,
        marginBottom: 32,
      }}>
        {MODE_ICONS.map(({ mode, icon: Icon, color, tooltip }) => (
          <button
            key={mode}
            onClick={() => onSwitchMode?.(mode)}
            data-tooltip={tooltip}
            className="tooltip-bottom"
            style={{
              width: isMobile ? 44 : 42,
              height: isMobile ? 44 : 42,
              borderRadius: 12,
              border: "1px solid rgba(212,175,55,0.2)",
              background: "rgba(212,175,55,0.04)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)",
              position: "relative",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = `${color}66`;
              e.currentTarget.style.background = `${color}14`;
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = `0 4px 12px ${color}1A`;
              const icon = e.currentTarget.querySelector("svg");
              if (icon) (icon as HTMLElement).style.color = color;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(212,175,55,0.2)";
              e.currentTarget.style.background = "rgba(212,175,55,0.04)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
              const icon = e.currentTarget.querySelector("svg");
              if (icon) (icon as HTMLElement).style.color = "rgba(212,175,55,0.5)";
            }}
          >
            <Icon
              size={isMobile ? 16 : 18}
              strokeWidth={1.5}
              style={{ color: "rgba(212,175,55,0.5)", transition: "color 200ms" }}
            />
          </button>
        ))}
      </div>

      {/* ===== Spacer bottom (60%) ===== */}
      <div style={{ flex: 0.6 }} />

      {/* ===== 4. TRUST + SCROLL — Mobile only ===== */}
      {isMobile && (
        <div style={{
          position: "absolute",
          bottom: 20,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
        }}>
          <span style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            opacity: 0.3,
          }}>
            Free to start · No credit card
          </span>

          <button onClick={() => {
            document.getElementById("landing-start")?.scrollIntoView({ behavior: "smooth" });
          }} style={{
            width: 28, height: 28, borderRadius: "50%",
            border: "1px solid rgba(212,175,55,0.2)",
            background: "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "rgba(212,175,55,0.4)",
            animation: "bounce 2.5s ease-in-out infinite",
          }}>
            <ChevronDown size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
