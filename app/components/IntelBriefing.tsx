"use client";
import { useState } from "react";
import { Globe, RotateCcw, ChevronDown, ChevronRight, MessageSquare } from "lucide-react";
import { t } from "../lib/i18n";
import MarkdownRenderer from "./MarkdownRenderer";

const INTEL_FOCUS_OPTIONS = ["geopolitics", "regulations", "markets", "logistics", "crypto"];

type IntelBriefingProps = {
  intelContent: string;
  intelLoading: boolean;
  intelTimestamp: string | null;
  intelFocus: string[];
  setIntelFocus: (fn: (prev: string[]) => string[]) => void;
  onGenerate: () => void;
  onAskAbout: (section: string) => void;
};

export default function IntelBriefing({ intelContent, intelLoading, intelTimestamp, intelFocus, setIntelFocus, onGenerate, onAskAbout }: IntelBriefingProps) {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  /* ═══ WELCOME STATE ═══ */
  if (!intelContent && !intelLoading) {
    return (
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "40px 24px",
      }}>
        <div style={{ maxWidth: 520, width: "100%", textAlign: "center" }}>
          {/* Branded header */}
          <div style={{
            fontSize: 36, fontWeight: 300, letterSpacing: "0.15em",
            color: "var(--text-primary)", marginBottom: 8,
            animation: "fadeIn 0.4s ease-out",
          }}>
            INTEL
          </div>

          {/* Subtitle */}
          <div style={{
            fontSize: 14, color: "var(--text-tertiary)", lineHeight: 1.6,
            marginBottom: 40,
          }}>
            {t("intel.subtitle")}
          </div>

          {/* Focus area chips */}
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 8,
            justifyContent: "center", marginBottom: 32,
          }}>
            {INTEL_FOCUS_OPTIONS.map(f => (
              <button
                key={f}
                onClick={() => setIntelFocus(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])}
                className="suggestion-chip"
                style={{
                  padding: "8px 18px", borderRadius: 20, fontSize: 13, cursor: "pointer",
                  transition: "all 0.15s",
                  background: intelFocus.includes(f) ? "var(--accent-bg)" : "transparent",
                  border: intelFocus.includes(f) ? "1px solid var(--accent)" : "1px solid var(--border-secondary)",
                  color: intelFocus.includes(f) ? "var(--accent)" : "var(--text-secondary)",
                  fontWeight: intelFocus.includes(f) ? 500 : 400,
                }}
              >
                {t(`intel.focus.${f}`)}
              </button>
            ))}
          </div>

          {/* Generate button */}
          <button
            onClick={onGenerate}
            style={{
              padding: "14px 32px", borderRadius: "var(--radius-md)",
              background: "var(--accent)", color: "#fff", fontSize: 15,
              fontWeight: 600, border: "none", cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 8,
              transition: "opacity 0.15s",
            }}
          >
            {t("intel.generate")}
          </button>
        </div>
      </div>
    );
  }

  /* ═══ LOADING STATE ═══ */
  if (intelLoading && !intelContent) {
    return (
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "40px 24px",
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          background: "var(--accent-bg)", display: "flex",
          alignItems: "center", justifyContent: "center",
          marginBottom: 20, animation: "pulse 2s ease-in-out infinite",
        }}>
          <Globe size={24} style={{ color: "var(--accent)" }} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 500, color: "var(--text-primary)", marginBottom: 8 }}>
          {t("intel.generating")}
        </div>
        <span className="loading-dots"><span /><span /><span /></span>
      </div>
    );
  }

  /* ═══ LOADED STATE ═══ */
  const sections: { heading: string; content: string }[] = [];
  const lines = intelContent.split("\n");
  let curHead = "", curContent = "";
  for (const line of lines) {
    const h2 = line.match(/^## (.+)/);
    if (h2) {
      if (curHead) sections.push({ heading: curHead, content: curContent.trim() });
      curHead = h2[1]; curContent = "";
    } else {
      curContent += line + "\n";
    }
  }
  if (curHead) sections.push({ heading: curHead, content: curContent.trim() });
  if (sections.length === 0 && intelContent) sections.push({ heading: "", content: intelContent });

  const riskColors: Record<string, string> = {
    low: "var(--success)", medium: "var(--warning)", high: "#F97316", critical: "var(--error)",
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "32px 24px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", animation: "fadeIn 0.2s ease" }}>
        {/* Header with refresh */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 24, flexWrap: "wrap", gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 500, color: "var(--text-primary)" }}>
              {t("intel.title")}
            </div>
            {intelTimestamp && (
              <div style={{
                fontSize: 12, color: "var(--text-tertiary)",
                fontFamily: "var(--font-mono)", marginTop: 4,
              }}>
                {t("intel.generated_at")} {new Date(intelTimestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZoneName: "short" })}
              </div>
            )}
          </div>
          <button
            onClick={onGenerate}
            disabled={intelLoading}
            style={{
              fontSize: 13, color: "var(--text-secondary)",
              background: "transparent",
              border: "1px solid var(--border-primary)",
              padding: "8px 16px", borderRadius: "var(--radius-sm)",
              cursor: intelLoading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 6,
              opacity: intelLoading ? 0.6 : 1,
            }}
          >
            <RotateCcw size={14} /> {t("intel.update")}
          </button>
        </div>

        {/* Sections — markdown with inline risk badges */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sections.map((sec, si) => {
            const riskMatch = sec.content.match(/CRITICAL|HIGH|MEDIUM|LOW/gi);
            const maxRisk = riskMatch
              ? (riskMatch.some(r => r.toUpperCase() === "CRITICAL") ? "critical"
                : riskMatch.some(r => r.toUpperCase() === "HIGH") ? "high"
                : riskMatch.some(r => r.toUpperCase() === "MEDIUM") ? "medium" : "low")
              : null;
            const sKey = `intel-${si}`;
            const isCollapsed = collapsedSections[sKey];

            return (
              <div key={sKey} style={{
                borderRadius: "var(--radius-md)",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-secondary)",
                overflow: "hidden",
              }}>
                <button
                  onClick={() => setCollapsedSections(prev => ({ ...prev, [sKey]: !prev[sKey] }))}
                  style={{
                    width: "100%", padding: "16px 20px", background: "none",
                    border: "none", cursor: "pointer", display: "flex",
                    justifyContent: "space-between", alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
                      {sec.heading || "Briefing"}
                    </span>
                    {maxRisk && (
                      <span style={{
                        fontSize: 10, padding: "2px 10px", borderRadius: 10,
                        background: `${riskColors[maxRisk]}15`,
                        color: riskColors[maxRisk],
                        fontWeight: 500, letterSpacing: "0.03em",
                      }}>
                        {t(`intel.risk.${maxRisk}`)}
                      </span>
                    )}
                  </div>
                  {isCollapsed
                    ? <ChevronRight size={14} style={{ color: "var(--text-tertiary)" }} />
                    : <ChevronDown size={14} style={{ color: "var(--text-tertiary)" }} />}
                </button>
                {!isCollapsed && (
                  <div style={{ padding: "0 20px 16px" }}>
                    <div style={{ fontSize: 15, lineHeight: 1.7, color: "var(--text-secondary)" }}>
                      <MarkdownRenderer content={sec.content} />
                    </div>
                    {sec.heading && (
                      <button
                        onClick={() => onAskAbout(`Tell me more about: ${sec.heading}. ${sec.content.slice(0, 200)}`)}
                        style={{
                          marginTop: 12, fontSize: 12, color: "var(--accent)",
                          background: "var(--accent-bg)", border: "none",
                          padding: "6px 14px", borderRadius: "var(--radius-sm)",
                          cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                        }}
                      >
                        <MessageSquare size={12} /> {t("intel.ask")}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Loading indicator when refreshing */}
        {intelLoading && (
          <div style={{ textAlign: "center", padding: 20 }}>
            <span className="loading-dots"><span /><span /><span /></span>
          </div>
        )}
      </div>
    </div>
  );
}
