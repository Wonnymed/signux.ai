"use client";
import { useState, useRef, useEffect } from "react";
import { Search, Check, FileText, Download, Package, Shield, BarChart3, Globe, Play, RotateCcw, MessageSquare, Wand2, Loader2, Share2, Lock } from "lucide-react";
import { t } from "../lib/i18n";
import type { Mode } from "../lib/types";
import { useIsMobile } from "../lib/useIsMobile";
import MarkdownRenderer from "./MarkdownRenderer";
import { useEnhance } from "../lib/useEnhance";
import { signuxFetch } from "../lib/api-client";

type SearchResult = {
  query: string;
  summary: string;
};

type ResearchViewProps = {
  lang: string;
  onContinueInChat?: (report: string) => void;
  onSetMode?: (m: Mode) => void;
  isLoggedIn?: boolean;
  tier?: string;
};

/* Custom Search+ icon */
function SearchPlusIcon({ size = 28, color = "#6B8AFF" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
      <path d="M11 8v6" />
      <path d="M8 11h6" />
    </svg>
  );
}

/* Constellation dots */
const CONSTELLATION_DOTS = [
  { top: "8%", left: "12%", delay: 0 },
  { top: "15%", right: "18%", delay: 0.5 },
  { top: "35%", left: "6%", delay: 1.2 },
  { top: "25%", right: "8%", delay: 0.8 },
  { top: "55%", left: "15%", delay: 1.8 },
  { top: "65%", right: "12%", delay: 2.2 },
  { top: "80%", left: "20%", delay: 0.3 },
  { top: "85%", right: "22%", delay: 1.5 },
];

const CONSTELLATION_LINES = [
  { top: "12%", left: "10%", width: "25%", rotate: "15deg", delay: 0.4 },
  { top: "40%", left: "5%", width: "20%", rotate: "-10deg", delay: 1.0 },
  { top: "70%", right: "10%", width: "22%", rotate: "8deg", delay: 1.6 },
];

