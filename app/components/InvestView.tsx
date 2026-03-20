"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  TrendingUp, ArrowDown, Wand2, Loader2, Lock,
  FileText, Target, PieChart, ShieldCheck, BarChart3,
} from "lucide-react";
import { t } from "../lib/i18n";
import { useIsMobile } from "../lib/useIsMobile";
import { getProfile } from "../lib/profile";
import MessageBlock from "./MessageBlock";
import ChatInput, { type FileAttachment } from "./ChatInput";
import type { Message, Mode } from "../lib/types";
import { useEnhance } from "../lib/useEnhance";
import { signuxFetch } from "../lib/api-client";

const BLUE = "#3B82F6";

const INVEST_TYPES = [
  { id: "business", label: "Business / Startup", icon: "\u{1F3E2}" },
  { id: "realestate", label: "Real Estate", icon: "\u{1F3E0}" },
  { id: "stock", label: "Stock / ETF", icon: "\u{1F4C8}" },
  { id: "crypto", label: "Crypto / Web3", icon: "\u{20BF}" },
  { id: "franchise", label: "Franchise", icon: "\u{1F3EA}" },
];

const AMOUNT_PILLS = ["$10K", "$50K", "$100K", "$500K"];

const PLACEHOLDERS: Record<string, string> = {
  business: "I'm evaluating investing $500K in a Series A SaaS startup...",
  realestate: "Should I buy a rental property in Austin for $350K...",
  stock: "Analyze NVDA as a long-term hold \u2014 is it overvalued?",
  crypto: "Is ETH still a good investment at current prices?",
  franchise: "Is a McDonald's franchise worth the $2M investment?",
};

const ANALYSIS_TOOLS = [
  {
    icon: FileText,
    name: "Full Equity Report",
    desc: "Wall Street-style investment analysis",
    prompt: "Generate a professional equity research report for [INVESTMENT]. Include: Executive Summary, Investment Thesis, Key Metrics (ROI, payback, risk score), Bull Case, Bear Case, Comparable Analysis, and Verdict (STRONG BUY / BUY / HOLD / AVOID).",
  },
  {
    icon: Target,
    name: "Risk Assessment",
    desc: "Every risk quantified and ranked",
    prompt: "Run a comprehensive risk assessment for investing in [INVESTMENT]. Quantify each risk: market risk, execution risk, regulatory risk, liquidity risk, concentration risk. Rate severity 1-10 and probability. Give an overall risk score.",
  },
  {
    icon: PieChart,
    name: "Portfolio Fit",
    desc: "Does this fit my investment strategy?",
    prompt: "I already have [EXISTING INVESTMENTS]. Analyze whether adding [NEW INVESTMENT] improves my portfolio: diversification, correlation, risk-adjusted return, concentration risk. Recommend optimal allocation %.",
  },
  {
    icon: ShieldCheck,
    name: "Due Diligence Checklist",
    desc: "Structured checklist before committing",
    prompt: "Generate a comprehensive due diligence checklist for [INVESTMENT TYPE]. Cover: financials verification, legal review, market validation, team assessment, competitive position, exit scenarios, and red flags to watch.",
  },
];

