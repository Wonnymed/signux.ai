"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Rocket, ChevronRight, ChevronLeft, Check, Shield, AlertTriangle, Target, TrendingUp, Brain, Zap, Copy, RotateCcw, FileText, Calendar, DollarSign, Users, ChevronDown, ChevronUp, X, Wand2, Loader2, Lock } from "lucide-react";
import { t } from "../lib/i18n";
import { useIsMobile } from "../lib/useIsMobile";
import { useEnhance } from "../lib/useEnhance";
import type { Mode } from "../lib/types";
import { signuxFetch } from "../lib/api-client";

/* ═══ Types ═══ */
type BusinessIdea = {
  name: string;
  matchScore: number;
  description: string;
  category?: string;
  whyItMatches: string[];
  whyItMightFail?: string[];
  realisticRevenue?: { month1: string; month3: string; month6: string };
  timeToFirstRevenue?: string;
  estimatedTimeToRevenue?: string;
  capitalNeeded: string;
  riskLevel: string;
  competitionLevel?: string;
  marketTrend?: string;
};

type AgentResult = { agent: string; analysis: string };

type Verdict = {
  viability_score: number;
  verdict: "GO" | "CAUTION" | "PIVOT";
  one_line?: string;
  top_risks?: { risk: string; severity: string; mitigation: string }[];
  top_opportunities?: { opportunity: string; impact: string }[];
  honest_assessment?: string;
  if_you_proceed?: string;
  kill_conditions?: string[];
};

type Blueprint = {
  business_model_canvas?: any;
  pricing?: any;
  icp?: any;
  week_by_week?: any[];
  tools_stack?: any[];
  first_week_checklist?: string[];
  kill_metrics?: any;
  templates?: any;
};

type CheckinResult = {
  ai_score: number;
  ai_analysis: string;
  ai_recommendation?: string;
  wins?: string[];
  concerns?: string[];
  action_items?: { task: string; why: string; expected_impact: string }[];
  should_pivot?: boolean;
  pivot_reason?: string;
  adjusted_forecast?: { month3_revenue: string; confidence: string };
};

type LaunchpadPhase = "welcome" | "discovery" | "analyzing" | "results" | "validating" | "validated" | "blueprint" | "tracking";

/* ═══ Constants ═══ */
const TEAL = "#14B8A6";
const tealAlpha = (a: number) => `rgba(20,184,166,${a})`;

const TRAJECTORY_LINES = [
  { left: "8%", height: 40, delay: 0, dur: 6 },
  { left: "25%", height: 55, delay: 1.2, dur: 7 },
  { left: "42%", height: 35, delay: 2.5, dur: 6.5 },
  { left: "60%", height: 50, delay: 0.8, dur: 7.5 },
  { left: "78%", height: 30, delay: 3, dur: 6 },
  { left: "92%", height: 45, delay: 1.8, dur: 8 },
];

const JOURNEY_STEPS = ["Discovery", "Validation", "Blueprint", "Launch", "Track", "Scale"];

const SKILL_PILLS = ["Design", "Programming", "Writing", "Marketing", "Sales", "Finance", "Teaching", "Cooking"];

const TIME_OPTIONS = [
  { label: "Full-time (40h+/week)", value: "full-time" },
  { label: "Part-time (15-25h/week)", value: "part-time" },
  { label: "Side project (5-10h/week)", value: "side-project" },
];

const CAPITAL_OPTIONS = [
  { label: "Under $1K", value: "under-1k" },
  { label: "$1K - $5K", value: "1k-5k" },
  { label: "$5K - $20K", value: "5k-20k" },
  { label: "$20K+", value: "20k-plus" },
];

const PRIORITY_OPTIONS = ["Freedom", "Income", "Impact", "Creativity", "Scalability", "Low stress"];

const AGENT_ICONS: Record<string, any> = {
  "Market Analyst": TrendingUp,
  "Financial Advisor": DollarSign,
  "Risk Assessor": Shield,
  "Customer Expert": Users,
  "Competition Analyst": Target,
  "Devil's Advocate": AlertTriangle,
};

const AGENT_NAMES = ["Market Analyst", "Financial Advisor", "Risk Assessor", "Customer Expert", "Competition Analyst", "Devil's Advocate"];

