"use client";
import { useState, useCallback, useEffect } from "react";
import { useIsMobile } from "../lib/useIsMobile";
import ChatInput, { type FileAttachment } from "./ChatInput";
import { SignuxIcon } from "./SignuxIcon";
import type { Mode } from "../lib/types";
import { ENGINES, SIGNUX_GOLD, type EngineId } from "../lib/engines";
import { Zap, Hammer, TrendingUp, UserCheck, Shield, Swords, ArrowRight, RefreshCw, Sparkles } from "lucide-react";
import { signuxFetch } from "../lib/api-client";

const GOLD = "#C8A84E";

const ICON_MAP: Record<string, typeof Zap> = {
  Zap, Hammer, TrendingUp, UserCheck, Shield, Swords,
};

const ENGINE_LIST = (Object.keys(ENGINES) as EngineId[]).map((id) => ({
  id,
  ...ENGINES[id],
}));

/* ═══ Homepage featured scenarios (curated slice) ═══ */
const HOMEPAGE_SCENARIOS: {
  engine: EngineId;
  question: string;
  context: string;
}[] = [
  {
    engine: "simulate",
    question: "Should I launch a premium coffee brand in Gangnam with a limited initial budget?",
    context: "Test viability in a saturated market with constrained capital.",
  },
  {
    engine: "hire",
    question: "Should I hire a VP Sales now or wait until revenue is more stable?",
    context: "Timing a senior hire when cash is limited but pipeline needs leadership.",
  },
  {
    engine: "grow",
    question: "Should I prioritize creator partnerships or performance ads for the next 90 days?",
    context: "Pick the highest-leverage growth channel before committing budget.",
  },
  {
    engine: "protect",
    question: "What could break this product launch before it becomes expensive to fix?",
    context: "Surface hidden risks in execution, regulation, or timing.",
  },
];

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
  isLoggedIn?: boolean;
};