export default function ResearchView({ lang, onContinueInChat, onSetMode, isLoggedIn, tier }: ResearchViewProps) {
  const [phase, setPhase] = useState<"input" | "running" | "complete">("input");
  const [query, setQuery] = useState("");
  const [isDemo, setIsDemo] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [searchPlan, setSearchPlan] = useState<string[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { enhance, enhancing, wasEnhanced } = useEnhance("research");

  const handleEnhance = async () => {
    const result = await enhance(query);
    if (result) setQuery(result);
  };

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [searchResults, report]);

  const templates = [
    {
      icon: BarChart3, color: "#22c55e", bg: "rgba(34,197,94,0.1)",
      title: "Market analysis",
      desc: "Size, trends, opportunities, and entry barriers",
      fill: "Market analysis for the meal prep delivery industry: market size, growth trends, consumer demographics, competitive landscape, unit economics, and entry barriers for a new player",
    },
    {
      icon: Shield, color: "#8b5cf6", bg: "rgba(139,92,246,0.1)",
      title: "Competitor deep dive",
      desc: "Pricing, positioning, strengths, and weaknesses",
      fill: "Compare the top 5 project management tools (Asana, Monday, ClickUp, Notion, Linear): pricing tiers, feature comparison, market positioning, customer reviews, and strategic weaknesses",
    },
    {
      icon: Globe, color: "#f59e0b", bg: "rgba(245,158,11,0.1)",
      title: "Regulatory guide",
      desc: "Licenses, compliance, and legal requirements",
      fill: "Complete regulatory guide for launching a fintech app in Brazil: required licenses, Central Bank regulations, PIX integration, compliance frameworks, LGPD data protection, and timeline to approval",
    },
    {
      icon: Package, color: "#ef4444", bg: "rgba(239,68,68,0.1)",
      title: "Strategy frameworks",
      desc: "SWOT, Porter's, Blue Ocean, and business models",
      fill: "Go-to-market strategy for a B2B SaaS product entering the European market: Porter's Five Forces analysis, Blue Ocean opportunities, pricing strategy, channel partnerships, and first-year milestones",
    },
  ];

  const processSteps = [
    "Plan queries",
    "Search sources",
    "Cross-reference",
    "Synthesize report",
  ];

  const startResearch = async (queryOverride?: string, skipPaywall?: boolean) => {
    const q = queryOverride || query;
    if (!q.trim() || loading) return;
    if (!skipPaywall) {
      if (!isLoggedIn) { window.location.href = "/signup"; return; }
      if (tier === "free") { setShowPaywall(true); return; }
    }
    if (queryOverride) setQuery(queryOverride);
    setLoading(true);
    setPhase("running");
    setSearchPlan([]);
    setCurrentSearchIndex(-1);
    setSearchResults([]);
    setReport("");

    try {
      const res = await signuxFetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, lang }),
      });
      if (!res.body) throw new Error("No stream");
      const reader = res.body.getReader();
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
            if (data.type === "plan") {
              setSearchPlan(data.queries);
            } else if (data.type === "searching") {
              setCurrentSearchIndex(data.index);
            } else if (data.type === "result") {
              setSearchResults(prev => [...prev, { query: data.query, summary: data.summary }]);
            } else if (data.type === "synthesizing") {
              setCurrentSearchIndex(-2); // special state
            } else if (data.type === "report") {
              setReport(data.content);
            } else if (data.type === "complete") {
              setPhase("complete");
            } else if (data.type === "error") {
              setReport(data.message || t("research.error"));
              setPhase("complete");
            }
          } catch {}
        }
      }
    } catch {
      setReport(t("research.error"));
      setPhase("complete");
    }
    setLoading(false);
  };

  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  const shareResult = async () => {
    setSharing(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "research",
          title: query?.slice(0, 200),
          content: report,
          metadata: { sources_count: searchResults.length },
        }),
      });
      const data = await res.json();
      if (data.url) {
        await navigator.clipboard.writeText(data.url);
        setShareUrl(data.url);
        setTimeout(() => setShareUrl(""), 3000);
      }
    } catch {}
    setSharing(false);
  };

  const reset = () => {
    setPhase("input");
    setQuery("");
    setSearchPlan([]);
    setCurrentSearchIndex(-1);
    setSearchResults([]);
    setReport("");
    setLoading(false);
  };

  /* ═══ INPUT STATE ═══ */
  if (phase === "input") {
    return (
        <section style={{
          minHeight: isMobile ? "75vh" : "85vh",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: isMobile ? "24px 16px 32px" : "32px 24px 40px",
          position: "relative", overflow: "hidden",
        }}>
          {/* Constellation dots */}
          {CONSTELLATION_DOTS.map((dot, i) => (
            <div key={`dot-${i}`} style={{
              position: "absolute", width: 2, height: 2, borderRadius: "50%",
              background: "rgba(107,138,255,0.3)", pointerEvents: "none",
              animation: `twinkle 3s ease-in-out infinite`,
              animationDelay: `${dot.delay}s`,
              top: dot.top, left: dot.left, right: dot.right,
            } as any} />
          ))}
          {CONSTELLATION_LINES.map((line, i) => (
            <div key={`line-${i}`} style={{
              position: "absolute", height: 1, pointerEvents: "none",
              background: "linear-gradient(90deg, transparent, rgba(107,138,255,0.08), transparent)",
              top: line.top, left: line.left, right: line.right,
              width: line.width, transform: `rotate(${line.rotate})`,
              animation: `twinkle 3s ease-in-out infinite`,
              animationDelay: `${line.delay}s`,
            } as any} />
          ))}

          <div style={{ maxWidth: 720, width: "100%", position: "relative", zIndex: 1 }}>

            {/* ── HEADER ── */}
            <div style={{ textAlign: "center", marginBottom: 24, animation: "fadeIn 0.4s ease-out" }}>
              {/* Icon box */}
              <div style={{
                width: 48, height: 48, borderRadius: 16,
                border: "1px solid rgba(107,138,255,0.15)",
                background: "rgba(107,138,255,0.05)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 20px", position: "relative",
              }}>
                <div style={{
                  position: "absolute", inset: -6, borderRadius: 20,
                  border: "1px solid rgba(107,138,255,0.06)",
                }} />
                <SearchPlusIcon size={22} />
              </div>

              {/* Title */}
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center" }}>
                <span style={{
                  fontFamily: "var(--font-brand)", fontSize: isMobile ? 28 : 36, fontWeight: 700,
                  letterSpacing: 6, color: "var(--text-primary)",
                }}>
                  DEEP
                </span>
                <span style={{
                  fontFamily: "var(--font-brand)", fontSize: isMobile ? 28 : 36, fontWeight: 300,
                  letterSpacing: 3, color: "var(--text-secondary)", marginLeft: 8,
                }}>
                  RESEARCH
                </span>
              </div>

              {/* Subtitle */}
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 3,
                textTransform: "uppercase", color: "rgba(107,138,255,0.6)", marginTop: 12,
              }}>
                Multi-source intelligence synthesis
              </div>

              {/* Divider */}
              <div style={{
                width: 48, height: 1,
                background: "linear-gradient(90deg, transparent, #6B8AFF, transparent)",
                margin: "20px auto 0",
              }} />
            </div>

            {/* ── PROCESS STRIP ── */}
            <div style={{
              display: "flex", flexWrap: "wrap", justifyContent: "center",
              gap: isMobile ? 12 : 8, marginBottom: 16,
              animation: "fadeIn 0.5s ease-out",
            }}>
              {processSteps.map((step, i) => (
                <div key={step} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {i > 0 && !isMobile && (
                    <span style={{ color: "var(--card-hover-border)", fontSize: 12, marginRight: 4 }}>→</span>
                  )}
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%",
                    border: "1px solid rgba(107,138,255,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(107,138,255,0.5)",
                  }}>
                    {i + 1}
                  </div>
                  <span style={{
                    fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 1,
                    textTransform: "uppercase", color: "var(--text-secondary)",
                  }}>
                    {step}
                  </span>
                </div>
              ))}
            </div>

            {/* ── DEMO BANNER ── */}
            {!isLoggedIn && !(typeof window !== "undefined" && localStorage.getItem("signux_research_demo_used")) && (
              <div style={{
                padding: 14, borderRadius: 14,
                border: "1px solid rgba(107,138,255,0.2)",
                background: "rgba(107,138,255,0.05)",
                marginBottom: 12, textAlign: "center",
                animation: "fadeIn 0.5s ease-out",
              }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>
                  See Deep Research in action
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 14 }}>
                  Watch AI search multiple sources and compile a structured report
                </div>
                <button onClick={() => {
                  const demoQuery = "Market analysis for the meal prep delivery industry in the US: market size, growth trends, consumer demographics, competitive landscape, unit economics, and entry barriers for a new player in 2026";
                  setIsDemo(true);
                  if (typeof window !== "undefined") localStorage.setItem("signux_research_demo_used", "true");
                  startResearch(demoQuery, true);
                }} style={{
                  padding: "10px 28px", borderRadius: 50,
                  background: "#6B8AFF", color: "#fff",
                  fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer",
                  fontFamily: "var(--font-brand)", letterSpacing: 1,
                  transition: "all 200ms",
                }}
                  onMouseEnter={e => { e.currentTarget.style.filter = "brightness(1.1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.filter = "none"; }}
                >
                  Run demo research
                </button>
              </div>
            )}

            {/* ── INPUT ── */}
            <div
              style={{
                border: query.trim() ? "1px solid rgba(107,138,255,0.25)" : "1px solid rgba(107,138,255,0.1)",
                borderRadius: 16,
                background: query.trim() ? "rgba(107,138,255,0.03)" : "rgba(107,138,255,0.02)",
                padding: isMobile ? 12 : 16,
                transition: "all 300ms ease",
                boxShadow: query.trim() ? "0 0 30px rgba(107,138,255,0.05)" : "none",
                marginBottom: 12,
                animation: "fadeIn 0.5s ease-out",
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = "rgba(107,138,255,0.25)";
                e.currentTarget.style.boxShadow = "0 0 30px rgba(107,138,255,0.05)";
                e.currentTarget.style.background = "rgba(107,138,255,0.03)";
              }}
              onBlur={e => {
                if (!query.trim()) {
                  e.currentTarget.style.borderColor = "rgba(107,138,255,0.1)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.background = "rgba(107,138,255,0.02)";
                }
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <div style={{
                  width: 4, height: 4, borderRadius: "50%",
                  background: "#6B8AFF",
                  animation: "pulse 2s ease-in-out infinite",
                }} />
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2,
                  textTransform: "uppercase", color: "rgba(107,138,255,0.5)",
                }}>
                  WHAT DO YOU NEED RESEARCHED?
                </span>
              </div>
              <textarea
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={t("research.placeholder")}
                onKeyDown={e => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "e") { e.preventDefault(); handleEnhance(); return; }
                }}
                style={{
                  width: "100%", minHeight: 80, padding: 0,
                  background: "transparent", border: "none",
                  color: "var(--text-primary)", fontSize: 15, lineHeight: 1.6,
                  resize: "none", outline: "none", fontFamily: "var(--font-sans)",
                  opacity: enhancing ? 0.5 : 1, transition: "opacity 150ms ease",
                }}
              />
            </div>

            {/* ── RESEARCH TEMPLATES ── */}
            <div style={{ marginBottom: 12, animation: "fadeIn 0.6s ease-out" }}>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2,
                textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: 12,
              }}>
                RESEARCH TEMPLATES
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
                gap: 8,
              }}>
                {templates.map(tmpl => {
                  const Icon = tmpl.icon;
                  return (
                    <button
                      key={tmpl.title}
                      onClick={() => setQuery(tmpl.fill)}
                      style={{
                        background: "var(--card-bg)",
                        border: "1px solid var(--card-border)",
                        borderRadius: 10, padding: "10px 12px",
                        cursor: "pointer", transition: "all 200ms",
                        textAlign: "left", display: "flex", gap: 12,
                        alignItems: "flex-start",
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = "rgba(107,138,255,0.2)";
                        e.currentTarget.style.background = "rgba(107,138,255,0.03)";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = "var(--card-border)";
                        e.currentTarget.style.background = "var(--card-bg)";
                      }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: tmpl.bg, display: "flex",
                        alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        <Icon size={16} style={{ color: tmpl.color }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 2 }}>
                          {tmpl.title}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                          {tmpl.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── OUTPUT PREVIEW ── */}
            <div style={{
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              alignItems: isMobile ? "flex-start" : "center",
              gap: isMobile ? 12 : 20,
              padding: "16px 20px",
              border: "1px solid var(--divider)",
              borderRadius: 12,
              background: "var(--card-bg)",
              marginBottom: 12,
              animation: "fadeIn 0.7s ease-out",
            }}>
              {[
                { icon: Search, color: "#6B8AFF", bg: "rgba(107,138,255,0.1)", line1: "8-12 sources", line2: "searched & verified" },
                { icon: FileText, color: "#8b5cf6", bg: "rgba(139,92,246,0.1)", line1: "Structured report", line2: "with citations" },
                { icon: Download, color: "#22c55e", bg: "rgba(34,197,94,0.1)", line1: "Export PDF", line2: "branded report" },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {i > 0 && !isMobile && (
                      <div style={{ width: 1, height: 28, background: "var(--card-border)", marginRight: 8 }} />
                    )}
                    <div style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: item.bg, display: "flex",
                      alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <Icon size={14} style={{ color: item.color }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.3 }}>{item.line1}</div>
                      <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{item.line2}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── CTA ── */}
            <div style={{ textAlign: "center", animation: "fadeIn 0.8s ease-out" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                {query.trim().length >= 10 && (
                  <button
                    onClick={handleEnhance}
                    disabled={enhancing}
                    title="Enhance your query (⌘E)"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "6px 14px", borderRadius: 50,
                      border: "1px solid var(--card-border)",
                      background: wasEnhanced ? "var(--accent-soft, rgba(212,175,55,0.1))" : "none",
                      color: wasEnhanced ? "var(--accent)" : "var(--text-tertiary)",
                      fontSize: 11, cursor: enhancing ? "wait" : "pointer",
                      transition: "all 200ms", fontFamily: "var(--font-mono)", letterSpacing: 0.5,
                    }}
                    onMouseEnter={e => { if (!enhancing && !wasEnhanced) { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; } }}
                    onMouseLeave={e => { if (!enhancing && !wasEnhanced) { e.currentTarget.style.borderColor = "var(--card-border)"; e.currentTarget.style.color = "var(--text-tertiary)"; } }}
                  >
                    {enhancing ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Wand2 size={12} />}
                    {wasEnhanced ? "Enhanced" : "Enhance"}
                  </button>
                )}
                <button
                  onClick={startResearch}
                  disabled={!query.trim() || loading}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 10,
                    background: query.trim() && !loading ? "#6B8AFF" : "rgba(107,138,255,0.3)",
                    color: "var(--text-primary)", border: "none", borderRadius: 50,
                    padding: "14px 36px",
                    fontFamily: "var(--font-brand)", fontWeight: 600, fontSize: 14,
                    letterSpacing: 2, textTransform: "uppercase",
                    cursor: query.trim() && !loading ? "pointer" : "not-allowed",
                    transition: "all 200ms",
                    opacity: query.trim() && !loading ? 1 : 0.5,
                  }}
                  onMouseEnter={e => {
                    if (query.trim() && !loading) {
                      e.currentTarget.style.filter = "brightness(1.15)";
                      e.currentTarget.style.boxShadow = "0 0 30px rgba(107,138,255,0.2)";
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.filter = "none";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <Search size={16} />
                  START RESEARCH
                </button>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 16 }}>
                {t("research.disclaimer")}
              </div>
            </div>

          </div>
        </section>
    );
  }

  /* ═══ RUNNING STATE ═══ */
  if (phase === "running") {
    const progressPct = searchPlan.length > 0
      ? currentSearchIndex === -2
        ? 90
        : Math.min(((currentSearchIndex + 1) / searchPlan.length) * 80, 80)
      : 10;

    return (
      <div
        ref={feedRef}
        style={{
          flex: 1, overflowY: "auto",
          padding: isMobile ? "24px 16px" : "40px 24px",
          display: "flex", flexDirection: "column", alignItems: "center",
        }}
      >
        <div style={{ maxWidth: 640, width: "100%" }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            marginBottom: 32, animation: "fadeIn 0.3s ease-out",
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: "#6B8AFF",
              animation: "pulse 1.5s ease-in-out infinite",
            }} />
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 2,
              textTransform: "uppercase", color: "rgba(107,138,255,0.7)",
            }}>
              {currentSearchIndex === -2 ? t("research.synthesizing") : t("research.searching")}
            </span>
          </div>

          {/* Progress bar */}
          <div style={{
            width: "100%", height: 2, background: "rgba(107,138,255,0.1)",
            borderRadius: 1, overflow: "hidden", marginBottom: 32,
          }}>
            <div style={{
              height: "100%", background: "#6B8AFF",
              borderRadius: 1, transition: "width 0.5s ease",
              width: `${progressPct}%`,
            }} />
          </div>

          {/* Search plan */}
          {searchPlan.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 32 }}>
              {searchPlan.map((q, i) => {
                const isDone = i < searchResults.length;
                const isCurrent = i === currentSearchIndex;
                return (
                  <div key={i} style={{
                    display: "flex", gap: 12, padding: "10px 14px",
                    borderRadius: 10, background: isCurrent ? "rgba(107,138,255,0.05)" : "transparent",
                    border: isCurrent ? "1px solid rgba(107,138,255,0.1)" : "1px solid transparent",
                    animation: "fadeInUp 0.2s ease-out",
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      marginTop: 1,
                    }}>
                      {isDone ? (
                        <Check size={12} style={{ color: "#22c55e" }} />
                      ) : isCurrent ? (
                        <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: "rgba(107,138,255,0.2)", borderTopColor: "#6B8AFF" }} />
                      ) : (
                        <div style={{ width: 8, height: 8, borderRadius: "50%", border: "1px solid var(--text-tertiary)" }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, color: isDone ? "var(--text-secondary)" : isCurrent ? "var(--text-primary)" : "var(--text-secondary)",
                        lineHeight: 1.5,
                      }}>
                        {q}
                      </div>
                      {isDone && searchResults[i] && (
                        <div style={{
                          fontSize: 12, color: "var(--text-tertiary)",
                          marginTop: 4, lineHeight: 1.5,
                          maxHeight: 60, overflow: "hidden",
                          maskImage: "linear-gradient(to bottom, black 70%, transparent)",
                          WebkitMaskImage: "linear-gradient(to bottom, black 70%, transparent)",
                        }}>
                          {searchResults[i].summary.slice(0, 200)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Synthesizing indicator */}
          {currentSearchIndex === -2 && (
            <div style={{
              padding: "20px", borderRadius: 12,
              border: "1px solid rgba(107,138,255,0.1)",
              background: "rgba(107,138,255,0.03)",
              display: "flex", alignItems: "center", gap: 12,
              animation: "fadeInUp 0.3s ease-out",
            }}>
              <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderColor: "rgba(107,138,255,0.2)", borderTopColor: "#6B8AFF" }} />
              <div>
                <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>
                  {t("research.synthesizing")}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
                  Cross-referencing {searchResults.length} sources
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ═══ COMPLETE STATE ═══ */
  return (
    <div style={{
      flex: 1, overflowY: "auto",
      padding: isMobile ? "24px 16px" : "40px 32px",
      position: "relative",
    }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          marginBottom: 32, animation: "fadeIn 0.3s ease-out",
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "rgba(34,197,94,0.15)", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>
            <Check size={14} style={{ color: "#22c55e" }} />
          </div>
          <span style={{
            fontFamily: "var(--font-brand)", fontSize: 20, fontWeight: 600,
            letterSpacing: 2, color: "var(--text-primary)",
          }}>
            {t("research.complete")}
          </span>
        </div>

        {/* Action buttons */}
        <div style={{
          display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap",
        }}>
          <button
            onClick={reset}
            style={{
              fontSize: 13, color: "var(--text-secondary)",
              background: "transparent", border: "1px solid var(--border-primary)",
              padding: "8px 16px", borderRadius: "var(--radius-sm)",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <RotateCcw size={14} /> {t("research.new")}
          </button>
          <button
            onClick={shareResult}
            disabled={sharing}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 50,
              border: "1px solid var(--border-secondary)",
              background: shareUrl ? "rgba(107,138,255,0.08)" : "transparent",
              color: shareUrl ? "#6B8AFF" : "var(--text-secondary)",
              fontSize: 12, cursor: "pointer", transition: "all 200ms",
            }}
          >
            <Share2 size={14} /> {sharing ? "Sharing..." : shareUrl ? "Link copied!" : "Share"}
          </button>
          {onContinueInChat && (
            <button
              onClick={() => onContinueInChat(report)}
              style={{
                fontSize: 13, color: "var(--text-primary)",
                background: "#6B8AFF", border: "none",
                padding: "8px 16px", borderRadius: "var(--radius-sm)",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                fontWeight: 500,
              }}
            >
              <MessageSquare size={14} /> {t("research.continue_chat")}
            </button>
          )}
        </div>

        {/* Report */}
        <div style={{
          padding: isMobile ? 16 : 24, borderRadius: "var(--radius-md)",
          background: "var(--bg-secondary)", border: "1px solid var(--border-secondary)",
          animation: "fadeIn 0.3s ease-out",
        }}>
          <div style={{ fontSize: 15, lineHeight: 1.7, color: "var(--text-secondary)" }}>
            <MarkdownRenderer content={report} />
          </div>
        </div>

        {/* Demo CTA */}
        {isDemo && !isLoggedIn && (
          <div style={{
            padding: 24, borderRadius: 14, textAlign: "center",
            background: "rgba(107,138,255,0.05)", border: "1px solid rgba(107,138,255,0.2)",
            marginTop: 24,
          }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
              Research YOUR market
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
              Sign up free to run unlimited custom research reports
            </div>
            <button onClick={() => { if (typeof window !== "undefined") window.location.href = "/signup"; }} style={{
              padding: "12px 32px", borderRadius: 50,
              background: "#6B8AFF", color: "#fff",
              fontWeight: 600, fontSize: 14, border: "none", cursor: "pointer",
              fontFamily: "var(--font-brand)", letterSpacing: 1,
              transition: "all 200ms",
            }}
              onMouseEnter={e => { e.currentTarget.style.filter = "brightness(1.1)"; }}
              onMouseLeave={e => { e.currentTarget.style.filter = "none"; }}
            >
              Sign up free
            </button>
          </div>
        )}
      </div>

      {showPaywall && (
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
          zIndex: 50, borderRadius: 16,
        }}>
          <div style={{ textAlign: "center", padding: 32, maxWidth: 400 }}>
            <Lock size={32} style={{ color: "#6B8AFF", marginBottom: 16 }} />
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
              Upgrade to Pro
            </div>
            <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 20 }}>
              Run unlimited deep research with AI-powered multi-source analysis
            </div>
            <a href="/pricing" style={{
              display: "inline-flex", padding: "10px 24px", borderRadius: 50,
              background: "#6B8AFF", color: "#fff", fontWeight: 600,
              fontSize: 13, textDecoration: "none",
            }}>
              See plans
            </a>
            <button onClick={() => setShowPaywall(false)} style={{
              display: "block", margin: "12px auto 0", background: "none",
              border: "none", color: "var(--text-tertiary)", fontSize: 12, cursor: "pointer",
            }}>
              Maybe later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
