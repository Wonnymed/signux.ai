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
      padding: isMobile ? "0 20px" : "0 32px",
      width: "100%",
      position: "relative",
    }}>

      {/* Spacer top — pushes content slightly above center */}
      <div style={{ flex: 0.42 }} />

      {/* Logo block */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: isMobile ? 8 : 12,
        marginBottom: isMobile ? 40 : 52,
      }}>
        <SignuxIcon size={isMobile ? 40 : 56} />
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{
            fontFamily: "var(--font-brand)",
            fontSize: isMobile ? 26 : 36,
            fontWeight: 800,
            letterSpacing: 6,
            color: "var(--text-primary)",
          }}>
            SIGNUX
          </span>
          <span style={{
            fontFamily: "var(--font-brand)",
            fontSize: isMobile ? 26 : 36,
            fontWeight: 300,
            letterSpacing: 6,
            color: "var(--text-tertiary)",
            opacity: 0.3,
          }}>
            AI
          </span>
        </div>
      </div>

      {/* Composer — same max-width as conversation input */}
      <div style={{
        width: "100%",
        maxWidth: 680,
        marginBottom: 24,
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

      {/* Mode icons */}
      <div style={{
        display: "flex",
        gap: isMobile ? 10 : 12,
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
              border: `1px solid ${color}30`,
              background: `${color}08`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)",
              position: "relative",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = `${color}60`;
              e.currentTarget.style.background = `${color}12`;
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = `0 4px 14px ${color}18`;
              const icon = e.currentTarget.querySelector("svg");
              if (icon) (icon as HTMLElement).style.color = color;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = `${color}30`;
              e.currentTarget.style.background = `${color}08`;
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
              const icon = e.currentTarget.querySelector("svg");
              if (icon) (icon as HTMLElement).style.color = `${color}80`;
            }}
          >
            <Icon
              size={isMobile ? 16 : 18}
              strokeWidth={1.5}
              style={{ color: `${color}80`, transition: "color 200ms" }}
            />
          </button>
        ))}
      </div>

      {/* Spacer bottom */}
      <div style={{ flex: 0.58 }} />

      {/* Trust line + scroll hint — mobile only */}
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
