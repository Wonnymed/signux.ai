"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { TrendingUp, ArrowDown, Wand2, Loader2 } from "lucide-react";
import { t } from "../lib/i18n";
import { useIsMobile } from "../lib/useIsMobile";
import { getProfile } from "../lib/profile";
import MessageBlock from "./MessageBlock";
import ChatInput, { type FileAttachment } from "./ChatInput";
import type { Message, Mode } from "../lib/types";
import { useEnhance } from "../lib/useEnhance";
import { signuxFetch } from "../lib/api-client";

/* ═══ Constants ═══ */
const PURPLE = "#A855F7";

const CAPABILITIES = [
  "Expected value", "Kelly criterion", "Base rates", "Market signals",
];

const TEMPLATES = [
  {
    tag: "STARTUP", dotColor: PURPLE,
    title: "Startup deal",
    desc: "EV, dilution, comparables",
    fill: "Evaluating a $500K angel check in a Series A fintech startup. Pre-money $8M, 20% revenue growth MoM, 18-month runway. Compare to sector base rates and estimate expected value.",
  },
  {
    tag: "PORTFOLIO", dotColor: "#22C55E",
    title: "Portfolio",
    desc: "Kelly sizing, correlation",
    fill: "I have a $200K portfolio: 40% S&P 500, 30% BTC, 20% real estate REITs, 10% cash. Evaluate optimal Kelly sizing, correlation risk, and rebalancing strategy for a 5-year horizon.",
  },
  {
    tag: "ACQUISITION", dotColor: "#6B8AFF",
    title: "Acquisition",
    desc: "DCF, integration risk",
    fill: "Considering acquiring a $2M ARR B2B SaaS company for $8M. 70% gross margins, 15% churn, growing 25% YoY. Run a DCF analysis and evaluate integration risk vs build-vs-buy.",
  },
  {
    tag: "REAL ESTATE", dotColor: "#F59E0B",
    title: "Real estate",
    desc: "Cap rate, IRR, stress test",
    fill: "Evaluating a $1.2M commercial property: $8,500/month rental income, 5% vacancy rate, $3,200/month operating expenses. Calculate cap rate, cash-on-cash return, and run IRR scenarios with interest rate stress tests.",
  },
];

const QUANT_LABELS = ["EV", "Kelly", "Bayes", "IRR", "KL"];

/* ═══ Candlestick silhouettes ═══ */
function CandlestickBG() {
  const sticks = Array.from({ length: 20 }, (_, i) => {
    const height = 30 + Math.round(((i * 7 + 13) % 91));  // deterministic 30-120
    const isGreen = i % 3 !== 0;
    const left = 5 + (i * 4.7);
    return { height, color: isGreen ? "rgba(34,197,94,0.06)" : "rgba(168,85,247,0.06)", left };
  });

  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 140, pointerEvents: "none", overflow: "hidden" }}>
      {sticks.map((s, i) => (
        <div key={i} style={{
          position: "absolute", bottom: 0, left: `${s.left}%`,
          width: 3, height: s.height, borderRadius: "1px 1px 0 0",
          background: s.color,
        }} />
      ))}
    </div>
  );
}