/* ═══ Component ═══ */
export default function LaunchpadView({ lang, userId, onSetMode, isLoggedIn, tier }: { lang: string; userId?: string; onSetMode?: (m: Mode) => void; isLoggedIn?: boolean; tier?: string }) {
  const isMobile = useIsMobile();
  const { enhance, enhancing, wasEnhanced } = useEnhance("launchpad");
  const [phase, setPhase] = useState<LaunchpadPhase>("welcome");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);

  // Discovery answers
  const [skills, setSkills] = useState("");
  const [timeAvailable, setTimeAvailable] = useState("");
  const [capital, setCapital] = useState("");
  const [riskTolerance, setRiskTolerance] = useState(5);
  const [priorities, setPriorities] = useState<string[]>([]);

  // Results
  const [ideas, setIdeas] = useState<BusinessIdea[]>([]);
  const [error, setError] = useState("");

  // Validation
  const [selectedIdea, setSelectedIdea] = useState<BusinessIdea | null>(null);
  const [agentResults, setAgentResults] = useState<AgentResult[]>([]);
  const [currentAgent, setCurrentAgent] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);

  // Blueprint
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [blueprintLoading, setBlueprintLoading] = useState(false);
  const [blueprintTab, setBlueprintTab] = useState<"plan" | "canvas" | "templates">("plan");

  // Tracking
  const [checkins, setCheckins] = useState<any[]>([]);
  const [currentCheckin, setCurrentCheckin] = useState({
    week_number: 1,
    revenue: "",
    new_clients: "",
    leads_contacted: "",
    leads_responded: "",
    biggest_win: "",
    biggest_challenge: "",
    what_learned: "",
  });
  const [checkinResult, setCheckinResult] = useState<CheckinResult | null>(null);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [benchmarkComparison, setBenchmarkComparison] = useState<Record<string, any> | null>(null);

  // UI
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const startDiscovery = (persona?: string) => {
    if (persona === "scale") {
      setSkills("Already have a running business");
      setQuestionIndex(1);
    }
    setPhase("discovery");
  };

  const canProceed = () => {
    switch (questionIndex) {
      case 0: return skills.trim().length > 0;
      case 1: return timeAvailable !== "";
      case 2: return capital !== "";
      case 3: return true;
      case 4: return priorities.length > 0;
      default: return false;
    }
  };

  const nextQuestion = () => {
    if (questionIndex < 4) setQuestionIndex(prev => prev + 1);
    else runDiscovery();
  };

  const prevQuestion = () => {
    if (questionIndex > 0) setQuestionIndex(prev => prev - 1);
  };

  const togglePriority = (p: string) => {
    setPriorities(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const handleEnhance = async () => {
    if (enhancing || skills.trim().length < 10) return;
    const result = await enhance(skills);
    if (result) setSkills(result);
  };

  const runDiscovery = async () => {
    if (!isLoggedIn) { window.location.href = "/signup"; return; }
    if (tier === "free") { setShowPaywall(true); return; }
    setPhase("analyzing");
    setError("");
    try {
      const res = await signuxFetch("/api/launchpad/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skills, timeAvailable, capital, riskTolerance, priorities, lang }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setIdeas(data.ideas || []);
      setPhase("results");
    } catch (e: any) {
      setError(e.message || "Something went wrong");
      setPhase("results");
    }
  };

  const runValidation = async (idea: BusinessIdea) => {
    setSelectedIdea(idea);
    setAgentResults([]);
    setCurrentAgent("");
    setVerdict(null);
    setPhase("validating");

    try {
      abortRef.current = new AbortController();
      const res = await signuxFetch("/api/launchpad/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business: idea,
          profile: { skills, capital, time: timeAvailable },
          lang,
        }),
        signal: abortRef.current.signal,
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "stage") setCurrentAgent(data.label);
            else if (data.type === "agent_done") {
              setAgentResults(prev => [...prev, { agent: data.agent, analysis: data.analysis }]);
            }
            else if (data.type === "verdict") {
              setVerdict(data);
              setPhase("validated");
            }
            else if (data.type === "error") {
              setError(data.message);
              setPhase("results");
            }
          } catch {}
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setError(e.message || "Validation failed");
        setPhase("results");
      }
    }
  };

  const runBlueprint = async () => {
    if (!selectedIdea || !verdict) return;
    setBlueprintLoading(true);
    setBlueprint(null);
    setPhase("blueprint");

    try {
      const res = await signuxFetch("/api/launchpad/blueprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business: selectedIdea,
          profile: { skills, capital, time: timeAvailable },
          validationReport: verdict,
          lang,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setBlueprint(data.blueprint);
      setCurrentCheckin(prev => ({ ...prev, week_number: 1 }));
    } catch (e: any) {
      setError(e.message || "Blueprint generation failed");
    } finally {
      setBlueprintLoading(false);
    }
  };

  const submitCheckin = async () => {
    if (!selectedIdea) return;
    setCheckinLoading(true);
    setCheckinResult(null);

    try {
      const res = await signuxFetch("/api/launchpad/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: {
            business_name: selectedIdea.name,
            skills,
            time_available: timeAvailable,
            category: selectedIdea.category || "general",
          },
          checkin: currentCheckin,
          previousCheckins: checkins,
          lang,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCheckinResult(data.analysis);
      if (data.benchmarkComparison) setBenchmarkComparison(data.benchmarkComparison);
      setCheckins(prev => [...prev, { ...currentCheckin, ...data.analysis }]);
    } catch (e: any) {
      setError(e.message || "Check-in failed");
    } finally {
      setCheckinLoading(false);
    }
  };

  const reset = () => {
    setPhase("welcome");
    setQuestionIndex(0);
    setSkills("");
    setTimeAvailable("");
    setCapital("");
    setRiskTolerance(5);
    setPriorities([]);
    setIdeas([]);
    setError("");
    setSelectedIdea(null);
    setAgentResults([]);
    setVerdict(null);
    setBlueprint(null);
    setCheckins([]);
    setCheckinResult(null);
  };

  const stopValidation = () => {
    abortRef.current?.abort();
    setPhase("results");
  };

  /* ═══ Shared styles ═══ */
  const sectionCard = (extra?: React.CSSProperties): React.CSSProperties => ({
    padding: isMobile ? 16 : 20, borderRadius: 14,
    border: "1px solid var(--card-border)",
    background: "var(--card-bg)",
    ...extra,
  });

  const monoLabel: React.CSSProperties = {
    fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 1.5,
    textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: 8,
  };

  const tealBtn = (disabled?: boolean): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 8,
    background: disabled ? tealAlpha(0.2) : TEAL,
    color: disabled ? "var(--text-secondary)" : "var(--text-inverse)",
    border: "none", borderRadius: 8, padding: "12px 24px",
    fontSize: 13, fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 200ms",
  });

  const ghostBtn: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6,
    background: "none", border: "1px solid var(--border-secondary)",
    borderRadius: 8, padding: "10px 18px",
    color: "var(--text-secondary)", fontSize: 13, cursor: "pointer",
  };

  /* ═══ WELCOME STATE ═══ */
  if (phase === "welcome") {
    const personas = [
      { tag: "CAREER CHANGE", color: TEAL, desc: "I have skills but no business idea yet", persona: "career" },
      { tag: "SIDE PROJECT", color: "#f59e0b", desc: "I have an idea and want to validate it", persona: "side" },
      { tag: "SCALE UP", color: "#3b82f6", desc: "I already started but need structure to grow", persona: "scale" },
    ];

    return (
        <section style={{
          minHeight: isMobile ? "75vh" : "85vh",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: isMobile ? "24px 16px 32px" : "32px 24px 40px",
          position: "relative", overflow: "hidden",
        }}>
          {TRAJECTORY_LINES.map((line, i) => (
            <div key={`tl-${i}`} style={{
              position: "absolute", left: line.left, width: 2,
              height: line.height, pointerEvents: "none",
              background: `linear-gradient(to top, ${tealAlpha(0.3)}, transparent)`,
              animation: `moveUp ${line.dur}s linear infinite`,
              animationDelay: `${line.delay}s`,
            }} />
          ))}

          <div style={{ maxWidth: 720, width: "100%", position: "relative", zIndex: 1 }}>
            <div style={{ textAlign: "center", marginBottom: 24, animation: "fadeIn 0.4s ease-out" }}>
              <div style={{
                width: isMobile ? 36 : 48, height: isMobile ? 36 : 48, borderRadius: isMobile ? 10 : 12,
                border: `1px solid ${tealAlpha(0.15)}`,
                background: tealAlpha(0.04),
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px",
              }}>
                <Rocket size={isMobile ? 18 : 22} style={{ color: TEAL }} />
              </div>

              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center" }}>
                <span style={{
                  fontFamily: "var(--font-brand)", fontSize: isMobile ? 20 : 28, fontWeight: 700,
                  letterSpacing: 3, color: "var(--text-primary)",
                }}>LAUNCH</span>
                <span style={{
                  fontFamily: "var(--font-brand)", fontSize: isMobile ? 20 : 28, fontWeight: 300,
                  letterSpacing: 2, color: "var(--text-tertiary)", marginLeft: 8,
                }}>PAD</span>
              </div>

              <div style={{
                fontFamily: "var(--font-mono)", fontSize: isMobile ? 9 : 11, letterSpacing: isMobile ? 1 : 3,
                textTransform: "uppercase", color: tealAlpha(0.6), marginTop: isMobile ? 8 : 12,
              }}>
                {t("launchpad.subtitle")}
              </div>

              <div style={{
                width: 48, height: 1,
                background: `linear-gradient(90deg, transparent, ${TEAL}, transparent)`,
                margin: "20px auto 0",
              }} />
            </div>

            <div style={{
              display: "flex", alignItems: "center",
              justifyContent: isMobile ? "flex-start" : "center",
              gap: 0, marginBottom: 20, animation: "fadeIn 0.5s ease-out",
              overflowX: "auto", WebkitOverflowScrolling: "touch",
              padding: isMobile ? "0 4px 6px" : "0 8px",
              scrollSnapType: isMobile ? "x mandatory" : undefined,
              scrollbarWidth: "none",
            }}>
              {JOURNEY_STEPS.map((step, i) => (
                <div key={step} style={{
                  display: "flex", alignItems: "center",
                  flex: isMobile ? "0 0 auto" : undefined,
                  scrollSnapAlign: isMobile ? "center" : undefined,
                }}>
                  {i > 0 && <div style={{ width: isMobile ? 10 : 24, height: 1, background: tealAlpha(0.15), flexShrink: 0 }} />}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: isMobile ? 4 : 6 }}>
                    <div style={{
                      width: isMobile ? 24 : 28, height: isMobile ? 24 : 28, borderRadius: "50%",
                      border: i === 0 ? `1px solid ${tealAlpha(0.4)}` : "1px solid var(--border-secondary)",
                      background: i === 0 ? tealAlpha(0.15) : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "var(--font-mono)", fontSize: isMobile ? 9 : 10, fontWeight: 600,
                      color: i === 0 ? TEAL : "var(--text-tertiary)",
                    }}>
                      {i + 1}
                    </div>
                    <span style={{
                      fontFamily: "var(--font-mono)", fontSize: isMobile ? 7 : 9, letterSpacing: 1,
                      textTransform: "uppercase",
                      color: i === 0 ? tealAlpha(0.7) : "var(--text-tertiary)",
                      whiteSpace: "nowrap",
                    }}>
                      {step}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              textAlign: "center", maxWidth: 520, margin: "0 auto 40px",
              fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.6,
              animation: "fadeIn 0.55s ease-out",
            }}>
              {t("launchpad.central_text")}
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
              gap: 10, marginBottom: 32,
              animation: "fadeIn 0.6s ease-out",
            }}>
              {personas.map(p => {
                const r = parseInt(p.color.slice(1, 3), 16);
                const g = parseInt(p.color.slice(3, 5), 16);
                const b = parseInt(p.color.slice(5, 7), 16);
                const rgba = (a: number) => `rgba(${r},${g},${b},${a})`;
                return (
                  <button
                    key={p.tag}
                    onClick={() => startDiscovery(p.persona)}
                    style={{
                      background: "var(--card-bg)",
                      border: "1px solid var(--card-border)",
                      borderRadius: 10, padding: "16px",
                      cursor: "pointer", transition: "all 200ms",
                      textAlign: "left", borderLeft: "2px solid transparent",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = rgba(0.2);
                      e.currentTarget.style.borderLeftColor = p.color;
                      e.currentTarget.style.background = rgba(0.03);
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = "var(--card-border)";
                      e.currentTarget.style.borderLeftColor = "transparent";
                      e.currentTarget.style.background = "var(--card-bg)";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <div style={{ width: 4, height: 4, borderRadius: "50%", background: p.color }} />
                      <span style={{
                        fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 1,
                        textTransform: "uppercase", color: "var(--text-secondary)",
                      }}>{p.tag}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5 }}>
                      {p.desc}
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ textAlign: "center", animation: "fadeIn 0.8s ease-out" }}>
              <button
                onClick={() => startDiscovery()}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 10,
                  background: TEAL, color: "var(--text-inverse)", border: "none", borderRadius: 50,
                  padding: "14px 36px",
                  fontFamily: "var(--font-brand)", fontWeight: 600, fontSize: 14,
                  letterSpacing: 2, textTransform: "uppercase",
                  cursor: "pointer", transition: "all 200ms",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.filter = "brightness(1.15)";
                  e.currentTarget.style.boxShadow = `0 0 30px ${tealAlpha(0.25)}`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.filter = "none";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <Rocket size={16} />
                {t("launchpad.cta")}
              </button>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 16 }}>
                {t("launchpad.disclaimer")}
              </div>
            </div>
          </div>
        </section>
    );
  }

  /* ═══ DISCOVERY STATE ═══ */
  if (phase === "discovery") {
    const renderQuestion = () => {
      switch (questionIndex) {
        case 0:
          return (
            <div style={{ animation: "fadeIn 0.3s ease-out" }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginBottom: 24, lineHeight: 1.4 }}>
                {t("launchpad.q1")}
              </div>
              <textarea
                value={skills}
                onChange={e => setSkills(e.target.value)}
                placeholder={t("launchpad.q1_placeholder")}
                autoFocus
                style={{
                  width: "100%", minHeight: 80, padding: 16,
                  background: "var(--card-bg)",
                  border: `1px solid ${tealAlpha(0.12)}`,
                  borderRadius: 12, color: "var(--text-primary)",
                  fontSize: 15, lineHeight: 1.6, resize: "none", outline: "none",
                  fontFamily: "var(--font-sans)",
                  opacity: enhancing ? 0.5 : 1, transition: "opacity 150ms ease",
                }}
                onFocus={e => e.currentTarget.style.borderColor = tealAlpha(0.3)}
                onBlur={e => { if (!skills.trim()) e.currentTarget.style.borderColor = tealAlpha(0.12); }}
                onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "e") { e.preventDefault(); handleEnhance(); return; } }}
              />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                {SKILL_PILLS.map(s => (
                  <button key={s} onClick={() => setSkills(prev => prev ? `${prev}, ${s}` : s)} style={{
                    padding: "5px 12px", borderRadius: 20,
                    background: "var(--pill-bg)",
                    border: "1px solid var(--pill-border)",
                    color: "var(--pill-text)", fontSize: 12,
                    cursor: "pointer", transition: "all 150ms",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = tealAlpha(0.2); e.currentTarget.style.color = "var(--text-primary)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--pill-border)"; e.currentTarget.style.color = "var(--pill-text)"; }}
                  >{s}</button>
                ))}
              </div>
              {skills.trim().length >= 10 && (
                <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={handleEnhance} disabled={enhancing} title="Enhance (⌘E)" style={{
                    display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 50,
                    border: "1px solid var(--card-border)", background: wasEnhanced ? "var(--accent-soft, rgba(212,175,55,0.1))" : "none",
                    color: wasEnhanced ? "var(--accent)" : "var(--text-tertiary)", fontSize: 11,
                    cursor: enhancing ? "wait" : "pointer", transition: "all 200ms", fontFamily: "var(--font-mono)", letterSpacing: 0.5,
                  }}
                    onMouseEnter={e => { if (!enhancing && !wasEnhanced) { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; } }}
                    onMouseLeave={e => { if (!enhancing && !wasEnhanced) { e.currentTarget.style.borderColor = "var(--card-border)"; e.currentTarget.style.color = "var(--text-tertiary)"; } }}
                  >
                    {enhancing ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Wand2 size={12} />}
                    {wasEnhanced ? "Enhanced" : "Enhance"}
                  </button>
                </div>
              )}
            </div>
          );
        case 1:
          return (
            <div style={{ animation: "fadeIn 0.3s ease-out" }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginBottom: 24, lineHeight: 1.4 }}>
                {t("launchpad.q2")}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {TIME_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setTimeAvailable(opt.value)} style={{
                    padding: "16px 20px", borderRadius: 12, textAlign: "left",
                    border: timeAvailable === opt.value ? `1px solid ${tealAlpha(0.4)}` : "1px solid var(--card-border)",
                    background: timeAvailable === opt.value ? tealAlpha(0.06) : "var(--card-bg)",
                    color: timeAvailable === opt.value ? "var(--text-primary)" : "var(--text-secondary)",
                    fontSize: 14, cursor: "pointer", transition: "all 200ms",
                    display: "flex", alignItems: "center", gap: 12,
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%",
                      border: timeAvailable === opt.value ? `2px solid ${TEAL}` : "1px solid var(--text-tertiary)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      {timeAvailable === opt.value && <div style={{ width: 8, height: 8, borderRadius: "50%", background: TEAL }} />}
                    </div>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          );
        case 2:
          return (
            <div style={{ animation: "fadeIn 0.3s ease-out" }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginBottom: 24, lineHeight: 1.4 }}>
                {t("launchpad.q3")}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {CAPITAL_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setCapital(opt.value)} style={{
                    padding: "16px 20px", borderRadius: 12, textAlign: "center",
                    border: capital === opt.value ? `1px solid ${tealAlpha(0.4)}` : "1px solid var(--card-border)",
                    background: capital === opt.value ? tealAlpha(0.06) : "var(--card-bg)",
                    color: capital === opt.value ? "var(--text-primary)" : "var(--text-secondary)",
                    fontSize: 14, fontWeight: 500, cursor: "pointer", transition: "all 200ms",
                  }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          );
        case 3:
          return (
            <div style={{ animation: "fadeIn 0.3s ease-out" }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginBottom: 24, lineHeight: 1.4 }}>
                {t("launchpad.q4")}
              </div>
              <div style={{ padding: "0 8px" }}>
                <input
                  type="range" min={1} max={10} value={riskTolerance}
                  onChange={e => setRiskTolerance(Number(e.target.value))}
                  style={{ width: "100%", accentColor: TEAL }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t("launchpad.conservative")}</span>
                  <span style={{ fontSize: 16, fontWeight: 600, color: TEAL }}>{riskTolerance}/10</span>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t("launchpad.aggressive")}</span>
                </div>
              </div>
            </div>
          );
        case 4:
          return (
            <div style={{ animation: "fadeIn 0.3s ease-out" }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginBottom: 24, lineHeight: 1.4 }}>
                {t("launchpad.q5")}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {PRIORITY_OPTIONS.map(p => (
                  <button key={p} onClick={() => togglePriority(p)} style={{
                    padding: "10px 18px", borderRadius: 24,
                    border: priorities.includes(p) ? `1px solid ${tealAlpha(0.4)}` : "1px solid var(--border-secondary)",
                    background: priorities.includes(p) ? tealAlpha(0.08) : "var(--card-bg)",
                    color: priorities.includes(p) ? TEAL : "var(--text-secondary)",
                    fontSize: 13, fontWeight: priorities.includes(p) ? 600 : 400,
                    cursor: "pointer", transition: "all 150ms",
                  }}>
                    {p}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 12 }}>
                {t("launchpad.select_multiple")}
              </div>
            </div>
          );
        default: return null;
      }
    };

    return (
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: isMobile ? "24px 16px 32px" : "40px 24px",
        minHeight: "calc(100vh - 60px)",
      }}>
        <div style={{ maxWidth: 560, width: "100%" }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 40 }}>
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} style={{
                flex: 1, height: 3, borderRadius: 2,
                background: i <= questionIndex ? TEAL : "var(--card-border)",
                transition: "background 0.3s ease",
              }} />
            ))}
          </div>

          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2,
            textTransform: "uppercase", color: tealAlpha(0.5), marginBottom: 24,
          }}>
            {t("launchpad.step")} {questionIndex + 1} / 5
          </div>

          {renderQuestion()}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 40 }}>
            <button
              onClick={questionIndex === 0 ? reset : prevQuestion}
              style={ghostBtn}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--card-hover-border)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border-secondary)"}
            >
              <ChevronLeft size={14} />
              {questionIndex === 0 ? t("launchpad.back") : t("launchpad.previous")}
            </button>

            <button
              onClick={nextQuestion}
              disabled={!canProceed()}
              style={tealBtn(!canProceed())}
            >
              {questionIndex === 4 ? t("launchpad.analyze") : t("launchpad.next")}
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
        <LaunchpadPaywall show={showPaywall} onClose={() => setShowPaywall(false)} />
      </div>
    );
  }

  /* ═══ ANALYZING STATE ═══ */
  if (phase === "analyzing") {
    return (
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        minHeight: "calc(100vh - 60px)",
      }}>
        <div style={{ textAlign: "center", animation: "fadeIn 0.3s ease-out" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            border: `1px solid ${tealAlpha(0.2)}`, background: tealAlpha(0.05),
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 24px",
          }}>
            <span className="spinner" style={{
              width: 24, height: 24, borderWidth: 2,
              borderColor: tealAlpha(0.2), borderTopColor: TEAL,
            }} />
          </div>
          <div style={{
            fontFamily: "var(--font-brand)", fontSize: 20, fontWeight: 600,
            letterSpacing: 2, color: "var(--text-primary)", marginBottom: 8,
          }}>
            {t("launchpad.analyzing")}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            {t("launchpad.analyzing_desc")}
          </div>
        </div>
      </div>
    );
  }

  /* ═══ RESULTS STATE ═══ */
  if (phase === "results") {
    return (
      <div style={{
        flex: 1, overflowY: "auto",
        padding: isMobile ? "24px 16px" : "40px 24px",
        display: "flex", flexDirection: "column", alignItems: "center",
      }}>
        <div style={{ maxWidth: 720, width: "100%" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            marginBottom: 32, animation: "fadeIn 0.3s ease-out",
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: tealAlpha(0.15), display: "flex",
              alignItems: "center", justifyContent: "center",
            }}>
              <Check size={14} style={{ color: TEAL }} />
            </div>
            <span style={{
              fontFamily: "var(--font-brand)", fontSize: 20, fontWeight: 600,
              letterSpacing: 2, color: "var(--text-primary)",
            }}>
              {t("launchpad.results_title")}
            </span>
          </div>

          {error ? (
            <div style={{
              padding: 20, borderRadius: 12,
              border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.05)",
              color: "var(--text-primary)", fontSize: 14, marginBottom: 24,
            }}>
              {error}
            </div>
          ) : (
            <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 28 }}>
              {t("launchpad.results_desc")}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 40 }}>
            {ideas.map((idea, i) => {
              const scoreColor = idea.matchScore >= 80 ? "#22c55e" : idea.matchScore >= 60 ? "#f59e0b" : "#ef4444";
              return (
                <div key={i} style={{
                  ...sectionCard(),
                  animation: `fadeInUp 0.3s ease-out`,
                  animationDelay: `${i * 0.1}s`,
                  animationFillMode: "both",
                }}>
                  <div style={{ display: "flex", gap: 16, alignItems: isMobile ? "flex-start" : "center" }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: "50%",
                      border: `2px solid ${scoreColor}`,
                      display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>
                        {idea.matchScore}
                      </span>
                      <span style={{ fontSize: 8, color: scoreColor, opacity: 0.7 }}>%</span>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
                          {idea.name}
                        </span>
                        {idea.category && (
                          <span style={{
                            padding: "2px 8px", borderRadius: 10, fontSize: 10,
                            background: tealAlpha(0.08), color: TEAL,
                            fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 0.5,
                          }}>
                            {idea.category}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                        {idea.description}
                      </div>
                    </div>
                  </div>

                  {/* Why it matches */}
                  <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--divider)" }}>
                    <div style={monoLabel}>Why it matches</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {idea.whyItMatches?.map((reason, j) => (
                        <div key={j} style={{ display: "flex", gap: 8, fontSize: 12, color: "var(--text-secondary)" }}>
                          <Check size={12} style={{ color: TEAL, flexShrink: 0, marginTop: 2 }} />
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Risks */}
                  {idea.whyItMightFail && idea.whyItMightFail.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={monoLabel}>Risks</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {idea.whyItMightFail.map((risk, j) => (
                          <div key={j} style={{ display: "flex", gap: 8, fontSize: 12, color: "var(--text-secondary)" }}>
                            <AlertTriangle size={12} style={{ color: "#f59e0b", flexShrink: 0, marginTop: 2 }} />
                            <span>{risk}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Revenue projections */}
                  {idea.realisticRevenue && (
                    <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
                      {[
                        { label: "Month 1", value: idea.realisticRevenue.month1 },
                        { label: "Month 3", value: idea.realisticRevenue.month3 },
                        { label: "Month 6", value: idea.realisticRevenue.month6 },
                      ].map(m => (
                        <div key={m.label} style={{
                          padding: "8px 12px", borderRadius: 8,
                          background: tealAlpha(0.04), border: `1px solid ${tealAlpha(0.08)}`,
                        }}>
                          <div style={{ fontSize: 9, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", letterSpacing: 1, textTransform: "uppercase" }}>{m.label}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginTop: 2 }}>{m.value}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Meta */}
                  <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
                    {[
                      { label: "Revenue in", value: idea.timeToFirstRevenue || idea.estimatedTimeToRevenue },
                      { label: "Capital", value: idea.capitalNeeded },
                      { label: "Risk", value: idea.riskLevel },
                      ...(idea.competitionLevel ? [{ label: "Competition", value: idea.competitionLevel }] : []),
                      ...(idea.marketTrend ? [{ label: "Trend", value: idea.marketTrend }] : []),
                    ].filter(m => m.value).map(m => (
                      <div key={m.label} style={{ display: "flex", gap: 4 }}>
                        <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{m.label}:</span>
                        <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 500 }}>{m.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Validate button */}
                  <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--divider)" }}>
                    <button
                      onClick={() => runValidation(idea)}
                      style={{
                        ...tealBtn(),
                        width: "100%", justifyContent: "center",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.filter = "brightness(1.1)"; }}
                      onMouseLeave={e => { e.currentTarget.style.filter = "none"; }}
                    >
                      <Shield size={14} /> Validate with 6 AI Agents
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={reset} style={ghostBtn}>
              <Rocket size={14} /> {t("launchpad.start_over")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ═══ VALIDATING STATE ═══ */
  if (phase === "validating") {
    const completedAgents = agentResults.map(r => r.agent);
    return (
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: isMobile ? "24px 16px" : "40px 24px",
        minHeight: "calc(100vh - 60px)",
      }}>
        <div style={{ maxWidth: 520, width: "100%", animation: "fadeIn 0.3s ease-out" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{
              fontFamily: "var(--font-brand)", fontSize: 22, fontWeight: 600,
              letterSpacing: 2, color: "var(--text-primary)", marginBottom: 8,
            }}>
              Validating: {selectedIdea?.name}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              {currentAgent || "Starting validation agents..."}
            </div>
          </div>

          {/* Agent grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 32 }}>
            {AGENT_NAMES.map(name => {
              const done = completedAgents.includes(name);
              const Icon = AGENT_ICONS[name] || Brain;
              return (
                <div key={name} style={{
                  ...sectionCard(),
                  display: "flex", alignItems: "center", gap: 12,
                  opacity: done ? 1 : 0.5,
                  transition: "all 300ms",
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: done ? tealAlpha(0.1) : "var(--card-bg)",
                    border: `1px solid ${done ? tealAlpha(0.3) : "var(--border-secondary)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    {done ? (
                      <Check size={16} style={{ color: TEAL }} />
                    ) : (
                      <Icon size={16} style={{ color: "var(--text-tertiary)" }} />
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{name}</div>
                    <div style={{ fontSize: 10, color: done ? TEAL : "var(--text-tertiary)" }}>
                      {done ? "Complete" : "Waiting..."}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          <div style={{ height: 3, borderRadius: 2, background: "var(--card-border)", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 2, background: TEAL,
              width: `${(completedAgents.length / 6) * 100}%`,
              transition: "width 300ms ease",
            }} />
          </div>
          <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "var(--text-tertiary)" }}>
            {completedAgents.length} / 6 agents complete
          </div>

          {/* Stop button */}
          <div style={{ textAlign: "center", marginTop: 24 }}>
            <button onClick={stopValidation} style={ghostBtn}>
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ═══ VALIDATED STATE ═══ */
  if (phase === "validated" && verdict) {
    const scoreColor = verdict.viability_score >= 7 ? "#22c55e"
      : verdict.viability_score >= 5 ? "#f59e0b" : "#ef4444";
    const verdictColor = verdict.verdict === "GO" ? "#22c55e"
      : verdict.verdict === "CAUTION" ? "#f59e0b" : "#ef4444";

    return (
      <div style={{
        flex: 1, overflowY: "auto",
        padding: isMobile ? "24px 16px" : "40px 24px",
        display: "flex", flexDirection: "column", alignItems: "center",
      }}>
        <div style={{ maxWidth: 720, width: "100%" }}>
          {/* Verdict header */}
          <div style={{ textAlign: "center", marginBottom: 40, animation: "fadeIn 0.4s ease-out" }}>
            <div style={{ fontSize: 14, color: "var(--text-tertiary)", marginBottom: 12 }}>
              Validation complete for
            </div>
            <div style={{
              fontFamily: "var(--font-brand)", fontSize: 24, fontWeight: 600,
              color: "var(--text-primary)", marginBottom: 24,
            }}>
              {selectedIdea?.name}
            </div>

            {/* Score gauge */}
            <div style={{
              width: 120, height: 120, borderRadius: "50%",
              border: `4px solid ${scoreColor}`,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: `0 0 40px ${scoreColor}33`,
            }}>
              <span style={{ fontSize: 40, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>
                {verdict.viability_score}
              </span>
              <span style={{ fontSize: 11, color: scoreColor, opacity: 0.7 }}>/10</span>
            </div>

            {/* Verdict badge */}
            <div style={{
              display: "inline-flex", padding: "8px 24px", borderRadius: 50,
              background: `${verdictColor}15`,
              border: `1px solid ${verdictColor}40`,
              fontSize: 16, fontWeight: 700, letterSpacing: 3,
              color: verdictColor, textTransform: "uppercase",
            }}>
              {verdict.verdict}
            </div>

            {verdict.one_line && (
              <div style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 16, maxWidth: 500, margin: "16px auto 0" }}>
                {verdict.one_line}
              </div>
            )}
          </div>

          {/* Honest assessment */}
          {verdict.honest_assessment && (
            <div style={{ ...sectionCard({ marginBottom: 16 }), animation: "fadeIn 0.5s ease-out" }}>
              <div style={monoLabel}>Honest Assessment</div>
              <div style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                {verdict.honest_assessment}
              </div>
            </div>
          )}

          {/* Risks & Opportunities */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 12, marginBottom: 16,
          }}>
            {/* Risks */}
            {verdict.top_risks && verdict.top_risks.length > 0 && (
              <div style={sectionCard({ animation: "fadeIn 0.55s ease-out" })}>
                <div style={monoLabel}>Top Risks</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {verdict.top_risks.map((r, i) => (
                    <div key={i}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <div style={{
                          width: 6, height: 6, borderRadius: "50%",
                          background: r.severity === "high" ? "#ef4444" : r.severity === "medium" ? "#f59e0b" : "#22c55e",
                        }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{r.risk}</span>
                      </div>
                      {r.mitigation && (
                        <div style={{ fontSize: 12, color: "var(--text-secondary)", paddingLeft: 12 }}>
                          Mitigation: {r.mitigation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Opportunities */}
            {verdict.top_opportunities && verdict.top_opportunities.length > 0 && (
              <div style={sectionCard({ animation: "fadeIn 0.6s ease-out" })}>
                <div style={monoLabel}>Opportunities</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {verdict.top_opportunities.map((o, i) => (
                    <div key={i} style={{ display: "flex", gap: 8 }}>
                      <Zap size={12} style={{ color: "#22c55e", flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{o.opportunity}</span>
                        <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginLeft: 6 }}>({o.impact})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Kill conditions */}
          {verdict.kill_conditions && verdict.kill_conditions.length > 0 && (
            <div style={{
              ...sectionCard({ marginBottom: 16 }),
              borderColor: "rgba(239,68,68,0.15)",
              animation: "fadeIn 0.65s ease-out",
            }}>
              <div style={{ ...monoLabel, color: "#ef4444" }}>Kill Conditions</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {verdict.kill_conditions.map((kc, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, fontSize: 13, color: "var(--text-secondary)" }}>
                    <X size={12} style={{ color: "#ef4444", flexShrink: 0, marginTop: 2 }} />
                    <span>{kc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* If you proceed */}
          {verdict.if_you_proceed && (
            <div style={{ ...sectionCard({ marginBottom: 16 }), borderColor: tealAlpha(0.15), animation: "fadeIn 0.7s ease-out" }}>
              <div style={{ ...monoLabel, color: TEAL }}>If You Proceed</div>
              <div style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.6 }}>
                {verdict.if_you_proceed}
              </div>
            </div>
          )}

          {/* Agent reports */}
          {agentResults.length > 0 && (
            <div style={{ ...sectionCard({ marginBottom: 24 }), animation: "fadeIn 0.75s ease-out" }}>
              <div style={monoLabel}>Agent Reports</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {agentResults.map((ar, i) => {
                  const Icon = AGENT_ICONS[ar.agent] || Brain;
                  return (
                    <div key={i} style={{ paddingBottom: 12, borderBottom: i < agentResults.length - 1 ? "1px solid var(--divider)" : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <Icon size={14} style={{ color: TEAL }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{ar.agent}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                        {ar.analysis}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 40 }}>
            <button
              onClick={runBlueprint}
              style={tealBtn()}
              onMouseEnter={e => { e.currentTarget.style.filter = "brightness(1.1)"; }}
              onMouseLeave={e => { e.currentTarget.style.filter = "none"; }}
            >
              <FileText size={14} /> Generate 90-Day Blueprint
            </button>
            <button onClick={() => setPhase("results")} style={ghostBtn}>
              <ChevronLeft size={14} /> Back to Ideas
            </button>
            <button onClick={reset} style={ghostBtn}>
              <RotateCcw size={14} /> Start Over
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ═══ BLUEPRINT STATE ═══ */
  if (phase === "blueprint") {
    if (blueprintLoading) {
      return (
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          minHeight: "calc(100vh - 60px)",
        }}>
          <div style={{ textAlign: "center", animation: "fadeIn 0.3s ease-out" }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              border: `1px solid ${tealAlpha(0.2)}`, background: tealAlpha(0.05),
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 24px",
            }}>
              <span className="spinner" style={{
                width: 24, height: 24, borderWidth: 2,
                borderColor: tealAlpha(0.2), borderTopColor: TEAL,
              }} />
            </div>
            <div style={{
              fontFamily: "var(--font-brand)", fontSize: 20, fontWeight: 600,
              letterSpacing: 2, color: "var(--text-primary)", marginBottom: 8,
            }}>
              Generating Blueprint
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Building your personalized 90-day plan with real market data...
            </div>
          </div>
        </div>
      );
    }

    if (!blueprint) {
      return (
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          minHeight: "calc(100vh - 60px)",
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, color: "var(--text-primary)", marginBottom: 16 }}>
              {error || "Blueprint generation failed"}
            </div>
            <button onClick={() => setPhase("validated")} style={ghostBtn}>
              <ChevronLeft size={14} /> Back to Validation
            </button>
          </div>
        </div>
      );
    }

    const bmc = blueprint.business_model_canvas;
    const tabs = [
      { key: "plan" as const, label: "Week-by-Week" },
      { key: "canvas" as const, label: "Business Canvas" },
      { key: "templates" as const, label: "Templates" },
    ];

    return (
      <div style={{
        flex: 1, overflowY: "auto",
        padding: isMobile ? "24px 16px" : "40px 24px",
        display: "flex", flexDirection: "column", alignItems: "center",
      }}>
        <div style={{ maxWidth: 800, width: "100%" }}>
          {/* Header */}
          <div style={{ marginBottom: 32, animation: "fadeIn 0.3s ease-out" }}>
            <div style={{ fontSize: 12, color: TEAL, fontFamily: "var(--font-mono)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>
              90-Day Blueprint
            </div>
            <div style={{
              fontFamily: "var(--font-brand)", fontSize: 24, fontWeight: 600,
              color: "var(--text-primary)", marginBottom: 4,
            }}>
              {selectedIdea?.name}
            </div>
            {verdict && (
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                Viability: {verdict.viability_score}/10 — {verdict.verdict}
              </div>
            )}
          </div>

          {/* First week checklist */}
          {blueprint.first_week_checklist && blueprint.first_week_checklist.length > 0 && (
            <div style={{ ...sectionCard({ marginBottom: 16, borderColor: tealAlpha(0.2) }), animation: "fadeIn 0.35s ease-out" }}>
              <div style={{ ...monoLabel, color: TEAL }}>First Week Checklist</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {blueprint.first_week_checklist.map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, fontSize: 13, color: "var(--text-primary)" }}>
                    <Check size={14} style={{ color: TEAL, flexShrink: 0, marginTop: 1 }} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div style={{
            display: "flex", gap: 2, marginBottom: 20, padding: 3, borderRadius: 10,
            background: "var(--card-bg)", border: "1px solid var(--card-border)",
            width: "fit-content",
          }}>
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setBlueprintTab(tab.key)}
                style={{
                  padding: "8px 16px", borderRadius: 8, border: "none",
                  background: blueprintTab === tab.key ? tealAlpha(0.1) : "transparent",
                  color: blueprintTab === tab.key ? TEAL : "var(--text-secondary)",
                  fontSize: 12, fontWeight: blueprintTab === tab.key ? 600 : 400,
                  cursor: "pointer", transition: "all 150ms",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab: Week-by-Week */}
          {blueprintTab === "plan" && blueprint.week_by_week && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
              {blueprint.week_by_week.map((week: any, i: number) => (
                <div key={i} style={sectionCard()}>
                  <button
                    onClick={() => setExpandedWeek(expandedWeek === i ? null : i)}
                    style={{
                      width: "100%", background: "none", border: "none",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      cursor: "pointer", padding: 0,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: tealAlpha(0.08), border: `1px solid ${tealAlpha(0.15)}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: TEAL,
                      }}>
                        {week.week}
                      </div>
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{week.theme}</div>
                        {week.revenue_target && (
                          <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Target: {week.revenue_target}</div>
                        )}
                      </div>
                    </div>
                    {expandedWeek === i ? <ChevronUp size={16} style={{ color: "var(--text-tertiary)" }} /> : <ChevronDown size={16} style={{ color: "var(--text-tertiary)" }} />}
                  </button>

                  {expandedWeek === i && (
                    <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--divider)", animation: "fadeIn 0.2s ease-out" }}>
                      {week.tasks && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                          {week.tasks.map((task: any, j: number) => (
                            <div key={j} style={{
                              padding: 12, borderRadius: 8,
                              background: tealAlpha(0.03), border: `1px solid ${tealAlpha(0.06)}`,
                            }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 4 }}>
                                {task.task}
                              </div>
                              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                                {task.deliverable && (
                                  <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Deliverable: {task.deliverable}</span>
                                )}
                                {task.time && (
                                  <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Time: {task.time}</span>
                                )}
                                {task.cost && (
                                  <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Cost: {task.cost}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {week.milestone && (
                        <div style={{ fontSize: 12, color: TEAL, fontWeight: 500 }}>
                          Milestone: {week.milestone}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Tab: Business Canvas */}
          {blueprintTab === "canvas" && bmc && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
              {/* Value Prop */}
              <div style={sectionCard()}>
                <div style={monoLabel}>Value Proposition</div>
                <div style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.6 }}>
                  {bmc.value_proposition}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                {/* Customer Segments */}
                {bmc.customer_segments && (
                  <div style={sectionCard()}>
                    <div style={monoLabel}>Customer Segments</div>
                    {bmc.customer_segments.map((s: string, i: number) => (
                      <div key={i} style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>• {s}</div>
                    ))}
                  </div>
                )}
                {/* Channels */}
                {bmc.channels && (
                  <div style={sectionCard()}>
                    <div style={monoLabel}>Channels</div>
                    {bmc.channels.map((c: string, i: number) => (
                      <div key={i} style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>• {c}</div>
                    ))}
                  </div>
                )}
                {/* Revenue Streams */}
                {bmc.revenue_streams && (
                  <div style={sectionCard()}>
                    <div style={monoLabel}>Revenue Streams</div>
                    {bmc.revenue_streams.map((r: string, i: number) => (
                      <div key={i} style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>• {r}</div>
                    ))}
                  </div>
                )}
                {/* Key Resources */}
                {bmc.key_resources && (
                  <div style={sectionCard()}>
                    <div style={monoLabel}>Key Resources</div>
                    {bmc.key_resources.map((r: string, i: number) => (
                      <div key={i} style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>• {r}</div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cost Structure */}
              {bmc.cost_structure && (
                <div style={sectionCard()}>
                  <div style={monoLabel}>Cost Structure</div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 8 }}>
                    {bmc.cost_structure.monthly_fixed && (
                      <div><span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Fixed: </span><span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{bmc.cost_structure.monthly_fixed}</span></div>
                    )}
                    {bmc.cost_structure.variable && (
                      <div><span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Variable: </span><span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{bmc.cost_structure.variable}</span></div>
                    )}
                  </div>
                  {bmc.cost_structure.tools?.map((tool: any, i: number) => (
                    <div key={i} style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 2 }}>
                      {tool.name} ({tool.cost}) — {tool.why}
                    </div>
                  ))}
                </div>
              )}

              {/* Pricing */}
              {blueprint.pricing && (
                <div style={sectionCard()}>
                  <div style={monoLabel}>Pricing Strategy</div>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 10 }}>{blueprint.pricing.strategy}</div>
                  {blueprint.pricing.tiers?.map((tier: any, i: number) => (
                    <div key={i} style={{
                      padding: 10, borderRadius: 8, marginBottom: 6,
                      background: tealAlpha(0.03), border: `1px solid ${tealAlpha(0.06)}`,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{tier.name}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: TEAL }}>{tier.price}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>{tier.includes}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* ICP */}
              {blueprint.icp && (
                <div style={sectionCard()}>
                  <div style={monoLabel}>Ideal Customer Profile</div>
                  <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6, marginBottom: 8 }}>{blueprint.icp.description}</div>
                  {blueprint.icp.pain_points && (
                    <div style={{ marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Pain points: </span>
                      {blueprint.icp.pain_points.map((p: string, i: number) => (
                        <span key={i} style={{ fontSize: 12, color: "var(--text-secondary)" }}>{i > 0 ? ", " : ""}{p}</span>
                      ))}
                    </div>
                  )}
                  {blueprint.icp.where_they_hang_out && (
                    <div style={{ marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Where to find them: </span>
                      {blueprint.icp.where_they_hang_out.map((p: string, i: number) => (
                        <span key={i} style={{ fontSize: 12, color: "var(--text-secondary)" }}>{i > 0 ? ", " : ""}{p}</span>
                      ))}
                    </div>
                  )}
                  {blueprint.icp.budget_range && (
                    <div><span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Budget: </span><span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{blueprint.icp.budget_range}</span></div>
                  )}
                </div>
              )}

              {/* Tools Stack */}
              {blueprint.tools_stack && blueprint.tools_stack.length > 0 && (
                <div style={sectionCard()}>
                  <div style={monoLabel}>Tools Stack</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {blueprint.tools_stack.map((tool: any, i: number) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{tool.name}</span>
                          <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginLeft: 8 }}>{tool.purpose}</span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: TEAL }}>{tool.cost}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Kill Metrics */}
              {blueprint.kill_metrics && (
                <div style={{ ...sectionCard(), borderColor: "rgba(239,68,68,0.15)" }}>
                  <div style={{ ...monoLabel, color: "#ef4444" }}>Kill Metrics</div>
                  {Object.entries(blueprint.kill_metrics).map(([key, val]) => (
                    <div key={key} style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{key}: </span>{val as string}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Templates */}
          {blueprintTab === "templates" && blueprint.templates && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
              {Object.entries(blueprint.templates).map(([key, value]) => (
                <div key={key} style={sectionCard()}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={monoLabel}>{key.replace(/_/g, " ")}</div>
                    <button
                      onClick={() => navigator.clipboard.writeText(value as string)}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "var(--text-tertiary)", padding: 4,
                      }}
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                  <div style={{
                    fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7,
                    whiteSpace: "pre-wrap", padding: 12, borderRadius: 8,
                    background: tealAlpha(0.03), border: `1px solid ${tealAlpha(0.06)}`,
                  }}>
                    {value as string}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 40 }}>
            <button
              onClick={() => setPhase("tracking")}
              style={tealBtn()}
              onMouseEnter={e => { e.currentTarget.style.filter = "brightness(1.1)"; }}
              onMouseLeave={e => { e.currentTarget.style.filter = "none"; }}
            >
              <Calendar size={14} /> Start Weekly Tracking
            </button>
            <button onClick={() => setPhase("validated")} style={ghostBtn}>
              <ChevronLeft size={14} /> Back to Validation
            </button>
            <button onClick={reset} style={ghostBtn}>
              <RotateCcw size={14} /> Start Over
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ═══ TRACKING STATE ═══ */
  if (phase === "tracking") {
    const weekNumber = checkins.length + 1;

    return (
      <div style={{
        flex: 1, overflowY: "auto",
        padding: isMobile ? "24px 16px" : "40px 24px",
        display: "flex", flexDirection: "column", alignItems: "center",
      }}>
        <div style={{ maxWidth: 720, width: "100%" }}>
          {/* Header */}
          <div style={{ marginBottom: 32, animation: "fadeIn 0.3s ease-out" }}>
            <div style={{ fontSize: 12, color: TEAL, fontFamily: "var(--font-mono)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>
              Weekly Check-in
            </div>
            <div style={{
              fontFamily: "var(--font-brand)", fontSize: 24, fontWeight: 600,
              color: "var(--text-primary)", marginBottom: 4,
            }}>
              {selectedIdea?.name} — Week {weekNumber}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              {checkins.length > 0 ? `${checkins.length} check-ins completed` : "Your first weekly check-in"}
            </div>
          </div>

          {/* Previous check-ins summary */}
          {checkins.length > 0 && (
            <div style={{ ...sectionCard({ marginBottom: 20 }), animation: "fadeIn 0.35s ease-out" }}>
              <div style={monoLabel}>Progress History</div>
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                {checkins.map((c, i) => {
                  const sc = (c.ai_score || 5) >= 7 ? "#22c55e" : (c.ai_score || 5) >= 5 ? "#f59e0b" : "#ef4444";
                  return (
                    <div key={i} style={{
                      minWidth: 60, padding: "8px 12px", borderRadius: 8, textAlign: "center",
                      background: tealAlpha(0.04), border: `1px solid ${tealAlpha(0.08)}`,
                    }}>
                      <div style={{ fontSize: 9, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>W{c.week_number}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: sc }}>{c.ai_score || "?"}</div>
                      <div style={{ fontSize: 9, color: "var(--text-tertiary)" }}>{c.revenue || "$0"}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Check-in result */}
          {checkinResult && (
            <div style={{ marginBottom: 24, animation: "fadeIn 0.3s ease-out" }}>
              <div style={{
                ...sectionCard({ marginBottom: 12 }),
                borderColor: (checkinResult.ai_score || 5) >= 7 ? "rgba(34,197,94,0.2)" : (checkinResult.ai_score || 5) >= 5 ? "rgba(245,158,11,0.2)" : "rgba(239,68,68,0.2)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: "50%",
                    border: `3px solid ${(checkinResult.ai_score || 5) >= 7 ? "#22c55e" : (checkinResult.ai_score || 5) >= 5 ? "#f59e0b" : "#ef4444"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span style={{ fontSize: 20, fontWeight: 700, color: (checkinResult.ai_score || 5) >= 7 ? "#22c55e" : (checkinResult.ai_score || 5) >= 5 ? "#f59e0b" : "#ef4444" }}>
                      {checkinResult.ai_score}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>Week {weekNumber - 1} Score</div>
                    {checkinResult.ai_recommendation && (
                      <div style={{ fontSize: 12, color: TEAL }}>{checkinResult.ai_recommendation}</div>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                  {checkinResult.ai_analysis}
                </div>
              </div>

              {/* Wins & Concerns */}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
                {checkinResult.wins && checkinResult.wins.length > 0 && (
                  <div style={sectionCard()}>
                    <div style={{ ...monoLabel, color: "#22c55e" }}>Wins</div>
                    {checkinResult.wins.map((w, i) => (
                      <div key={i} style={{ display: "flex", gap: 6, fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>
                        <Check size={12} style={{ color: "#22c55e", flexShrink: 0, marginTop: 1 }} /> {w}
                      </div>
                    ))}
                  </div>
                )}
                {checkinResult.concerns && checkinResult.concerns.length > 0 && (
                  <div style={sectionCard()}>
                    <div style={{ ...monoLabel, color: "#f59e0b" }}>Concerns</div>
                    {checkinResult.concerns.map((c, i) => (
                      <div key={i} style={{ display: "flex", gap: 6, fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>
                        <AlertTriangle size={12} style={{ color: "#f59e0b", flexShrink: 0, marginTop: 1 }} /> {c}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Items */}
              {checkinResult.action_items && checkinResult.action_items.length > 0 && (
                <div style={{ ...sectionCard({ marginBottom: 12 }), borderColor: tealAlpha(0.15) }}>
                  <div style={{ ...monoLabel, color: TEAL }}>Action Items for This Week</div>
                  {checkinResult.action_items.map((item, i) => (
                    <div key={i} style={{ padding: 10, borderRadius: 8, background: tealAlpha(0.03), marginBottom: 6 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{item.task}</div>
                      <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>Why: {item.why}</div>
                      <div style={{ fontSize: 11, color: TEAL, marginTop: 2 }}>Impact: {item.expected_impact}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Forecast */}
              {checkinResult.adjusted_forecast && (
                <div style={sectionCard()}>
                  <div style={monoLabel}>Adjusted Forecast</div>
                  <div style={{ fontSize: 14, color: "var(--text-primary)" }}>
                    Month 3 revenue: <strong>{checkinResult.adjusted_forecast.month3_revenue}</strong>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>
                    Confidence: {checkinResult.adjusted_forecast.confidence}
                  </div>
                </div>
              )}

              {/* Pivot warning */}
              {checkinResult.should_pivot && (
                <div style={{
                  ...sectionCard({ marginTop: 12 }),
                  borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: "#ef4444" }}>
                    <AlertTriangle size={16} /> Pivot Recommended
                  </div>
                  {checkinResult.pivot_reason && (
                    <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 8, lineHeight: 1.6 }}>
                      {checkinResult.pivot_reason}
                    </div>
                  )}
                </div>
              )}

              {/* Benchmark comparison */}
              {benchmarkComparison && Object.keys(benchmarkComparison).length > 0 && (
                <div style={{
                  padding: 16, borderRadius: 10, marginTop: 12,
                  border: `1px solid ${tealAlpha(0.12)}`, background: tealAlpha(0.02),
                }}>
                  <div style={{ ...monoLabel, color: TEAL, marginBottom: 10 }}>
                    How You Compare
                  </div>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${Math.min(Object.keys(benchmarkComparison).length, 4)}, 1fr)`,
                    gap: 12,
                  }}>
                    {Object.entries(benchmarkComparison).map(([key, val]: [string, any]) => {
                      const isTop = val.percentile?.includes("top");
                      const isBottom = val.percentile?.includes("bottom");
                      return (
                        <div key={key} style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase", marginBottom: 4, letterSpacing: 0.5 }}>
                            {key}
                          </div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
                            {val.yours}
                          </div>
                          <div style={{
                            fontSize: 10, marginTop: 2,
                            color: isTop ? "#22c55e" : isBottom ? "#ef4444" : "var(--text-tertiary)",
                            fontWeight: isTop || isBottom ? 600 : 400,
                          }}>
                            {val.percentile || `avg: ${val.average}`}
                          </div>
                          <div style={{ fontSize: 9, color: "var(--text-tertiary)", opacity: 0.5, marginTop: 2 }}>
                            avg: {val.average} · n={val.sampleSize}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* New check-in button */}
              <div style={{ marginTop: 16 }}>
                <button
                  onClick={() => {
                    setCheckinResult(null);
                    setBenchmarkComparison(null);
                    setCurrentCheckin({
                      week_number: weekNumber,
                      revenue: "", new_clients: "", leads_contacted: "",
                      leads_responded: "", biggest_win: "", biggest_challenge: "", what_learned: "",
                    });
                  }}
                  style={tealBtn()}
                  onMouseEnter={e => { e.currentTarget.style.filter = "brightness(1.1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.filter = "none"; }}
                >
                  <Calendar size={14} /> Submit Week {weekNumber} Check-in
                </button>
              </div>
            </div>
          )}

          {/* Check-in form */}
          {!checkinResult && (
            <div style={{ animation: "fadeIn 0.3s ease-out" }}>
              <div style={sectionCard({ marginBottom: 16 })}>
                <div style={{ ...monoLabel, color: TEAL }}>Week {weekNumber} Numbers</div>

                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 16 }}>
                  {[
                    { key: "revenue", label: "Revenue this week", placeholder: "$0", icon: DollarSign },
                    { key: "new_clients", label: "New clients/customers", placeholder: "0", icon: Users },
                    { key: "leads_contacted", label: "Leads contacted", placeholder: "0", icon: Target },
                    { key: "leads_responded", label: "Leads responded", placeholder: "0", icon: TrendingUp },
                  ].map(field => {
                    const Icon = field.icon;
                    return (
                      <div key={field.key}>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                          <Icon size={12} style={{ color: "var(--text-tertiary)" }} />
                          {field.label}
                        </div>
                        <input
                          value={(currentCheckin as any)[field.key]}
                          onChange={e => setCurrentCheckin(prev => ({ ...prev, [field.key]: e.target.value }))}
                          placeholder={field.placeholder}
                          style={{
                            width: "100%", padding: "10px 12px", borderRadius: 8,
                            background: "var(--card-bg)", border: `1px solid ${tealAlpha(0.12)}`,
                            color: "var(--text-primary)", fontSize: 14, outline: "none",
                          }}
                          onFocus={e => e.currentTarget.style.borderColor = tealAlpha(0.3)}
                          onBlur={e => e.currentTarget.style.borderColor = tealAlpha(0.12)}
                        />
                      </div>
                    );
                  })}
                </div>

                {[
                  { key: "biggest_win", label: "Biggest win this week", placeholder: "What went well?" },
                  { key: "biggest_challenge", label: "Biggest challenge", placeholder: "What blocked you?" },
                  { key: "what_learned", label: "What I learned", placeholder: "Key insight or lesson..." },
                ].map(field => (
                  <div key={field.key} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>{field.label}</div>
                    <textarea
                      value={(currentCheckin as any)[field.key]}
                      onChange={e => setCurrentCheckin(prev => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      style={{
                        width: "100%", minHeight: 60, padding: "10px 12px", borderRadius: 8,
                        background: "var(--card-bg)", border: `1px solid ${tealAlpha(0.12)}`,
                        color: "var(--text-primary)", fontSize: 14, resize: "none", outline: "none",
                        fontFamily: "var(--font-sans)", lineHeight: 1.5,
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = tealAlpha(0.3)}
                      onBlur={e => e.currentTarget.style.borderColor = tealAlpha(0.12)}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={() => {
                    setCurrentCheckin(prev => ({ ...prev, week_number: weekNumber }));
                    submitCheckin();
                  }}
                  disabled={checkinLoading}
                  style={tealBtn(checkinLoading)}
                  onMouseEnter={e => { if (!checkinLoading) e.currentTarget.style.filter = "brightness(1.1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.filter = "none"; }}
                >
                  {checkinLoading ? (
                    <>
                      <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: tealAlpha(0.3), borderTopColor: "#fff" }} />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain size={14} /> Get AI Analysis
                    </>
                  )}
                </button>
                <button onClick={() => setPhase("blueprint")} style={ghostBtn}>
                  <ChevronLeft size={14} /> Back to Blueprint
                </button>
                <button onClick={reset} style={ghostBtn}>
                  <RotateCcw size={14} /> Start Over
                </button>
              </div>
            </div>
          )}

          {error && (
            <div style={{
              padding: 16, borderRadius: 12, marginTop: 16,
              border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.05)",
              color: "var(--text-primary)", fontSize: 13,
            }}>
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  return <LaunchpadPaywall show={showPaywall} onClose={() => setShowPaywall(false)} />;
}

function LaunchpadPaywall({ show, onClose }: { show: boolean; onClose: () => void }) {
  if (!show) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, display: "flex",
      alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
      zIndex: 100,
    }}>
      <div style={{ textAlign: "center", padding: 32, maxWidth: 400 }}>
        <Lock size={32} style={{ color: "#14B8A6", marginBottom: 16 }} />
        <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
          Your business journey is ready to begin
        </div>
        <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.6 }}>
          AI-matched business ideas, validation, 90-day blueprint, and weekly check-ins. Pro users launch faster.
        </div>
        <a href="/pricing" style={{
          display: "inline-flex", padding: "12px 28px", borderRadius: 50,
          background: "#14B8A6", color: "#fff", fontWeight: 600,
          fontSize: 14, textDecoration: "none",
        }}>
          {"See what you're missing →"}
        </a>
        <button onClick={onClose} style={{
          display: "block", margin: "12px auto 0", background: "none",
          border: "none", color: "var(--text-tertiary)", fontSize: 12, cursor: "pointer",
        }}>
          Maybe later
        </button>
      </div>
    </div>
  );
}
