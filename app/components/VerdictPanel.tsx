"use client";
import { motion, AnimatePresence } from "framer-motion";

type PatternData = {
  type: string;
  title: string;
  description: string;
  agents_involved?: string[];
};

type DissentData = {
  avatar: string;
  agent: string;
  note: string | null;
};

type VerdictPanelProps = {
  verdict: {
    proceedCount: number;
    stopCount: number;
    avgConfidence: number;
    viability: number;
    estimatedROI?: string;
    verdict?: string;
    keyRisk?: string;
    keyOpportunity?: string;
    patterns?: PatternData[];
    dissents?: DissentData[];
    votes?: any[];
  };
  isMobile?: boolean;
};

const PATTERN_COLORS: Record<string, string> = {
  consensus: "#22c55e",
  emerging_risk: "#ef4444",
  blind_spot: "#f59e0b",
  opportunity: "#3b82f6",
  tension: "#ec4899",
};

export default function VerdictPanel({ verdict, isMobile }: VerdictPanelProps) {
  if (!verdict || typeof verdict !== "object") return null;
  const isProceed = (verdict.proceedCount || 0) >= 6;
  const mainColor = isProceed ? "#10B981" : "#EF4444";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        padding: isMobile ? "16px" : "20px 24px",
        borderRadius: 12,
        background: "var(--card-bg)",
        border: `1px solid ${mainColor}25`,
      }}
    >
      {/* Header row — score + vote breakdown */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
        flexWrap: "wrap",
        gap: 12,
      }}>
        <div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            style={{
              fontSize: isMobile ? 24 : 32,
              fontWeight: 800,
              color: mainColor,
              fontFamily: "var(--font-mono)",
              lineHeight: 1,
            }}
          >
            {verdict.proceedCount}-{verdict.stopCount}
          </motion.div>
          <div style={{
            fontSize: 12,
            color: "var(--text-tertiary)",
            marginTop: 2,
          }}>
            {isProceed ? "PROCEED" : "STOP"}
          </div>
        </div>

        {/* Viability */}
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontSize: isMobile ? 20 : 28,
            fontWeight: 800,
            color: "#D4AF37",
            fontFamily: "var(--font-mono)",
            lineHeight: 1,
          }}>
            {verdict.viability}/10
          </div>
          <div style={{
            fontSize: 9,
            fontFamily: "var(--font-mono)",
            color: "var(--text-tertiary)",
            letterSpacing: "0.1em",
            marginTop: 2,
          }}>
            VIABILITY
          </div>
        </div>

        {/* Confidence */}
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontSize: 22,
            fontWeight: 800,
            color: "var(--text-primary)",
            fontFamily: "var(--font-mono)",
            lineHeight: 1,
          }}>
            {verdict.avgConfidence}
          </div>
          <div style={{
            fontSize: 9,
            fontFamily: "var(--font-mono)",
            color: "var(--text-tertiary)",
            letterSpacing: "0.1em",
            marginTop: 2,
          }}>
            AVG CONF
          </div>
        </div>

        {/* ROI */}
        {verdict.estimatedROI && verdict.estimatedROI !== "N/A" && (
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontSize: 22,
              fontWeight: 800,
              fontFamily: "var(--font-mono)",
              color: (typeof verdict.estimatedROI === "string" && verdict.estimatedROI.startsWith("-")) ? "#EF4444" : "#10B981",
              lineHeight: 1,
            }}>
              {String(verdict.estimatedROI)}
            </div>
            <div style={{
              fontSize: 9,
              fontFamily: "var(--font-mono)",
              color: "var(--text-tertiary)",
              letterSpacing: "0.1em",
              marginTop: 2,
            }}>
              EST. ROI
            </div>
          </div>
        )}
      </div>

      {/* Vote bar visualization */}
      <div style={{
        display: "flex",
        height: 6,
        borderRadius: 3,
        overflow: "hidden",
        marginBottom: 16,
        background: "var(--bg-tertiary)",
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(verdict.proceedCount / 10) * 100}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{
            background: "#10B981",
            borderRadius: "3px 0 0 3px",
          }}
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(verdict.stopCount / 10) * 100}%` }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          style={{
            background: "#EF4444",
            borderRadius: "0 3px 3px 0",
          }}
        />
      </div>

      {/* Individual votes */}
      {verdict.votes && Array.isArray(verdict.votes) && verdict.votes.length > 0 && (
        <div style={{
          display: "flex",
          gap: 4,
          flexWrap: "wrap",
          marginBottom: 16,
        }}>
          {verdict.votes.map((v: any, i: number) => (
            <div
              key={i}
              title={`${v.agent}: ${v.vote} (${v.confidence}/10)`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 8px",
                borderRadius: 50,
                background: v.vote === "PROCEED" ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                border: `1px solid ${v.vote === "PROCEED" ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
                fontSize: 10,
              }}
            >
              <span>{v.avatar}</span>
              <span style={{
                color: v.vote === "PROCEED" ? "#10B981" : "#EF4444",
                fontWeight: 600,
                fontFamily: "var(--font-mono)",
              }}>
                {v.vote}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Verdict text */}
      {verdict.verdict && (
        <p style={{
          fontSize: 14,
          fontWeight: 500,
          color: "var(--text-primary)",
          lineHeight: 1.6,
          margin: "0 0 16px",
        }}>
          {typeof verdict.verdict === "string" ? verdict.verdict : String(verdict.verdict ?? "")}
        </p>
      )}

      {/* Key Risk + Key Opportunity */}
      {(verdict.keyRisk || verdict.keyOpportunity) && (
        <div style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: verdict.patterns?.length || verdict.dissents?.length ? 16 : 0,
        }}>
          {verdict.keyRisk && (
            <div style={{
              flex: 1,
              minWidth: 180,
              padding: "10px 14px",
              borderRadius: 8,
              background: "rgba(239,68,68,0.04)",
              border: "1px solid rgba(239,68,68,0.12)",
            }}>
              <div style={{
                fontSize: 9,
                fontWeight: 700,
                color: "#EF4444",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.1em",
                marginBottom: 4,
              }}>
                KEY RISK
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                {typeof verdict.keyRisk === "string" ? verdict.keyRisk : String(verdict.keyRisk ?? "")}
              </div>
            </div>
          )}
          {verdict.keyOpportunity && (
            <div style={{
              flex: 1,
              minWidth: 180,
              padding: "10px 14px",
              borderRadius: 8,
              background: "rgba(34,197,94,0.04)",
              border: "1px solid rgba(34,197,94,0.12)",
            }}>
              <div style={{
                fontSize: 9,
                fontWeight: 700,
                color: "#22c55e",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.1em",
                marginBottom: 4,
              }}>
                KEY OPPORTUNITY
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                {typeof verdict.keyOpportunity === "string" ? verdict.keyOpportunity : String(verdict.keyOpportunity ?? "")}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Emergent Patterns */}
      {verdict.patterns && verdict.patterns.length > 0 && (
        <div style={{ marginBottom: verdict.dissents?.length ? 16 : 0 }}>
          <div style={{
            fontSize: 10,
            fontFamily: "var(--font-mono)",
            color: "var(--text-tertiary)",
            textTransform: "uppercase" as const,
            letterSpacing: 1,
            marginBottom: 8,
          }}>
            Emergent Patterns
          </div>
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}>
            {verdict.patterns.map((p, i) => {
              const pColor = PATTERN_COLORS[p.type] || "#6B7280";
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: `${pColor}06`,
                    border: `1px solid ${pColor}15`,
                  }}
                >
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    marginTop: 4,
                    background: pColor,
                    flexShrink: 0,
                  }} />
                  <div>
                    <div style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      marginBottom: 2,
                    }}>
                      {typeof p.title === "string" ? p.title : String(p.title ?? "")}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                      {typeof p.description === "string" ? p.description : String(p.description ?? "")}
                    </div>
                    {p.agents_involved && Array.isArray(p.agents_involved) && p.agents_involved.length > 0 && (
                      <div style={{ marginTop: 4, display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {p.agents_involved.map((a, ai) => (
                          <span key={ai} style={{
                            fontSize: 9,
                            padding: "1px 5px",
                            borderRadius: 3,
                            background: "rgba(255,255,255,0.03)",
                            color: "var(--text-tertiary)",
                            border: "1px solid var(--border-secondary)",
                          }}>{typeof a === "string" ? a : String(a)}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dissent Notes */}
      {verdict.dissents && verdict.dissents.length > 0 && (
        <div style={{
          padding: "12px 14px",
          borderRadius: 8,
          background: "rgba(239,68,68,0.03)",
          border: "1px solid rgba(239,68,68,0.1)",
        }}>
          <div style={{
            fontSize: 10,
            fontFamily: "var(--font-mono)",
            color: "#EF4444",
            textTransform: "uppercase" as const,
            letterSpacing: 1,
            marginBottom: 8,
          }}>
            Dissent Notes
          </div>
          {verdict.dissents.map((d, i) => (
            <div
              key={i}
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                marginBottom: i < verdict.dissents!.length - 1 ? 6 : 0,
                lineHeight: 1.5,
              }}
            >
              <span style={{ marginRight: 4 }}>{typeof d.avatar === "string" ? d.avatar : ""}</span>
              <strong style={{ color: "var(--text-primary)" }}>{typeof d.agent === "string" ? d.agent : "Agent"}:</strong>{" "}
              &ldquo;{typeof d.note === "string" ? d.note : String(d.note ?? "")}&rdquo;
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
