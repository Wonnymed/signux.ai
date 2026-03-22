"use client";
import { useState, useEffect } from "react";
import { useIsMobile } from "../lib/useIsMobile";
import ChatInput, { type FileAttachment } from "./ChatInput";
import { SignuxIcon } from "./SignuxIcon";
import type { Mode } from "../lib/types";
import { ENGINES, type EngineId } from "../lib/engines";

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

const MODE_PILLS = (Object.keys(ENGINES) as EngineId[]).map((id) => ({
  mode: id as Mode,
  label: ENGINES[id].name,
}));

export default function WelcomeScreen({
  input, setInput, onSend, loading, attachments, onAttachmentsChange,
  onToast, onSwitchMode,
}: WelcomeScreenProps) {
  const isMobile = useIsMobile();
  const [showScrollHint, setShowScrollHint] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      setShowScrollHint(scrollY < 80);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      minHeight: isMobile ? "calc(100vh - 52px)" : "calc(100vh - 60px)",
      padding: isMobile ? "0 20px" : "0 32px",
      paddingTop: isMobile ? "12vh" : "clamp(80px, 18vh, 200px)",
      width: "100%",
      position: "relative",
    }}>

      {/* Logo block */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: isMobile ? 8 : 12,
        marginBottom: isMobile ? "clamp(40px, 8vh, 80px)" : "clamp(60px, 12vh, 160px)",
      }}>
        <SignuxIcon size={isMobile ? 40 : 48} variant="gold" />
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{
            fontFamily: "var(--font-brand)",
            fontSize: isMobile ? 26 : 32,
            fontWeight: 300,
            letterSpacing: 8,
            color: "var(--text-primary)",
          }}>
            SIGNUX
          </span>
          <span style={{
            fontFamily: "var(--font-brand)",
            fontSize: isMobile ? 26 : 32,
            fontWeight: 300,
            letterSpacing: 8,
            color: "var(--text-tertiary)",
          }}>
            AI
          </span>
        </div>
      </div>

      {/* Composer — viewport-proportional width */}
      <div style={{
        width: "100%",
        maxWidth: isMobile ? 680 : "clamp(600px, 52vw, 820px)",
        marginBottom: "clamp(16px, 3vh, 36px)",
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

      {/* Mode pills — text only, no emojis, no colors */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 8,
        marginBottom: 32,
      }}>
        {MODE_PILLS.map(({ mode, label }) => (
          <button
            key={mode}
            onClick={() => onSwitchMode?.(mode)}
            style={{
              padding: "6px 14px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-primary)",
              background: "transparent",
              color: "var(--text-tertiary)",
              fontSize: 12,
              cursor: "pointer",
              transition: "all 150ms ease",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--border-hover)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-primary)";
              e.currentTarget.style.color = "var(--text-tertiary)";
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Scroll Hint — apenas visual, não é botão */}
      <div
        style={{
          position: "absolute",
          bottom: isMobile ? 20 : 28,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0,
          opacity: showScrollHint ? 1 : 0,
          transition: "opacity 0.5s ease",
          pointerEvents: "none",
          cursor: "default",
          userSelect: "none",
        }}
      >
        <svg
          width={isMobile ? 18 : 20}
          height={isMobile ? 18 : 20}
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ animation: "scrollHintBounce 2.5s ease-in-out infinite" }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </div>
  );
}
