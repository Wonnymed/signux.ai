"use client";

import { Suspense, useEffect, useCallback, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Sidebar from "@/app/components/shell/Sidebar";
import SimulationProgress from "@/app/components/sim/SimulationProgress";
import AgentCard from "@/app/components/sim/AgentCard";
import ConsensusTracker from "@/app/components/sim/ConsensusTracker";
import DecisionObjectCard from "@/app/components/sim/DecisionObject";
import FollowUpChips from "@/app/components/sim/FollowUpChips";
import { AgentCardSkeleton, VerdictSkeleton } from "@/app/components/sim/Skeleton";
import AuthWallBanner from "@/app/components/sim/AuthWallBanner";
import FieldIntelligenceBar from "@/app/components/sim/FieldIntelligenceBar";
import HITLCheckpoint from "@/components/simulation/HITLCheckpoint";
import { useSimulationStream } from "@/app/lib/hooks/useSimulationStream";
import { TIERS, ADVISOR_OPTIONS } from "@/lib/config/tiers";
import { getDisplayModel } from "@/lib/display";

export default function SimulationPage() {
  return (
    <Suspense>
      <SimulationPageInner />
    </Suspense>
  );
}

function SimulationPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const question = searchParams.get("question") || "";
  const engine = searchParams.get("engine") || "simulate";

  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [enableCrowdWisdom, setEnableCrowdWisdom] = useState(false);
  const [advisorCount, setAdvisorCount] = useState(0);
  const [advisorGuidance, setAdvisorGuidance] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);
  const verdictRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  const {
    phases,
    rounds,
    currentRound,
    agents,
    plan,
    consensus,
    verdict,
    followups,
    isRunning,
    error,
    fieldPersonas,
    fieldScans,
    hitlCheckpoint,
    startSimulation,
  } = useSimulationStream();

  // Read crowd wisdom preference from URL
  const crowdParam = searchParams.get("crowd") === "1";
  const guidanceParam = searchParams.get("advisorGuidance") || "";
  const advisorCountParam = Number(searchParams.get("advisorCount")) || 0;

  // Auto-start simulation on mount
  useEffect(() => {
    if (question) {
      const useCrowd = crowdParam || enableCrowdWisdom;
      const count = advisorCountParam || advisorCount;
      if (useCrowd) setEnableCrowdWisdom(true);
      if (count > 0) { setAdvisorCount(count); setEnableCrowdWisdom(true); }
      if (guidanceParam) setAdvisorGuidance(guidanceParam);
      startSimulation(question, engine, useCrowd || count > 0, guidanceParam || undefined, count || undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll to verdict when it appears
  useEffect(() => {
    if (verdict && !hasScrolledRef.current) {
      hasScrolledRef.current = true;
      setTimeout(() => {
        verdictRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [verdict]);

  const handleFollowUp = useCallback(
    (suggestion: string) => {
      if (isNavigating) return;
      setIsNavigating(true);
      const id = `sim_${Date.now()}`;
      const params = new URLSearchParams({ question: suggestion, engine });
      router.push(`/sim/${id}?${params.toString()}`);
      setTimeout(() => setIsNavigating(false), 5000);
    },
    [engine, router, isNavigating],
  );

  const handleToggleAgent = useCallback((agentId: string) => {
    setExpandedAgent((prev) => (prev === agentId ? null : agentId));
  }, []);

  // Empty state — no question
  if (!question) {
    return (
      <div style={{ display: "flex", minHeight: "100dvh" }}>
        <Sidebar activeEngine="simulate" onSelectEngine={() => {}} />
        <div
          style={{
            flex: 1,
            marginLeft: "var(--sidebar-width-collapsed)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <p style={{ fontSize: 16, color: "var(--text-secondary)" }}>
            No simulation found.
          </p>
          <a
            href="/"
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "var(--accent)",
              textDecoration: "none",
            }}
          >
            Start one from the homepage →
          </a>
        </div>
      </div>
    );
  }

  // Deduplicate agents — show only latest report per agent_id
  // Group all reports by agent_id, keep full history for expanded view
  const agentHistoryMap = new Map<string, typeof agents>();
  for (const agent of agents) {
    const existing = agentHistoryMap.get(agent.agent_id) || [];
    existing.push(agent);
    agentHistoryMap.set(agent.agent_id, existing);
  }
  const latestAgents = Array.from(agentHistoryMap.entries()).map(
    ([, reports]) => reports[reports.length - 1],
  );
  const uniqueAgentCount = latestAgents.length;

  // How many agents are expected based on plan
  const expectedAgents = plan ? plan.tasks.length : 0;
  const pendingAgentSkeletons = isRunning && plan
    ? Math.max(0, Math.min(expectedAgents, 4) - uniqueAgentCount)
    : 0;

  return (
    <div style={{ display: "flex", minHeight: "100dvh" }}>
      <Sidebar activeEngine="simulate" onSelectEngine={() => {}} />

      <div
        style={{
          flex: 1,
          marginLeft: "var(--sidebar-width-collapsed)",
          display: "flex",
          flexDirection: "column",
          minHeight: "100dvh",
        }}
      >
        {/* Top bar — question */}
        <header
          style={{
            padding: "16px 32px",
            borderBottom: "1px solid var(--border-default)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: isRunning ? "#7C3AED" : "#10B981",
              flexShrink: 0,
            }}
            className={isRunning ? "pulse-dot" : ""}
          />
          <h1
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            {question}
          </h1>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              marginLeft: "auto",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>
              {isRunning && currentRound > 0
                ? enableCrowdWisdom && advisorCount > 0
                  ? `10 specialists · ${getDisplayModel()} · ${advisorCount} field researchers · Round ${currentRound}/10 · analyzing...`
                  : `10 specialists · ${getDisplayModel()} · Round ${currentRound}/10 · analyzing...`
                : enableCrowdWisdom && advisorCount > 0
                  ? `${TIERS.free.features.specialists} specialists · ${getDisplayModel()} · ${advisorCount} field researchers · 10 rounds`
                  : `${TIERS.free.features.specialists} specialists · ${getDisplayModel()} · 10 rounds`}
            </span>
            {/* Crowd Wisdom tier selector — disabled once running */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {ADVISOR_OPTIONS.map((opt) => {
                const isActive = enableCrowdWisdom && advisorCount === opt.count;
                return (
                  <button
                    key={opt.count}
                    onClick={() => {
                      if (isActive) {
                        setEnableCrowdWisdom(false);
                        setAdvisorCount(0);
                      } else {
                        setEnableCrowdWisdom(true);
                        setAdvisorCount(opt.count);
                      }
                    }}
                    disabled={isRunning}
                    title={`${TIERS[opt.tier].displayName} tier · Adds ${opt.count} field researchers`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "3px 10px",
                      borderRadius: "var(--radius-full)",
                      border: `1px solid ${isActive ? "var(--accent)" : "var(--border-default)"}`,
                      background: isActive ? "var(--accent-muted)" : "transparent",
                      color: isActive ? "var(--accent)" : "var(--text-tertiary)",
                      fontSize: 11,
                      fontWeight: 500,
                      cursor: isRunning ? "default" : "pointer",
                      opacity: isRunning ? 0.5 : 1,
                      transition: "all var(--transition-normal)",
                    }}
                  >
                    🧠 {opt.label}
                  </button>
                );
              })}
            </div>
            <span style={{ color: isRunning ? "var(--accent)" : "#10B981", fontWeight: 500 }}>
              {isRunning ? "Running..." : "Complete"}
            </span>
          </span>
        </header>

        {/* Advisor Guidance — visible when crowd wisdom enabled and not running */}
        {enableCrowdWisdom && !isRunning && !verdict && (
          <div
            style={{
              padding: "8px 24px 12px",
              borderBottom: "1px solid var(--border-subtle)",
              background: "var(--accent-glow)",
            }}
          >
            <textarea
              value={advisorGuidance}
              onChange={(e) => setAdvisorGuidance(e.target.value.slice(0, 500))}
              placeholder="Guide your advisors (optional) — e.g., Include a Korean grandmother, a Gangnam landlord, a Coupang Eats driver..."
              rows={2}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-default)",
                background: "var(--surface-0)",
                color: "var(--text-secondary)",
                fontSize: 12,
                fontFamily: "inherit",
                resize: "none",
                outline: "none",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--accent)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border-default)";
              }}
            />
            <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 4, textAlign: "right" }}>
              {advisorGuidance.length}/500
            </div>
          </div>
        )}

        {/* Workspace */}
        <div
          style={{
            flex: 1,
            display: "flex",
            gap: 0,
            overflow: "hidden",
          }}
        >
          {/* Left: Phases + Consensus */}
          <aside
            style={{
              width: 220,
              flexShrink: 0,
              borderRight: "1px solid var(--border-subtle)",
              padding: "24px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 24,
              overflowY: "auto",
            }}
          >
            <SimulationProgress rounds={rounds} currentRound={currentRound} />

            {/* Plan tasks */}
            {plan && (
              <div>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: "var(--text-tertiary)",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    margin: "0 0 8px",
                  }}
                >
                  Research Plan
                </p>
                {plan.tasks.map((t, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      gap: 8,
                      marginBottom: 6,
                      alignItems: "flex-start",
                    }}
                  >
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: "var(--accent-muted)",
                        color: "var(--accent)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 9,
                        fontWeight: 600,
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      {i + 1}
                    </span>
                    <div>
                      <p
                        style={{
                          fontSize: 12,
                          color: "var(--text-secondary)",
                          margin: 0,
                          lineHeight: 1.4,
                        }}
                      >
                        {t.description}
                      </p>
                      <p
                        style={{
                          fontSize: 11,
                          color: "var(--text-tertiary)",
                          margin: 0,
                        }}
                      >
                        {t.agent || t.assigned_agent}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {consensus && <ConsensusTracker consensus={consensus} />}
          </aside>

          {/* Main content area */}
          <main
            style={{
              flex: 1,
              padding: 32,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {/* Agent cards — deduplicated, latest report per agent */}
            {(latestAgents.length > 0 || pendingAgentSkeletons > 0) && (
              <div>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--text-tertiary)",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    margin: "0 0 12px",
                  }}
                >
                  Agent Reports ({uniqueAgentCount}{isRunning ? "/10" : ""})
                </p>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  {latestAgents.map((agent, i) => (
                    <AgentCard
                      key={`${agent.agent_id}_${i}`}
                      agent={agent}
                      index={i}
                      expanded={expandedAgent === agent.agent_id}
                      onToggle={() => handleToggleAgent(agent.agent_id)}
                      history={agentHistoryMap.get(agent.agent_id) || []}
                    />
                  ))}
                  {/* Skeleton placeholders for pending agents */}
                  {Array.from({ length: pendingAgentSkeletons }).map((_, i) => (
                    <AgentCardSkeleton key={`skel-${i}`} />
                  ))}
                </div>
              </div>
            )}

            {/* HITL Checkpoint — appears after deep analysis, before verdict */}
            {hitlCheckpoint?.isActive && (
              <HITLCheckpoint
                simulationId={hitlCheckpoint.simulationId}
                assumptions={hitlCheckpoint.assumptions}
                summary={hitlCheckpoint.summary}
                agentPositions={hitlCheckpoint.agentPositions}
                timeoutMs={hitlCheckpoint.timeoutMs}
                onComplete={() => {}}
              />
            )}

            {/* Verdict or verdict skeleton */}
            {verdict ? (
              <div ref={verdictRef} style={{ marginTop: 8 }}>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--text-tertiary)",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    margin: "0 0 12px",
                  }}
                >
                  Decision Object
                </p>
                <DecisionObjectCard verdict={verdict} />
              </div>
            ) : isRunning && agents.length > 0 ? (
              <div style={{ marginTop: 8 }}>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--text-tertiary)",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    margin: "0 0 12px",
                  }}
                >
                  Decision Object
                </p>
                <VerdictSkeleton />
              </div>
            ) : null}

            {/* Field Intelligence — shows inline as scans complete */}
            {fieldScans.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <FieldIntelligenceBar
                  fieldScans={fieldScans}
                  personaCount={fieldPersonas?.length || 0}
                />
              </div>
            )}

            {/* Follow-ups */}
            {followups.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--text-tertiary)",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    margin: "0 0 12px",
                  }}
                >
                  Follow Up
                </p>
                <FollowUpChips
                  suggestions={followups}
                  onSelect={handleFollowUp}
                  disabled={isNavigating}
                />
              </div>
            )}

            {/* Auth wall — show after verdict for unauthenticated users */}
            {verdict && !isRunning && (
              <div style={{ marginTop: 4 }}>
                <AuthWallBanner />
              </div>
            )}

            {/* Error state */}
            {error && (
              <div
                style={{
                  padding: 16,
                  borderRadius: "var(--radius-md)",
                  background: "rgba(244,63,94,0.06)",
                  border: "1px solid rgba(244,63,94,0.15)",
                  marginTop: 8,
                }}
              >
                <p style={{ fontSize: 13, color: "#F43F5E", margin: 0, fontWeight: 500 }}>
                  {error}
                </p>
              </div>
            )}

            {/* Empty state while connecting */}
            {agents.length === 0 && isRunning && !plan && (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <p style={{ fontSize: 14, color: "var(--text-tertiary)" }}>
                  The octopus is thinking...
                </p>
              </div>
            )}
          </main>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .pulse-dot {
          animation: pulse 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