/* ═══ Main Component ═══ */
export default function InvestView({ lang, onSetMode }: { lang: string; onSetMode?: (m: Mode) => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
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
  const pad = isMobile ? "16px" : "24px";

  /* ═══ WELCOME STATE ═══ */
  if (messages.length === 0) {
    return (
        <section style={{
          minHeight: isMobile ? "75vh" : "85vh",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: isMobile ? "24px 16px 32px" : "40px 24px",
          position: "relative", overflowX: "hidden",
        }}>
          {/* BG: Candlestick silhouettes */}
          <CandlestickBG />

          <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 720, display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>

            {/* Header */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              {/* Icon box */}
              <div style={{
                width: 64, height: 64, borderRadius: 14,
                border: `1px solid rgba(168,85,247,0.15)`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <TrendingUp size={28} color={PURPLE} />
              </div>

              {/* Title */}
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontFamily: "var(--font-brand)", fontWeight: 700, fontSize: 42, color: "var(--text-primary)", letterSpacing: 2 }}>
                  INVEST
                </span>
                <span style={{ fontFamily: "var(--font-brand)", fontWeight: 300, fontSize: 42, color: "var(--text-primary)", opacity: 0.3, letterSpacing: 2 }}>
                  ENGINE
                </span>
              </div>

              {/* Subtitle */}
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 11,
                color: `rgba(168,85,247,0.55)`, letterSpacing: 1,
                textTransform: "uppercase",
              }}>
                {t("invest.subtitle")}
              </span>
            </div>

            {/* Capability strip */}
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
              {CAPABILITIES.map(cap => (
                <span key={cap} style={{
                  fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1.2,
                  textTransform: "uppercase", color: "var(--text-tertiary)",
                  padding: "4px 10px", borderRadius: 4,
                  border: "1px solid var(--border-primary)",
                }}>
                  {cap}
                </span>
              ))}
            </div>

            {/* Input */}
            <div style={{ width: "100%", maxWidth: 720 }}>
              <label style={{
                display: "flex", alignItems: "center", gap: 6,
                fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 600,
                letterSpacing: 1.5, textTransform: "uppercase",
                color: "var(--text-tertiary)", marginBottom: 8,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: PURPLE, display: "inline-block" }} />
                {t("invest.input_label")}
              </label>
              <div style={{
                border: `1px solid rgba(168,85,247,0.25)`,
                borderRadius: 12, overflow: "hidden",
                background: "var(--bg-secondary)",
              }}>
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "e") { e.preventDefault(); handleEnhance(); return; }
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder={t("invest.placeholder")}
                  rows={3}
                  style={{
                    width: "100%", padding: "14px 16px", border: "none", outline: "none",
                    background: "transparent", color: "var(--text-primary)",
                    fontSize: 14, fontFamily: "var(--font-body)", resize: "none",
                    lineHeight: 1.6,
                    opacity: enhancing ? 0.5 : 1, transition: "opacity 150ms ease",
                  }}
                />
                <div style={{
                  display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8,
                  padding: "8px 12px", borderTop: "1px solid var(--border-primary)",
                }}>
                  {input.trim().length >= 10 && (
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
                  )}
                  <button
                    onClick={() => send()}
                    disabled={!input.trim() || loading}
                    style={{
                      background: PURPLE, color: "#fff",
                      border: "none", borderRadius: 8,
                      padding: "8px 20px", fontSize: 12, fontWeight: 700,
                      fontFamily: "var(--font-brand)", letterSpacing: 1.5,
                      textTransform: "uppercase", cursor: input.trim() ? "pointer" : "default",
                      opacity: input.trim() ? 1 : 0.4,
                      transition: "opacity 0.15s",
                    }}
                  >
                    {t("invest.cta")}
                  </button>
                </div>
              </div>
            </div>

            {/* Template cards — 2x2 grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: 12, width: "100%",
            }}>
              {TEMPLATES.map(tpl => (
                <button
                  key={tpl.tag}
                  onClick={() => { setInput(tpl.fill); }}
                  style={{
                    background: "var(--bg-secondary)", border: "1px solid var(--border-primary)",
                    borderRadius: 10, padding: "14px 16px",
                    textAlign: "left", cursor: "pointer",
                    transition: "border-color 0.15s, background 0.15s",
                    display: "flex", flexDirection: "column", gap: 6,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(168,85,247,0.3)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-primary)"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: tpl.dotColor }} />
                    <span style={{
                      fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700,
                      letterSpacing: 1.2, textTransform: "uppercase",
                      color: tpl.dotColor,
                    }}>
                      {tpl.tag}
                    </span>
                  </div>
                  <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600, lineHeight: 1.3 }}>
                    {tpl.title}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.3 }}>
                    {tpl.desc}
                  </span>
                </button>
              ))}
            </div>

            {/* Quant strip */}
            <div style={{ display: "flex", justifyContent: "center", gap: isMobile ? 16 : 28 }}>
              {QUANT_LABELS.map(label => (
                <span key={label} style={{
                  fontFamily: "var(--font-brand)", fontWeight: 700, fontSize: 14,
                  letterSpacing: 1.5, color: "var(--text-tertiary)", opacity: 0.5,
                }}>
                  {label}
                </span>
              ))}
            </div>

            {/* Disclaimer */}
            <p style={{
              fontSize: 11, color: "var(--text-tertiary)", textAlign: "center",
              fontFamily: "var(--font-mono)", letterSpacing: 0.3, maxWidth: 500,
            }}>
              {t("invest.disclaimer")}
            </p>
          </div>
        </section>
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
        <div style={{ width: "100%", maxWidth: 900, margin: "0 auto", paddingTop: 20, paddingBottom: 32 }}>
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
    </>
  );
}