/* ═══ Main Component ═══ */
export default function InvestView({ lang, onSetMode, isLoggedIn, tier }: { lang: string; onSetMode?: (m: Mode) => void; isLoggedIn?: boolean; tier?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [showPaywall, setShowPaywall] = useState(false);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const [investType, setInvestType] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const { enhance, enhancing, wasEnhanced } = useEnhance("invest");

  const bottomRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const scrollRaf = useRef(0);
  const retryRef = useRef<{ text: string } | null>(null);

  const profileName = getProfile()?.name || "";
  const userInitials = profileName ? profileName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "OP";

  /* ── Scroll handling ── */
  const handleScroll = useCallback(() => {
    const area = areaRef.current;
    if (!area) return;
    const dist = area.scrollHeight - area.scrollTop - area.clientHeight;
    isNearBottomRef.current = dist < 100;
    setUserScrolledUp(dist > 200);
  }, []);

  useEffect(() => {
    if (!isNearBottomRef.current) return;
    cancelAnimationFrame(scrollRaf.current);
    scrollRaf.current = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    const area = areaRef.current;
    if (!area) return;
    area.scrollTo({ top: area.scrollHeight, behavior: "smooth" });
    isNearBottomRef.current = true;
    setUserScrolledUp(false);
  }, []);

  /* ── Retry effect ── */
  useEffect(() => {
    if (retryRef.current && !loading) {
      const { text } = retryRef.current;
      retryRef.current = null;
      send(text);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, loading]);

  /* ── Send ── */
  const send = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    if (!isLoggedIn) { window.location.href = "/signup"; return; }
    if (!["pro", "max", "founding"].includes(tier || "")) { setShowPaywall(true); return; }

    const userMsg: Message = { role: "user", content: msg, timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages([...newMessages, { role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);
    setSearching(false);

    const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await signuxFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, profile: getProfile(), mode: "invest" }),
      });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";
      if (reader) {
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
              if (data.type === "searching") {
                setSearching(true);
              } else if (data.type === "text") {
                setSearching(false);
                fullText += data.text;
                setMessages(prev => {
                  const u = [...prev];
                  u[u.length - 1] = { role: "assistant", content: fullText };
                  return u;
                });
              } else if (data.type === "tool") {
                fullText += `\n\n---\n**${data.name.replace(/_/g, " ")}**\n`;
                if (data.result?.breakdown) {
                  fullText += "\n| Item | Value |\n|---|---|\n";
                  Object.entries(data.result.breakdown).forEach(([k, v]) => {
                    fullText += `| ${k.replace(/_/g, " ")} | ${v} |\n`;
                  });
                } else if (data.result && !data.result.error) {
                  Object.entries(data.result).forEach(([k, v]) => {
                    if (k !== "note") fullText += `- **${k.replace(/_/g, " ")}**: ${v}\n`;
                  });
                  if (data.result.note) fullText += `\n> ${data.result.note}\n`;
                }
                fullText += "\n---\n\n";
                setMessages(prev => {
                  const u = [...prev];
                  u[u.length - 1] = { role: "assistant", content: fullText };
                  return u;
                });
              } else if (data.type === "error") {
                fullText += `\n\n${t("common.error")}: ${data.message}`;
                setMessages(prev => {
                  const u = [...prev];
                  u[u.length - 1] = { role: "assistant", content: fullText };
                  return u;
                });
              }
            } catch {}
          }
        }
      }
    } catch {
      setMessages(prev => {
        const u = [...prev];
        u[u.length - 1] = { role: "assistant", content: t("chat.connection_error") };
        return u;
      });
    }

    setMessages(prev => {
      const u = [...prev];
      const last = u[u.length - 1];
      if (last?.role === "assistant") u[u.length - 1] = { ...last, timestamp: Date.now() };
      return u;
    });
    setLoading(false);
    setSearching(false);
  };

  const onRetry = () => {
    if (messages.length < 2 || loading) return;
    const lastUser = messages[messages.length - 2];
    if (lastUser.role !== "user") return;
    retryRef.current = { text: lastUser.content };
    setMessages(messages.slice(0, -2));
  };

  const handleCopy = () => {};
  const handleEnhance = async () => {
    const result = await enhance(input);
    if (result) setInput(result);
  };

  /* ═══ WELCOME STATE ═══ */
  if (messages.length === 0) {
    return (
      <div style={{
        display: "flex", flexDirection: "column",
        padding: isMobile ? "24px 16px 120px" : "24px 24px 120px",
        maxWidth: 768, margin: "0 auto", width: "100%",
      }}>

        {/* ===== HEADER COMPACTO ===== */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          marginBottom: 6,
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: 8,
            background: "rgba(59,130,246,0.1)",
            border: "1px solid rgba(59,130,246,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <TrendingUp size={13} style={{ color: BLUE }} />
          </div>
          <span style={{
            fontFamily: "var(--font-brand)", fontSize: 15, fontWeight: 700,
            letterSpacing: 3, color: "var(--text-primary)",
          }}>
            INVEST
          </span>
        </div>
        <p style={{
          textAlign: "center", fontSize: 13, color: "var(--text-tertiary)",
          marginBottom: 20,
        }}>
          Get the real numbers — AI-powered investment analysis
        </p>

        {/* ===== INVESTMENT TYPE SELECTOR ===== */}
        <div className="invest-type-pills" style={{
          display: "flex", gap: 6, marginBottom: 16,
          flexWrap: isMobile ? "nowrap" : "wrap",
          justifyContent: isMobile ? "flex-start" : "center",
          overflowX: isMobile ? "auto" : undefined,
          WebkitOverflowScrolling: "touch" as any,
          scrollbarWidth: "none" as any,
          paddingBottom: isMobile ? 4 : 0,
          width: "100%",
        }}>
          {INVEST_TYPES.map((type) => (
            <button key={type.id} onClick={() => setInvestType(prev => prev === type.id ? null : type.id)} style={{
              padding: "6px 14px", borderRadius: 50,
              border: `1px solid ${investType === type.id ? "rgba(59,130,246,0.4)" : "var(--border-secondary)"}`,
              background: investType === type.id ? "rgba(59,130,246,0.08)" : "transparent",
              color: investType === type.id ? BLUE : "var(--text-secondary)",
              fontSize: 11, cursor: "pointer", transition: "all 150ms",
              display: "flex", alignItems: "center", gap: 5,
              whiteSpace: "nowrap", flexShrink: 0,
            }}>
              <span style={{ fontSize: 12 }}>{type.icon}</span> {type.label}
            </button>
          ))}
        </div>

        {/* ===== INPUT PRINCIPAL ===== */}
        <div style={{ width: "100%", marginBottom: 16 }}>
          <div style={{
            borderRadius: 14,
            border: `1px solid rgba(59,130,246,0.2)`,
            background: "var(--card-bg)", overflow: "hidden",
          }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "e") { e.preventDefault(); handleEnhance(); return; }
                if (e.key === "Enter" && !e.shiftKey && input.trim()) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={PLACEHOLDERS[investType || ""] || "Describe the investment you're evaluating..."}
              rows={isMobile ? 2 : 3}
              style={{
                width: "100%", padding: "14px 16px 6px",
                background: "transparent", border: "none",
                color: "var(--text-primary)", fontSize: 14,
                lineHeight: 1.6, resize: "none", outline: "none",
                fontFamily: "var(--font-body)",
              }}
            />
            <div style={{
              display: "flex", alignItems: "center", padding: "6px 12px 8px", gap: 6,
            }}>
              {/* Quick amount pills */}
              <div className="invest-amount-pills" style={{
                display: "flex", gap: 4,
                overflowX: isMobile ? "auto" : undefined,
                scrollbarWidth: "none" as any,
              }}>
                {AMOUNT_PILLS.map((amt) => (
                  <button key={amt} onClick={() => {
                    setInput(prev => prev ? `${prev} (budget: ${amt})` : `I have ${amt} to invest`);
                  }} style={{
                    padding: "3px 8px", borderRadius: 4,
                    border: "1px solid var(--border-secondary)",
                    background: "transparent",
                    color: "var(--text-tertiary)", fontSize: 10,
                    cursor: "pointer", fontFamily: "var(--font-mono)",
                    transition: "all 150ms", whiteSpace: "nowrap", flexShrink: 0,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(59,130,246,0.3)"; e.currentTarget.style.color = BLUE; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-secondary)"; e.currentTarget.style.color = "var(--text-tertiary)"; }}
                  >
                    {amt}
                  </button>
                ))}
              </div>

              {input.trim().length >= 10 && (
                <button onClick={handleEnhance} disabled={enhancing} title="Enhance (\u2318E)" style={{
                  display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 50,
                  border: "1px solid var(--border-secondary)",
                  background: wasEnhanced ? "rgba(59,130,246,0.08)" : "transparent",
                  color: wasEnhanced ? BLUE : "var(--text-tertiary)", fontSize: 11,
                  cursor: enhancing ? "wait" : "pointer", transition: "all 200ms",
                  fontFamily: "var(--font-mono)", letterSpacing: 0.5,
                }}>
                  {enhancing ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> : <Wand2 size={11} />}
                  {wasEnhanced ? "Enhanced" : "Enhance"}
                </button>
              )}

              <div style={{ flex: 1 }} />

              <button
                onClick={() => send()}
                disabled={!input.trim()}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 18px", borderRadius: 50,
                  background: input.trim() ? BLUE : "rgba(255,255,255,0.04)",
                  color: input.trim() ? "#fff" : "var(--text-tertiary)",
                  fontSize: 12, fontWeight: 700, border: "none",
                  cursor: input.trim() ? "pointer" : "default",
                  opacity: input.trim() ? 1 : 0.4,
                  transition: "all 300ms ease",
                }}
              >
                <BarChart3 size={12} /> Analyze
              </button>
            </div>
          </div>
        </div>

        {/* ===== ANALYSIS TOOLS ===== */}
        <div style={{ width: "100%" }}>
          <span style={{
            fontSize: 10, color: "var(--text-tertiary)",
            fontFamily: "var(--font-mono)", letterSpacing: 0.5,
            textTransform: "uppercase",
          }}>
            Analysis tools
          </span>
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 8, marginTop: 8,
          }}>
            {ANALYSIS_TOOLS.map((tool, i) => {
              const Icon = tool.icon;
              return (
                <button key={i} onClick={() => setInput(tool.prompt)}
                  className="interactive-card"
                  style={{
                    display: "flex", flexDirection: "column",
                    padding: "14px 16px", borderRadius: 12,
                    border: "1px solid var(--border-secondary)",
                    background: "var(--card-bg)", textAlign: "left",
                    cursor: "pointer", gap: 8,
                    transition: "border-color 150ms",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(59,130,246,0.25)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-secondary)"; }}
                >
                  <div style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: "rgba(59,130,246,0.08)",
                    border: "1px solid rgba(59,130,246,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: BLUE,
                  }}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>
                      {tool.name}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)", lineHeight: 1.4 }}>
                      {tool.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ===== DISCLAIMER ===== */}
        <p style={{
          textAlign: "center", fontSize: 10,
          color: "var(--text-tertiary)", opacity: 0.3,
          marginTop: 20,
        }}>
          Not financial advice. Always consult a qualified financial advisor before investing.
        </p>
      </div>
    );
  }

  /* ═══ CHAT STATE ═══ */
  return (
    <>
      <div
        ref={areaRef}
        onScroll={handleScroll}
        style={{
          flex: 1, overflowY: "auto", display: "flex", flexDirection: "column",
          position: "relative", userSelect: "none", WebkitUserSelect: "none" as any,
        }}
      >
        {/* Mode breadcrumb */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: isMobile ? "8px 16px" : "8px 24px",
          fontSize: 10, color: "var(--text-tertiary)",
          fontFamily: "var(--font-mono)", letterSpacing: 0.5,
        }}>
          <TrendingUp size={10} style={{ color: BLUE }} />
          INVEST
        </div>

        <div style={{ width: "100%", maxWidth: 768, margin: "0 auto", padding: "4px 24px 120px" }}>
          {messages.map((m, i) => (
            <MessageBlock
              key={i}
              message={m}
              index={i}
              isLast={i === messages.length - 1}
              loading={loading}
              searching={searching}
              userInitials={userInitials}
              onRetry={i === messages.length - 1 ? onRetry : undefined}
              onCopy={handleCopy}
            />
          ))}
          <div ref={bottomRef} />
        </div>

        {userScrolledUp && (
          <button
            onClick={scrollToBottom}
            style={{
              position: "sticky", bottom: 16, alignSelf: "center",
              padding: "6px 14px", borderRadius: 20,
              background: "var(--bg-primary)", border: "1px solid var(--border-primary)",
              color: "var(--text-secondary)", fontSize: 11, cursor: "pointer",
              boxShadow: "var(--shadow-md)", zIndex: 5,
              display: "flex", alignItems: "center", gap: 4,
              animation: "fadeIn 0.15s ease",
            }}
          >
            <ArrowDown size={12} />
          </button>
        )}
      </div>

      {/* Fixed input at bottom */}
      <div style={{ flexShrink: 0, background: "var(--bg-primary)", position: "relative" }}>
        <div style={{
          position: "absolute",
          top: -32, left: 0, right: 0, height: 32,
          background: "linear-gradient(to bottom, transparent, var(--bg-primary))",
          pointerEvents: "none",
        }} />
        <div style={{ padding: isMobile ? "8px 12px 16px" : "12px 24px 16px", paddingBottom: "calc(16px + var(--safe-bottom, 0px))" }}>
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={() => send()}
            loading={loading}
            attachments={attachments}
            onAttachmentsChange={setAttachments}
            mode="invest"
          />
        </div>
      </div>
      {showPaywall && (
        <div style={{
          position: "fixed", inset: 0, display: "flex",
          alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
          zIndex: 100,
        }}>
          <div style={{ textAlign: "center", padding: 32, maxWidth: 400 }}>
            <Lock size={32} style={{ color: BLUE, marginBottom: 16 }} />
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
              Unlock Invest intelligence
            </div>
            <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.6 }}>
              Expected value, risk scores, and honest verdicts on every deal. Pro gets 5 analyses/month. Max gets unlimited.
            </div>
            <a href="/pricing" style={{
              display: "inline-flex", padding: "12px 28px", borderRadius: 50,
              background: BLUE, color: "#fff", fontWeight: 600,
              fontSize: 14, textDecoration: "none",
            }}>
              {"Upgrade now \u2192"}
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
    </>
  );
}