export default function WelcomeScreen({
  input, setInput, loading, attachments, onAttachmentsChange,
  onToast, onSwitchMode, onRouteAndSwitch, isLoggedIn,
}: WelcomeScreenProps) {
  const isMobile = useIsMobile();
  const [hoveredEngine, setHoveredEngine] = useState<string | null>(null);
  const [hoveredScenario, setHoveredScenario] = useState<number | null>(null);
  const [routing, setRouting] = useState(false);
  const [routeResult, setRouteResult] = useState<RoutingResult | null>(null);
  const [routedQuestion, setRoutedQuestion] = useState("");
  const [recentItems, setRecentItems] = useState<any[]>([]);

  /* ═══ Fetch recent items for continue strip ═══ */
  useEffect(() => {
    if (!isLoggedIn) return;
    signuxFetch("/api/simulations/list")
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => {
        const sorted = data
          .sort((a: any, b: any) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
          .slice(0, 3);
        setRecentItems(sorted);
      })
      .catch(() => {});
  }, [isLoggedIn]);

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

  const handleUseScenario = (scenario: typeof HOMEPAGE_SCENARIOS[0]) => {
    const q = scenario.question;
    onRouteAndSwitch?.(q, scenario.engine as Mode);
  };

  const showRoutingState = routing || routeResult;

  /* ═══ Content width — wider on desktop for better canvas use ═══ */
  const contentMaxW = isMobile ? "100%" : "min(640px, 52vw)";

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      width: "100%",
      minHeight: "100%",
    }}>

      {/* ═══ ABOVE THE FOLD — Hero section ═══ */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        minHeight: isMobile ? "calc(100vh - 48px)" : "calc(100vh - 16px)",
        padding: isMobile ? "0 20px" : "0 32px",
      }}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
          maxWidth: contentMaxW,
        }}>

          {/* 1. Premium brand mark — small, restrained */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: isMobile ? 20 : 28,
          }}>
            <SignuxIcon size={isMobile ? 18 : 20} variant="gold" />
            <span style={{
              fontFamily: "var(--font-brand)",
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: 4,
              color: "var(--text-tertiary)",
              textTransform: "uppercase" as const,
            }}>
              SIGNUX
            </span>
          </div>

          {/* 2. Strong product headline */}
          <h1 style={{
            fontFamily: "var(--font-serif, var(--font-brand))",
            fontSize: isMobile ? 26 : "clamp(30px, 2.6vw, 38px)",
            fontWeight: 400,
            letterSpacing: "-0.01em",
            color: "var(--text-primary)",
            textAlign: "center",
            lineHeight: 1.2,
            margin: "0 0 10px",
          }}>
            What are you trying to decide?
          </h1>

          {/* 3. Supporting line */}
          <p style={{
            fontSize: isMobile ? 13 : 14,
            color: "var(--text-tertiary)",
            textAlign: "center",
            lineHeight: 1.5,
            margin: "0 0 28px",
            maxWidth: 400,
            letterSpacing: 0.1,
          }}>
            Describe the decision. Signux routes it to the right engine.
          </p>

          {/* ═══ 4. ASK SIGNUX INPUT ═══ */}
          {!showRoutingState && (
            <div style={{
              width: "100%",
              marginBottom: isMobile ? 20 : 28,
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
                placeholder="A tradeoff, a hiring call, a launch question, a risk to evaluate..."
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

          {/* ═══ 5. ENGINE GRID — above the fold ═══ */}
          {!showRoutingState && (
            <>
              {/* Continue strip for returning users */}
              {recentItems.length > 0 && (
                <div style={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 5,
                  marginBottom: isMobile ? 20 : 24,
                }}>
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    marginBottom: 2, padding: "0 2px",
                  }}>
                    <span style={{
                      fontSize: 10, fontWeight: 600, letterSpacing: 1.2,
                      color: "var(--text-tertiary)", textTransform: "uppercase",
                      fontFamily: "var(--font-mono)",
                    }}>Continue where you left off</span>
                    <a
                      href="/recent"
                      style={{
                        fontSize: 10, color: "var(--text-tertiary)", textDecoration: "none",
                        transition: "color 180ms ease-out", fontFamily: "var(--font-mono)",
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = "var(--text-secondary)"}
                      onMouseLeave={e => e.currentTarget.style.color = "var(--text-tertiary)"}
                    >View all</a>
                  </div>
                  {recentItems.map((item: any) => {
                    const engine = (item.engine || "simulate") as string;
                    const engineData = ENGINES[engine as EngineId];
                    const Icon = ICON_MAP[engineData?.icon] || Zap;
                    const eColor = engineData?.color || GOLD;
                    return (
                      <a
                        key={item.id}
                        href={`/chat?load=${item.id}`}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "10px 14px", borderRadius: 10,
                          border: "1px solid var(--border-primary)",
                          background: "transparent",
                          textDecoration: "none",
                          transition: "border-color 180ms ease-out, background 180ms ease-out",
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = `${eColor}40`;
                          e.currentTarget.style.background = `${eColor}06`;
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = "var(--border-primary)";
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <Icon size={13} strokeWidth={1.5} style={{ color: eColor, flexShrink: 0 }} />
                        <span style={{
                          flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 450,
                          color: "var(--text-primary)",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>{item.scenario || "Untitled decision"}</span>
                        <ArrowRight size={12} strokeWidth={1.5} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
                      </a>
                    );
                  })}
                </div>
              )}

              {/* Engine micro-label */}
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                marginBottom: 12, padding: "0 2px",
                width: "100%",
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: 1.2,
                  color: "var(--text-tertiary)", textTransform: "uppercase",
                  fontFamily: "var(--font-mono)",
                }}>
                  Six engines. One decision layer.
                </span>
              </div>

              {/* Engine cards */}
              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr",
                gap: isMobile ? 8 : 10,
                width: "100%",
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
                        flexDirection: "column",
                        gap: 6,
                        padding: isMobile ? "14px 14px" : "16px 18px",
                        borderRadius: 12,
                        border: `1px solid ${isHovered ? `${eColor}50` : "var(--border-primary)"}`,
                        background: isHovered ? `${eColor}08` : "transparent",
                        cursor: "pointer",
                        transition: "border-color 200ms ease-out, background 200ms ease-out, box-shadow 200ms ease-out",
                        textAlign: "left",
                        boxShadow: isHovered ? `0 2px 12px ${eColor}10` : "none",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <Icon size={16} color={eColor} strokeWidth={1.5} />
                        <span style={{ fontSize: 13.5, fontWeight: 550, color: "var(--text-primary)", letterSpacing: 0.1 }}>
                          {engine.name}
                        </span>
                      </div>
                      <span style={{
                        fontSize: 11.5, color: "var(--text-tertiary)", lineHeight: 1.35,
                        letterSpacing: 0.05,
                      }}>
                        {engine.subtitle}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ═══ BELOW THE FOLD — Scenarios section ═══ */}
      {!showRoutingState && (
        <div style={{
          width: "100%",
          maxWidth: contentMaxW,
          padding: isMobile ? "32px 20px 48px" : "40px 32px 64px",
          margin: "0 auto",
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 14, padding: "0 2px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Sparkles size={10} strokeWidth={1.5} style={{ color: "var(--text-tertiary)" }} />
              <span style={{
                fontSize: 10, fontWeight: 600, letterSpacing: 1.2,
                color: "var(--text-tertiary)", textTransform: "uppercase",
                fontFamily: "var(--font-mono)",
              }}>Curated scenarios</span>
            </div>
            <a
              href="/scenarios"
              style={{
                fontSize: 10, color: "var(--text-tertiary)", textDecoration: "none",
                transition: "color 180ms ease-out", fontFamily: "var(--font-mono)",
                letterSpacing: 0.3,
              }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--text-secondary)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--text-tertiary)"}
            >View gallery &rarr;</a>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: isMobile ? 8 : 10,
          }}>
            {HOMEPAGE_SCENARIOS.map((s, i) => {
              const engineData = ENGINES[s.engine];
              const eColor = engineData.color;
              const isHov = hoveredScenario === i;
              return (
                <button
                  key={i}
                  onClick={() => handleUseScenario(s)}
                  onMouseEnter={() => setHoveredScenario(i)}
                  onMouseLeave={() => setHoveredScenario(null)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 7,
                    padding: "14px 16px",
                    borderRadius: 12,
                    border: `1px solid ${isHov ? `${eColor}50` : "var(--border-primary)"}`,
                    background: isHov ? `${eColor}06` : "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "border-color 200ms ease-out, background 200ms ease-out, box-shadow 200ms ease-out",
                    boxShadow: isHov ? `0 2px 12px ${eColor}08` : "none",
                  }}
                >
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
                    color: eColor, fontFamily: "var(--font-mono)",
                  }}>{engineData.name}</span>
                  <span style={{
                    fontSize: 13, fontWeight: 500, color: "var(--text-primary)",
                    lineHeight: 1.4,
                    display: "-webkit-box", WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical", overflow: "hidden",
                  }}>{s.question}</span>
                  <span style={{
                    fontSize: 11.5, color: "var(--text-tertiary)", lineHeight: 1.4,
                    letterSpacing: 0.05,
                  }}>{s.context}</span>
                </button>
              );
            })}
          </div>
        </div>
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
