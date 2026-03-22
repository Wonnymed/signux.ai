"use client";
import { useState, useEffect } from "react";
import { useIsMobile } from "../lib/useIsMobile";
import ChatInput, { type FileAttachment } from "./ChatInput";
import { SignuxIcon } from "./SignuxIcon";
import type { Mode } from "../lib/types";
import { ENGINES, type EngineId } from "../lib/engines";
import { Zap, Hammer, TrendingUp, UserCheck, Shield, Swords } from "lucide-react";

const ICON_MAP: Record<string, typeof Zap> = {
  Zap, Hammer, TrendingUp, UserCheck, Shield, Swords,
};

const ENGINE_LIST = (Object.keys(ENGINES) as EngineId[]).map((id) => ({
  id,
  ...ENGINES[id],
}));

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

export default function WelcomeScreen({
  input, setInput, onSend, loading, attachments, onAttachmentsChange,
  onToast, onSwitchMode,
}: WelcomeScreenProps) {
  const isMobile = useIsMobile();
  const [showScrollHint, setShowScrollHint] = useState(true);
  const [hoveredEngine, setHoveredEngine] = useState<string | null>(null);

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
      paddingTop: isMobile ? "8vh" : "clamp(60px, 12vh, 140px)",
      width: "100%",
      position: "relative",
    }}>

      {/* Logo block */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: isMobile ? 8 : 12,
        marginBottom: isMobile ? "clamp(28px, 5vh, 48px)" : "clamp(36px, 6vh, 72px)",
      }}>
        <SignuxIcon size={isMobile ? 36 : 44} variant="gold" />
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{
            fontFamily: "var(--font-brand)",
            fontSize: isMobile ? 24 : 30,
            fontWeight: 300,
            letterSpacing: 8,
            color: "var(--text-primary)",
          }}>
            SIGNUX
          </span>
          <span style={{
            fontFamily: "var(--font-brand)",
            fontSize: isMobile ? 24 : 30,
            fontWeight: 300,
            letterSpacing: 8,
            color: "var(--text-tertiary)",
          }}>
            AI
          </span>
        </div>
      </div>

      {/* Headline */}
      <h1 style={{
        fontSize: isMobile ? 28 : 36,
        fontWeight: 300,
        color: "var(--text-primary)",
        margin: 0,
        marginBottom: 10,
        textAlign: "center",
        lineHeight: 1.25,
      }}>
        Chatbots answer. Consultants analyze. Signux decides.
      </h1>
      <p style={{
        fontSize: 14,
        color: "var(--text-secondary)",
        margin: 0,
        marginBottom: isMobile ? 20 : 28,
        textAlign: "center",
      }}>
        10 specialist agents. 10 adversarial rounds. One structured decision.
      </p>

      {/* Composer */}
      <div style={{
        width: "100%",
        maxWidth: isMobile ? 680 : "clamp(600px, 52vw, 820px)",
        marginBottom: isMobile ? 16 : 24,
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
          placeholder="What decision are you trying to make?"
        />
      </div>

      {/* "Or choose an engine" label */}
      <span style={{
        fontSize: 12,
        color: "var(--text-tertiary)",
        marginBottom: 12,
        fontFamily: "var(--font-mono)",
        letterSpacing: 0.5,
      }}>
        Or choose an engine:
      </span>

      {/* Engine grid — 3×2 desktop, 2×3 mobile */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr",
        gap: 10,
        width: "100%",
        maxWidth: isMobile ? 400 : 620,
        marginBottom: 20,
      }}>
        {ENGINE_LIST.map((engine) => {
          const Icon = ICON_MAP[engine.icon] || Zap;
          const isHovered = hoveredEngine === engine.id;

          return (
            <button
              key={engine.id}
              onClick={() => onSwitchMode?.(engine.id as Mode)}
              onMouseEnter={() => setHoveredEngine(engine.id)}
              onMouseLeave={() => setHoveredEngine(null)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 8,
                padding: isMobile ? "14px 14px" : "16px 18px",
                borderRadius: 12,
                border: `1px solid ${isHovered ? "var(--border-hover)" : "var(--border-primary)"}`,
                background: isHovered ? "var(--bg-tertiary)" : "var(--bg-card)",
                cursor: "pointer",
                transition: "all 150ms ease",
                textAlign: "left",
              }}
            >
              <Icon
                size={20}
                color={engine.color}
                strokeWidth={1.5}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{
                  fontSize: 15,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                }}>
                  {engine.name}
                </span>
                <span style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  lineHeight: 1.4,
                }}>
                  {engine.subtitle}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Supporting microcopy */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        marginTop: 4,
      }}>
        <span style={{
          fontSize: 11,
          color: "var(--text-tertiary)",
          textAlign: "center",
          maxWidth: 400,
          lineHeight: 1.5,
        }}>
          Six engines. One decision layer. Free to start.
        </span>
        <button
          onClick={() => {
            const el = document.getElementById("how-it-works");
            el?.scrollIntoView({ behavior: "smooth" });
          }}
          style={{
            fontSize: 12,
            color: "var(--text-tertiary)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px 0",
            transition: "color 150ms",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-tertiary)"; }}
        >
          Learn more
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      {/* Scroll Hint */}
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
