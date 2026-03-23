"use client";
import { useState, useCallback } from "react";
import { useIsMobile } from "../lib/useIsMobile";
import ChatInput, { type FileAttachment } from "./ChatInput";
import { SignuxIcon } from "./SignuxIcon";
import type { Mode } from "../lib/types";
import { ENGINES, type EngineId } from "../lib/engines";
import { Zap, Hammer, TrendingUp, UserCheck, Shield, Swords, ArrowRight, RefreshCw } from "lucide-react";

const GOLD = "#C8A84E";

const ICON_MAP: Record<string, typeof Zap> = {
  Zap, Hammer, TrendingUp, UserCheck, Shield, Swords,
};

const ENGINE_LIST = (Object.keys(ENGINES) as EngineId[]).map((id) => ({
  id,
  ...ENGINES[id],
}));

export type RoutingResult = {
  engine: string;
  confidence: "high" | "medium" | "low";
  reasoning: string;
  alternate: string | null;
  clarification: string | null;
};

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
  onRouteAndSwitch?: (question: string, engine: Mode) => void;
  lang?: string;
};

export default function WelcomeScreen({
  input, setInput, loading, attachments, onAttachmentsChange,
  onToast, onSwitchMode, onRouteAndSwitch,
}: WelcomeScreenProps) {
  const isMobile = useIsMobile();
  const [hoveredEngine, setHoveredEngine] = useState<string | null>(null);
  const [routing, setRouting] = useState(false);
  const [routeResult, setRouteResult] = useState<RoutingResult | null>(null);
  const [routedQuestion, setRoutedQuestion] = useState("");

  const handleAskSignux = useCallback(async () => {
    const q = input.trim();
    if (!q || routing) return;

    setRouting(true);
    setRouteResult(null);
    setRoutedQuestion(q);

    try {
      const res = await fetch("/api/route-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data: RoutingResult = await res.json();
      setRouteResult(data);

      if (data.confidence === "high" && !data.clarification) {
        setTimeout(() => {
          onRouteAndSwitch?.(q, data.engine as Mode);
        }, 800);
      }
    } catch {
      setRouteResult({
        engine: "simulate",
        confidence: "low",
        reasoning: "Could not classify. Defaulting to Simulate.",
        alternate: null,
        clarification: null,
      });
    } finally {
      setRouting(false);
    }
  }, [input, routing, onRouteAndSwitch]);

  const handleConfirmRoute = (engine: string) => {
    onRouteAndSwitch?.(routedQuestion, engine as Mode);
  };

  const handleReset = () => {
    setRouteResult(null);
    setRoutedQuestion("");
  };

  const showRoutingState = routing || routeResult;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: isMobile ? "calc(100vh - 48px)" : "100vh",
      padding: isMobile ? "0 20px" : "0 32px",
      width: "100%",
    }}>

      {/* ═══ HERO: Logo + Brand ═══ */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: isMobile ? 12 : 16,
        marginBottom: isMobile ? 32 : 40,
      }}>
        <SignuxIcon size={isMobile ? 64 : 88} variant="gold" />
        <span style={{
          fontFamily: "var(--font-brand)",
          fontSize: isMobile ? 24 : 30,
          fontWeight: 300,
          letterSpacing: 8,
          color: "var(--text-primary)",
        }}>
          SIGNUX <span style={{ color: "var(--text-tertiary)" }}>AI</span>
        </span>
      </div>

      {/* ═══ INPUT ═══ */}
      {!showRoutingState && (
        <div style={{
          width: "100%",
          maxWidth: isMobile ? 680 : "clamp(540px, 44vw, 720px)",
          marginBottom: isMobile ? 24 : 32,
        }}>
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={handleAskSignux}
            loading={routing}
            showDisclaimer={false}
            showVoice={false}
            attachments={attachments}
            onAttachmentsChange={onAttachmentsChange}
            onToast={onToast}
            placeholder="Describe a decision, tradeoff, or problem..."
          />
        </div>
      )}

      {/* ═══ ROUTING STATE ═══ */}
      {routing && !routeResult && <RoutingLoader />}
      {routeResult && (
        <RoutingCard
          result={routeResult}
          question={routedQuestion}
          onConfirm={handleConfirmRoute}
          onSwitch={(engine) => handleConfirmRoute(engine)}
          onRefine={handleReset}
          isMobile={isMobile}
        />
      )}

      {/* ═══ ENGINE GRID ═══ */}
      {!showRoutingState && (
        <>
          <span style={{
            fontSize: 12,
            color: "var(--text-tertiary)",
            marginBottom: 14,
            letterSpacing: 0.3,
          }}>
            Or choose an engine directly
          </span>

          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr",
            gap: 8,
            width: "100%",
            maxWidth: isMobile ? 400 : 560,
          }}>
            {ENGINE_LIST.map((engine) => {
              const Icon = ICON_MAP[engine.icon] || Zap;
              const isHovered = hoveredEngine === engine.id;
              const eColor = engine.color;

              return (
                <button
                  key={engine.id}
                  onClick={() => onSwitchMode?.(engine.id as Mode)}
                  onMouseEnter={() => setHoveredEngine(engine.id)}
                  onMouseLeave={() => setHoveredEngine(null)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: isMobile ? "12px 12px" : "14px 16px",
                    borderRadius: 10,
                    border: `1px solid ${isHovered ? `${eColor}40` : "var(--border-primary)"}`,
                    background: isHovered ? `${eColor}08` : "transparent",
                    cursor: "pointer",
                    transition: "border-color 180ms ease-out, background 180ms ease-out",
                    textAlign: "left",
                  }}
                >
                  <Icon size={18} color={eColor} strokeWidth={1.5} />
                  <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text-primary)" }}>
                    {engine.name}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ═══ ROUTING LOADER ═══ */
function RoutingLoader() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 12,
      padding: "32px 0",
    }}>
      <div style={{
        width: 32, height: 32,
        border: "2px solid var(--border-primary)",
        borderTopColor: "var(--text-tertiary)",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      <span style={{
        fontSize: 12.5,
        color: "var(--text-secondary)",
        fontFamily: "var(--font-mono)",
        letterSpacing: 0.5,
      }}>
        Routing your question...
      </span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ═══ ROUTING CARD ═══ */
function RoutingCard({
  result, question, onConfirm, onSwitch, onRefine, isMobile,
}: {
  result: RoutingResult;
  question: string;
  onConfirm: (engine: string) => void;
  onSwitch: (engine: string) => void;
  onRefine: () => void;
  isMobile: boolean;
}) {
  const [confirmHovered, setConfirmHovered] = useState(false);
  const [altHovered, setAltHovered] = useState(false);
  const [refineHovered, setRefineHovered] = useState(false);

  const engineData = ENGINES[result.engine as EngineId];
  const altEngineData = result.alternate ? ENGINES[result.alternate as EngineId] : null;
  const Icon = ICON_MAP[engineData?.icon] || Zap;

  const isAutoRouting = result.confidence === "high" && !result.clarification;

  return (
    <div style={{
      width: "100%",
      maxWidth: isMobile ? 480 : 520,
      padding: isMobile ? "20px 18px" : "24px 28px",
      borderRadius: 14,
      border: "1px solid var(--border-primary)",
      background: "var(--bg-card)",
      display: "flex",
      flexDirection: "column",
      gap: 16,
    }}>
      {/* Question echo */}
      <div style={{
        fontSize: 12,
        color: "var(--text-secondary)",
        padding: "8px 12px",
        borderRadius: 8,
        background: "var(--bg-secondary)",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>
        {question}
      </div>

      {/* Routing result */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: "var(--bg-secondary)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Icon size={18} strokeWidth={1.5} color="var(--text-primary)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 500, color: "var(--text-primary)", marginBottom: 2 }}>
            {isAutoRouting ? `Routing to ${engineData?.name}` : `Routed to ${engineData?.name}`}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>
            {result.reasoning}
          </div>
        </div>
      </div>

      {/* Clarification — low confidence */}
      {result.clarification && (
        <div style={{
          fontSize: 12.5,
          color: "var(--text-secondary)",
          padding: "10px 14px",
          borderRadius: 8,
          border: "1px solid var(--border-primary)",
          lineHeight: 1.5,
        }}>
          {result.clarification}
        </div>
      )}

      {/* Auto-routing indicator */}
      {isAutoRouting && (
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 11.5, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)",
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "#3ECF8E",
            animation: "pulse 1.5s ease-in-out infinite",
          }} />
          Entering {engineData?.name}...
          <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
        </div>
      )}

      {/* Actions — medium/low confidence */}
      {!isAutoRouting && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => onConfirm(result.engine)}
            onMouseEnter={() => setConfirmHovered(true)}
            onMouseLeave={() => setConfirmHovered(false)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 8,
              background: confirmHovered ? "var(--bg-hover)" : "var(--bg-secondary)",
              border: `1px solid ${confirmHovered ? "var(--border-hover)" : "var(--border-primary)"}`,
              color: "var(--text-primary)", fontSize: 12.5, fontWeight: 500,
              cursor: "pointer",
              transition: "background 180ms ease-out, border-color 180ms ease-out",
            }}
          >
            Continue with {engineData?.name}
            <ArrowRight size={13} strokeWidth={1.5} />
          </button>

          {altEngineData && (
            <button
              onClick={() => onSwitch(result.alternate!)}
              onMouseEnter={() => setAltHovered(true)}
              onMouseLeave={() => setAltHovered(false)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 8,
                background: "transparent",
                border: `1px solid ${altHovered ? "var(--border-hover)" : "var(--border-primary)"}`,
                color: altHovered ? "var(--text-primary)" : "var(--text-secondary)", fontSize: 12.5, fontWeight: 400,
                cursor: "pointer",
                transition: "border-color 180ms ease-out, color 180ms ease-out",
              }}
            >
              Try {altEngineData.name}
            </button>
          )}

          <button
            onClick={onRefine}
            onMouseEnter={() => setRefineHovered(true)}
            onMouseLeave={() => setRefineHovered(false)}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "8px 12px", borderRadius: 8,
              background: "transparent",
              border: "none",
              color: refineHovered ? "var(--text-secondary)" : "var(--text-tertiary)", fontSize: 12, fontWeight: 400,
              cursor: "pointer",
              transition: "color 180ms ease-out",
            }}
          >
            <RefreshCw size={12} strokeWidth={1.5} />
            Refine
          </button>
        </div>
      )}
    </div>
  );
}
