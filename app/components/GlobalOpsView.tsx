"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Globe, ArrowUp, ArrowDown, Wand2, Loader2 } from "lucide-react";
import { t } from "../lib/i18n";
import { useIsMobile } from "../lib/useIsMobile";
import { getProfile } from "../lib/profile";
import MessageBlock from "./MessageBlock";
import ChatInput, { type FileAttachment } from "./ChatInput";
import type { Message, Mode } from "../lib/types";
import SignuxFooter from "./SignuxFooter";
import { useEnhance } from "../lib/useEnhance";
import { signuxFetch } from "../lib/api-client";

/* ═══ Constants ═══ */
const GREEN = "#22C55E";

const CAPABILITIES = [
  "Jurisdictions", "Tax structures", "Compliance", "Trade routes", "Crypto frameworks",
];

const SCENARIOS = [
  {
    tag: "IMPORT/EXPORT", dotColor: GREEN,
    title: "HK trading, Shenzhen supply, multi-market",
    fill: "I'm setting up a Hong Kong trading company to source electronics from Shenzhen factories and distribute to Brazil, US, and EU markets. Need to understand HS codes, duties, Incoterms, and optimal logistics routes.",
  },
  {
    tag: "STRUCTURE", dotColor: "#6B8AFF",
    title: "Offshore holding with IP optimization",
    fill: "I run a SaaS company with $500K ARR. I want to set up an offshore holding to optimize IP licensing and reduce my effective tax rate. Currently based in Brazil, serving global clients.",
  },
  {
    tag: "CRYPTO", dotColor: "#F59E0B",
    title: "Multi-jurisdiction crypto compliance",
    fill: "I operate a crypto exchange serving users in Brazil, Portugal, and UAE. Need to understand MiCA compliance for EU, CVM rules for Brazil, VARA requirements for Dubai, and Travel Rule obligations.",
  },
];

/* ═══ Intersection Node (pulsing) ═══ */
function IntersectionNode({ top, left }: { top: string; left: string }) {
  return (
    <div style={{
      position: "absolute", top, left, width: 4, height: 4,
      borderRadius: "50%", background: `rgba(34,197,94,0.2)`,
      animation: "pulse 3s ease-in-out infinite",
      boxShadow: `0 0 8px rgba(34,197,94,0.15)`,
    }} />
  );
}

/* ═══ Main Component ═══ */
export default function GlobalOpsView({ lang, onSetMode }: { lang: string; onSetMode?: (m: Mode) => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const isMobile = useIsMobile();
  const { enhance, enhancing, wasEnhanced } = useEnhance("globalops");

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
        body: JSON.stringify({ messages: apiMessages, profile: getProfile(), mode: "globalops" }),
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
      <div style={{ display: "flex", flexDirection: "column" }}>
        {/* HERO */}
        <section style={{
          minHeight: isMobile ? "75vh" : "85vh",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: isMobile ? "24px 16px 32px" : "40px 24px",
          position: "relative", overflowY: "visible", overflowX: "hidden",
        }}>

          {/* BG: Meridian lines */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
            {/* 3 vertical */}
            {[25, 50, 75].map(pct => (
              <div key={`v${pct}`} style={{
                position: "absolute", top: 0, bottom: 0, left: `${pct}%`,
                width: 1, background: `rgba(34,197,94,0.06)`,
              }} />
            ))}
            {/* 2 horizontal */}
            {[33, 66].map(pct => (
              <div key={`h${pct}`} style={{
                position: "absolute", left: 0, right: 0, top: `${pct}%`,
                height: 1, background: `rgba(34,197,94,0.06)`,
              }} />
            ))}
            {/* 5 intersection nodes */}
            <IntersectionNode top="33%" left="25%" />
            <IntersectionNode top="33%" left="75%" />
            <IntersectionNode top="66%" left="50%" />
            <IntersectionNode top="66%" left="25%" />
            <IntersectionNode top="33%" left="50%" />

            {/* Radial gradients */}
            <div style={{
              position: "absolute", top: "20%", left: "30%",
              width: 400, height: 400, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(34,197,94,0.03) 0%, transparent 70%)",
            }} />
            <div style={{
              position: "absolute", bottom: "10%", right: "20%",
              width: 300, height: 300, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(34,197,94,0.025) 0%, transparent 70%)",
            }} />
          </div>

          <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 720, display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>

            {/* Header */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              {/* Icon ring */}
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                border: `1px solid rgba(34,197,94,0.15)`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Globe size={28} color={GREEN} />
              </div>

              {/* Title */}
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontFamily: "var(--font-brand)", fontWeight: 700, fontSize: 42, color: "var(--text-primary)", letterSpacing: 2 }}>
                  GLOBAL
                </span>
                <span style={{ fontFamily: "var(--font-brand)", fontWeight: 300, fontSize: 42, color: "var(--text-primary)", opacity: 0.3, letterSpacing: 2 }}>
                  OPS
                </span>
              </div>

              {/* Subtitle */}
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 11,
                color: `rgba(34,197,94,0.55)`, letterSpacing: 1,
                textTransform: "uppercase",
              }}>
                {t("globalops.subtitle")}
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
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: GREEN, display: "inline-block" }} />
                {t("globalops.input_label")}
              </label>
              <div style={{
                border: `1px solid rgba(34,197,94,0.25)`,
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
                  placeholder={t("globalops.placeholder")}
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
                      background: GREEN, color: "#000",
                      border: "none", borderRadius: 8,
                      padding: "8px 20px", fontSize: 12, fontWeight: 700,
                      fontFamily: "var(--font-brand)", letterSpacing: 1.5,
                      textTransform: "uppercase", cursor: input.trim() ? "pointer" : "default",
                      opacity: input.trim() ? 1 : 0.4,
                      transition: "opacity 0.15s",
                    }}
                  >
                    {t("globalops.cta")}
                  </button>
                </div>
              </div>
            </div>

            {/* Scenario cards */}
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
              gap: 12, width: "100%",
            }}>
              {SCENARIOS.map(s => (
                <button
                  key={s.tag}
                  onClick={() => { setInput(s.fill); }}
                  style={{
                    background: "var(--bg-secondary)", border: "1px solid var(--border-primary)",
                    borderRadius: 10, padding: "14px 16px",
                    textAlign: "left", cursor: "pointer",
                    transition: "border-color 0.15s, background 0.15s",
                    display: "flex", flexDirection: "column", gap: 8,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(34,197,94,0.3)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-primary)"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dotColor }} />
                    <span style={{
                      fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700,
                      letterSpacing: 1.2, textTransform: "uppercase",
                      color: s.dotColor,
                    }}>
                      {s.tag}
                    </span>
                  </div>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                    {s.title}
                  </span>
                </button>
              ))}
            </div>

            {/* Disclaimer */}
            <p style={{
              fontSize: 11, color: "var(--text-tertiary)", textAlign: "center",
              fontFamily: "var(--font-mono)", letterSpacing: 0.3, maxWidth: 500,
            }}>
              {t("globalops.disclaimer")}
            </p>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section style={{ padding: isMobile ? "48px 16px" : "64px 24px", maxWidth: 880, margin: "0 auto", width: "100%" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2, color: "rgba(34,197,94,0.7)", textTransform: "uppercase", marginBottom: 14 }}>
            How Global Ops works
          </div>
          <h2 style={{ fontFamily: "var(--font-brand)", fontWeight: 700, fontSize: isMobile ? 20 : 24, color: "var(--text-primary)", margin: 0, marginBottom: 24 }}>
            Navigate international business with AI intelligence
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 48 }}>
            {[
              { num: "01", title: "Describe", desc: "Tell us about your operation — products, markets, entities, and goals" },
              { num: "02", title: "Jurisdictions", desc: "AI analyzes 100+ jurisdictions for tax, compliance, and regulatory fit" },
              { num: "03", title: "Compliance", desc: "Full compliance map with licensing, reporting, and audit requirements" },
              { num: "04", title: "Recommend", desc: "Optimal structure, trade routes, and entity setup with cost estimates" },
            ].map((step, i) => (
              <div key={i} style={{ padding: 20, borderRadius: 12, border: "1px solid var(--card-border)", background: "var(--card-bg)" }}>
                <div style={{ fontFamily: "var(--font-brand)", fontWeight: 700, fontSize: 28, color: "rgba(34,197,94,0.4)", marginBottom: 8 }}>{step.num}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>{step.title}</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ padding: isMobile ? "0 16px 48px" : "0 24px 64px", maxWidth: 880, margin: "0 auto", width: "100%" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2, color: "var(--text-tertiary)", textTransform: "uppercase", marginBottom: 14 }}>
            What makes this different
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
            {[
              { title: "100+ jurisdictions", desc: "From Delaware to Dubai, Singapore to Switzerland — real regulatory data, not generic advice." },
              { title: "Real tax rates", desc: "Effective rates, not statutory. We calculate what you'll actually pay after treaties and incentives." },
              { title: "Crypto frameworks", desc: "MiCA, CVM, VARA, MAS — navigate crypto regulations across every major jurisdiction." },
              { title: "Trade route optimization", desc: "HS codes, duties, Incoterms, and logistics routes optimized for your specific supply chain." },
            ].map((item, i) => (
              <div key={i} style={{ padding: 16, borderRadius: 10, border: "1px solid var(--card-border)", background: "var(--card-bg)" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </section>

        <div style={{ height: 1, background: "var(--divider)", maxWidth: 600, margin: "0 auto" }} />
        <SignuxFooter onSetMode={onSetMode} />
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
            mode="globalops"
          />
        </div>
      </div>
    </>
  );
}
